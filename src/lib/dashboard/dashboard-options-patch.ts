// ============================================================
// OPTIONS LANE RESPONSE — fresh options + regime/alerts refresh
// ============================================================

import { serverCache, CacheKeys } from '@/lib/cache/server'
import { computeRegime } from '@/lib/regime/engine'
import { buildDashboardAlerts } from '@/lib/alerts/buildDashboardAlerts'
import { buildPlaceholders } from '@/app/api/dashboard/placeholders'
import { loadOptionsModuleForDashboard } from '@/lib/dashboard/loadOptionsLane'
import type {
  Alert,
  FedPolicyModule,
  LiquidityModule,
  MacroModule,
  OptionsModule,
  RegimeState,
  TreasuryModule,
} from '@/lib/types'
import type { MarketSnapshot } from '@/lib/features/market'
import { logDashboardOptions } from '@/lib/util/optionsDebugLog'

export interface OptionsLaneResponse {
  options:           OptionsModule
  regime:            RegimeState
  alerts:            Alert[]
  lastLaneUpdate:    string
}

/**
 * Uses last cached core modules + market snapshot so options never re-fetches FRED.
 */
export async function buildOptionsLaneResponse(): Promise<OptionsLaneResponse> {
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

  const spot = market.breadth.spx.price ?? null
  logDashboardOptions('buildOptionsLaneResponse', {
    spotFromMarketCache: spot,
    marketModuleFromCache: Boolean(mkG && !mkG.isStale),
    marketModuleStale: mkG?.isStale ?? null,
  })
  const options = await loadOptionsModuleForDashboard(spot)
  logDashboardOptions('buildOptionsLaneResponse done', {
    structureAvailable: options.structureAvailable,
    optionsMetaSource: options.meta.sourceId,
    fetchError: options.meta.fetchError ?? null,
  })

  const regime = computeRegime({
    fed,
    liquidity,
    treasury,
    macro,
    breadth: market.breadth,
    flows: market.flows,
    options,
  })

  const alerts = buildDashboardAlerts(regime, fed, treasury, liquidity, macro, market)

  return {
    options,
    regime,
    alerts,
    lastLaneUpdate: new Date().toISOString(),
  }
}
