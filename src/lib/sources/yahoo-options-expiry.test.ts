import { describe, expect, it } from 'vitest'
import { expirationToIsoDate } from '@/lib/sources/yahoo-options'

describe('expirationToIsoDate (yahoo-finance2 vs raw Yahoo)', () => {
  it('accepts Date from yahoo-finance2 coercion', () => {
    expect(expirationToIsoDate(new Date('2026-03-26T00:00:00.000Z'))).toBe('2026-03-26')
  })

  it('accepts unix seconds from raw v7 JSON', () => {
    const sec = Math.floor(new Date('2026-03-26T12:00:00Z').getTime() / 1000)
    expect(expirationToIsoDate(sec)).toBe('2026-03-26')
  })

  it('accepts Yahoo { raw } wrapper for unix expiry', () => {
    const sec = Math.floor(new Date('2026-03-26T12:00:00Z').getTime() / 1000)
    expect(expirationToIsoDate({ raw: sec, fmt: '2026-03-26' })).toBe('2026-03-26')
  })
})
