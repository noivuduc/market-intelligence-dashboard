import { describe, it, expect } from 'vitest'
import { buildDashboardAlerts } from './buildDashboardAlerts'
import { buildPlaceholders } from '@/app/api/dashboard/placeholders'
import type { RegimeState } from '@/lib/types'
import type { MarketSnapshot } from '@/lib/features/market'

function baseRegime(over: Partial<RegimeState> = {}): RegimeState {
  return {
    label: 'sideways',
    confidence: 52,
    subScores: { policy: 50, liquidity: 50, risk: 50, trend: 50, flow: 50, positioning: 50 },
    drivers: [],
    risks: [],
    watchNext: [],
    lastUpdated: new Date().toISOString(),
    ...over,
  }
}

describe('buildDashboardAlerts', () => {
  const ph = buildPlaceholders()

  it('adds risk-off regime alert', () => {
    const a = buildDashboardAlerts(baseRegime({ label: 'risk-off' }), ph.fed, ph.treasury, ph.liquidity, ph.macro, null)
    expect(a.some((x) => x.id === 'regime-risk-off')).toBe(true)
    expect(a.find((x) => x.id === 'regime-risk-off')?.confidence).toBe('high')
  })

  it('adds FOMC proximity when date known', () => {
    const fed = {
      ...ph.fed,
      daysToFomc: 5,
      nextFomcDate: '2026-03-19',
    }
    const a = buildDashboardAlerts(baseRegime(), fed, ph.treasury, ph.liquidity, ph.macro, null)
    expect(a.some((x) => x.id === 'fomc-imminent')).toBe(true)
  })

  it('skips FOMC alert when next date missing', () => {
    const fed = { ...ph.fed, daysToFomc: 3, nextFomcDate: '' }
    const a = buildDashboardAlerts(baseRegime(), fed, ph.treasury, ph.liquidity, ph.macro, null)
    expect(a.some((x) => x.id === 'fomc-imminent')).toBe(false)
  })

  it('adds breadth divergence when market snapshot weak', () => {
    const market: MarketSnapshot = {
      ...ph.market,
      breadth: {
        ...ph.market.breadth,
        breadthConfirmed: false,
        tapeQuality: 'weak-rally',
      },
    }
    const a = buildDashboardAlerts(baseRegime(), ph.fed, ph.treasury, ph.liquidity, ph.macro, market)
    expect(a.some((x) => x.id === 'breadth-divergence')).toBe(true)
  })

  it('does not add cross-asset alerts when market is null', () => {
    const a = buildDashboardAlerts(baseRegime(), ph.fed, ph.treasury, ph.liquidity, ph.macro, null)
    expect(a.some((x) => x.id === 'vix-elevated')).toBe(false)
  })

  it('adds macro catalyst alert when release within 72h', () => {
    const d = new Date(Date.now() + 36 * 3_600_000).toISOString()
    const macro = {
      ...ph.macro,
      nextCatalyst: { name: 'CPI', date: d, importance: 'high' as const },
    }
    const a = buildDashboardAlerts(baseRegime(), ph.fed, ph.treasury, ph.liquidity, macro, null)
    expect(a.some((x) => x.id === 'macro-catalyst-soon')).toBe(true)
  })
})
