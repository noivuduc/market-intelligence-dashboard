// ============================================================
// DASHBOARD CORE STATE (Tier 1) — no options chain, no sparkline lane
// ============================================================

import { serverCache, CacheKeys, TTL } from '@/lib/cache/server'
import { buildFedModule } from '@/lib/features/fed'
import { buildTreasuryModule } from '@/lib/features/treasury'
import { buildLiquidityModule } from '@/lib/features/liquidity'
import { buildMacroModule } from '@/lib/features/macro'
import { buildMarketCoreSnapshot } from '@/lib/features/market'
import { computeRegime } from '@/lib/regime/engine'
import { buildPlaceholders } from '@/app/api/dashboard/placeholders'
import { buildDashboardAlerts } from '@/lib/alerts/buildDashboardAlerts'
import type {
  DashboardState,
  FedPolicyModule,
  TreasuryModule,
  LiquidityModule,
  MacroModule,
} from '@/lib/types'
import type { MarketSnapshot } from '@/lib/features/market'

export async function buildDashboardCoreState(): Promise<DashboardState> {
  const hasFRED = !!process.env.FRED_API_KEY
  const hasYahoo = process.env.YAHOO_FINANCE_ENABLED !== 'false'
  const placeholders = buildPlaceholders()

  const [
    fedResult,
    treasuryResult,
    liquidityResult,
    macroResult,
    marketResult,
  ] = await Promise.allSettled([
    hasFRED ? serverCache.getOrFetch(CacheKeys.fedModule(), TTL.FED_DATA, buildFedModule) : Promise.reject(new Error('FRED not configured')),
    hasFRED ? serverCache.getOrFetch(CacheKeys.treasuryModule(), TTL.TREASURY_YIELDS, buildTreasuryModule) : Promise.reject(new Error('FRED not configured')),
    hasFRED ? serverCache.getOrFetch(CacheKeys.liquidityModule(), TTL.FED_DATA, buildLiquidityModule) : Promise.reject(new Error('FRED not configured')),
    hasFRED ? serverCache.getOrFetch(CacheKeys.macroModule(), TTL.MACRO_RELEASES, buildMacroModule) : Promise.reject(new Error('FRED not configured')),
    hasYahoo
      ? serverCache.getOrFetchWithStaleFallback(CacheKeys.marketModule(), TTL.MARKET_QUOTES, buildMarketCoreSnapshot)
      : Promise.reject(new Error('Yahoo disabled')),
  ])

  const fed = fedResult.status === 'fulfilled' ? fedResult.value.data : placeholders.fed
  const treasury = treasuryResult.status === 'fulfilled' ? treasuryResult.value.data : placeholders.treasury
  const liquidity = liquidityResult.status === 'fulfilled' ? liquidityResult.value.data : placeholders.liquidity
  const macro = macroResult.status === 'fulfilled' ? macroResult.value.data : placeholders.macro
  const market =
    marketResult.status === 'fulfilled' ? marketResult.value.data : placeholders.market

  const fredAvailable = fedResult.status === 'fulfilled'
  const marketAvailable = marketResult.status === 'fulfilled'

  if (fedResult.status === 'rejected') console.warn('[dashboard-core] FRED failed:', fedResult.reason)
  if (marketResult.status === 'rejected') console.warn('[dashboard-core] Market failed:', marketResult.reason)
  if (treasuryResult.status === 'rejected') console.warn('[dashboard-core] Treasury failed:', treasuryResult.reason)

  const optionsModule = placeholders.options
  const regime = computeRegime({
    fed: fed as FedPolicyModule,
    liquidity: liquidity as LiquidityModule,
    treasury: treasury as TreasuryModule,
    macro: macro as MacroModule,
    breadth: market.breadth,
    flows: market.flows,
    options: optionsModule,
  })

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

  return {
    lastFullUpdate: new Date().toISOString(),
    dataQuality: {
      fredAvailable,
      marketAvailable,
      aiAvailable: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
      overallStatus:
        fredAvailable && marketAvailable ? 'full' : fredAvailable || marketAvailable ? 'partial' : 'degraded',
    },
    regime,
    executive: {
      regime,
      briefing: placeholders.briefing,
      topChanges: regime.drivers,
      topRisks: regime.risks,
      topWatch: regime.watchNext,
      whatBreaks: whatBreaksExecutive,
      lastUpdated: new Date().toISOString(),
    },
    fed: fed as FedPolicyModule,
    treasury: treasury as TreasuryModule,
    macro: macro as MacroModule,
    liquidity: liquidity as LiquidityModule,
    breadth: market.breadth,
    flows: market.flows,
    retail: placeholders.retail,
    organic: placeholders.organic,
    options: optionsModule,
    internals: placeholders.internals,
    collar: placeholders.collar,
    watchlist: market.watchlist,
    crossAsset: market.crossAsset,
    alerts,
  }
}
