// ============================================================
// OPTIONS LANE — isolated from core dashboard Yahoo traffic
// ============================================================

import { serverCache, CacheKeys, TTL } from '@/lib/cache/server'
import { buildOptionsModuleFromChain } from '@/lib/features/options'
import { fetchPolygonSpxOptionChainSnapshot } from '@/lib/sources/polygon-options'
import { fetchYahooSpxOptionChainSnapshot } from '@/lib/sources/yahoo-options'
import {
  pickOptionsChainProvider,
  resolveOptionsChainSourceMode,
} from '@/lib/sources/options-chain-source'
import { buildPlaceholders } from '@/app/api/dashboard/placeholders'
import type { OptionsModule } from '@/lib/types'
import type { SpxOptionChainSnapshot } from '@/lib/sources/option-chain-types'
import { logDashboardOptions } from '@/lib/util/optionsDebugLog'

export async function loadOptionsModuleForDashboard(
  spotForOptions: number | null,
): Promise<OptionsModule> {
  const placeholders = buildPlaceholders()
  const hasYahoo = process.env.YAHOO_FINANCE_ENABLED !== 'false'
  const hasPolygon = Boolean(process.env.POLYGON_API_KEY?.trim())
  const optionsChainMode = resolveOptionsChainSourceMode()
  const optionsProvider = pickOptionsChainProvider(
    optionsChainMode,
    hasPolygon,
    hasYahoo,
  )

  logDashboardOptions('loadOptionsModuleForDashboard', {
    spotForOptions,
    OPTIONS_CHAIN_SOURCE: process.env.OPTIONS_CHAIN_SOURCE ?? '(unset)',
    resolvedMode: optionsChainMode,
    optionsProvider,
    YAHOO_FINANCE_ENABLED: process.env.YAHOO_FINANCE_ENABLED ?? '(unset)',
    hasPolygonKey: hasPolygon,
    cacheKey: CacheKeys.yahooOptionsChain(),
  })

  const loadYahooOptions = async (): Promise<OptionsModule> => {
    const yahooKey = CacheKeys.yahooOptionsChain()
    const afterMarketMs = Math.max(
      0,
      Number(process.env.YAHOO_OPTIONS_AFTER_MARKET_MS ?? '0') || 0,
    )

    const fresh = serverCache.get<SpxOptionChainSnapshot>(yahooKey)
    if (fresh) {
      logDashboardOptions('yahoo cache entry', {
        isStale: fresh.isStale,
        ageMs: fresh.ageMs,
        contracts: fresh.data.contracts.length,
        skipBecauseEmpty: fresh.data.contracts.length === 0,
      })
    } else {
      logDashboardOptions('yahoo cache miss', { key: yahooKey })
    }

    if (
      fresh &&
      !fresh.isStale &&
      fresh.data.contracts.length > 0
    ) {
      const mod = buildOptionsModuleFromChain(fresh.data, spotForOptions, 'yahoo')
      logDashboardOptions('yahoo using fresh cache', {
        structureAvailable: mod.structureAvailable,
        fetchError: mod.meta.fetchError ?? null,
      })
      return mod
    }

    if (afterMarketMs > 0) {
      logDashboardOptions('yahoo afterMarketMs pause', { afterMarketMs })
      await new Promise(r => setTimeout(r, afterMarketMs))
    }

    try {
      logDashboardOptions('yahoo getOrFetch start', { yahooKey })
      const snap = await serverCache.getOrFetch(
        yahooKey,
        TTL.OPTIONS_STRUCTURE,
        fetchYahooSpxOptionChainSnapshot,
      )
      logDashboardOptions('yahoo getOrFetch done', {
        fromCache: snap.fromCache,
        cachedAt: snap.cachedAt,
        snapshotContracts: snap.data.contracts.length,
        underlyingPrice: snap.data.underlyingPrice,
      })
      const mod = buildOptionsModuleFromChain(snap.data, spotForOptions, 'yahoo')
      logDashboardOptions('yahoo module built', {
        structureAvailable: mod.structureAvailable,
        fetchError: mod.meta.fetchError ?? null,
        putWall: mod.putWall,
        callWall: mod.callWall,
      })
      return mod
    } catch (e) {
      const recovered = serverCache.get<SpxOptionChainSnapshot>(yahooKey)
      if (recovered?.data) {
        console.warn(
          '[options-lane] Yahoo options failed — serving last good chain from cache:',
          e,
        )
        logDashboardOptions('yahoo recovered stale cache', {
          contracts: recovered.data.contracts.length,
        })
        const mod = buildOptionsModuleFromChain(recovered.data, spotForOptions, 'yahoo')
        logDashboardOptions('yahoo module from recovery', {
          structureAvailable: mod.structureAvailable,
          fetchError: mod.meta.fetchError ?? null,
        })
        return mod
      }
      logDashboardOptions('yahoo getOrFetch threw, no cache recovery', {
        error: e instanceof Error ? e.message : String(e),
      })
      throw e
    }
  }

  if (optionsProvider === 'polygon') {
    try {
      logDashboardOptions('polygon getOrFetch start')
      const snap = await serverCache.getOrFetch(
        CacheKeys.polygonOptionsSnapshot(),
        TTL.OPTIONS_STRUCTURE,
        fetchPolygonSpxOptionChainSnapshot,
      )
      logDashboardOptions('polygon getOrFetch done', {
        fromCache: snap.fromCache,
        snapshotContracts: snap.data.contracts.length,
      })
      const mod = buildOptionsModuleFromChain(snap.data, spotForOptions, 'polygon')
      logDashboardOptions('polygon module built', {
        structureAvailable: mod.structureAvailable,
        fetchError: mod.meta.fetchError ?? null,
      })
      return mod
    } catch (e) {
      console.warn('[options-lane] Polygon options failed:', e)
      if (optionsChainMode === 'auto' && hasYahoo) {
        try {
          console.warn('[options-lane] OPTIONS_CHAIN_SOURCE=auto — falling back to Yahoo')
          return await loadYahooOptions()
        } catch (e2) {
          console.warn('[options-lane] Yahoo options fallback failed:', e2)
          return placeholders.options
        }
      }
      return placeholders.options
    }
  }

  if (optionsProvider === 'yahoo') {
    try {
      return await loadYahooOptions()
    } catch (e) {
      console.warn('[options-lane] Yahoo options failed:', e)
      logDashboardOptions('yahoo failed — returning placeholder options module', {
        error: e instanceof Error ? e.message : String(e),
      })
      return placeholders.options
    }
  }

  logDashboardOptions('no options provider — returning placeholders', {
    optionsProvider,
    hasYahoo,
    hasPolygon,
  })
  return placeholders.options
}
