// ============================================================
// YAHOO FINANCE ADAPTER (UNOFFICIAL)
// Proxied through Next.js API routes to avoid CORS.
// No API key required. 15-minute delay for non-premium users.
//
// WARNING: This is an unofficial API. Structure may change.
// Replace with Polygon.io or similar for production.
//
// This module runs SERVER-SIDE ONLY.
// ============================================================

const YF_BASE_V8 = 'https://query1.finance.yahoo.com/v8/finance/chart'
const YF_BASE_V7 = 'https://query1.finance.yahoo.com/v7/finance/quote'

// ---- Types ----

export interface YFMeta {
  symbol:                    string
  currency:                  string
  regularMarketPrice:        number
  regularMarketPreviousClose:number
  regularMarketOpen:         number
  regularMarketDayHigh:      number
  regularMarketDayLow:       number
  regularMarketVolume:       number
  fiftyTwoWeekHigh:          number
  fiftyTwoWeekLow:           number
  regularMarketTime:         number   // Unix timestamp
  exchangeTimezoneName:      string
  shortName?:                string
}

export interface YFChartResult {
  meta:       YFMeta
  timestamp:  number[]
  indicators: {
    quote: {
      open:   (number | null)[]
      high:   (number | null)[]
      low:    (number | null)[]
      close:  (number | null)[]
      volume: (number | null)[]
    }[]
  }
}

export interface YFChartResponse {
  chart: {
    result:  YFChartResult[] | null
    error:   { code: string; description: string } | null
  }
}

// ---- Normalized quote ----

export interface NormalizedQuote {
  symbol:        string
  name:          string
  price:         number
  previousClose: number
  /** Null when prior close missing or invalid — do not coerce to 0 */
  change:        number | null
  changePct:     number | null
  open:          number
  high:          number
  low:           number
  volume:        number
  high52w:       number
  low52w:        number
  asOf:          string   // ISO from unix timestamp
}

// ---- Fetch single symbol ----

export async function fetchQuote(symbol: string): Promise<NormalizedQuote> {
  const encoded = encodeURIComponent(symbol)
  const url = `${YF_BASE_V8}/${encoded}?interval=1d&range=5d&includePrePost=false`

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; MarketIntel/1.0)',
      'Accept':     'application/json',
    },
    next: { revalidate: 60 },
  })

  if (!res.ok) {
    throw new Error(`Yahoo Finance [${symbol}] HTTP ${res.status}`)
  }

  const body: YFChartResponse = await res.json()

  if (body.chart.error) {
    throw new Error(`Yahoo Finance [${symbol}]: ${body.chart.error.description}`)
  }

  const result = body.chart.result?.[0]
  if (!result) throw new Error(`Yahoo Finance [${symbol}]: no result`)

  const { meta } = result
  const price = meta.regularMarketPrice
  const prev  = meta.regularMarketPreviousClose
  let change: number | null = null
  let changePct: number | null = null
  if (
    price != null && prev != null &&
    Number.isFinite(price) && Number.isFinite(prev) &&
    prev !== 0
  ) {
    change = price - prev
    changePct = ((price - prev) / Math.abs(prev)) * 100
  }

  return {
    symbol:        meta.symbol,
    name:          meta.shortName ?? meta.symbol,
    price,
    previousClose: prev,
    change,
    changePct,
    open:    meta.regularMarketOpen,
    high:    meta.regularMarketDayHigh,
    low:     meta.regularMarketDayLow,
    volume:  meta.regularMarketVolume,
    high52w: meta.fiftyTwoWeekHigh,
    low52w:  meta.fiftyTwoWeekLow,
    asOf:    new Date(meta.regularMarketTime * 1000).toISOString(),
  }
}

// ---- Fetch OHLCV history ----

export interface OHLCVBar {
  date:   string
  open:   number | null
  high:   number | null
  low:    number | null
  close:  number | null
  volume: number | null
}

export async function fetchHistory(
  symbol:   string,
  range:    '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' = '3mo',
  interval: '1d' | '1wk' | '1mo' = '1d',
): Promise<OHLCVBar[]> {
  const encoded = encodeURIComponent(symbol)
  const url = `${YF_BASE_V8}/${encoded}?interval=${interval}&range=${range}&includePrePost=false`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketIntel/1.0)' },
    next: { revalidate: 3600 },
  })

  if (!res.ok) throw new Error(`Yahoo Finance history [${symbol}] HTTP ${res.status}`)

  const body: YFChartResponse = await res.json()
  const result = body.chart.result?.[0]
  if (!result) return []

  const { timestamp, indicators } = result
  const q = indicators.quote[0]
  if (!q || !timestamp) return []

  return timestamp.map((ts, i) => ({
    date:   new Date(ts * 1000).toISOString().split('T')[0]!,
    open:   q.open[i]   ?? null,
    high:   q.high[i]   ?? null,
    low:    q.low[i]    ?? null,
    close:  q.close[i]  ?? null,
    volume: q.volume[i] ?? null,
  }))
}

// ---- Batch quotes ----

export async function fetchQuotes(
  symbols: string[],
): Promise<{ symbol: string; quote: NormalizedQuote | null; error: string | null }[]> {
  const results = await Promise.allSettled(
    symbols.map(s => fetchQuote(s))
  )
  return results.map((r, i) => ({
    symbol: symbols[i]!,
    quote:  r.status === 'fulfilled' ? r.value : null,
    error:  r.status === 'rejected'  ? String(r.reason) : null,
  }))
}

// ---- Symbol catalog ----
// Yahoo Finance symbol format: ^ prefix for indices

export const YF_SYMBOLS = {
  // Indices
  SPX:  '^GSPC',
  NDX:  '^NDX',
  DJI:  '^DJI',
  RUT:  '^RUT',
  VIX:  '^VIX',
  MOVE: '^MOVE',  // May not be on Yahoo

  // Broad ETFs
  SPY:  'SPY',
  QQQ:  'QQQ',
  IWM:  'IWM',
  DIA:  'DIA',
  RSP:  'RSP',   // Equal-weight S&P 500
  MDY:  'MDY',   // Mid cap

  // Sector ETFs
  XLK:  'XLK',   // Tech
  XLC:  'XLC',   // Communication
  XLF:  'XLF',   // Financials
  XLV:  'XLV',   // Healthcare
  XLE:  'XLE',   // Energy
  XLI:  'XLI',   // Industrials
  XLB:  'XLB',   // Materials
  XLRE: 'XLRE',  // Real Estate
  XLU:  'XLU',   // Utilities
  XLP:  'XLP',   // Staples
  XLY:  'XLY',   // Discretionary

  // Fixed income
  TLT:  'TLT',   // 20Y Treasury
  IEF:  'IEF',   // 7-10Y Treasury
  SHY:  'SHY',   // 1-3Y Treasury
  HYG:  'HYG',   // HY corp bonds
  LQD:  'LQD',   // IG corp bonds
  BND:  'BND',   // Total bond

  // Commodities / safe havens
  GLD:  'GLD',
  SLV:  'SLV',
  USO:  'USO',
  BTC:  'BTC-USD',
  GOLD_FUT: 'GC=F',
  OIL_FUT:  'CL=F',
  DXY:  'DX-Y.NYB',
  US10Y: '^TNX',

  // Vol
  SVXY: 'SVXY',
  UVXY: 'UVXY',
} as const

export type YFSymbol = typeof YF_SYMBOLS[keyof typeof YF_SYMBOLS]
