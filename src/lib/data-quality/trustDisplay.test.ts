import { describe, it, expect } from 'vitest'
import { trustOperationalState } from './trustDisplay'
import type { SourceMeta } from '@/lib/sources/types'

function meta(p: Partial<SourceMeta>): SourceMeta {
  return {
    sourceId: 't',
    sourceName: 'Test',
    dataClass: 'observed',
    confidence: 'high',
    fetchedAt: new Date().toISOString(),
    dataAsOf: new Date().toISOString(),
    cadenceLabel: 'daily',
    requiresPremium: false,
    ...p,
  }
}

describe('trustOperationalState', () => {
  it('returns fallback when isFallback', () => {
    expect(trustOperationalState(meta({ isFallback: true }))).toBe('fallback')
  })
  it('returns unavailable when fetchError', () => {
    expect(trustOperationalState(meta({ fetchError: 'x', isFallback: true }))).toBe('unavailable')
  })
  it('returns delayed for delayed dataClass', () => {
    expect(trustOperationalState(meta({ dataClass: 'delayed' }))).toBe('delayed')
  })
})
