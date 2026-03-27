import { describe, expect, it } from 'vitest'
import { applyOptionsLane, applySparklineLane } from './client-merge'
import { buildPlaceholders } from '@/app/api/dashboard/placeholders'
import { computeRegime } from '@/lib/regime/engine'
import { makeMeta, SOURCES } from '@/lib/sources/types'
import type { DashboardState } from '@/lib/types'

function minimalState(): DashboardState {
  const p = buildPlaceholders()
  const regime = computeRegime({
    fed: p.fed,
    liquidity: p.liquidity,
    treasury: p.treasury,
    macro: p.macro,
    breadth: p.market.breadth,
    flows: p.market.flows,
    options: p.options,
  })
  return {
    lastFullUpdate: new Date().toISOString(),
    dataQuality: {
      fredAvailable: true,
      marketAvailable: true,
      aiAvailable: false,
      overallStatus: 'full',
    },
    regime,
    executive: {
      regime,
      briefing: p.briefing,
      topChanges: regime.drivers,
      topRisks: regime.risks,
      topWatch: regime.watchNext,
      whatBreaks: 'test',
      lastUpdated: new Date().toISOString(),
    },
    fed: p.fed,
    treasury: p.treasury,
    macro: p.macro,
    liquidity: p.liquidity,
    breadth: p.market.breadth,
    flows: p.market.flows,
    retail: p.retail,
    organic: p.organic,
    options: p.options,
    internals: p.internals,
    collar: p.collar,
    watchlist: [
      {
        symbol: 'SPX',
        name: 'S&P 500',
        category: 'index',
        price: 5000,
        change1d: 1,
        changePct1d: 0.02,
        trend: 'rising',
        status: 'stable',
        meta: makeMeta(SOURCES.YAHOO_FINANCE),
      },
    ],
    crossAsset: [
      {
        symbol: 'SPX',
        displayName: 'S&P 500',
        yahooSymbol: '^GSPC',
        price: 5000,
        changePct1d: 0.02,
        trend: 'rising',
        regimeTag: 'tape',
        meta: makeMeta(SOURCES.YAHOO_FINANCE),
      },
    ],
    alerts: [],
  }
}

describe('client-merge', () => {
  it('applySparklineLane attaches spark arrays by Yahoo symbol map', () => {
    const s = minimalState()
    const next = applySparklineLane(s, { '^GSPC': [1, 2, 3] })
    const spx = next.watchlist.find((w) => w.symbol === 'SPX')
    expect(spx?.sparkline).toEqual([1, 2, 3])
  })

  it('applyOptionsLane updates regime-linked executive fields', () => {
    const s = minimalState()
    const nextRegime = { ...s.regime, label: 'risk-off' as const, risks: ['A', 'B', 'C', 'D'] }
    const next = applyOptionsLane(s, {
      options: s.options,
      regime: nextRegime,
      alerts: [{ id: '1', severity: 'info', title: 't', explanation: 'e', affectedModules: [], watchItems: [], createdAt: '', acknowledged: false }],
    })
    expect(next.regime.label).toBe('risk-off')
    expect(next.executive.topRisks).toEqual(['A', 'B', 'C', 'D'])
    expect(next.executive.whatBreaks).toBe('A · B · C')
    expect(next.alerts).toHaveLength(1)
  })

  // ── Options preservation (anti-flash) ──────────────────────────────────────

  describe('applyOptionsLane — options preservation', () => {
    it('keeps previous live options when new response has placeholder (structureAvailable=false)', () => {
      const s = minimalState()
      // Give previous state a live options structure
      const liveOptions = { ...s.options, structureAvailable: true, putWall: 5200, callWall: 5600, zeroGamma: 5400 }
      const stateWithLive = { ...s, options: liveOptions }

      // Options lane returns a degraded placeholder (e.g. 429 on Yahoo)
      const placeholderOptions = { ...s.options, structureAvailable: false, putWall: null, callWall: null, zeroGamma: null }
      const next = applyOptionsLane(stateWithLive, {
        options: placeholderOptions,
        regime:  s.regime,
        alerts:  [],
      })

      // Must NOT downgrade — previous live data preserved
      expect(next.options.structureAvailable).toBe(true)
      expect(next.options.putWall).toBe(5200)
      expect(next.options.callWall).toBe(5600)
    })

    it('accepts new live options when previous was also live', () => {
      const s = minimalState()
      const prevLive = { ...s.options, structureAvailable: true, putWall: 5200, callWall: 5600, zeroGamma: 5400 }
      const nextLive = { ...s.options, structureAvailable: true, putWall: 5250, callWall: 5650, zeroGamma: 5450 }
      const stateWithLive = { ...s, options: prevLive }

      const next = applyOptionsLane(stateWithLive, {
        options: nextLive,
        regime:  s.regime,
        alerts:  [],
      })

      // New live data should replace old live data
      expect(next.options.putWall).toBe(5250)
      expect(next.options.callWall).toBe(5650)
    })

    it('accepts placeholder when previous state was also placeholder', () => {
      const s = minimalState()
      // Both prev and new are structureAvailable=false → no preservation needed
      const placeholder = { ...s.options, structureAvailable: false }
      const stateWithPlaceholder = { ...s, options: placeholder }
      const newPlaceholder = { ...s.options, structureAvailable: false }

      const next = applyOptionsLane(stateWithPlaceholder, {
        options: newPlaceholder,
        regime:  s.regime,
        alerts:  [],
      })

      expect(next.options.structureAvailable).toBe(false)
    })

    it('accepts new live options even when previous was placeholder', () => {
      const s = minimalState()
      const placeholder = { ...s.options, structureAvailable: false }
      const stateWithPlaceholder = { ...s, options: placeholder }
      const liveOptions = { ...s.options, structureAvailable: true, putWall: 5200, callWall: 5600, zeroGamma: 5400 }

      const next = applyOptionsLane(stateWithPlaceholder, {
        options: liveOptions,
        regime:  s.regime,
        alerts:  [],
      })

      // Upgrade from placeholder → live is always accepted
      expect(next.options.structureAvailable).toBe(true)
      expect(next.options.putWall).toBe(5200)
    })
  })

  // ── Null regime (cold-start guard) ────────────────────────────────────────

  describe('applyOptionsLane — null regime', () => {
    it('preserves existing regime when options lane returns null regime (cold start)', () => {
      const s = minimalState()
      const originalLabel = s.regime.label
      const next = applyOptionsLane(s, {
        options: s.options,
        regime:  null,
        alerts:  [],
      })
      expect(next.regime.label).toBe(originalLabel)
      expect(next.executive.regime.label).toBe(originalLabel)
    })

    it('still applies new options when regime is null', () => {
      const s = minimalState()
      const liveOptions = { ...s.options, structureAvailable: true, putWall: 5000, callWall: 5400, zeroGamma: null }
      const next = applyOptionsLane(s, {
        options: liveOptions,
        regime:  null,
        alerts:  [],
      })
      expect(next.options.putWall).toBe(5000)
    })
  })

  // ── Previous data retained on poll ────────────────────────────────────────

  describe('applySparklineLane — previous data retained', () => {
    it('does not blank existing watchlist items when sparklines are empty', () => {
      const s = minimalState()
      const next = applySparklineLane(s, {})
      // Existing watchlist entries preserved (sparkline becomes undefined but item stays)
      expect(next.watchlist).toHaveLength(s.watchlist.length)
      expect(next.watchlist[0]?.symbol).toBe('SPX')
    })

    it('merges partial sparklines without removing non-sparkline data', () => {
      const s = minimalState()
      const next = applySparklineLane(s, { '^GSPC': [100, 101, 102] })
      // Watchlist price should still be present
      expect(next.watchlist[0]?.price).toBe(5000)
      // Sparkline attached
      expect(next.watchlist[0]?.sparkline).toEqual([100, 101, 102])
    })
  })
})
