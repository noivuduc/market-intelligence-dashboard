// ============================================================
// FRED DATA API ROUTE
// Proxies FRED API calls server-side.
// Caches responses to avoid rate limits and improve latency.
// ============================================================

import { NextResponse } from 'next/server'
import { fetchMultiple, FRED_SERIES } from '@/lib/sources/fred'
import { serverCache, CacheKeys, TTL } from '@/lib/cache/server'
import { buildFedModule } from '@/lib/features/fed'
import { buildTreasuryModule } from '@/lib/features/treasury'
import { buildLiquidityModule } from '@/lib/features/liquidity'
import { buildMacroModule } from '@/lib/features/macro'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const module = searchParams.get('module')  // 'fed' | 'treasury' | 'liquidity' | 'macro'

  if (!process.env.FRED_API_KEY) {
    return NextResponse.json(
      { error: 'FRED_API_KEY not configured. See .env.example.' },
      { status: 503 }
    )
  }

  try {
    switch (module) {
      case 'fed': {
        const { data } = await serverCache.getOrFetch(
          CacheKeys.fedModule(),
          TTL.FED_DATA,
          () => buildFedModule(),
        )
        return NextResponse.json(data, {
          headers: cacheHeaders(TTL.FED_DATA),
        })
      }

      case 'treasury': {
        const { data } = await serverCache.getOrFetch(
          CacheKeys.treasuryModule(),
          TTL.TREASURY_YIELDS,
          () => buildTreasuryModule(),
        )
        return NextResponse.json(data, {
          headers: cacheHeaders(TTL.TREASURY_YIELDS),
        })
      }

      case 'liquidity': {
        const { data } = await serverCache.getOrFetch(
          CacheKeys.liquidityModule(),
          TTL.FED_DATA,
          () => buildLiquidityModule(),
        )
        return NextResponse.json(data, {
          headers: cacheHeaders(TTL.FED_DATA),
        })
      }

      case 'macro': {
        const { data } = await serverCache.getOrFetch(
          CacheKeys.macroModule(),
          TTL.MACRO_RELEASES,
          () => buildMacroModule(),
        )
        return NextResponse.json(data, {
          headers: cacheHeaders(TTL.MACRO_RELEASES),
        })
      }

      default:
        return NextResponse.json(
          { error: 'Missing or unknown module parameter. Use: fed | treasury | liquidity | macro' },
          { status: 400 }
        )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[/api/sources/fred] Error for module=${module}:`, message)
    return NextResponse.json(
      { error: message, module },
      { status: 502 }
    )
  }
}

function cacheHeaders(ttlMs: number) {
  return {
    'Cache-Control': `public, s-maxage=${Math.floor(ttlMs / 1000)}, stale-while-revalidate=${Math.floor(ttlMs / 2000)}`,
    'X-Data-Source': 'FRED',
    'X-Cached-At':   new Date().toISOString(),
  }
}
