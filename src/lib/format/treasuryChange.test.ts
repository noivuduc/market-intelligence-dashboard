import { describe, it, expect } from 'vitest'
import { yieldChangeToBps, formatYieldDeltaBps } from './treasuryChange'

describe('yieldChangeToBps', () => {
  it('converts yield delta in percentage points to bps', () => {
    expect(yieldChangeToBps(0.032)).toBeCloseTo(3.2, 5)
  })
})

describe('formatYieldDeltaBps', () => {
  it('returns null for null input', () => {
    expect(formatYieldDeltaBps(null)).toBeNull()
  })
  it('formats signed bps', () => {
    expect(formatYieldDeltaBps(0.04)).toBe('+4.0 bps')
    expect(formatYieldDeltaBps(-0.015)).toBe('-1.5 bps')
  })
})
