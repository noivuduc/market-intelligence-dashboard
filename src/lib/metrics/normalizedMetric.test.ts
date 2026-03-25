import { describe, it, expect } from 'vitest'
import { emptyNormalizedMetric, formatYieldPercent, formatBpsChange } from './normalizedMetric'

describe('normalizedMetric helpers', () => {
  it('emptyNormalizedMetric marks unavailable', () => {
    const m = emptyNormalizedMetric('%', '%')
    expect(m.unavailable).toBe(true)
    expect(m.formatted).toBe('—')
  })

  it('formatYieldPercent handles null', () => {
    expect(formatYieldPercent(null)).toBe('—')
  })

  it('formatBpsChange returns signed bps', () => {
    expect(formatBpsChange(3.25)).toBe('+3.3 bps')
    expect(formatBpsChange(-1.1)).toBe('-1.1 bps')
  })
})
