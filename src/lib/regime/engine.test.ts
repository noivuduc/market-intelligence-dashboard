// ============================================================
// Tests: regime engine confidence and scoring
// ============================================================
import { describe, expect, it } from 'vitest'
import { computeRegime } from './engine'
import type { RegimeEngineInputs } from './engine'
import { buildPlaceholders } from '@/app/api/dashboard/placeholders'
import { makeMeta, SOURCES } from '@/lib/sources/types'

function allPlaceholderInputs(): RegimeEngineInputs {
  const p = buildPlaceholders()
  return {
    fed:      p.fed,
    liquidity:p.liquidity,
    treasury: p.treasury,
    macro:    p.macro,
    breadth:  p.market.breadth,
    flows:    p.market.flows,
    options:  p.options,
  }
}

describe('regime confidence', () => {
  it('all-placeholder inputs produce confidence significantly below 95', () => {
    const regime = computeRegime(allPlaceholderInputs())
    // When options are placeholder (structureAvailable=false), confidence must be penalised.
    // All-50 forced subs should NOT produce 95% confidence.
    expect(regime.confidence).toBeLessThan(85)
  })

  it('options unavailable reduces confidence vs options available', () => {
    const p = buildPlaceholders()
    const baseInputs = allPlaceholderInputs()

    // Give options a real structure with neutral signals (positioning score stays ~50),
    // so the only difference vs withoutOptions is the missing-key penalty removal.
    const withOptions: RegimeEngineInputs = {
      ...baseInputs,
      options: {
        ...p.options,
        structureAvailable:  true,
        greeksAvailable:     false,
        putWall:             5000,
        callWall:            5200,
        zeroGamma:           null,
        dealerPositioning:   'neutral',   // no score delta
        airPocketRisk:       'moderate',  // no score delta
        pinningRisk:         'moderate',  // no score delta
        breakoutSensitivity: 'moderate',  // no score delta
      },
    }

    const withoutOptions = computeRegime(baseInputs)
    const withOptionsResult = computeRegime(withOptions)

    // Real options data should produce equal or higher confidence than no options
    expect(withOptionsResult.confidence).toBeGreaterThanOrEqual(withoutOptions.confidence)
  })
})

describe('regime classification', () => {
  it('returns transition for balanced placeholder inputs', () => {
    const regime = computeRegime(allPlaceholderInputs())
    // Placeholder market has tapeQuality='mixed', so composite should be near center
    expect(['transition', 'sideways']).toContain(regime.label)
  })

  it('risk-on inputs return risk-on or topping-candidate', () => {
    const p = buildPlaceholders()
    const riskOnBreadth = {
      ...p.market.breadth,
      tapeQuality:      'healthy-rally' as const,
      participation:    'broad' as const,
      breadthConfirmed: true,
    }
    const result = computeRegime({
      fed:       { ...p.fed, policyStance: 'easing',      liquidityImplication: 'supportive', trendDrift: 'easing' },
      liquidity: { ...p.liquidity, liquidityStance: 'supportive', creditStress: 'low', volStress: 'low', trend: 'easing', vulnerabilityScore: 10 },
      treasury:  { ...p.treasury, bondsVsEquities: 'helping' },
      macro:     { ...p.macro, growthTrend: 'accelerating', inflationTrend: 'falling', surpriseRegime: 'positive' },
      breadth:   riskOnBreadth,
      flows:     { ...p.market.flows, overallPressure: 'buying', futuresPressure: 'buying' },
      options:   p.options,
    })
    expect(['risk-on', 'topping-candidate']).toContain(result.label)
  })
})
