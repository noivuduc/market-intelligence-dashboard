import { describe, it, expect } from 'vitest'
import { normalizeBriefingTtl } from './briefingTtl'
import type { TopLevelBriefing } from '@/lib/types'

describe('normalizeBriefingTtl', () => {
  it('extends expiresAt when equal to cachedAt', () => {
    const t = '2026-01-15T12:00:00.000Z'
    const brief: TopLevelBriefing = {
      regime: 'x',
      why: 'y',
      whatChanged: '',
      whatConfirms: '',
      whatBreaks: '',
      watchNext: '',
      fullBrief: '',
      cachedAt: t,
      expiresAt: t,
    }
    const out = normalizeBriefingTtl(brief, 900_000)
    expect(new Date(out.expiresAt).getTime()).toBeGreaterThan(new Date(out.cachedAt).getTime())
  })

  it('leaves valid TTL unchanged', () => {
    const cachedAt = '2026-01-15T12:00:00.000Z'
    const expiresAt = '2026-01-15T12:20:00.000Z'
    const brief: TopLevelBriefing = {
      regime: 'x',
      why: 'y',
      whatChanged: '',
      whatConfirms: '',
      whatBreaks: '',
      watchNext: '',
      fullBrief: '',
      cachedAt,
      expiresAt,
    }
    const out = normalizeBriefingTtl(brief, 900_000)
    expect(out.expiresAt).toBe(expiresAt)
  })
})
