// ============================================================
// FRED API ADAPTER
// Federal Reserve Economic Data — api.stlouisfed.org
// Free API key required: https://fred.stlouisfed.org/docs/api/api_key.html
//
// This module runs SERVER-SIDE ONLY (API routes).
// Never import this in client components.
// ============================================================

const FRED_BASE = 'https://api.stlouisfed.org/fred'

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

function isTransientFredError(err: unknown): boolean {
  const s = err instanceof Error ? err.message : String(err)
  return /\bHTTP (502|503|504|429)\b/.test(s)
}

// ---- Raw FRED types ----

export interface FREDObservation {
  realtime_start: string
  realtime_end:   string
  date:           string
  value:          string   // FRED uses strings; '.' means missing
}

export interface FREDSeriesResponse {
  realtime_start: string
  realtime_end:   string
  observation_start: string
  observation_end:   string
  units:          string
  output_type:    number
  file_type:      string
  order_by:       string
  sort_order:     string
  count:          number
  offset:         number
  limit:          number
  observations:   FREDObservation[]
}

// ---- Core fetch ----

function requireApiKey(): string {
  const key = process.env.FRED_API_KEY
  if (!key) throw new Error('FRED_API_KEY not configured. Set it in .env.local.')
  return key
}

async function fetchSeriesOnce(
  seriesId: string,
  limit: number,
  order: 'asc' | 'desc',
): Promise<FREDObservation[]> {
  const key = requireApiKey()
  const url = new URL(`${FRED_BASE}/series/observations`)
  url.searchParams.set('series_id',  seriesId)
  url.searchParams.set('api_key',    key)
  url.searchParams.set('file_type',  'json')
  url.searchParams.set('limit',      String(limit))
  url.searchParams.set('sort_order', order)

  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
    cache: 'no-store',   // TTL managed by server cache layer; bypass Next.js data cache
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`FRED [${seriesId}] HTTP ${res.status}: ${body.slice(0, 200)}`)
  }

  const body: FREDSeriesResponse = await res.json()
  return body.observations
}

const FRED_FETCH_ATTEMPTS = Math.max(1, Math.min(6, Number(process.env.FRED_FETCH_ATTEMPTS ?? '3') || 3))
const FRED_RETRY_BASE_MS = Math.max(100, Math.min(5000, Number(process.env.FRED_RETRY_BASE_MS ?? '400') || 400))

/**
 * Single FRED series with retries on transient gateway / rate-limit errors.
 */
export async function fetchSeries(
  seriesId:  string,
  limit = 20,
  order:     'asc' | 'desc' = 'desc',
): Promise<FREDObservation[]> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= FRED_FETCH_ATTEMPTS; attempt++) {
    try {
      return await fetchSeriesOnce(seriesId, limit, order)
    } catch (e) {
      lastErr = e
      if (attempt >= FRED_FETCH_ATTEMPTS || !isTransientFredError(e)) throw e
      await sleep(FRED_RETRY_BASE_MS * attempt)
    }
  }
  throw lastErr
}

// ---- Helpers ----

/** Parse a FRED observation value, returning null for missing data */
export function parseValue(obs: FREDObservation): number | null {
  if (obs.value === '.' || obs.value === '') return null
  const n = parseFloat(obs.value)
  return isNaN(n) ? null : n
}

/** Latest non-null observation */
export function latest(obs: FREDObservation[]): { value: number; date: string } | null {
  for (const o of obs) {
    const v = parseValue(o)
    if (v !== null) return { value: v, date: o.date }
  }
  return null
}

/** Two most recent non-null observations (for delta calc) */
export function latestTwo(obs: FREDObservation[]): [
  { value: number; date: string } | null,
  { value: number; date: string } | null,
] {
  const valid = obs
    .map(o => ({ ...o, v: parseValue(o) }))
    .filter(o => o.v !== null)
    .slice(0, 2)
  return [
    valid[0] ? { value: valid[0].v!, date: valid[0].date } : null,
    valid[1] ? { value: valid[1].v!, date: valid[1].date } : null,
  ]
}

/** Convert observations to time series (ascending for charts) */
export function toTimeSeries(obs: FREDObservation[], ascending = true): { date: string; value: number }[] {
  const pts = obs
    .map(o => ({ date: o.date, value: parseValue(o) }))
    .filter((o): o is { date: string; value: number } => o.value !== null)
  return ascending ? pts.reverse() : pts
}

// ---- Batch fetch ----

const FRED_BATCH_CONCURRENCY = Math.max(1, Math.min(16, Number(process.env.FRED_MAX_CONCURRENT ?? '6') || 6))
const FRED_BATCH_GAP_MS = Math.max(0, Math.min(2000, Number(process.env.FRED_BATCH_GAP_MS ?? '40') || 40))

/**
 * Fetches many series with capped concurrency per call (reduces St. Louis Fed 502s when
 * multiple dashboard modules each fire large batches in parallel).
 */
export async function fetchMultiple(
  ids: string[],
  limit = 20,
): Promise<Record<string, FREDObservation[]>> {
  const out: Record<string, FREDObservation[]> = {}
  const failed: string[] = []

  for (let i = 0; i < ids.length; i += FRED_BATCH_CONCURRENCY) {
    const slice = ids.slice(i, i + FRED_BATCH_CONCURRENCY)
    const settled = await Promise.allSettled(
      slice.map(id => fetchSeries(id, limit).then(obs => ({ id, obs }))),
    )
    for (let j = 0; j < settled.length; j++) {
      const id = slice[j]!
      const r = settled[j]!
      if (r.status === 'fulfilled') {
        out[r.value.id] = r.value.obs
      } else {
        failed.push(id)
      }
    }
    if (i + FRED_BATCH_CONCURRENCY < ids.length && FRED_BATCH_GAP_MS > 0) {
      await sleep(FRED_BATCH_GAP_MS)
    }
  }

  if (failed.length > 0) {
    const sample = failed.slice(0, 6).join(', ')
    const more = failed.length > 6 ? ` (+${failed.length - 6} more)` : ''
    console.warn(`FRED: ${failed.length} series unavailable after retries (${sample}${more})`)
  }

  return out
}

// ============================================================
// SERIES CATALOG
// All FRED series IDs used by this application.
// ============================================================

export const FRED_SERIES = {
  // ---- Fed Policy ----
  FED_FUNDS_UPPER:  'DFEDTARU',   // Fed Funds Upper Target (daily)
  FED_FUNDS_LOWER:  'DFEDTARL',   // Fed Funds Lower Target (daily)
  IORB:             'IORB',        // Interest on Reserve Balances (daily)
  ONRRP:            'RRPONTSYD',   // ON RRP Outstanding Amount (daily, $B)
  BALANCE_SHEET:    'WALCL',       // Fed Total Assets / Balance Sheet (millions USD, weekly)
  RESERVE_BALANCES: 'WRESBAL',     // Reserve balances with FR banks (millions USD, weekly)

  // ---- Treasury Yields ----
  DGS3MO:   'DGS3MO',   // 3-Month Treasury yield
  DGS1:     'DGS1',     // 1-Year
  DGS2:     'DGS2',     // 2-Year
  DGS5:     'DGS5',     // 5-Year
  DGS10:    'DGS10',    // 10-Year
  DGS30:    'DGS30',    // 30-Year
  TIPS5Y:   'DFII5',    // 5-Year TIPS real yield
  TIPS10Y:  'DFII10',   // 10-Year TIPS real yield
  BEI5Y:    'T5YIE',    // 5-Year breakeven inflation
  BEI10Y:   'T10YIE',   // 10-Year breakeven inflation
  SPREAD_2_10: 'T10Y2Y', // 10Y-2Y spread
  SPREAD_3M_10:'T10Y3M', // 10Y-3M spread

  // ---- SOFR / Money Markets ----
  SOFR: 'SOFR',   // SOFR rate (daily)

  // ---- Financial Conditions ----
  NFCI:      'NFCI',        // Chicago Fed NFCI (weekly, lower = looser)
  ANFCI:     'ANFCI',       // Adjusted NFCI (controls for macro)
  HY_SPREAD: 'BAMLH0A0HYM2', // ICE BofA HY OAS spread (daily, bps)
  IG_SPREAD: 'BAMLC0A0CM',   // ICE BofA IG OAS spread (daily, bps)
  VIX:       'VIXCLS',       // CBOE VIX (daily)
  MOVE:      'BAMLMOVE',     // ICE BofA MOVE index (daily) — may not be on FRED
  RECESSION_PROB: 'RECPROUSM156N', // NY Fed recession probability (monthly)

  // ---- Macro ----
  CPI:          'CPIAUCSL',   // CPI All Urban, SA (monthly, YoY derived)
  CORE_CPI:     'CPILFESL',   // Core CPI (monthly)
  PCE:          'PCEPI',      // PCE Price Index (monthly)
  CORE_PCE:     'PCEPILFE',   // Core PCE (monthly)
  PAYROLLS:     'PAYEMS',     // Nonfarm payrolls (monthly, thousands)
  UNEMPLOYMENT: 'UNRATE',     // Unemployment rate (monthly)
  CLAIMS_INIT:  'ICSA',       // Initial jobless claims (weekly)
  CLAIMS_CONT:  'CCSA',       // Continued claims (weekly)
  GDP:          'GDPC1',      // Real GDP level (quarterly, billions chained 2017 USD SAAR)
  /** Real GDP, change from preceding period, %, quarterly, SAAR — use for "GDP QoQ" headline */
  GDP_PCT_QOQ_SAAR: 'A191RL1Q225SBEA',
  RETAIL_SALES: 'RSXFS',      // Retail ex-auto (monthly, $M)
  ISM_MFG:      'MANEMP',     // Mfg employment (proxy; ISM PMI sourced from ISM directly)
  HOUSING_STARTS:'HOUST',     // Housing starts (monthly, thousands SAAR)
} as const

export type FREDSeriesId = typeof FRED_SERIES[keyof typeof FRED_SERIES]
