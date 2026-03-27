// ============================================================
// MARKET DATA API ROUTE
// Proxies Yahoo Finance requests server-side to avoid CORS.
// Yahoo Finance is the fallback for market prices.
// Replace with Polygon.io for production-grade reliability.
// ============================================================

import { NextResponse } from 'next/server'
import { buildMarketCoreSnapshot } from '@/lib/features/market'
import { serverCache, CacheKeys, TTL } from '@/lib/cache/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const { data, fromCache, cachedAt } = await serverCache.getOrFetch(
      CacheKeys.marketModule(),
      TTL.MARKET_QUOTES,
      () => buildMarketCoreSnapshot(),
    )

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': `public, s-maxage=60, stale-while-revalidate=30`,
        'X-Data-Source': 'Yahoo Finance (unofficial)',
        'X-Cached-At':   cachedAt,
        'X-From-Cache':  String(fromCache),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/sources/market] Error:', message)
    return NextResponse.json(
      { error: message, caveat: 'Yahoo Finance API unavailable. Market data cannot be retrieved.' },
      { status: 502 }
    )
  }
}
