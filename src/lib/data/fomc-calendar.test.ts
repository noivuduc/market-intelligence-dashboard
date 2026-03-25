import { describe, it, expect } from 'vitest'
import { getNextFOMC, getLastFOMC, ALL_FOMC } from './fomc-calendar'

describe('FOMC calendar', () => {
  it('includes 2026 meetings', () => {
    expect(ALL_FOMC.some(m => m.statementDate.startsWith('2026-'))).toBe(true)
  })
  it('getLastFOMC is before getNextFOMC when both exist', () => {
    const last = getLastFOMC()
    const next = getNextFOMC()
    if (!last || !next) return
    expect(last.statementDate < next.statementDate).toBe(true)
  })
})
