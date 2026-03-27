// ============================================================
// YAHOO FINANCE — SPX OPTION CHAIN (yahoo-finance2 → v7/options)
// Rate-limit aware: no alternate underlying after HTTP 429.
// Spacing between expirations, fewer pages, circuit breaker on options family.
// ============================================================

import { YF_SYMBOLS } from '@/lib/sources/yahoo-symbols'
import { getYahooOptionsCircuitBreaker } from '@/lib/sources/yahoo-circuit'
import {
  getYahooFinance2,
  yahooFinance2HttpStatus,
} from '@/lib/sources/yahoo-finance-instance'
import type { NormalizedOptionContract, SpxOptionChainSnapshot } from '@/lib/sources/option-chain-types'
import { logYahooOptionsChain } from '@/lib/util/optionsDebugLog'

const YF2_MODULE = { validateResult: false as const }

/** Cap extra ?date= calls — default **1** (nearest expiry only) to spare Yahoo after chart burst */
const MAX_EXPIRATION_PAGES = Math.min(
  12,
  Math.max(1, Number(process.env.YAHOO_OPTIONS_MAX_EXPIRATIONS ?? '1') || 1),
)

const MS_BETWEEN_EXPIRATIONS = Math.min(
  8000,
  Math.max(0, Number(process.env.YAHOO_OPTIONS_REQUEST_GAP_MS ?? '200') || 200),
)

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

function jitter(ms: number): number {
  return ms + Math.floor(Math.random() * 250)
}

interface YfOptionContract {
  strike?: unknown
  openInterest?: unknown
  volume?: unknown
  expiration?: unknown
  impliedVolatility?: unknown
  gamma?: unknown
}

interface YfOptionsExpirationBlock {
  /** yahoo-finance2 coerces this to `Date`; raw Yahoo JSON uses unix seconds */
  expirationDate?: number | Date
  calls?: YfOptionContract[]
  puts?: YfOptionContract[]
}

interface YfOptionChainResult {
  underlyingSymbol?: string
  expirationDates?: number[]
  quote?: { regularMarketPrice?: number }
  options?: YfOptionsExpirationBlock[]
}

function isoDateFromUnix(sec: number): string | null {
  if (typeof sec !== 'number' || !Number.isFinite(sec)) return null
  const d = new Date(sec * 1000)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10) ?? null
}

/** Yahoo JSON often wraps numbers as `{ raw: number, fmt?: string }`. */
export function unwrapYahooMaybeRaw(v: unknown): unknown {
  if (v !== null && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) {
    const raw = (v as { raw?: unknown }).raw
    if (raw !== undefined && raw !== null) return raw
  }
  return v
}

function finiteNumber(v: unknown): number | null {
  const u = unwrapYahooMaybeRaw(v)
  if (typeof u === 'number' && Number.isFinite(u)) return u
  if (typeof u === 'string') {
    const t = u.trim()
    if (t === '') return null
    const n = Number(t)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/** For `?date=` / `yf.options({ date })` when pulling a specific expiration page. */
function toOptionsApiDate(marker: unknown): Date {
  const u = unwrapYahooMaybeRaw(marker)
  if (u instanceof Date && !Number.isNaN(u.getTime())) return u
  if (typeof u === 'number' && Number.isFinite(u)) {
    return u > 1e12 ? new Date(u) : new Date(u * 1000)
  }
  if (typeof u === 'string' && u.length >= 8) {
    const d = new Date(u)
    if (!Number.isNaN(d.getTime())) return d
  }
  throw new Error(`Invalid options expiration marker: ${String(marker)}`)
}

/** Normalize expiry from yahoo-finance2 (`Date`), raw Yahoo JSON (unix), `{raw}`, or ISO string. */
export function expirationToIsoDate(v: unknown): string | null {
  const u = unwrapYahooMaybeRaw(v)
  if (u instanceof Date && !Number.isNaN(u.getTime())) {
    return u.toISOString().slice(0, 10) ?? null
  }
  if (typeof u === 'number' && Number.isFinite(u)) {
    return isoDateFromUnix(u)
  }
  if (typeof u === 'string' && u.length >= 8) {
    const d = new Date(u)
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10) ?? null
  }
  return null
}

function normalizeContract(
  contractType: 'call' | 'put',
  row: YfOptionContract,
  expirationDate: string,
): NormalizedOptionContract | null {
  const strikeN = finiteNumber(row.strike)
  if (strikeN == null || strikeN <= 0) return null

  let openInterest = Math.max(0, Math.round(finiteNumber(row.openInterest) ?? 0))
  if (openInterest <= 0) {
    const vol = finiteNumber(row.volume)
    if (vol != null && vol > 0) openInterest = Math.round(vol)
  }
  if (openInterest <= 0) return null

  const g = finiteNumber(row.gamma)
  const gamma = g != null && Number.isFinite(g) ? g : null
  return { contractType, expirationDate, strike: strikeN, openInterest, gamma }
}

function ingestExpirationBlocks(
  result: YfOptionChainResult,
  into: NormalizedOptionContract[],
): void {
  for (const block of result.options ?? []) {
    const expStr = expirationToIsoDate(block.expirationDate)
    if (!expStr) continue
    for (const c of block.calls ?? []) {
      const n = normalizeContract('call', c, expStr)
      if (n) into.push(n)
    }
    for (const p of block.puts ?? []) {
      const n = normalizeContract('put', p, expStr)
      if (n) into.push(n)
    }
  }
}

/**
 * One options page via yahoo-finance2 (same v7 endpoint + crumb handling).
 * `hostPreference` is ignored; kept so call sites stay stable.
 */
async function fetchYahooOptionChainPage(
  symbol: string,
  expirationMarker: unknown | null,
  _hostPreference: string | null,
): Promise<{ result: YfOptionChainResult; hostUsed: string }> {
  const br = getYahooOptionsCircuitBreaker()
  if (br.isOpen()) {
    console.warn('[yahoo-options] yahoo-options circuit is OPEN — fetch will fail until cooldown', {
      symbol,
      cooldownRemainingMs: br.cooldownRemainingMs(),
    })
  }
  br.assertClosed()
  const yf = getYahooFinance2()

  logYahooOptionsChain('request', {
    symbol,
    specificExpiration: expirationMarker != null,
  })

  try {
    const row =
      expirationMarker != null
        ? await yf.options(symbol, { date: toOptionsApiDate(expirationMarker) }, YF2_MODULE)
        : await yf.options(symbol, undefined, YF2_MODULE)
    br.observeHttpStatus(200)
    if (row == null || typeof row !== 'object') {
      throw new Error('empty result')
    }
    const res = row as YfOptionChainResult
    const blocks = res.options ?? []
    const rawRows = blocks.reduce(
      (n, b) => n + (b.calls?.length ?? 0) + (b.puts?.length ?? 0),
      0,
    )
    const b0 = blocks[0]
    logYahooOptionsChain('response ok', {
      symbol,
      optionBlocks: blocks.length,
      rawCallPutRows: rawRows,
      expirationDatesLen: (res.expirationDates ?? []).length,
      quotePrice: res.quote?.regularMarketPrice,
      sampleBlockExpirationDate:
        b0?.expirationDate == null
          ? null
          : {
              type: typeof b0.expirationDate,
              isDate: b0.expirationDate instanceof Date,
            },
    })
    return { result: res, hostUsed: 'yahoo-finance2' }
  } catch (e) {
    const code = yahooFinance2HttpStatus(e)
    console.warn('[yahoo-options] request failed', {
      symbol,
      specificExpiration: expirationMarker != null,
      httpStatus: code ?? null,
      errorName: e instanceof Error ? e.name : typeof e,
      errorMessage: e instanceof Error ? e.message : String(e),
    })
    if (code != null) br.observeHttpStatus(code)
    if (code === 429) {
      throw new Error(`Yahoo options [${symbol}] HTTP 429`)
    }
    throw e instanceof Error ? e : new Error(String(e))
  }
}

/**
 * Yahoo **^GSPC** is the S&P 500 *spot index* — the v7 options endpoint returns **no chain**
 * (quote only). SPX index options use **^SPX**. Legacy `.env` often set `YAHOO_OPTIONS_SYMBOL=^GSPC`; remap.
 */
function spxOptionsUnderlyingSymbol(): string {
  const raw = process.env.YAHOO_OPTIONS_SYMBOL?.trim()
  if (!raw) return YF_SYMBOLS.SPX_OPTIONS

  const withCaret = raw.startsWith('^') ? raw.toUpperCase() : `^${raw.toUpperCase()}`
  if (withCaret === YF_SYMBOLS.SPX) {
    console.warn(
      '[yahoo-options] YAHOO_OPTIONS_SYMBOL is ^GSPC (spot index). Yahoo has no options chain for that ticker — ' +
        'using ^SPX for SPX index options. Remove YAHOO_OPTIONS_SYMBOL or set YAHOO_OPTIONS_SYMBOL=^SPX.',
    )
    return YF_SYMBOLS.SPX_OPTIONS
  }
  return raw
}

async function fetchYahooOptionChainForUnderlying(
  symbol: string,
): Promise<SpxOptionChainSnapshot> {
  logYahooOptionsChain('fetch chain start', { symbol, maxExpirationPages: MAX_EXPIRATION_PAGES })
  const { result: seed, hostUsed } = await fetchYahooOptionChainPage(symbol, null, null)

  const underlyingPrice =
    typeof seed.quote?.regularMarketPrice === 'number' &&
    Number.isFinite(seed.quote.regularMarketPrice) &&
    seed.quote.regularMarketPrice > 0
      ? seed.quote.regularMarketPrice
      : null

  function expirationListTime(x: unknown): number {
    const u = unwrapYahooMaybeRaw(x)
    if (u instanceof Date && !Number.isNaN(u.getTime())) return u.getTime()
    if (typeof u === 'number' && Number.isFinite(u)) return u > 1e12 ? u : u * 1000
    if (typeof u === 'string' && u.length >= 8) {
      const t = new Date(u).getTime()
      return Number.isNaN(t) ? NaN : t
    }
    return NaN
  }

  const expDates = [...(seed.expirationDates ?? [])].sort(
    (a, b) => expirationListTime(a) - expirationListTime(b),
  )
  const datesToPull =
    expDates.length > 0
      ? expDates.slice(0, MAX_EXPIRATION_PAGES)
      : []

  const contracts: NormalizedOptionContract[] = []
  let expirationsMerged = 0

  if (datesToPull.length === 0) {
    ingestExpirationBlocks(seed, contracts)
    expirationsMerged = seed.options?.length ?? 1
  } else {
    for (let i = 0; i < datesToPull.length; i++) {
      const ts = datesToPull[i]!
      try {
        if (i > 0 && MS_BETWEEN_EXPIRATIONS > 0) {
          await sleep(jitter(MS_BETWEEN_EXPIRATIONS))
        }
        const page =
          i === 0
            ? seed
            : (await fetchYahooOptionChainPage(symbol, ts, hostUsed)).result
        ingestExpirationBlocks(i === 0 ? seed : page, contracts)
        expirationsMerged += 1
      } catch {
        if (i === 0) throw new Error(`Yahoo options: failed to load first expiration for ${symbol}`)
        break
      }
    }
  }

  const rawRows =
    (seed.options ?? []).reduce((n, b) => n + (b.calls?.length ?? 0) + (b.puts?.length ?? 0), 0)
  if (contracts.length === 0 && rawRows > 0) {
    const b0 = seed.options?.[0]
    console.warn(
      `[yahoo-options] ${symbol}: Yahoo returned ${rawRows} option rows but ingest produced 0 contracts ` +
        '(check expiry / OI parsing).',
      {
        optionBlocks: seed.options?.length ?? 0,
        firstBlockExpirationDate: b0?.expirationDate,
        firstBlockExpirationType: b0?.expirationDate == null ? 'missing' : typeof b0.expirationDate,
      },
    )
  }

  logYahooOptionsChain('snapshot built', {
    symbol,
    contractsIngested: contracts.length,
    underlyingPrice,
    expirationsMerged,
    datesToPullCount: datesToPull.length,
    usedExpirationListBranch: datesToPull.length > 0,
  })

  return {
    contracts,
    underlyingPrice,
    contractCount: contracts.length,
    expirationsMerged,
  }
}

/**
 * SPX index option chain via Yahoo (**^SPX** only). Set **`YAHOO_OPTIONS_SYMBOL`** to override the ticker.
 */
export async function fetchYahooSpxOptionChainSnapshot(): Promise<SpxOptionChainSnapshot> {
  const envRaw = process.env.YAHOO_OPTIONS_SYMBOL?.trim() ?? ''
  const sym = spxOptionsUnderlyingSymbol()
  logYahooOptionsChain('fetchYahooSpxOptionChainSnapshot', {
    symbol: sym,
    envRaw: envRaw || '(unset)',
    envOverride: Boolean(envRaw),
  })
  return fetchYahooOptionChainForUnderlying(sym)
}
