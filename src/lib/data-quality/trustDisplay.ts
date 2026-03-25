// ============================================================
// Trust / freshness display helpers (UI + tests)
// Maps SourceMeta → coarse operational state for styling
// ============================================================

import type { SourceMeta } from '@/lib/sources/types'

export type TrustOperationalState =
  | 'fresh'
  | 'delayed'
  | 'stale'
  | 'unavailable'
  | 'fallback'

const DAY_MS = 86_400_000

export function trustOperationalState(meta: SourceMeta): TrustOperationalState {
  if (meta.fetchError) return 'unavailable'
  if (meta.isFallback) return 'fallback'
  if (meta.dataClass === 'delayed') return 'delayed'

  const asOf = new Date(meta.dataAsOf).getTime()
  if (!Number.isFinite(asOf)) return 'stale'

  const ageMs = Date.now() - asOf
  if (ageMs < 0) return 'fresh'
  if (ageMs < 120_000) return 'fresh'
  if (ageMs < 15 * 60_000) return 'delayed'
  if (ageMs < 24 * DAY_MS) return 'stale'
  return 'unavailable'
}

export function trustStyleClass(state: TrustOperationalState): string {
  switch (state) {
    case 'fresh':
      return 'border-l-tac-600'
    case 'delayed':
      return 'border-l-steel-500'
    case 'stale':
      return 'border-l-amber-600'
    case 'fallback':
      return 'border-l-amber-700 border-dashed'
    case 'unavailable':
    default:
      return 'border-l-crit-700 opacity-90'
  }
}
