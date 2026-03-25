// ============================================================
// LIQUIDITY & FINANCIAL CONDITIONS FEATURE AGGREGATOR
// ============================================================

import { fetchMultiple, latestTwo, toTimeSeries, FRED_SERIES } from '@/lib/sources/fred'
import { makeMeta, SOURCES, type SourceMeta } from '@/lib/sources/types'
import type { LiquidityModule, MetricValue, TrendDirection } from '@/lib/types'
import { fredBillionsToTrillions, fredMillionsToTrillions } from '@/lib/format/money'
import { formatSpreadBpsFromFredPercent, spreadPercentToBps } from '@/lib/format/spreadDisplay'

function metric(
  curr: { value: number; date: string } | null,
  prev: { value: number; date: string } | null,
  unit: string,
  fmt:  (v: number) => string,
  percentile?: number,
  metaOverride?: Partial<SourceMeta>,
): MetricValue {
  const meta = makeMeta({ ...SOURCES.FRED, ...metaOverride }, curr?.date)
  if (!curr) return { value: null, prior: null, change: null, changePct: null, unit, formatted: '—', trend: 'flat', meta }
  const change = prev ? curr.value - prev.value : null
  const trend: TrendDirection =
    change == null ? 'flat' :
    change > 0.0001 ? 'rising' :
    change < -0.0001 ? 'falling' : 'flat'
  return { value: curr.value, prior: prev?.value ?? null, change, changePct: null, unit, formatted: fmt(curr.value), percentile, trend, meta }
}

/** ICE BofA HY/IG on FRED: OAS as percent of par → store/display as bps */
function creditSpreadMetric(
  curr: { value: number; date: string } | null,
  prev: { value: number; date: string } | null,
  metaOverride?: Partial<SourceMeta>,
): MetricValue {
  const meta = makeMeta({
    ...SOURCES.FRED,
    ...metaOverride,
    caveat: [
      metaOverride?.caveat,
      'FRED reports option-adjusted spread as percent (e.g. 3.2 = 320 bps).',
    ].filter(Boolean).join(' '),
  }, curr?.date)
  if (!curr) {
    return {
      value: null, prior: null, change: null, changePct: null,
      unit: 'bps', formatted: '—', trend: 'flat', meta,
    }
  }
  const bps = spreadPercentToBps(curr.value)
  const pbps = prev ? spreadPercentToBps(prev.value) : null
  const change = pbps !== null ? bps - pbps : null
  const trend: TrendDirection =
    change == null ? 'flat' :
    change > 0.5 ? 'rising' :
    change < -0.5 ? 'falling' : 'flat'
  return {
    value:     bps,
    prior:     pbps,
    change,
    changePct: null,
    unit:      'bps',
    formatted: formatSpreadBpsFromFredPercent(curr.value),
    trend,
    meta,
  }
}

export async function buildLiquidityModule(): Promise<LiquidityModule> {
  const series = await fetchMultiple([
    FRED_SERIES.SOFR,
    FRED_SERIES.RESERVE_BALANCES,
    FRED_SERIES.ONRRP,
    FRED_SERIES.NFCI,
    FRED_SERIES.ANFCI,
    FRED_SERIES.HY_SPREAD,
    FRED_SERIES.IG_SPREAD,
    FRED_SERIES.VIX,
    FRED_SERIES.RECESSION_PROB,
  ], 12)

  const [sofrC, sofrP]   = latestTwo(series[FRED_SERIES.SOFR] ?? [])
  const [resC,  resP]    = latestTwo(series[FRED_SERIES.RESERVE_BALANCES] ?? [])
  const [rrpC,  rrpP]    = latestTwo(series[FRED_SERIES.ONRRP] ?? [])
  const [nfciC, nfciP]   = latestTwo(series[FRED_SERIES.NFCI] ?? [])
  const [anfciC, anfciP] = latestTwo(series[FRED_SERIES.ANFCI] ?? [])
  const [hyC,   hyP]     = latestTwo(series[FRED_SERIES.HY_SPREAD] ?? [])
  const [igC,   igP]     = latestTwo(series[FRED_SERIES.IG_SPREAD] ?? [])
  const [vixC,  vixP]    = latestTwo(series[FRED_SERIES.VIX] ?? [])
  const [recC]           = latestTwo(series[FRED_SERIES.RECESSION_PROB] ?? [])

  // ---- Reserve balances: FRED millions USD → trillions ----
  const reservesTVal  = resC  ? fredMillionsToTrillions(resC.value)  : null
  const reservesPVal  = resP  ? fredMillionsToTrillions(resP.value)  : null
  const rrpTVal       = rrpC  ? fredBillionsToTrillions(rrpC.value) : null
  const rrpPTVal      = rrpP  ? fredBillionsToTrillions(rrpP.value) : null

  const reserveBalances = metric(
    reservesTVal !== null ? { value: reservesTVal, date: resC!.date } : null,
    reservesPVal !== null ? { value: reservesPVal, date: resP!.date } : null,
    '$T', v => `$${v.toFixed(2)}T`,
    // Percentile: above $3T = comfortable (score ~40), above $3.5T = ample (score ~20)
    reservesTVal !== null ? Math.max(10, Math.min(90, 80 - reservesTVal * 15)) : undefined,
  )

  const onRrpUsage = metric(
    rrpTVal !== null ? { value: rrpTVal, date: rrpC!.date } : null,
    rrpPTVal !== null ? { value: rrpPTVal, date: rrpP!.date } : null,
    '$T', v => `$${v.toFixed(2)}T`,
  )

  // ---- SOFR ----
  const sofr = metric(sofrC, sofrP, '%', v => `${v.toFixed(2)}%`)

  // ---- NFCI vs ANFCI (both Chicago Fed; legacy field names retained for API stability) ----
  const fciChicago = metric(
    nfciC, nfciP, 'index', v => v.toFixed(3),
    undefined,
    {
      sourceName: 'Chicago Fed — NFCI',
      caveat:     'National Financial Conditions Index (Chicago Fed). Lower = looser conditions.',
    },
  )
  const fciNyfed = metric(
    anfciC, anfciP, 'index', v => v.toFixed(3),
    undefined,
    {
      sourceName: 'Chicago Fed — ANFCI',
      caveat:     'Adjusted NFCI removes business cycle effects; not an NY Fed series.',
    },
  )

  const hySpread = creditSpreadMetric(hyC, hyP, { sourceName: 'FRED — ICE BofA US HY OAS' })
  const igSpread = creditSpreadMetric(igC, igP, { sourceName: 'FRED — ICE BofA US Corporate OAS' })

  // ---- VIX ----
  const vix = metric(vixC, vixP, 'index', v => v.toFixed(1))

  // ---- Recession probability ----
  const recessionProb = metric(recC, null, '%', v => `${v.toFixed(0)}%`)

  // ---- Infer credit stress from HY spread ----
  const hyBps = hyC ? spreadPercentToBps(hyC.value) : null
  const creditStress: LiquidityModule['creditStress'] =
    hyBps == null ? 'moderate' :
    hyBps < 300 ? 'low' :
    hyBps < 400 ? 'moderate' :
    hyBps < 600 ? 'elevated' : 'high'

  // ---- Vol stress from VIX ----
  const vixVal = vixC?.value ?? 15
  const volStress: LiquidityModule['volStress'] =
    vixVal < 15 ? 'low' :
    vixVal < 20 ? 'moderate' :
    vixVal < 30 ? 'elevated' : 'high'

  // ---- QT trend from reserves ----
  const resSeries = toTimeSeries(series[FRED_SERIES.RESERVE_BALANCES] ?? [], true)
  let qtTrend: TrendDirection = 'flat'
  if (resSeries.length >= 8) {
    const recent = resSeries.slice(-8)
    const change = recent[recent.length - 1]!.value - recent[0]!.value
    // Values are millions USD; ~50bn swing ≈ 50_000
    qtTrend = change < -50_000 ? 'falling' : change > 50_000 ? 'rising' : 'flat'
  }

  // ---- Overall liquidity stance ----
  const nfciVal = nfciC?.value ?? 0
  const liquidityStance: LiquidityModule['liquidityStance'] =
    nfciVal < -0.5 ? 'supportive' :
    nfciVal >  0.5 ? 'restrictive' : 'neutral'

  const liquidityTrend: LiquidityModule['trend'] =
    nfciC && nfciP ?
      nfciC.value < nfciP.value ? 'easing' :
      nfciC.value > nfciP.value ? 'tightening' : 'stable'
    : 'stable'

  // ---- Vulnerability score (0–100) ----
  // Higher = more vulnerable
  let vuln = 30  // baseline
  if (creditStress === 'elevated') vuln += 15
  if (creditStress === 'high')     vuln += 30
  if (volStress    === 'elevated') vuln += 10
  if (volStress    === 'high')     vuln += 25
  if (nfciVal > 0.5)               vuln += 15
  if (reservesTVal !== null && reservesTVal < 2.8) vuln += 20
  vuln = Math.min(95, Math.max(5, vuln))

  const now = new Date().toISOString()

  return {
    sofr,
    reserveBalances,
    onRrpUsage,
    qtTrend,
    fciNyfed,
    fciChicago,
    recessionProb,
    hySpread,
    igSpread,
    vix,
    creditStress,
    volStress,
    liquidityStance,
    trend: liquidityTrend,
    vulnerabilityScore: vuln,
    meta: makeMeta({ ...SOURCES.FRED }, now),
  }
}
