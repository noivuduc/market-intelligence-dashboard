// ============================================================
// MACRO FEATURE AGGREGATOR
// Fetches FRED actuals + combines with static consensus calendar.
// ============================================================

import {
  fetchMultiple,
  latest,
  latestTwo,
  toTimeSeries,
  parseValue,
  FRED_SERIES,
} from '@/lib/sources/fred'
import { makeMeta, SOURCES } from '@/lib/sources/types'
import { getNextMacroCatalyst, MACRO_RELEASES } from '@/lib/data/macro-calendar'
import type { MacroModule, MacroRelease } from '@/lib/types'

/** YoY % for CPI-style index at a specific ascending-series index (0-based) */
function cpiYoYAtIndex(series: { date: string; value: number }[], idx: number): number | null {
  if (idx < 12 || idx >= series.length) return null
  const curr = series[idx]!
  const yago = series[idx - 12]!
  if (yago.value === 0) return null
  return ((curr.value - yago.value) / yago.value) * 100
}

function referenceLabelFromFREDMonth(isoDate: string): string {
  if (!isoDate) return ''
  const [y, m] = isoDate.split('-').map(Number)
  if (!y || !m) return isoDate
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function quarterLabelFromIso(isoDate: string): string {
  if (!isoDate) return ''
  const [y, m] = isoDate.split('-').map(Number)
  if (!y || !m) return isoDate
  const q = Math.floor((m - 1) / 3) + 1
  return `Q${q} ${y}`
}

// ---- Compute MoM % change ----
function computeMoM(series: { date: string; value: number }[]): { date: string; mom: number } | null {
  if (series.length < 2) return null
  const curr = series[series.length - 1]!
  const prev = series[series.length - 2]!
  if (!prev || prev.value === 0) return null
  return { date: curr.date, mom: ((curr.value - prev.value) / prev.value) * 100 }
}

export async function buildMacroModule(): Promise<MacroModule> {
  const series = await fetchMultiple([
    FRED_SERIES.CPI,
    FRED_SERIES.CORE_CPI,
    FRED_SERIES.PCE,
    FRED_SERIES.CORE_PCE,
    FRED_SERIES.PAYROLLS,
    FRED_SERIES.UNEMPLOYMENT,
    FRED_SERIES.CLAIMS_INIT,
    FRED_SERIES.GDP_PCT_QOQ_SAAR,
    FRED_SERIES.RETAIL_SALES,
    FRED_SERIES.HOUSING_STARTS,
  ], 40)

  function ts(id: string) { return toTimeSeries(series[id] ?? [], true) }
  function two(id: string) { return latestTwo(series[id] ?? []) }

  // ---- CPI (YoY) — headline vs prior **month** YoY, not core vs headline ----
  const cpiSeries = ts(FRED_SERIES.CPI)
  const cpiIdx = cpiSeries.length - 1
  const cpiYoYLatest = cpiIdx >= 12 ? cpiYoYAtIndex(cpiSeries, cpiIdx) : null
  const cpiYoYPrior  = cpiIdx >= 13 ? cpiYoYAtIndex(cpiSeries, cpiIdx - 1) : null
  const cpiAsOfDate  = cpiIdx >= 0 ? cpiSeries[cpiIdx]!.date : ''

  // ---- PCE (MoM) ----
  const pceSeries     = ts(FRED_SERIES.CORE_PCE)
  const pceMoM        = computeMoM(pceSeries)

  // ---- Payrolls (MoM level change, thousands) ----
  const [payC, payP]  = two(FRED_SERIES.PAYROLLS)
  const payrollsMoM   = payC && payP ? payC.value - payP.value : null

  // ---- Unemployment ----
  const [unC, unP]    = two(FRED_SERIES.UNEMPLOYMENT)

  // ---- Initial Claims ----
  const [claimsC, claimsP] = two(FRED_SERIES.CLAIMS_INIT)

  // ---- GDP (official QoQ SAAR % series) ----
  const [gdpC, gdpP] = two(FRED_SERIES.GDP_PCT_QOQ_SAAR)

  // ---- Retail Sales (MoM) ----
  const retSeries     = ts(FRED_SERIES.RETAIL_SALES)
  const retMoM        = computeMoM(retSeries)

  // ---- Combine with consensus from calendar ----

  function findConsensus(seriesMatch: string): {
    consensus: number | null
    releaseDate: string
    period: string
  } {
    const recent = MACRO_RELEASES
      .filter(r => r.fredSeriesId === seriesMatch)
      .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))[0]
    return {
      consensus:   recent?.consensus ?? null,
      releaseDate: recent?.releaseDate ?? '',
      period:      recent?.period ?? '',
    }
  }

  function buildRelease(
    name:          string,
    actual:        number | null,
    dataAsOfDate:  string,
    period:        string,
    consensus:     number | null,
    prior:         number | null,
    unit:          string,
    releaseDate?:  string,
  ): MacroRelease {
    const surprise = actual !== null && consensus !== null ? actual - consensus : null
    return {
      name,
      actual,
      expected: consensus,
      prior,
      surprise,
      date: dataAsOfDate,
      period,
      releaseDate: releaseDate || undefined,
    }
  }

  const cpiConsensus   = findConsensus(FRED_SERIES.CPI)
  const payrollsCons   = findConsensus(FRED_SERIES.PAYROLLS)
  const pceConsensus   = findConsensus(FRED_SERIES.CORE_PCE)
  const gdpConsensus   = findConsensus(FRED_SERIES.GDP_PCT_QOQ_SAAR)

  const cpiPeriodLabel = referenceLabelFromFREDMonth(cpiAsOfDate)

  // ---- Macro releases ----
  const cpi          = buildRelease(
    'CPI YoY',
    cpiYoYLatest,
    cpiAsOfDate,
    cpiPeriodLabel || 'Latest',
    cpiConsensus.consensus,
    cpiYoYPrior,
    '%',
    cpiConsensus.releaseDate || undefined,
  )
  const pce          = buildRelease(
    'Core PCE MoM',
    pceMoM?.mom ?? null,
    pceMoM?.date ?? '',
    referenceLabelFromFREDMonth(pceMoM?.date ?? ''),
    pceConsensus.consensus,
    null,
    '%',
    pceConsensus.releaseDate || undefined,
  )
  const payrolls     = buildRelease(
    'Nonfarm Payrolls',
    payrollsMoM,
    payC?.date ?? '',
    referenceLabelFromFREDMonth(payC?.date ?? ''),
    payrollsCons.consensus,
    payP?.value ?? null,
    'K',
    payrollsCons.releaseDate || undefined,
  )
  const unemployment = buildRelease(
    'Unemployment Rate',
    unC?.value ?? null,
    unC?.date ?? '',
    referenceLabelFromFREDMonth(unC?.date ?? ''),
    null,
    unP?.value ?? null,
    '%',
  )
  const joblessClaims = buildRelease(
    'Initial Claims',
    claimsC?.value ?? null,
    claimsC?.date ?? '',
    `Wk of ${claimsC?.date ?? ''}`,
    null,
    claimsP?.value ?? null,
    'K',
  )
  const retailSales  = buildRelease(
    'Retail Sales ex-Auto MoM',
    retMoM?.mom ?? null,
    retMoM?.date ?? '',
    referenceLabelFromFREDMonth(retMoM?.date ?? ''),
    null,
    null,
    '%',
  )
  const gdp          = buildRelease(
    'GDP QoQ SAAR',
    gdpC?.value ?? null,
    gdpC?.date ?? '',
    quarterLabelFromIso(gdpC?.date ?? ''),
    gdpConsensus.consensus,
    gdpP?.value ?? null,
    '%',
    gdpConsensus.releaseDate || undefined,
  )
  const ismMfg       = buildRelease('ISM Mfg PMI',        null, '', 'Latest', 50.0, null, 'index')  // Not on FRED
  const ismSvc       = buildRelease('ISM Svc PMI',        null, '', 'Latest', 51.0, null, 'index')

  // ---- Derive regime labels ----

  // Growth: GDP + payrolls trend
  const gdpTrend = gdpC?.value ?? 2.0
  const growthTrend: MacroModule['growthTrend'] =
    gdpTrend > 2.5 ? 'accelerating' :
    gdpTrend > 1.0 ? 'stable' :
    gdpTrend > 0   ? 'decelerating' : 'contraction'

  // Inflation: CPI YoY trend
  const cpiVal = cpiYoYLatest ?? 3.0
  const inflationTrend: MacroModule['inflationTrend'] =
    cpiVal > 4.0 ? 'rising' :
    cpiVal > 3.0 ? 'sticky' :
    cpiVal > 2.0 ? 'falling' : 'stable'

  // Labor: unemployment + claims
  const unRate = unC?.value ?? 4.0
  const laborTrend: MacroModule['laborTrend'] =
    unRate < 3.8 ? 'strong' :
    unRate < 4.5 ? 'softening' : 'weak'

  // Surprise regime: compare actuals to consensus
  const surprises = [cpi, pce, payrolls].filter(r => r.surprise !== null)
  const avgSurprise = surprises.length
    ? surprises.reduce((s, r) => s + (r.surprise ?? 0), 0) / surprises.length
    : 0
  const surpriseRegime: MacroModule['surpriseRegime'] =
    avgSurprise > 0.1  ? 'positive' :
    avgSurprise < -0.1 ? 'negative' : 'neutral'

  const nextCatalyst = getNextMacroCatalyst()

  const now = new Date().toISOString()

  return {
    cpi, pce, payrolls, unemployment, joblessClaims,
    retailSales, gdp, ismMfg, ismSvc,
    growthTrend, inflationTrend, laborTrend,
    surpriseRegime, nextCatalyst,
    meta: makeMeta({
      ...SOURCES.FRED,
      caveat: 'Macro prints use FRED observation dates as data as-of. Static consensus rows in macro-calendar.ts must be updated before each release; otherwise surprise vs est. may be stale.',
    }, now),
  }
}
