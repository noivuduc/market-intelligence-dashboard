// ============================================================
// OPTIONS MODULE — derived from Polygon or Yahoo chain snapshot
// Walls / zero-gamma / dealer heuristics are approximations;
// meta.caveat documents limitations vs full OPRA GEX engines.
//
// SIGN CONVENTION:
//  - put wall (max put OI): dealer sold puts → dealers are LONG delta/LONG gamma
//    at this level. Spot approaching put wall = stabilising support, NOT short gamma.
//  - call wall (max call OI): dealer sold calls → dealers are SHORT delta near expiry.
//    Spot approaching call wall = capping resistance. Being near the call wall can
//    indicate dealer short gamma (must buy rallies to hedge).
//  - zero-gamma: strike of maximum |gamma|×OI. Requires per-contract greeks.
//    When greeks are unavailable (Yahoo source), zeroGamma = null. Do NOT fall
//    back to spot price — that creates false precision.
// ============================================================

import { makeMeta, SOURCES } from '@/lib/sources/types'
import type { GammaLevel, OptionsModule } from '@/lib/types'
import type {
  NormalizedOptionContract,
  OptionsChainProvider,
  SpxOptionChainSnapshot,
} from '@/lib/sources/option-chain-types'
import { OPTIONS } from '@/lib/config/thresholds'

const CAVEAT_POLYGON =
  'Derived from Polygon open interest and per-contract greeks when present. Not a full dealer GEX model; zero-gamma is the max |γ|×OI strike, not exchange-reported. Verify vs your risk stack.'

const CAVEAT_YAHOO =
  'Derived from Yahoo Finance option chain (unofficial API). OI may be delayed; greeks absent — zero-gamma set to null (not estimated from spot). Not a full dealer GEX model. Verify vs your risk stack.'

function aggregateByStrike(contracts: NormalizedOptionContract[]) {
  const putOi = new Map<number, number>()
  const callOi = new Map<number, number>()
  const putGammaOi = new Map<number, number>()
  const callGammaOi = new Map<number, number>()
  const expiryOi = new Map<string, number>()
  let greeksPresent = false

  for (const c of contracts) {
    const map = c.contractType === 'put' ? putOi : callOi
    map.set(c.strike, (map.get(c.strike) ?? 0) + c.openInterest)
    if (c.gamma != null) {
      greeksPresent = true
      const gm = c.contractType === 'put' ? putGammaOi : callGammaOi
      const add = Math.abs(c.gamma) * c.openInterest
      gm.set(c.strike, (gm.get(c.strike) ?? 0) + add)
    }
    expiryOi.set(c.expirationDate, (expiryOi.get(c.expirationDate) ?? 0) + c.openInterest)
  }

  return { putOi, callOi, putGammaOi, callGammaOi, expiryOi, greeksPresent }
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

function expiryImportance(isoDate: string): 'monthly' | 'weekly' | 'quarterly' {
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
      greeksAvailable:    false,
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

  const { putOi, callOi, putGammaOi, callGammaOi, expiryOi, greeksPresent } =
    aggregateByStrike(snapshot.contracts)

  const putWall = strikeOfMaxOi(putOi)
  const callWall = strikeOfMaxOi(callOi)
  if (putWall == null || callWall == null) {
    return {
      structureAvailable: false,
      greeksAvailable:    greeksPresent,
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

  // ---- Zero-gamma ----
  // Only derive from greeks when present. Do NOT fall back to spot price —
  // that produces false precision ("ZG at spot" is meaningless).
  const zgFromGreeks = greeksPresent ? strikeOfMaxGammaOi(putGammaOi, callGammaOi) : null
  const zeroGamma: number | null = zgFromGreeks ?? null

  const spot =
    spotPrice != null && Number.isFinite(spotPrice) && spotPrice > 0
      ? spotPrice
      : snapshot.underlyingPrice

  // ---- Build gamma level chart ----
  const putOiAtWall  = putOi.get(putWall) ?? 0
  const callOiAtWall = callOi.get(callWall) ?? 0

  const gammaLevels: GammaLevel[] = [
    {
      strike: putWall,
      relativeWeight: greeksPresent
        ? (putGammaOi.get(putWall) ?? 0) + (callGammaOi.get(putWall) ?? 0)
        : putOiAtWall,
      type: 'put-wall',
    },
    {
      strike: callWall,
      relativeWeight: greeksPresent
        ? (putGammaOi.get(callWall) ?? 0) + (callGammaOi.get(callWall) ?? 0)
        : callOiAtWall,
      type: 'call-wall',
    },
  ]

  if (zeroGamma != null) {
    const zgWeight =
      (putGammaOi.get(zeroGamma) ?? 0) + (callGammaOi.get(zeroGamma) ?? 0)
    gammaLevels.push({
      strike: zeroGamma,
      relativeWeight: zgWeight > 0 ? zgWeight : Math.max(putOi.get(zeroGamma) ?? 0, callOi.get(zeroGamma) ?? 0, 1),
      type: 'zero-gamma',
    })
  }

  // Additional gamma clusters (greeks-only; OI clusters otherwise)
  if (greeksPresent) {
    const scoreByStrike = new Map<number, number>()
    for (const [k, v] of putGammaOi)  scoreByStrike.set(k, (scoreByStrike.get(k) ?? 0) + v)
    for (const [k, v] of callGammaOi) scoreByStrike.set(k, (scoreByStrike.get(k) ?? 0) + v)
    const excluded = new Set([putWall, callWall, ...(zeroGamma != null ? [zeroGamma] : [])])
    const ranked = [...scoreByStrike.entries()]
      .filter(([k]) => !excluded.has(k))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
    for (const [strike, g] of ranked) {
      gammaLevels.push({ strike, relativeWeight: g, type: 'gamma-cluster' })
    }
  }

  // ---- Dealer positioning ----
  // Sign convention:
  //  - near PUT wall:  dealers absorbed put selling → long gamma at this level (stabilising)
  //  - near CALL wall: dealers short calls → short delta; near expiry can be short gamma (capping)
  //  - inside corridor (put < spot < call), away from walls: dealers long gamma (range-bound)
  let dealerPositioning: OptionsModule['dealerPositioning'] = 'neutral'
  let pinningRisk:        OptionsModule['pinningRisk']        = 'moderate'
  let airPocketRisk:      OptionsModule['airPocketRisk']      = 'moderate'
  let breakoutSensitivity:OptionsModule['breakoutSensitivity']= 'moderate'

  if (spot != null && Number.isFinite(spot) && spot > 0) {
    const lo = Math.min(putWall, callWall)
    const hi = Math.max(putWall, callWall)
    const distToPut  = Math.abs(spot - putWall)  / spot
    const distToCall = Math.abs(spot - callWall) / spot
    const nearestWall = Math.min(distToPut, distToCall)

    // Pinning risk = proximity to EITHER wall (both walls create pinning dynamics)
    if (nearestWall < OPTIONS.PIN_HIGH_DIST)    pinningRisk = 'high'
    else if (nearestWall < OPTIONS.PIN_MODERATE_DIST) pinningRisk = 'moderate'
    else pinningRisk = 'low'

    if (distToCall < OPTIONS.CALL_WALL_SHORT_GAMMA_DIST) {
      // Near call wall: dealers short calls → short gamma heading higher
      dealerPositioning   = 'short-gamma'
      airPocketRisk       = 'high'
      breakoutSensitivity = 'high'
    } else if (distToPut < OPTIONS.PUT_WALL_SUPPORT_DIST && spot > lo) {
      // Near put wall but above it: stabilising dealer support dynamics
      dealerPositioning   = 'neutral'   // not short gamma at put wall
      airPocketRisk       = 'moderate'
      breakoutSensitivity = 'low'
    } else if (spot > lo && spot < hi && nearestWall > OPTIONS.CORRIDOR_LONG_GAMMA_DIST) {
      // Inside corridor, well away from walls: dealers long gamma
      dealerPositioning   = 'long-gamma'
      airPocketRisk       = 'low'
      breakoutSensitivity = 'low'
    }
  }

  return {
    structureAvailable: true,
    greeksAvailable:    greeksPresent,
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
