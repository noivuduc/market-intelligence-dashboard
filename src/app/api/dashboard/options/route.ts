// ============================================================
// OPTIONS LANE (Tier 3) — isolated chain fetch + regime refresh
// ============================================================

import { NextResponse } from 'next/server'
import { buildOptionsLaneResponse } from '@/lib/dashboard/dashboard-options-patch'
import { buildPlaceholders } from '@/app/api/dashboard/placeholders'
import { computeRegime } from '@/lib/regime/engine'
import { buildDashboardAlerts } from '@/lib/alerts/buildDashboardAlerts'
import type {
  FedPolicyModule,
  LiquidityModule,
  MacroModule,
  TreasuryModule,
} from '@/lib/types'
import type { MarketSnapshot } from '@/lib/features/market'
import { serverCache, CacheKeys } from '@/lib/cache/server'
import { logDashboardOptions } from '@/lib/util/optionsDebugLog'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    logDashboardOptions('GET /api/dashboard/options start')
    const body = await buildOptionsLaneResponse()
    logDashboardOptions('GET /api/dashboard/options ok', {
      structureAvailable: body.options.structureAvailable,
      fetchError: body.options.meta.fetchError ?? null,
    })
    return NextResponse.json(
      { lane: 'options' as const, ...body },
      {
        headers: {
          'Cache-Control':    'no-store',
          'X-Dashboard-Lane': 'options',
        },
      },
    )
  } catch (e) {
    console.warn('[api/dashboard/options]', e)
    logDashboardOptions('GET /api/dashboard/options error path', {
      message: e instanceof Error ? e.message : String(e),
    })
    const placeholders = buildPlaceholders()
    const fedG = serverCache.get<FedPolicyModule>(CacheKeys.fedModule())
    const trG = serverCache.get<TreasuryModule>(CacheKeys.treasuryModule())
    const liG = serverCache.get<LiquidityModule>(CacheKeys.liquidityModule())
    const maG = serverCache.get<MacroModule>(CacheKeys.macroModule())
    const mkG = serverCache.get<MarketSnapshot>(CacheKeys.marketModule())
    const fed = fedG?.data ?? (placeholders.fed as FedPolicyModule)
    const treasury = trG?.data ?? (placeholders.treasury as TreasuryModule)
    const liquidity = liG?.data ?? (placeholders.liquidity as LiquidityModule)
    const macro = maG?.data ?? (placeholders.macro as MacroModule)
    const market = mkG?.data ?? placeholders.market
    const regime = computeRegime({
      fed,
      liquidity,
      treasury,
      macro,
      breadth: market.breadth,
      flows: market.flows,
      options: placeholders.options,
    })
    const alerts = buildDashboardAlerts(regime, fed, treasury, liquidity, macro, market)
    return NextResponse.json(
      {
        lane: 'options' as const,
        options: placeholders.options,
        regime,
        alerts,
        lastLaneUpdate: new Date().toISOString(),
        error: e instanceof Error ? e.message : 'Options lane failed',
      },
      { status: 200 },
    )
  }
}
