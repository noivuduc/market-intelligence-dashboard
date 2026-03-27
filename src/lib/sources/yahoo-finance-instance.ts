// ============================================================
// yahoo-finance2 — single server-side client (cookies / crumb).
// ============================================================

import YahooFinance from 'yahoo-finance2'

type YahooFinanceClient = InstanceType<typeof YahooFinance>

let singleton: YahooFinanceClient | null = null

export function getYahooFinance2(): YahooFinanceClient {
  if (!singleton) singleton = new YahooFinance()
  return singleton
}

/** HTTP status from yahoo-finance2's HTTPError (and similar). */
export function yahooFinance2HttpStatus(err: unknown): number | undefined {
  if (err !== null && typeof err === 'object' && 'code' in err) {
    const c = (err as { code: unknown }).code
    if (typeof c === 'number' && Number.isFinite(c)) return c
  }
  return undefined
}
