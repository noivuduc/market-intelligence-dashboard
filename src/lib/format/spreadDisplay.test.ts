import { describe, it, expect } from 'vitest'
import { spreadPercentToBps, formatSpreadBpsFromFredPercent } from './spreadDisplay'

describe('spreadPercentToBps', () => {
  it('maps FRED percent OAS to bps', () => {
    expect(spreadPercentToBps(3.21)).toBeCloseTo(321, 5)
  })
})

describe('formatSpreadBpsFromFredPercent', () => {
  it('renders whole bps', () => {
    expect(formatSpreadBpsFromFredPercent(3.21)).toBe('321 bps')
  })
})
