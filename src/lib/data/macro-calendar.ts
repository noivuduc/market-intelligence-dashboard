// ============================================================
// MACRO ECONOMIC RELEASE CALENDAR
// Consensus estimates and release dates.
//
// Source: Consensus estimates sourced from Briefing.com / Bloomberg
// at time of file update. Update manually before each release.
//
// IMPORTANT: Actual values are fetched live from FRED.
// Consensus values here are STATIC and require manual updates.
// They are clearly labeled as such in the UI.
// ============================================================

import type { MacroModule } from '@/lib/types'

export type ReleaseImportance = 'high' | 'medium' | 'low'
export type MacroSeries =
  | 'CPI_YOY'
  | 'CPI_MOM'
  | 'CORE_CPI_YOY'
  | 'CORE_CPI_MOM'
  | 'CORE_PCE_MOM'
  | 'CORE_PCE_YOY'
  | 'PAYROLLS'
  | 'UNEMPLOYMENT'
  | 'INIT_CLAIMS'
  | 'GDP_QOQ'
  | 'RETAIL_SALES_MOM'
  | 'ISM_MFG'
  | 'ISM_SVC'
  | 'HOUSING_STARTS'

export interface MacroReleaseMeta {
  series:       MacroSeries
  name:         string
  shortName:    string
  period:       string           // e.g. "May 2024"
  releaseDate:  string           // ISO date of release
  fredSeriesId: string           // FRED series to fetch actual from
  consensus:    number | null    // manually updated estimate
  consensusAsOf:string           // ISO date when consensus was last updated
  unit:         string
  importance:   ReleaseImportance
  notes?:       string
}

// ============================================================
// RECENT RELEASES — update this after each release
// Sorted by releaseDate descending (most recent first)
// ============================================================

export const MACRO_RELEASES: MacroReleaseMeta[] = [
  // ---- CPI ----
  {
    series: 'CPI_YOY', name: 'CPI YoY', shortName: 'CPI',
    period: 'May 2024', releaseDate: '2024-06-12', fredSeriesId: 'CPIAUCSL',
    consensus: 3.3, consensusAsOf: '2024-06-10', unit: '%', importance: 'high',
    notes: 'Year-over-year. Consensus from Bloomberg/Briefing.com.',
  },
  {
    series: 'CORE_CPI_MOM', name: 'Core CPI MoM', shortName: 'Core CPI',
    period: 'May 2024', releaseDate: '2024-06-12', fredSeriesId: 'CPILFESL',
    consensus: 0.3, consensusAsOf: '2024-06-10', unit: '%', importance: 'high',
  },
  {
    series: 'CPI_YOY', name: 'CPI YoY', shortName: 'CPI',
    period: 'Apr 2024', releaseDate: '2024-05-15', fredSeriesId: 'CPIAUCSL',
    consensus: 3.4, consensusAsOf: '2024-05-13', unit: '%', importance: 'high',
  },

  // ---- PCE ----
  {
    series: 'CORE_PCE_MOM', name: 'Core PCE MoM', shortName: 'Core PCE',
    period: 'Apr 2024', releaseDate: '2024-05-31', fredSeriesId: 'PCEPILFE',
    consensus: 0.3, consensusAsOf: '2024-05-29', unit: '%', importance: 'high',
    notes: 'Fed\'s preferred inflation gauge.',
  },

  // ---- Payrolls ----
  {
    series: 'PAYROLLS', name: 'Nonfarm Payrolls', shortName: 'NFP',
    period: 'May 2024', releaseDate: '2024-06-07', fredSeriesId: 'PAYEMS',
    // PAYEMS is in thousands; MoM delta is ~180 (thousands = 180K jobs), NOT 180_000
    consensus: 180, consensusAsOf: '2024-06-05', unit: 'K', importance: 'high',
  },
  {
    series: 'PAYROLLS', name: 'Nonfarm Payrolls', shortName: 'NFP',
    period: 'Apr 2024', releaseDate: '2024-05-03', fredSeriesId: 'PAYEMS',
    consensus: 243, consensusAsOf: '2024-05-01', unit: 'K', importance: 'high',
  },
  {
    series: 'UNEMPLOYMENT', name: 'Unemployment Rate', shortName: 'UNEMP',
    period: 'May 2024', releaseDate: '2024-06-07', fredSeriesId: 'UNRATE',
    consensus: 3.9, consensusAsOf: '2024-06-05', unit: '%', importance: 'high',
  },

  // ---- Claims ----
  {
    series: 'INIT_CLAIMS', name: 'Initial Jobless Claims', shortName: 'Claims',
    period: 'Wk Jun 1', releaseDate: '2024-06-06', fredSeriesId: 'ICSA',
    consensus: 215_000, consensusAsOf: '2024-06-04', unit: 'K', importance: 'medium',
  },

  // ---- GDP ----
  {
    series: 'GDP_QOQ', name: 'GDP QoQ SAAR', shortName: 'GDP',
    period: 'Q1 2024 (2nd)', releaseDate: '2024-05-30', fredSeriesId: 'GDPC1',
    consensus: 2.4, consensusAsOf: '2024-05-28', unit: '%', importance: 'high',
  },

  // ---- Retail Sales ----
  {
    series: 'RETAIL_SALES_MOM', name: 'Retail Sales ex-Auto MoM', shortName: 'Retail',
    period: 'Apr 2024', releaseDate: '2024-05-15', fredSeriesId: 'RSXFS',
    consensus: 0.2, consensusAsOf: '2024-05-13', unit: '%', importance: 'medium',
  },

  // ---- ISM ----
  {
    series: 'ISM_MFG', name: 'ISM Manufacturing PMI', shortName: 'ISM Mfg',
    period: 'May 2024', releaseDate: '2024-06-03', fredSeriesId: 'MANEMP',
    consensus: 50.0, consensusAsOf: '2024-06-01', unit: 'index', importance: 'medium',
    notes: 'ISM PMI not on FRED. Actual value manually maintained.',
  },
  {
    series: 'ISM_SVC', name: 'ISM Services PMI', shortName: 'ISM Svc',
    period: 'May 2024', releaseDate: '2024-06-05', fredSeriesId: 'MANEMP',
    consensus: 51.0, consensusAsOf: '2024-06-03', unit: 'index', importance: 'medium',
    notes: 'ISM PMI not on FRED. Actual value manually maintained.',
  },

  // ---- Forward schedule (approximate; update consensus before each print) ----
  {
    series: 'PAYROLLS', name: 'Nonfarm Payrolls', shortName: 'NFP',
    period: 'Mar 2026', releaseDate: '2026-04-03', fredSeriesId: 'PAYEMS',
    consensus: null, consensusAsOf: '2026-03-24', unit: 'K', importance: 'high',
    notes: 'BLS Employment Situation — verify exact date on bls.gov/schedule.',
  },
  {
    series: 'CPI_YOY', name: 'CPI YoY', shortName: 'CPI',
    period: 'Mar 2026', releaseDate: '2026-04-11', fredSeriesId: 'CPIAUCSL',
    consensus: null, consensusAsOf: '2026-03-24', unit: '%', importance: 'high',
    notes: 'BLS CPI — verify exact date on release calendar.',
  },
  {
    series: 'GDP_QOQ', name: 'GDP QoQ SAAR', shortName: 'GDP',
    period: 'Q1 2026 (adv)', releaseDate: '2026-04-29', fredSeriesId: 'A191RL1Q225SBEA',
    consensus: null, consensusAsOf: '2026-03-24', unit: '%', importance: 'high',
    notes: 'BEA GDP advance — verify on bea.gov.',
  },
]

/** Next catalyst for dashboard; falls back with explicit reason if calendar has no future rows */
export function getNextMacroCatalyst(): MacroModule['nextCatalyst'] {
  const today = new Date().toISOString().split('T')[0]!
  const future = MACRO_RELEASES
    .filter(r => r.releaseDate >= today)
    .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
  const nextHigh = future.find(r => r.importance === 'high')
  const pick = nextHigh ?? future[0]
  if (!pick) {
    return {
      name: 'Macro calendar',
      date: '',
      importance: 'low',
      unavailableReason:
        'No future-dated rows in MACRO_RELEASES. Append official BLS/BEA dates in macro-calendar.ts.',
    }
  }
  return {
    name: pick.shortName,
    date: pick.releaseDate,
    importance: pick.importance,
    referencePeriod: pick.period,
  }
}

/** Get the N most recent releases, optionally filtered by importance */
export function getRecentReleases(
  n = 10,
  importance?: ReleaseImportance,
): MacroReleaseMeta[] {
  let releases = [...MACRO_RELEASES]
  if (importance) releases = releases.filter(r => r.importance === importance)
  // Sort by release date descending
  releases.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))
  return releases.slice(0, n)
}

/** Get upcoming releases (future dates) */
export function getUpcomingReleases(n = 5): MacroReleaseMeta[] {
  const today = new Date().toISOString().split('T')[0]!
  return MACRO_RELEASES
    .filter(r => r.releaseDate >= today)
    .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
    .slice(0, n)
}

/** Next highest-importance release */
export function getNextHighImpact(): MacroReleaseMeta | null {
  const today = new Date().toISOString().split('T')[0]!
  return MACRO_RELEASES
    .filter(r => r.releaseDate >= today && r.importance === 'high')
    .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))[0] ?? null
}
