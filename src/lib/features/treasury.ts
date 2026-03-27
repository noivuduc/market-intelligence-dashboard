// ============================================================
// TREASURY FEATURE AGGREGATOR
// Transforms raw FRED yield data into TreasuryModule state.
// ============================================================

import {
  fetchMultiple,
  latest,
  latestTwo,
  toTimeSeries,
  FRED_SERIES,
} from '@/lib/sources/fred'
import { makeMeta, SOURCES } from '@/lib/sources/types'
import type { TreasuryModule, MetricValue, TrendDirection } from '@/lib/types'
import { formatYieldDeltaBps, yieldChangeToBps } from '@/lib/format/treasuryChange'

function yieldMetric(
  curr: { value: number; date: string } | null,
  prev: { value: number; date: string } | null,
): MetricValue {
  const meta = makeMeta({ ...SOURCES.FRED }, curr?.date)
  if (!curr) {
    return {
      value: null, prior: null, change: null, changeBps: null, changePct: null,
      unit: '%', formatted: '—', formattedChange: null, trend: 'flat', meta,
    }
  }
  const deltaPctPoints = prev ? curr.value - prev.value : null
  const changeBps = deltaPctPoints !== null ? yieldChangeToBps(deltaPctPoints) : null
  const trend: TrendDirection =
    deltaPctPoints == null ? 'flat' :
    deltaPctPoints >  0.001 ? 'rising' :
    deltaPctPoints < -0.001 ? 'falling' : 'flat'

  return {
    value:           curr.value,
    prior:           prev?.value ?? null,
    change:          changeBps,
    changeBps,
    changePct:       null,
    unit:            '%',
    displayUnit:     '% (session Δ in bps)',
    formatted:       `${curr.value.toFixed(2)}%`,
    formattedChange: formatYieldDeltaBps(deltaPctPoints),
    trend,
    meta,
  }
}

function spreadMetric(
  curr: { value: number; date: string } | null,
  prev: { value: number; date: string } | null,
): MetricValue {
  const meta = makeMeta({ ...SOURCES.FRED }, curr?.date)
  if (!curr) {
    return {
      value: null, prior: null, change: null, changeBps: null, changePct: null,
      unit: 'bps', formatted: '—', formattedChange: null, trend: 'flat', meta,
    }
  }
  // FRED T10Y2Y and T10Y3M are in percentage points; convert to bps
  const bps  = curr.value * 100
  const pbps = prev ? prev.value * 100 : null
  const change = pbps !== null ? bps - pbps : null
  const trend: TrendDirection =
    change == null ? 'flat' :
    change > 1  ? 'rising' :
    change < -1 ? 'falling' : 'flat'

  return {
    value:     bps,
    prior:     pbps,
    change,
    changePct: null,
    unit:      'bps',
    formatted: `${bps >= 0 ? '+' : ''}${bps.toFixed(0)} bps`,
    trend,
    meta,
  }
}

export async function buildTreasuryModule(): Promise<TreasuryModule> {
  const series = await fetchMultiple([
    FRED_SERIES.DGS3MO,
    FRED_SERIES.DGS1,
    FRED_SERIES.DGS2,
    FRED_SERIES.DGS5,
    FRED_SERIES.DGS10,
    FRED_SERIES.DGS30,
    FRED_SERIES.TIPS5Y,
    FRED_SERIES.TIPS10Y,
    FRED_SERIES.SPREAD_2_10,
    FRED_SERIES.SPREAD_3M_10,
    FRED_SERIES.BEI10Y,
  ], 10)

  function two(id: string) { return latestTwo(series[id] ?? []) }

  const [m3c, m3p]     = two(FRED_SERIES.DGS3MO)
  const [y1c, y1p]     = two(FRED_SERIES.DGS1)
  const [y2c, y2p]     = two(FRED_SERIES.DGS2)
  const [y5c, y5p]     = two(FRED_SERIES.DGS5)
  const [y10c, y10p]   = two(FRED_SERIES.DGS10)
  const [y30c, y30p]   = two(FRED_SERIES.DGS30)
  const [t5c, t5p]     = two(FRED_SERIES.TIPS5Y)
  const [t10c, t10p]   = two(FRED_SERIES.TIPS10Y)
  const [s210c, s210p] = two(FRED_SERIES.SPREAD_2_10)
  const [s3mc, s3mp]   = two(FRED_SERIES.SPREAD_3M_10)

  // ---- Infer curve regime from 2s10s spread ----
  const twoTenVal = s210c ? s210c.value * 100 : null  // bps
  let curveRegime: TreasuryModule['curveRegime'] = 'normalizing'
  if (twoTenVal !== null) {
    const prev2w = series[FRED_SERIES.SPREAD_2_10]?.slice(0, 10) ?? []
    const prev2wVals = prev2w
      .map(o => parseFloat(o.value))
      .filter(v => !isNaN(v))
    const prevAvg = prev2wVals.length
      ? prev2wVals.reduce((a, b) => a + b, 0) / prev2wVals.length
      : twoTenVal / 100

    if (twoTenVal < -50) curveRegime = 'inverted'
    else if ((twoTenVal / 100) > prevAvg + 0.05) curveRegime = 'steepening'
    else if ((twoTenVal / 100) < prevAvg - 0.05) curveRegime = 'flattening'
    else curveRegime = 'normalizing'
  }

  // ---- Infer rates regime ----
  const y10Series = toTimeSeries(series[FRED_SERIES.DGS10] ?? [], true)
  let ratesRegime: TreasuryModule['ratesRegime'] = 'range-bound'
  if (y10Series.length >= 10) {
    const recent = y10Series.slice(-10)
    const range  = Math.max(...recent.map(p => p.value)) - Math.min(...recent.map(p => p.value))
    const trend  = recent[recent.length - 1]!.value - recent[0]!.value
    if (Math.abs(trend) > 0.20 && range > 0.25) {
      ratesRegime = trend > 0 ? 'rising' : 'falling'
    }
  }

  // ---- Bonds vs equities ----
  const y10Change = y10c && y10p ? y10c.value - y10p.value : 0
  const bondsVsEquities: TreasuryModule['bondsVsEquities'] =
    y10Change > 0.10 ? 'hurting' :
    y10Change < -0.10 ? 'helping' :
    'neutral'

  // ---- Supply pressure heuristic ----
  // If 10Y > 4.5% and rising: high supply pressure
  const y10Val = y10c?.value ?? 0
  const supplyPressure: TreasuryModule['supplyPressure'] =
    y10Val > 4.5 && ratesRegime === 'rising' ? 'high' :
    y10Val > 4.0 ? 'moderate' : 'low'

  const now = new Date().toISOString()

  // ---- 2s30s spread: derive from DGS30 - DGS2 since no direct FRED series ----
  const [y30raw, y30rawP] = two(FRED_SERIES.DGS30)
  const [y2raw,  y2rawP]  = two(FRED_SERIES.DGS2)
  const twoThirtyVal = (y30raw && y2raw) ? { value: y30raw.value - y2raw.value, date: y30raw.date } : null
  const twoThirtyPval = (y30rawP && y2rawP) ? { value: y30rawP.value - y2rawP.value, date: y30rawP.date } : null

  return {
    curve: {
      m3:    yieldMetric(m3c,  m3p),
      y1:    yieldMetric(y1c,  y1p),
      y2:    yieldMetric(y2c,  y2p),
      y5:    yieldMetric(y5c,  y5p),
      y10:   yieldMetric(y10c, y10p),
      y30:   yieldMetric(y30c, y30p),
      tip5y: yieldMetric(t5c,  t5p),
      tip10y:yieldMetric(t10c, t10p),
    },
    spreads: {
      twoTen:    spreadMetric(s210c, s210p),
      twoThirty: spreadMetric(twoThirtyVal, twoThirtyPval),
      threeMTen: spreadMetric(s3mc,  s3mp),
    },
    curveRegime,
    supplyPressure,
    bondsVsEquities,
    ratesRegime,
    meta: makeMeta({ ...SOURCES.FRED }, now),
  }
}
