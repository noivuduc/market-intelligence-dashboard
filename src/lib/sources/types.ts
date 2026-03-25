// ============================================================
// SOURCE METADATA TYPES
// Describes where data comes from, its freshness, and reliability.
// Every metric in the system carries a SourceMeta.
// ============================================================

export type DataClass = 'observed' | 'derived' | 'inferred' | 'delayed'
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unavailable'
export type FreshnessState = 'live' | 'recent' | 'stale' | 'very-stale' | 'unavailable'

export interface SourceMeta {
  /** Short identifier for this source */
  sourceId:     string
  /** Human-readable source name */
  sourceName:   string
  /** URL or reference to the source */
  sourceUrl?:   string
  /** How the data was obtained */
  dataClass:    DataClass
  /** How reliable / accurate is this data */
  confidence:   ConfidenceLevel
  /** ISO timestamp when this data was last fetched */
  fetchedAt:    string
  /** ISO timestamp of the underlying data point */
  dataAsOf:     string
  /** How often this source typically refreshes */
  cadenceLabel: string
  /** Whether a premium subscription is needed */
  requiresPremium: boolean
  /** Any important caveats about this data */
  caveat?:      string
  /** True if data fetch failed and we're in fallback/stale state */
  isFallback?:  boolean
  /** Error message if fetch failed */
  fetchError?:  string
}

export interface SourcedValue<T = number> {
  value:   T | null
  meta:    SourceMeta
}

export interface SourcedTimeSeries {
  data:    { date: string; value: number }[]
  meta:    SourceMeta
}

// ---- Source registry constants ----

export const SOURCES = {
  FRED: {
    sourceId:        'fred',
    sourceName:      'Federal Reserve Economic Data (FRED)',
    sourceUrl:       'https://fred.stlouisfed.org',
    dataClass:       'observed' as DataClass,
    confidence:      'high' as ConfidenceLevel,
    requiresPremium: false,
    cadenceLabel:    'Daily (business days)',
  },
  NY_FED: {
    sourceId:        'nyfed',
    sourceName:      'NY Federal Reserve',
    sourceUrl:       'https://www.newyorkfed.org',
    dataClass:       'observed' as DataClass,
    confidence:      'high' as ConfidenceLevel,
    requiresPremium: false,
    cadenceLabel:    'Daily',
  },
  TREASURY: {
    sourceId:        'treasury',
    sourceName:      'U.S. Treasury / TreasuryDirect',
    sourceUrl:       'https://home.treasury.gov',
    dataClass:       'observed' as DataClass,
    confidence:      'high' as ConfidenceLevel,
    requiresPremium: false,
    cadenceLabel:    'Daily (business days)',
  },
  BLS: {
    sourceId:        'bls',
    sourceName:      'Bureau of Labor Statistics (BLS)',
    sourceUrl:       'https://www.bls.gov',
    dataClass:       'delayed' as DataClass,
    confidence:      'high' as ConfidenceLevel,
    requiresPremium: false,
    cadenceLabel:    'Monthly / Weekly releases',
  },
  YAHOO_FINANCE: {
    sourceId:        'yahoo',
    sourceName:      'Yahoo Finance (Unofficial)',
    sourceUrl:       'https://finance.yahoo.com',
    dataClass:       'observed' as DataClass,
    confidence:      'medium' as ConfidenceLevel,
    requiresPremium: false,
    cadenceLabel:    '15-second delayed',
    caveat:          'Yahoo Finance unofficial API. 15-min delayed for non-premium. Subject to availability.',
  },
  POLYGON: {
    sourceId:        'polygon',
    sourceName:      'Polygon.io',
    sourceUrl:       'https://polygon.io',
    dataClass:       'observed' as DataClass,
    confidence:      'high' as ConfidenceLevel,
    requiresPremium: true,
    cadenceLabel:    'Real-time (paid plan)',
    caveat:          'Requires Polygon.io premium subscription for options and tick data.',
  },
  CBOE: {
    sourceId:        'cboe',
    sourceName:      'Cboe / OPRA',
    sourceUrl:       'https://datashop.cboe.com',
    dataClass:       'observed' as DataClass,
    confidence:      'high' as ConfidenceLevel,
    requiresPremium: true,
    cadenceLabel:    'Real-time options data',
    caveat:          'Requires OPRA data subscription. Options gamma/positioning are derived estimates.',
  },
  DERIVED_ENGINE: {
    sourceId:        'derived',
    sourceName:      'Derived — Internal Computation',
    sourceUrl:       undefined,
    dataClass:       'derived' as DataClass,
    confidence:      'medium' as ConfidenceLevel,
    requiresPremium: false,
    cadenceLabel:    'Computed on each request',
    caveat:          'Value computed from observed inputs. Accuracy depends on input data quality.',
  },
  INFERRED_ENGINE: {
    sourceId:        'inferred',
    sourceName:      'Inferred — Proxy Estimate',
    sourceUrl:       undefined,
    dataClass:       'inferred' as DataClass,
    confidence:      'low' as ConfidenceLevel,
    requiresPremium: false,
    cadenceLabel:    'Computed on each request',
    caveat:          'Value inferred from indirect evidence. Confidence is LOW. Not a primary data source.',
  },
} as const

// ---- Helper to build a SourceMeta with runtime timestamps ----

export function makeMeta(
  base: Omit<SourceMeta, 'fetchedAt' | 'dataAsOf'>,
  dataAsOf?: string,
): SourceMeta {
  const now = new Date().toISOString()
  return {
    ...base,
    fetchedAt: now,
    dataAsOf:  dataAsOf ?? now,
  }
}

// ---- Freshness computation ----

export function computeFreshness(meta: SourceMeta): FreshnessState {
  if (meta.isFallback || meta.fetchError) return 'unavailable'
  const ageSec = (Date.now() - new Date(meta.dataAsOf).getTime()) / 1000
  if (ageSec < 120)   return 'live'
  if (ageSec < 600)   return 'recent'
  if (ageSec < 3600)  return 'stale'
  return 'very-stale'
}
