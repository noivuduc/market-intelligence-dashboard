// ============================================================
// YAHOO FINANCE (via yahoo-finance2, unofficial)
// Server-side only. Handles cookies/crumbs like the Yahoo site.
// Replace with Polygon.io or similar for production if needed.
// ============================================================

import { singleFlight } from '@/lib/util/singleFlight'
import { getYahooChartCircuitBreaker } from '@/lib/sources/yahoo-circuit'
import { getYahooChartMinuteBudget, BudgetExceededError } from '@/lib/sources/yahoo-budget'
import {
  getYahooFinance2,
  yahooFinance2HttpStatus,
} from '@/lib/sources/yahoo-finance-instance'

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

const YF2_MODULE = { validateResult: false as const }

/**
 * Yahoo chart traffic is capped in **batches** so `/api/dashboard` does not open
 * ~50 parallel chart requests (quotes + sparkline history), which triggers **HTTP 429**.
 * Options (`yahoo-options.ts`) use separate `YAHOO_OPTIONS_*` env vars.
 */
export function getYahooChartThrottle(): { maxConcurrent: number; gapMs: number } {
  return {
    maxConcurrent: Math.max(1, Math.min(24, Number(process.env.YAHOO_MAX_CONCURRENT ?? '10') || 10)),
    gapMs:         Math.max(0, Math.min(3000, Number(process.env.YAHOO_CHART_GAP_MS ?? '50') || 50)),
  }
}

export async function pauseYahooChartThrottle(): Promise<void> {
  const { gapMs } = getYahooChartThrottle()
  if (gapMs > 0) await sleep(gapMs)
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
  asOf:          string   // ISO
}

function finiteOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function quoteAsOfIso(t: unknown): string {
  if (t instanceof Date && !Number.isNaN(t.getTime())) return t.toISOString()
  if (typeof t === 'number' && Number.isFinite(t)) {
    const ms = t > 1e12 ? t : t * 1000
    return new Date(ms).toISOString()
  }
  return new Date().toISOString()
}

// ---- Fetch single symbol ----

async function fetchQuoteInner(symbol: string): Promise<NormalizedQuote> {
  const br = getYahooChartCircuitBreaker()
  br.assertClosed()
  const budget = getYahooChartMinuteBudget()
  if (!budget.tryConsume(1)) throw new BudgetExceededError()

  const yf = getYahooFinance2()
  let q: Record<string, unknown>
  try {
    q = (await yf.quote(symbol, undefined, YF2_MODULE)) as Record<string, unknown>
    br.observeHttpStatus(200)
  } catch (e) {
    const st = yahooFinance2HttpStatus(e)
    if (st != null) br.observeHttpStatus(st)
    throw e instanceof Error ? e : new Error(String(e))
  }

  if (q == null || typeof q !== 'object') {
    throw new Error(`Yahoo Finance [${symbol}]: no result`)
  }

  const price = finiteOr(q.regularMarketPrice, NaN)
  const prev = finiteOr(q.regularMarketPreviousClose, NaN)
  if (!Number.isFinite(price) || !Number.isFinite(prev)) {
    throw new Error(`Yahoo Finance [${symbol}]: missing price fields`)
  }

  let change: number | null = null
  let changePct: number | null = null
  if (prev !== 0) {
    change = price - prev
    changePct = ((price - prev) / Math.abs(prev)) * 100
  }

  const sym = typeof q.symbol === 'string' && q.symbol.length > 0 ? q.symbol : symbol
  const name =
    typeof q.shortName === 'string' && q.shortName.length > 0 ? q.shortName : sym

  return {
    symbol:        sym,
    name,
    price,
    previousClose: prev,
    change,
    changePct,
    open:    finiteOr(q.regularMarketOpen, 0),
    high:    finiteOr(q.regularMarketDayHigh, 0),
    low:     finiteOr(q.regularMarketDayLow, 0),
    volume:  finiteOr(q.regularMarketVolume, 0),
    high52w: finiteOr(q.fiftyTwoWeekHigh, 0),
    low52w:  finiteOr(q.fiftyTwoWeekLow, 0),
    asOf:    quoteAsOfIso(q.regularMarketTime),
  }
}

export function fetchQuote(symbol: string): Promise<NormalizedQuote> {
  return singleFlight(`yahoo:yf2:quote:${symbol}`, () => fetchQuoteInner(symbol))
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

const RANGE_MS: Record<'5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y', number> = {
  '5d':  5 * 86_400_000,
  '1mo': 30 * 86_400_000,
  '3mo': 90 * 86_400_000,
  '6mo': 182 * 86_400_000,
  '1y':  365 * 86_400_000,
  '2y':  730 * 86_400_000,
}

async function fetchHistoryInner(
  symbol:   string,
  range:    '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y',
  interval: '1d' | '1wk' | '1mo',
): Promise<OHLCVBar[]> {
  const br = getYahooChartCircuitBreaker()
  br.assertClosed()
  const budget = getYahooChartMinuteBudget()
  if (!budget.tryConsume(1)) throw new BudgetExceededError()

  const period2 = new Date()
  const period1 = new Date(period2.getTime() - RANGE_MS[range] - 1000)

  const yf = getYahooFinance2()
  let chart: { quotes?: Array<{
    date: Date | string
    open: number | null
    high: number | null
    low: number | null
    close: number | null
    volume: number | null
  }> }
  try {
    chart = (await yf.chart(
      symbol,
      { period1, period2, interval, includePrePost: false },
      YF2_MODULE,
    )) as typeof chart
    br.observeHttpStatus(200)
  } catch (e) {
    const st = yahooFinance2HttpStatus(e)
    if (st != null) br.observeHttpStatus(st)
    throw e instanceof Error ? e : new Error(String(e))
  }

  const quotes = chart.quotes
  if (!quotes?.length) return []

  return quotes.map(row => ({
    date:   row.date instanceof Date
      ? row.date.toISOString().split('T')[0]!
      : String(row.date),
    open:   row.open   ?? null,
    high:   row.high   ?? null,
    low:    row.low    ?? null,
    close:  row.close  ?? null,
    volume: row.volume ?? null,
  }))
}

export function fetchHistory(
  symbol:   string,
  range:    '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' = '3mo',
  interval: '1d' | '1wk' | '1mo' = '1d',
): Promise<OHLCVBar[]> {
  return singleFlight(
    `yahoo:yf2:hist:${symbol}:${range}:${interval}`,
    () => fetchHistoryInner(symbol, range, interval),
  )
}

// ---- Batch quotes ----

export async function fetchQuotes(
  symbols: string[],
): Promise<{ symbol: string; quote: NormalizedQuote | null; error: string | null }[]> {
  const { maxConcurrent } = getYahooChartThrottle()
  const out: { symbol: string; quote: NormalizedQuote | null; error: string | null }[] = []

  for (let i = 0; i < symbols.length; i += maxConcurrent) {
    const slice = symbols.slice(i, i + maxConcurrent)
    const settled = await Promise.allSettled(slice.map(s => fetchQuote(s)))
    for (let j = 0; j < slice.length; j++) {
      const sym = slice[j]!
      const r = settled[j]!
      out.push({
        symbol: sym,
        quote:  r.status === 'fulfilled' ? r.value : null,
        error:  r.status === 'rejected'  ? String(r.reason) : null,
      })
    }
    if (i + maxConcurrent < symbols.length) await pauseYahooChartThrottle()
  }

  return out
}

export { YF_SYMBOLS, type YFSymbol } from '@/lib/sources/yahoo-symbols'
