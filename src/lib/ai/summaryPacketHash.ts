// ============================================================
// Cache fingerprint for executive AI summary — shared by client
// and /api/ai/summary so skip logic stays aligned with server cache.
// Intentionally coarse: only regime identity/scores (not every tick).
// ============================================================

import type { RegimeSummaryPacket } from '@/lib/ai/packets'

/** Same key shape as server in-memory cache for ai:summary */
export function regimeSummaryPacketCacheKey(packet: RegimeSummaryPacket): string {
  const key = `${packet.regime.label}:${packet.regime.confidence}:${JSON.stringify(packet.regime.subScores)}`
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(16).slice(0, 8)
}
