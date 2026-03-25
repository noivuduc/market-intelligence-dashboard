import { describe, it, expect } from 'vitest'
import { fredMillionsToTrillions, fredBillionsToTrillions, formatTrillionsUsd } from './money'

describe('fredMillionsToTrillions', () => {
  it('converts WRESBAL-style millions to trillions', () => {
    expect(fredMillionsToTrillions(3_200_000)).toBeCloseTo(3.2, 5)
  })
})

describe('fredBillionsToTrillions', () => {
  it('converts ON RRP billions to trillions', () => {
    expect(fredBillionsToTrillions(380)).toBeCloseTo(0.38, 5)
  })
})

describe('formatTrillionsUsd', () => {
  it('formats trillions', () => {
    expect(formatTrillionsUsd(3.156)).toBe('$3.16T')
  })
})
