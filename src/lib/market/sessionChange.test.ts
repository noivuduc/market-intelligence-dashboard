import { describe, it, expect } from 'vitest'
import { sessionChangeFromCloses } from './sessionChange'

describe('sessionChangeFromCloses', () => {
  it('returns null when fewer than 2 closes', () => {
    expect(sessionChangeFromCloses([100])).toEqual({ changePct: null, changeAbs: null })
  })
  it('computes 1D pct from last two closes', () => {
    const r = sessionChangeFromCloses([100, 102])
    expect(r.changeAbs).toBe(2)
    expect(r.changePct).toBeCloseTo(2, 5)
  })
  it('returns null when prior close is non-positive', () => {
    expect(sessionChangeFromCloses([0, 1])).toEqual({ changePct: null, changeAbs: null })
  })
})
