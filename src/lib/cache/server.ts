// ============================================================
// SERVER-SIDE IN-PROCESS CACHE
// Multi-layer TTL cache for API route responses.
// Uses Map for single-instance deploys (Next.js dev + Vercel Edge).
// For multi-instance production, replace backend with Redis.
// ============================================================

interface CacheEntry<T> {
  data:      T
  cachedAt:  number   // ms
  ttlMs:     number
}

class InProcessCache {
  private store = new Map<string, CacheEntry<unknown>>()

  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, { data, cachedAt: Date.now(), ttlMs })
  }

  get<T>(key: string): { data: T; ageMs: number; isStale: boolean } | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined
    if (!entry) return null
    const ageMs   = Date.now() - entry.cachedAt
    const isStale = ageMs > entry.ttlMs
    return { data: entry.data, ageMs, isStale }
  }

  /** Returns cached data if fresh, otherwise calls fetcher and caches result */
  async getOrFetch<T>(
    key:     string,
    ttlMs:   number,
    fetcher: () => Promise<T>,
  ): Promise<{ data: T; fromCache: boolean; cachedAt: string }> {
    const cached = this.get<T>(key)
    if (cached && !cached.isStale) {
      return {
        data:      cached.data,
        fromCache: true,
        cachedAt:  new Date(Date.now() - cached.ageMs).toISOString(),
      }
    }

    const data = await fetcher()
    this.set(key, data, ttlMs)
    return { data, fromCache: false, cachedAt: new Date().toISOString() }
  }

  invalidate(key: string): void {
    this.store.delete(key)
  }

  invalidatePattern(pattern: RegExp): number {
    let count = 0
    for (const key of this.store.keys()) {
      if (pattern.test(key)) {
        this.store.delete(key)
        count++
      }
    }
    return count
  }

  /** Age of a cached entry in seconds, or null if not cached */
  ageSeconds(key: string): number | null {
    const entry = this.store.get(key)
    if (!entry) return null
    return (Date.now() - entry.cachedAt) / 1000
  }
}

// Singleton — shared across API route invocations in same process
export const serverCache = new InProcessCache()

// ---- TTL constants (ms) ----

export const TTL = {
  // Layer 1: Market data — prices, quotes, breadth
  MARKET_PRICES:      60_000,    // 1 minute
  INTRADAY_BREADTH:   60_000,

  // Layer 2: Derived analytics
  OPTIONS_STRUCTURE:  300_000,   // 5 minutes
  FLOW_SIGNALS:       300_000,
  REGIME_SCORES:      300_000,
  RETAIL_PROXY:       300_000,
  ORGANIC_VOLUME:     300_000,

  // Layer 3: Official / macro data
  FED_DATA:           3_600_000,  // 1 hour
  TREASURY_YIELDS:    3_600_000,
  MACRO_RELEASES:     86_400_000, // 24 hours
  LIQUIDITY_DATA:     3_600_000,

  // Layer 4: AI explanations
  AI_MODULE_EXPLAIN:  900_000,   // 15 minutes
  AI_SUMMARY:         900_000,
} as const

// ---- Cache key builders ----

export const CacheKeys = {
  fredSeries:     (id: string) => `fred:series:${id}`,
  fredBatch:      (ids: string[]) => `fred:batch:${ids.sort().join(',')}`,
  yahooQuote:     (sym: string) => `yahoo:quote:${sym}`,
  yahooHistory:   (sym: string, range: string) => `yahoo:history:${sym}:${range}`,
  yahooQuotes:    (syms: string[]) => `yahoo:quotes:${syms.sort().join(',')}`,
  dashboard:      () => 'dashboard:state',
  fedModule:      () => 'module:fed',
  treasuryModule: () => 'module:treasury',
  macroModule:    () => 'module:macro',
  liquidityModule:() => 'module:liquidity',
  marketModule:   () => 'module:market',
  aiExplain:      (module: string, hash: string) => `ai:explain:${module}:${hash}`,
  aiSummary:      (hash: string) => `ai:summary:${hash}`,
} as const

// ---- Stale-while-revalidate helper ----

/**
 * Returns stale data immediately while fetching fresh data in background.
 * Useful for non-blocking UI updates.
 */
export async function staleWhileRevalidate<T>(
  key:     string,
  ttlMs:   number,
  fetcher: () => Promise<T>,
  onFresh?: (data: T) => void,
): Promise<T | null> {
  const cached = serverCache.get<T>(key)

  if (!cached) {
    // No cache at all — must wait
    const data = await fetcher()
    serverCache.set(key, data, ttlMs)
    return data
  }

  if (cached.isStale) {
    // Return stale immediately, revalidate in background
    setImmediate(async () => {
      try {
        const fresh = await fetcher()
        serverCache.set(key, fresh, ttlMs)
        onFresh?.(fresh)
      } catch (e) {
        console.error(`Cache revalidation failed for ${key}:`, e)
      }
    })
  }

  return cached.data
}
