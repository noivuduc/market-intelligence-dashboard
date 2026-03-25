// ============================================================
// MAIN DASHBOARD API ROUTE
// Aggregates all module data into a single response.
// Tries real data sources; falls back to stale cache on error.
//
// Data layers:
//   Layer 1 (60s):  market prices from Yahoo Finance
//   Layer 2 (1h):   FRED — Fed, Treasury, Liquidity
//   Layer 3 (24h):  FRED — Macro releases
//   Layer 4 (15m):  AI explanations (separate /api/ai/* routes)
// ============================================================

import { NextResponse } from 'next/server'
import { serverCache, CacheKeys, TTL } from '@/lib/cache/server'
import { buildFedModule }       from '@/lib/features/fed'
import { buildTreasuryModule }  from '@/lib/features/treasury'
import { buildLiquidityModule } from '@/lib/features/liquidity'
import { buildMacroModule }     from '@/lib/features/macro'
import { buildMarketSnapshot }  from '@/lib/features/market'
import { computeRegime }        from '@/lib/regime/engine'
import { buildPlaceholders }    from './placeholders'
import { buildDashboardAlerts } from '@/lib/alerts/buildDashboardAlerts'
import type { DashboardState, FedPolicyModule, TreasuryModule, LiquidityModule, MacroModule } from '@/lib/types'
import type { MarketSnapshot } from '@/lib/features/market'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const hasFRED   = !!process.env.FRED_API_KEY
  const hasYahoo  = process.env.YAHOO_FINANCE_ENABLED !== 'false'

  // ---- Fetch all modules, each independently with error isolation ----

  const [
    fedResult,
    treasuryResult,
    liquidityResult,
    macroResult,
    marketResult,
  ] = await Promise.allSettled([
    hasFRED  ? serverCache.getOrFetch(CacheKeys.fedModule(),       TTL.FED_DATA,       buildFedModule)       : Promise.reject(new Error('FRED not configured')),
    hasFRED  ? serverCache.getOrFetch(CacheKeys.treasuryModule(),  TTL.TREASURY_YIELDS,buildTreasuryModule)  : Promise.reject(new Error('FRED not configured')),
    hasFRED  ? serverCache.getOrFetch(CacheKeys.liquidityModule(), TTL.FED_DATA,       buildLiquidityModule) : Promise.reject(new Error('FRED not configured')),
    hasFRED  ? serverCache.getOrFetch(CacheKeys.macroModule(),     TTL.MACRO_RELEASES, buildMacroModule)     : Promise.reject(new Error('FRED not configured')),
    hasYahoo ? serverCache.getOrFetch(CacheKeys.marketModule(),    TTL.MARKET_PRICES,  buildMarketSnapshot)  : Promise.reject(new Error('Yahoo disabled')),
  ])

  const placeholders = buildPlaceholders()

  // ---- Extract data or use placeholders ----

  const fed       = fedResult.status       === 'fulfilled' ? fedResult.value.data       : placeholders.fed
  const treasury  = treasuryResult.status  === 'fulfilled' ? treasuryResult.value.data  : placeholders.treasury
  const liquidity = liquidityResult.status === 'fulfilled' ? liquidityResult.value.data : placeholders.liquidity
  const macro     = macroResult.status     === 'fulfilled' ? macroResult.value.data     : placeholders.macro
  const market    = marketResult.status    === 'fulfilled' ? marketResult.value.data    : placeholders.market

  const fredAvailable   = fedResult.status === 'fulfilled'
  const marketAvailable = marketResult.status === 'fulfilled'

  // Log errors but don't crash
  if (fedResult.status === 'rejected')       console.warn('[dashboard] FRED failed:', fedResult.reason)
  if (marketResult.status === 'rejected')    console.warn('[dashboard] Market failed:', marketResult.reason)
  if (treasuryResult.status === 'rejected')  console.warn('[dashboard] Treasury failed:', treasuryResult.reason)

  // ---- Compute regime from whatever data we have ----

  const regime = computeRegime({
    fed:      fed as FedPolicyModule,
    liquidity:liquidity as LiquidityModule,
    treasury: treasury as TreasuryModule,
    macro:    macro as MacroModule,
    breadth:  market.breadth,
    flows:    market.flows,
    options:  placeholders.options,
  })

  // ---- Derive alerts from regime + module states ----

  const marketSnap: MarketSnapshot | null =
    marketResult.status === 'fulfilled' ? marketResult.value.data : null
  const alerts = buildDashboardAlerts(
    regime,
    fed as FedPolicyModule,
    treasury as TreasuryModule,
    liquidity as LiquidityModule,
    macro as MacroModule,
    marketSnap,
  )

  const whatBreaksExecutive =
    regime.risks.length > 0
      ? regime.risks.slice(0, 3).join(' · ')
      : 'Sustained deterioration in credit, volatility, or breadth versus the current posture would invalidate this read.'

  // ---- Build executive summary (AI briefing filled asynchronously by client) ----

  const state: DashboardState = {
    lastFullUpdate: new Date().toISOString(),
    dataQuality: {
      fredAvailable,
      marketAvailable,
      aiAvailable:   Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
      overallStatus: fredAvailable && marketAvailable ? 'full' : fredAvailable || marketAvailable ? 'partial' : 'degraded',
    },
    regime,
    executive: {
      regime,
      briefing: placeholders.briefing,    // AI fills this in via /api/ai/summary
      topChanges: regime.drivers,
      topRisks:   regime.risks,
      topWatch:   regime.watchNext,
      whatBreaks: whatBreaksExecutive,
      lastUpdated: new Date().toISOString(),
    },
    fed:       fed as FedPolicyModule,
    treasury:  treasury as TreasuryModule,
    macro:     macro as MacroModule,
    liquidity: liquidity as LiquidityModule,
    breadth:   market.breadth,
    flows:     market.flows,
    retail:    placeholders.retail,
    organic:   placeholders.organic,
    options:   placeholders.options,
    internals: placeholders.internals,
    collar:    placeholders.collar,
    watchlist: market.watchlist,
    crossAsset: market.crossAsset,
    alerts,
  }

  return NextResponse.json(state, {
    headers: {
      'Cache-Control':        'no-store',
      'X-Data-As-Of':         state.lastFullUpdate,
      'X-FRED-Available':     String(fredAvailable),
      'X-Market-Available':   String(marketAvailable),
      'X-Overall-Status':     state.dataQuality.overallStatus,
    },
  })
}
