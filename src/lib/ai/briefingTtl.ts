import type { TopLevelBriefing } from '@/lib/types'

/**
 * Ensures expiresAt is strictly after cachedAt when serving cached AI briefings.
 * Prevents TTL bugs where expiresAt === cachedAt.
 */
export function normalizeBriefingTtl(brief: TopLevelBriefing, ttlMs: number): TopLevelBriefing {
  const cachedAtMs = new Date(brief.cachedAt).getTime()
  const expiresMs = new Date(brief.expiresAt).getTime()
  if (!Number.isFinite(cachedAtMs) || !Number.isFinite(expiresMs) || expiresMs <= cachedAtMs) {
    return {
      ...brief,
      expiresAt: new Date(cachedAtMs + ttlMs).toISOString(),
    }
  }
  return brief
}
