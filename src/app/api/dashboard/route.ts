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
import type { DashboardState, FedPolicyModule, TreasuryModule, LiquidityModule, MacroModule } from '@/lib/types'

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

  const alerts = buildAlerts(regime, fed as FedPolicyModule, treasury as TreasuryModule, liquidity as LiquidityModule)

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
      whatBreaks: 'AI briefing not yet loaded. Call /api/ai/summary.',
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

// ---- Alert builder ----

function buildAlerts(
  regime:   ReturnType<typeof computeRegime>,
  fed:      FedPolicyModule,
  treasury: TreasuryModule,
  liq:      LiquidityModule,
) {
  const alerts = []
  const now    = new Date().toISOString()

  // Regime change alert
  if (regime.label === 'risk-off') {
    alerts.push({
      id: 'regime-risk-off',
      severity: 'elevated' as const,
      title: 'Regime: Risk-Off',
      explanation: 'Regime engine classifies current conditions as risk-off. Review liquidity, credit, and breadth signals.',
      affectedModules: ['Regime', 'Liquidity', 'Breadth'],
      watchItems: ['Credit spreads', 'SPX key support', 'VIX level'],
      createdAt: now, acknowledged: false,
    })
  }

  // FOMC proximity alert
  if (fed.daysToFomc !== null && fed.daysToFomc <= 7) {
    alerts.push({
      id: 'fomc-imminent',
      severity: 'watch' as const,
      title: `FOMC Meeting in ${fed.daysToFomc} day(s)`,
      explanation: `Federal Reserve policy meeting on ${fed.nextFomcDate}. Expect elevated volatility in rates and equities.`,
      affectedModules: ['Fed & Policy', 'Treasury & Rates'],
      watchItems: ['Fed statement', 'Rate path revision', 'Balance sheet guidance'],
      createdAt: now, acknowledged: false,
    })
  }

  // Treasury rates alert
  const y10  = treasury.curve.y10.value
  if (y10 !== null && y10 > 4.6) {
    alerts.push({
      id: 'rates-elevated',
      severity: 'watch' as const,
      title: `10Y Treasury Yield Above 4.6%`,
      explanation: `10Y yield at ${treasury.curve.y10.formatted} tightens financial conditions. Watch equity multiple sensitivity.`,
      affectedModules: ['Treasury & Rates', 'Liquidity'],
      watchItems: ['10Y at 4.75%', 'IG spread widening', 'SPX P/E compression'],
      createdAt: now, acknowledged: false,
    })
  }

  // Credit stress alert
  if (liq.creditStress === 'elevated' || liq.creditStress === 'high') {
    alerts.push({
      id: 'credit-stress',
      severity: liq.creditStress === 'high' ? 'critical' as const : 'elevated' as const,
      title: `HY Credit Stress: ${liq.creditStress.toUpperCase()}`,
      explanation: `HY spreads at ${liq.hySpread.formatted}. ${liq.creditStress === 'high' ? 'Severe credit deterioration — systemic risk watch.' : 'Credit conditions deteriorating — monitor closely.'}`,
      affectedModules: ['Liquidity', 'Regime'],
      watchItems: ['HY spread 400+', 'IG widening confirmation', 'Equity correlation'],
      createdAt: now, acknowledged: false,
    })
  }

  return alerts
}
