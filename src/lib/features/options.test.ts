// ============================================================
// Tests: buildOptionsModuleFromChain
// ============================================================
import { describe, expect, it } from 'vitest'
import { buildOptionsModuleFromChain } from './options'
import type { SpxOptionChainSnapshot } from '@/lib/sources/option-chain-types'

function makeSnapshot(contracts: SpxOptionChainSnapshot['contracts'], spot = 5000): SpxOptionChainSnapshot {
  return {
    contracts,
    underlyingPrice: spot,
    contractCount: contracts.length,
    pagesFetched: 1,
  }
}

const baseContracts = [
  // Put wall at 4800
  { contractType: 'put' as const, expirationDate: '2025-03-21', strike: 4800, openInterest: 50000, gamma: null },
  { contractType: 'put' as const, expirationDate: '2025-03-21', strike: 4900, openInterest: 20000, gamma: null },
  // Call wall at 5200
  { contractType: 'call' as const, expirationDate: '2025-03-21', strike: 5200, openInterest: 45000, gamma: null },
  { contractType: 'call' as const, expirationDate: '2025-03-21', strike: 5300, openInterest: 15000, gamma: null },
]

describe('zero-gamma fallback', () => {
  it('is null when no greeks are available (Yahoo source)', () => {
    const result = buildOptionsModuleFromChain(makeSnapshot(baseContracts), 5000, 'yahoo')
    // Yahoo has no greeks → ZG must be null, not spot price
    expect(result.zeroGamma).toBeNull()
    expect(result.greeksAvailable).toBe(false)
  })

  it('is derived from greeks when available (Polygon source)', () => {
    const withGreeks = [
      { contractType: 'put' as const,  expirationDate: '2025-03-21', strike: 4800, openInterest: 50000, gamma: 0.02 },
      { contractType: 'put' as const,  expirationDate: '2025-03-21', strike: 4900, openInterest: 20000, gamma: 0.03 },
      { contractType: 'call' as const, expirationDate: '2025-03-21', strike: 5200, openInterest: 45000, gamma: 0.025 },
      { contractType: 'call' as const, expirationDate: '2025-03-21', strike: 5300, openInterest: 15000, gamma: 0.01 },
    ]
    const result = buildOptionsModuleFromChain(makeSnapshot(withGreeks), 5000, 'polygon')
    expect(result.greeksAvailable).toBe(true)
    // ZG should be the max |gamma|×OI strike, which is 4800: 0.02×50000=1000 vs 4900: 0.03×20000=600 vs 5200: 0.025×45000=1125
    // Actually 5200 wins: 1125 > 4800's 1000. So ZG = 5200.
    expect(result.zeroGamma).toBe(5200)
    expect(result.zeroGamma).not.toBeNull()
  })
})

describe('dealer positioning sign convention', () => {
  it('near call wall → short-gamma (capping)', () => {
    // Spot at 5195, call wall at 5200 → 0.1% away
    const result = buildOptionsModuleFromChain(makeSnapshot(baseContracts, 5195), 5195, 'yahoo')
    expect(result.dealerPositioning).toBe('short-gamma')
    expect(result.airPocketRisk).toBe('high')
  })

  it('near put wall → NOT short-gamma (stabilising support)', () => {
    // Spot at 4820, put wall at 4800 → 0.4% above put wall
    const result = buildOptionsModuleFromChain(makeSnapshot(baseContracts, 4820), 4820, 'yahoo')
    expect(result.dealerPositioning).not.toBe('short-gamma')
  })

  it('inside corridor well away from walls → long-gamma', () => {
    // Spot at 5000, put wall 4800, call wall 5200 → ~4% from each
    const result = buildOptionsModuleFromChain(makeSnapshot(baseContracts, 5000), 5000, 'yahoo')
    expect(result.dealerPositioning).toBe('long-gamma')
    expect(result.airPocketRisk).toBe('low')
  })
})

describe('greeksAvailable flag', () => {
  it('is false when no contracts have gamma', () => {
    const result = buildOptionsModuleFromChain(makeSnapshot(baseContracts), 5000, 'polygon')
    expect(result.greeksAvailable).toBe(false)
  })

  it('is true when at least one contract has gamma', () => {
    const mixed = [
      ...baseContracts,
      { contractType: 'put' as const, expirationDate: '2025-03-21', strike: 5000, openInterest: 10000, gamma: 0.05 },
    ]
    const result = buildOptionsModuleFromChain(makeSnapshot(mixed), 5000, 'polygon')
    expect(result.greeksAvailable).toBe(true)
  })
})

describe('relativeWeight (renamed from gammaNotional)', () => {
  it('gammaLevels use relativeWeight not gammaNotional', () => {
    const result = buildOptionsModuleFromChain(makeSnapshot(baseContracts), 5000, 'yahoo')
    expect(result.structureAvailable).toBe(true)
    for (const level of result.gammaLevels) {
      // TypeScript will catch the field name at compile time; this checks runtime shape
      expect(typeof level.relativeWeight).toBe('number')
      expect((level as unknown as Record<string, unknown>)['gammaNotional']).toBeUndefined()
    }
  })
})
