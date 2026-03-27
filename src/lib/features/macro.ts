// ============================================================
// MACRO FEATURE AGGREGATOR
// Fetches FRED actuals + combines with static consensus calendar.
// ============================================================

import {
  fetchMultiple,
  latestTwo,
  toTimeSeries,
  FRED_SERIES,
} from '@/lib/sources/fred'
import { makeMeta, SOURCES } from '@/lib/sources/types'
import { getNextMacroCatalyst, MACRO_RELEASES } from '@/lib/data/macro-calendar'
import { MACRO } from '@/lib/config/thresholds'
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

// ---- Stale-consensus guard ----
// Returns null if the most recent consensus entry for this series is older than CONSENSUS_STALE_DAYS.
function findConsensus(seriesMatch: string): {
  consensus: number | null
  releaseDate: string
  period: string
} {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - MACRO.CONSENSUS_STALE_DAYS)
  const cutoff = cutoffDate.toISOString().split('T')[0]!

  const recent = MACRO_RELEASES
    .filter(r => r.fredSeriesId === seriesMatch && r.releaseDate >= cutoff)
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

// ---- Z-score surprise normalization ----
// Historical reference std deviations (approximate, based on 2015-2024 data):
//   CPI YoY: ±0.25pp typical surprise
//   Core PCE MoM: ±0.08pp typical surprise
//   NFP: ±80K (in thousands = ±80)
const SURPRISE_STD: Record<string, number> = {
  CPI_YOY:      0.25,
  CORE_PCE_MOM: 0.08,
  PAYROLLS:     80,
}

interface NormalizableSurprise {
  seriesKey: string
  surprise:  number | null
}

function computeSurpriseRegime(surprises: NormalizableSurprise[]): MacroModule['surpriseRegime'] {
  const zScores: number[] = []
  for (const s of surprises) {
    if (s.surprise === null) continue
    const std = SURPRISE_STD[s.seriesKey]
    if (!std || std === 0) continue
    zScores.push(s.surprise / std)
  }
  if (zScores.length === 0) return 'neutral'
  const avgZ = zScores.reduce((a, b) => a + b, 0) / zScores.length
  if (avgZ > MACRO.SURPRISE_POSITIVE)  return 'positive'
  if (avgZ < MACRO.SURPRISE_NEGATIVE)  return 'negative'
  return 'neutral'
}

export async function buildMacroModule(): Promise<MacroModule> {
  // Note: MANEMP removed — ISM PMI is not on FRED (MANEMP = manufacturing employment, not PMI)
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

  // ---- CPI (YoY) ----
  const cpiSeries = ts(FRED_SERIES.CPI)
  const cpiIdx = cpiSeries.length - 1
  const cpiYoYLatest = cpiIdx >= 12 ? cpiYoYAtIndex(cpiSeries, cpiIdx) : null
  const cpiYoYPrior  = cpiIdx >= 13 ? cpiYoYAtIndex(cpiSeries, cpiIdx - 1) : null
  const cpiAsOfDate  = cpiIdx >= 0 ? cpiSeries[cpiIdx]!.date : ''

  // ---- Core PCE (MoM) ----
  const pceSeries = ts(FRED_SERIES.CORE_PCE)
  const pceMoM    = computeMoM(pceSeries)

  // ---- Payrolls (MoM level change, thousands) ----
  // PAYEMS is a level series in thousands; diff = monthly job gain/loss (thousands)
  // prior = previous month's MoM delta, NOT the absolute level
  const [payC, payP, payPP] = (() => {
    const all = ts(FRED_SERIES.PAYROLLS)
    const n = all.length
    return [
      n > 0 ? all[n - 1]! : null,
      n > 1 ? all[n - 2]! : null,
      n > 2 ? all[n - 3]! : null,
    ]
  })()
  const payrollsMoM       = payC && payP ? payC.value - payP.value : null
  const payrollsPriorMoM  = payP && payPP ? payP.value - payPP.value : null

  // ---- Unemployment ----
  const [unC, unP] = two(FRED_SERIES.UNEMPLOYMENT)

  // ---- Initial Claims ----
  const [claimsC, claimsP] = two(FRED_SERIES.CLAIMS_INIT)

  // ---- GDP (official QoQ SAAR % series) ----
  const [gdpC, gdpP] = two(FRED_SERIES.GDP_PCT_QOQ_SAAR)

  // ---- Retail Sales (MoM) ----
  const retSeries = ts(FRED_SERIES.RETAIL_SALES)
  const retMoM    = computeMoM(retSeries)

  // ---- Consensus (with stale-guard — returns null if entry > 90 days old) ----
  const cpiConsensus    = findConsensus(FRED_SERIES.CPI)
  const payrollsCons    = findConsensus(FRED_SERIES.PAYROLLS)
  const pceConsensus    = findConsensus(FRED_SERIES.CORE_PCE)
  const gdpConsensus    = findConsensus(FRED_SERIES.GDP_PCT_QOQ_SAAR)

  const cpiPeriodLabel = referenceLabelFromFREDMonth(cpiAsOfDate)

  // ---- Build releases ----
  const cpi = buildRelease(
    'CPI YoY',
    cpiYoYLatest,
    cpiAsOfDate,
    cpiPeriodLabel || 'Latest',
    cpiConsensus.consensus,
    cpiYoYPrior,
    '%',
    cpiConsensus.releaseDate || undefined,
  )
  const pce = buildRelease(
    'Core PCE MoM',
    pceMoM?.mom ?? null,
    pceMoM?.date ?? '',
    referenceLabelFromFREDMonth(pceMoM?.date ?? ''),
    pceConsensus.consensus,
    null,
    '%',
    pceConsensus.releaseDate || undefined,
  )
  const payrolls = buildRelease(
    'Nonfarm Payrolls',
    payrollsMoM,
    payC?.date ?? '',
    referenceLabelFromFREDMonth(payC?.date ?? ''),
    payrollsCons.consensus,
    // prior = previous MoM delta (also in thousands), not absolute level
    payrollsPriorMoM,
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
  const retailSales = buildRelease(
    'Retail Sales ex-Auto MoM',
    retMoM?.mom ?? null,
    retMoM?.date ?? '',
    referenceLabelFromFREDMonth(retMoM?.date ?? ''),
    null,
    null,
    '%',
  )
  const gdp = buildRelease(
    'GDP QoQ SAAR',
    gdpC?.value ?? null,
    gdpC?.date ?? '',
    quarterLabelFromIso(gdpC?.date ?? ''),
    gdpConsensus.consensus,
    gdpP?.value ?? null,
    '%',
    gdpConsensus.releaseDate || undefined,
  )

  // ISM PMI: not available on FRED. Explicitly marked as unavailable.
  // Do NOT show hardcoded 50/51 as fake consensus — that misleads users.
  const ismMfg = buildRelease('ISM Mfg PMI', null, '', 'Unavailable', null, null, 'index')
  const ismSvc = buildRelease('ISM Svc PMI', null, '', 'Unavailable', null, null, 'index')

  // ---- Regime derivation ----
  const gdpTrend = gdpC?.value ?? 2.0
  const growthTrend: MacroModule['growthTrend'] =
    gdpTrend > MACRO.GDP_ACCELERATING ? 'accelerating' :
    gdpTrend > MACRO.GDP_STABLE       ? 'stable' :
    gdpTrend > 0                      ? 'decelerating' : 'contraction'

  const cpiVal = cpiYoYLatest ?? 3.0
  const inflationTrend: MacroModule['inflationTrend'] =
    cpiVal > MACRO.CPI_RISING  ? 'rising' :
    cpiVal > MACRO.CPI_STICKY  ? 'sticky' :
    cpiVal > MACRO.CPI_FALLING ? 'falling' : 'stable'

  const unRate = unC?.value ?? 4.0
  const laborTrend: MacroModule['laborTrend'] =
    unRate < MACRO.UNEMP_STRONG    ? 'strong' :
    unRate < MACRO.UNEMP_SOFTENING ? 'softening' : 'weak'

  // ---- Surprise regime using z-score normalization to avoid unit-mixing ----
  const surpriseRegime = computeSurpriseRegime([
    { seriesKey: 'CPI_YOY',      surprise: cpi.surprise },
    { seriesKey: 'CORE_PCE_MOM', surprise: pce.surprise },
    { seriesKey: 'PAYROLLS',     surprise: payrolls.surprise },
  ])

  const nextCatalyst = getNextMacroCatalyst()

  const now = new Date().toISOString()

  return {
    cpi, pce, payrolls, unemployment, joblessClaims,
    retailSales, gdp, ismMfg, ismSvc,
    growthTrend, inflationTrend, laborTrend,
    surpriseRegime, nextCatalyst,
    meta: makeMeta({
      ...SOURCES.FRED,
      caveat: 'Macro prints use FRED observation dates as data as-of. Consensus entries older than 90 days are discarded. ISM PMI not available on FRED — marked unavailable.',
    }, now),
  }
}
