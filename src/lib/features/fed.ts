// ============================================================
// FED FEATURE AGGREGATOR
// Transforms raw FRED observations into FedPolicyModule state.
// Runs server-side in the /api/sources/fred route.
// ============================================================

import {
  fetchMultiple,
  latest,
  latestTwo,
  toTimeSeries,
  FRED_SERIES,
} from '@/lib/sources/fred'
import { makeMeta, SOURCES } from '@/lib/sources/types'
import { getNextFOMC, getLastFOMC, daysToNextFOMC, fomcCoverageCaveat } from '@/lib/data/fomc-calendar'
import { fredBillionsToTrillions, fredMillionsToTrillions } from '@/lib/format/money'
import type { FedPolicyModule, MetricValue, TrendDirection } from '@/lib/types'

// ---- Build MetricValue from FRED observations ----

function buildMetric(
  curr:      { value: number; date: string } | null,
  prev:      { value: number; date: string } | null,
  unit:      string,
  formatter: (v: number) => string,
  percentile?: number,
): MetricValue {
  const meta = makeMeta(
    { ...SOURCES.FRED, caveat: undefined },
    curr?.date,
  )
  if (!curr) {
    return {
      value: null, prior: null, change: null, changePct: null,
      unit, formatted: '—', trend: 'flat', meta,
    }
  }
  const change    = prev ? curr.value - prev.value : null
  const changePct = (prev && prev.value !== 0)
    ? ((curr.value - prev.value) / Math.abs(prev.value)) * 100
    : null
  const trend: TrendDirection = change == null
    ? 'flat'
    : change > 0.0001  ? 'rising'
    : change < -0.0001 ? 'falling'
    : 'flat'

  return {
    value:     curr.value,
    prior:     prev?.value ?? null,
    change,
    changePct,
    unit,
    formatted: formatter(curr.value),
    percentile,
    trend,
    meta,
  }
}

// ---- Main aggregator ----

export async function buildFedModule(): Promise<FedPolicyModule> {
  const series = await fetchMultiple([
    FRED_SERIES.FED_FUNDS_UPPER,
    FRED_SERIES.FED_FUNDS_LOWER,
    FRED_SERIES.IORB,
    FRED_SERIES.ONRRP,
    FRED_SERIES.BALANCE_SHEET,
    FRED_SERIES.RESERVE_BALANCES,
  ], 10)

  // ---- Target range ----
  const upper = latest(series[FRED_SERIES.FED_FUNDS_UPPER] ?? [])
  const lower = latest(series[FRED_SERIES.FED_FUNDS_LOWER] ?? [])

  // ---- IORB ----
  const [iorbCurr, iorbPrev] = latestTwo(series[FRED_SERIES.IORB] ?? [])
  const iorb = buildMetric(iorbCurr, iorbPrev, '%', v => `${v.toFixed(2)}%`)

  // ---- ON RRP ----
  const [rrpCurr, rrpPrev] = latestTwo(series[FRED_SERIES.ONRRP] ?? [])
  // FRED RRPONTSYD is in $B
  const onRrp = buildMetric(
    rrpCurr ? { value: fredBillionsToTrillions(rrpCurr.value), date: rrpCurr.date } : null,
    rrpPrev ? { value: fredBillionsToTrillions(rrpPrev.value), date: rrpPrev.date } : null,
    '$T',
    v => `$${v.toFixed(2)}T`,
  )

  // ---- Balance sheet (WALCL is in $M, convert to $T) ----
  const [bsCurr, bsPrev] = latestTwo(series[FRED_SERIES.BALANCE_SHEET] ?? [])
  const balanceSheet = buildMetric(
    bsCurr ? { value: bsCurr.value / 1_000_000, date: bsCurr.date } : null,
    bsPrev ? { value: bsPrev.value / 1_000_000, date: bsPrev.date } : null,
    '$T',
    v => `$${v.toFixed(2)}T`,
  )

  // ---- Reserve balances (WRESBAL: millions USD → trillions) ----
  const [resCurr, resPrev] = latestTwo(series[FRED_SERIES.RESERVE_BALANCES] ?? [])
  const reserveBalances = buildMetric(
    resCurr ? { value: fredMillionsToTrillions(resCurr.value), date: resCurr.date } : null,
    resPrev ? { value: fredMillionsToTrillions(resPrev.value), date: resPrev.date } : null,
    '$T',
    v => `$${v.toFixed(2)}T`,
  )

  // ---- Derive QT monthly cap from balance sheet trend ----
  // QT cap is policy-set; we compute actual monthly runoff from balance sheet
  const bsSeries = toTimeSeries(series[FRED_SERIES.BALANCE_SHEET] ?? [], true)
  let qtMonthlyActual: number | null = null
  if (bsSeries.length >= 5) {
    // Last 4 weekly observations ~ 1 month
    const recent = bsSeries.slice(-5)
    const diff   = recent[recent.length - 1]!.value - recent[0]!.value
    qtMonthlyActual = diff / 1_000_000  // convert $M → $T monthly change
  }
  const qtMonthly = buildMetric(
    qtMonthlyActual !== null ? { value: qtMonthlyActual, date: bsCurr?.date ?? '' } : null,
    null,
    '$T/mo',
    v => `${v >= 0 ? '+' : ''}$${Math.abs(v).toFixed(2)}T/mo`,
  )

  // ---- Discount rate (not on FRED separately — use upper target + 50bps) ----
  const discountRateVal = upper ? upper.value + 0.50 : null
  const discountRate = buildMetric(
    discountRateVal !== null ? { value: discountRateVal, date: upper?.date ?? '' } : null,
    null,
    '%',
    v => `${v.toFixed(2)}%`,
  )

  // ---- FOMC calendar ----
  const nextFomc = getNextFOMC()
  const lastFomc = getLastFOMC()

  // ---- Infer policy stance ----
  // Simple heuristic: if upper target has been declining, easing drift; if stable, on-hold
  const upperSeries = toTimeSeries(series[FRED_SERIES.FED_FUNDS_UPPER] ?? [], true)
  let policyStance: FedPolicyModule['policyStance'] = 'on-hold'
  if (upperSeries.length >= 3) {
    const vals = upperSeries.slice(-3).map(p => p.value)
    const trend = vals[vals.length - 1]! - vals[0]!
    if (trend < -0.10) policyStance = 'easing'
    else if (trend > 0.10) policyStance = 'tightening'
    else policyStance = 'on-hold'
  }

  const liquidityImplication: FedPolicyModule['liquidityImplication'] =
    policyStance === 'easing'     ? 'supportive' :
    policyStance === 'tightening' ? 'restrictive' :
    'neutral'

  // ---- Market-implied path (placeholder — requires OIS/Fed Funds futures data) ----
  // This would require a premium source (Bloomberg, CME FedWatch).
  // We include the structure but mark as unavailable.
  const marketImpliedPath: FedPolicyModule['marketImpliedPath'] = []

  const now = new Date().toISOString()
  const fomcNote = fomcCoverageCaveat()
  return {
    fedFundsTarget: {
      lower: lower?.value ?? 0,
      upper: upper?.value ?? 0,
    },
    iorb,
    onRrp,
    discountRate,
    balanceSheet,
    qtMonthly,
    nextFomcDate:   nextFomc?.statementDate ?? '',
    daysToFomc:     daysToNextFOMC() ?? null,
    lastFomcDate:   lastFomc?.statementDate ?? '',
    marketImpliedPath,
    policyStance,
    liquidityImplication,
    trendDrift: policyStance === 'easing' ? 'easing' : policyStance === 'tightening' ? 'tightening' : 'stable',
    meta: makeMeta({
      ...SOURCES.FRED,
      ...(fomcNote ? { caveat: fomcNote } : {}),
    }, now),
  }
}
