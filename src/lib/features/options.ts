// ============================================================
// OPTIONS MODULE — derived from Polygon or Yahoo chain snapshot
// Walls / zero-gamma / dealer heuristics are approximations;
// meta.caveat documents limitations vs full OPRA GEX engines.
// ============================================================

import { makeMeta, SOURCES } from '@/lib/sources/types'
import type { GammaLevel, OptionsModule } from '@/lib/types'
import type {
  NormalizedOptionContract,
  OptionsChainProvider,
  SpxOptionChainSnapshot,
} from '@/lib/sources/option-chain-types'

const CAVEAT_POLYGON =
  'Derived from Polygon open interest and per-contract greeks when present. Not a full dealer GEX model; zero-gamma is a heuristic (max |γ|×OI strike), not exchange-reported. Verify vs your risk stack.'

const CAVEAT_YAHOO =
  'Derived from Yahoo Finance option chain (unofficial API). OI may be delayed; greeks are often absent — zero-gamma falls back to spot or midpoint heuristics. Not a full dealer GEX model. Verify vs your risk stack.'

function aggregateByStrike(contracts: NormalizedOptionContract[]) {
  const putOi = new Map<number, number>()
  const callOi = new Map<number, number>()
  const putGammaOi = new Map<number, number>()
  const callGammaOi = new Map<number, number>()
  const expiryOi = new Map<string, number>()

  for (const c of contracts) {
    const map = c.contractType === 'put' ? putOi : callOi
    map.set(c.strike, (map.get(c.strike) ?? 0) + c.openInterest)
    if (c.gamma != null) {
      const gm = c.contractType === 'put' ? putGammaOi : callGammaOi
      const add = Math.abs(c.gamma) * c.openInterest
      gm.set(c.strike, (gm.get(c.strike) ?? 0) + add)
    }
    expiryOi.set(c.expirationDate, (expiryOi.get(c.expirationDate) ?? 0) + c.openInterest)
  }

  return { putOi, callOi, putGammaOi, callGammaOi, expiryOi }
}

function strikeOfMaxOi(m: Map<number, number>): number | null {
  let bestK: number | null = null
  let best = 0
  for (const [k, v] of m) {
    if (v > best) {
      best = v
      bestK = k
    }
  }
  return bestK
}

function strikeOfMaxGammaOi(
  putG: Map<number, number>,
  callG: Map<number, number>,
): number | null {
  const scores = new Map<number, number>()
  for (const [k, v] of putG) scores.set(k, (scores.get(k) ?? 0) + v)
  for (const [k, v] of callG) scores.set(k, (scores.get(k) ?? 0) + v)
  let bestK: number | null = null
  let best = 0
  for (const [k, v] of scores) {
    if (v > best) {
      best = v
      bestK = k
    }
  }
  return bestK
}

function thirdFridayUtc(isoDate: string): boolean {
  const d = new Date(`${isoDate}T12:00:00.000Z`)
  if (Number.isNaN(d.getTime()) || d.getUTCDay() !== 5) return false
  const day = d.getUTCDate()
  return day >= 15 && day <= 21
}

function expiryImportance(
  isoDate: string,
): 'monthly' | 'weekly' | 'quarterly' {
  const d = new Date(`${isoDate}T12:00:00.000Z`)
  const m = d.getUTCMonth()
  const isQuarterlyMonth = m === 2 || m === 5 || m === 8 || m === 11
  if (thirdFridayUtc(isoDate) && isQuarterlyMonth) return 'quarterly'
  if (thirdFridayUtc(isoDate)) return 'monthly'
  return 'weekly'
}

function keyExpiriesFrom(expiryOi: Map<string, number>): OptionsModule['keyExpiries'] {
  return [...expiryOi.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([date]) => ({ date, importance: expiryImportance(date) }))
}

function metaBaseForProvider(provider: OptionsChainProvider) {
  if (provider === 'yahoo') {
    return {
      ...SOURCES.YAHOO_FINANCE,
      dataClass: 'derived' as const,
      confidence: 'medium' as const,
      caveat: CAVEAT_YAHOO,
    }
  }
  return {
    ...SOURCES.POLYGON,
    dataClass: 'derived' as const,
    confidence: 'medium' as const,
    caveat: CAVEAT_POLYGON,
  }
}

function emptyChainMessage(provider: OptionsChainProvider): string {
  return provider === 'yahoo'
    ? 'Yahoo Finance returned no SPX (^SPX) option contracts with open interest.'
    : 'Polygon returned no contracts with open interest for I:SPX.'
}

/**
 * Build OptionsModule from a cached chain snapshot + live spot (Yahoo SPX when available).
 */
export function buildOptionsModuleFromChain(
  snapshot: SpxOptionChainSnapshot,
  spotPrice: number | null,
  provider: OptionsChainProvider,
): OptionsModule {
  const fetchedAt = new Date().toISOString()
  const baseMeta = metaBaseForProvider(provider)

  if (snapshot.contracts.length === 0) {
    return {
      structureAvailable: false,
      putWall: null,
      callWall: null,
      zeroGamma: null,
      gammaLevels: [],
      dealerPositioning: 'neutral',
      pinningRisk: 'moderate',
      airPocketRisk: 'moderate',
      breakoutSensitivity: 'moderate',
      keyExpiries: [],
      meta: makeMeta({
        ...baseMeta,
        isFallback: true,
        fetchError: emptyChainMessage(provider),
      }, fetchedAt),
    }
  }

  const { putOi, callOi, putGammaOi, callGammaOi, expiryOi } = aggregateByStrike(snapshot.contracts)
  const putWall = strikeOfMaxOi(putOi)
  const callWall = strikeOfMaxOi(callOi)
  if (putWall == null || callWall == null) {
    return {
      structureAvailable: false,
      putWall: null,
      callWall: null,
      zeroGamma: null,
      gammaLevels: [],
      dealerPositioning: 'neutral',
      pinningRisk: 'moderate',
      airPocketRisk: 'moderate',
      breakoutSensitivity: 'moderate',
      keyExpiries: keyExpiriesFrom(expiryOi),
      meta: makeMeta({
        ...baseMeta,
        isFallback: true,
        fetchError: 'Could not resolve put/call walls from open interest.',
      }, fetchedAt),
    }
  }

  const zgFromGreeks = strikeOfMaxGammaOi(putGammaOi, callGammaOi)
  const spot =
    spotPrice != null && Number.isFinite(spotPrice) && spotPrice > 0
      ? spotPrice
      : snapshot.underlyingPrice
  let zeroGamma: number
  if (zgFromGreeks != null) {
    zeroGamma = zgFromGreeks
  } else if (spot != null && Number.isFinite(spot)) {
    zeroGamma = Math.round(spot)
  } else {
    zeroGamma = Math.round((putWall + callWall) / 2)
  }

  const putOiAtWall = putOi.get(putWall) ?? 0
  const callOiAtWall = callOi.get(callWall) ?? 0
  const zgGamma =
    (putGammaOi.get(zeroGamma) ?? 0) + (callGammaOi.get(zeroGamma) ?? 0)
  const zgOiFallback = Math.max(
    putOi.get(zeroGamma) ?? 0,
    callOi.get(zeroGamma) ?? 0,
    1,
  )
  const gammaLevels: GammaLevel[] = [
    {
      strike: putWall,
      gammaNotional: putOiAtWall,
      type: 'put-wall',
    },
    {
      strike: callWall,
      gammaNotional: callOiAtWall,
      type: 'call-wall',
    },
    {
      strike: zeroGamma,
      gammaNotional: zgGamma > 0 ? zgGamma : zgOiFallback,
      type: 'zero-gamma',
    },
  ]

  const scoreByStrike = new Map<number, number>()
  for (const [k, v] of putGammaOi) scoreByStrike.set(k, (scoreByStrike.get(k) ?? 0) + v)
  for (const [k, v] of callGammaOi) scoreByStrike.set(k, (scoreByStrike.get(k) ?? 0) + v)
  const ranked = [...scoreByStrike.entries()]
    .filter(([k]) => k !== putWall && k !== callWall && k !== zeroGamma)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
  for (const [strike, g] of ranked) {
    gammaLevels.push({ strike, gammaNotional: g, type: 'gamma-cluster' })
  }

  let dealerPositioning: OptionsModule['dealerPositioning'] = 'neutral'
  let pinningRisk: OptionsModule['pinningRisk'] = 'moderate'
  let airPocketRisk: OptionsModule['airPocketRisk'] = 'moderate'
  let breakoutSensitivity: OptionsModule['breakoutSensitivity'] = 'moderate'

  if (spot != null && Number.isFinite(spot) && spot > 0) {
    const lo = Math.min(putWall, callWall)
    const hi = Math.max(putWall, callWall)
    const mid = (lo + hi) / 2
    const distPut = Math.abs(spot - putWall) / spot
    const distCall = Math.abs(spot - callWall) / spot
    const nearWall = Math.min(distPut, distCall)

    if (nearWall < 0.0025) pinningRisk = 'high'
    else if (nearWall < 0.006) pinningRisk = 'moderate'
    else pinningRisk = 'low'

    if (nearWall < 0.004) {
      dealerPositioning = 'short-gamma'
      airPocketRisk = 'high'
      breakoutSensitivity = 'high'
    } else if (nearWall > 0.012 && spot > lo && spot < hi) {
      dealerPositioning = 'long-gamma'
      airPocketRisk = 'low'
      breakoutSensitivity = 'low'
    } else if (spot > mid && nearWall > 0.008) {
      airPocketRisk = 'moderate'
      breakoutSensitivity = 'moderate'
    }
  }

  return {
    structureAvailable: true,
    putWall,
    callWall,
    zeroGamma,
    gammaLevels,
    dealerPositioning,
    pinningRisk,
    airPocketRisk,
    breakoutSensitivity,
    keyExpiries: keyExpiriesFrom(expiryOi),
    meta: makeMeta(baseMeta, fetchedAt),
  }
}

/** @deprecated Use buildOptionsModuleFromChain(snapshot, spot, 'polygon') */
export function buildOptionsModuleFromPolygonChain(
  snapshot: SpxOptionChainSnapshot,
  spotPrice: number | null,
): OptionsModule {
  return buildOptionsModuleFromChain(snapshot, spotPrice, 'polygon')
}
