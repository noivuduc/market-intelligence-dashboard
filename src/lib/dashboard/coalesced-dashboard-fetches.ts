// ============================================================
// Client: dedupe dashboard + AI fetches for React Strict Mode
//
// 1) singleFlight — concurrent callers share one Promise (same tick).
// 2) recent-result cache — Strict Mode remount often runs *after* the first
//    request finishes, so singleFlight's slot is already cleared. Reuse the
//    last successful JSON for a short TTL (no second HTTP round-trip).
//
// Use bypassDedupe: true for 60s market poll, manual retry, or when you must
// force a fresh upstream read.
// ============================================================

import { singleFlight } from '@/lib/util/singleFlight'
import type { DashboardState, TopLevelBriefing } from '@/lib/types'
import type { RegimeSummaryPacket } from '@/lib/ai/packets'

export type ClientFetchDedupeOpts = {
  /** When true, skip recent-result cache (still coalesces concurrent in-flight). */
  bypassDedupe?: boolean
}

const DEDUP_MS = (() => {
  const n = Number(process.env.NEXT_PUBLIC_CLIENT_FETCH_DEDUP_MS)
  return Number.isFinite(n) && n >= 500 && n <= 120_000 ? n : 5_000
})()

let recentCore: { data: DashboardState; until: number } | null = null
let recentSparklines: { data: Record<string, number[] | undefined>; until: number } | null = null
let recentOptions: { data: OptionsLaneJson | null; until: number } | null = null
const recentAiByKey = new Map<string, { brief: TopLevelBriefing; until: number }>()

/** @internal tests */
export function __resetClientDashboardFetchCacheForTests(): void {
  recentCore = null
  recentSparklines = null
  recentOptions = null
  recentAiByKey.clear()
}

export interface OptionsLaneJson {
  options: DashboardState['options']
  regime:  DashboardState['regime']
  alerts:  DashboardState['alerts']
}

export function fetchCoalescedDashboardCore(
  opts?: ClientFetchDedupeOpts,
): Promise<DashboardState> {
  const bypass = opts?.bypassDedupe === true
  if (!bypass && recentCore && Date.now() < recentCore.until) {
    return Promise.resolve(recentCore.data)
  }
  return singleFlight('client:dashboard:core:v1', async () => {
    const r = await fetch('/api/dashboard/core')
    if (!r.ok) throw new Error(`Core API ${r.status}`)
    const data = (await r.json()) as DashboardState
    recentCore = { data, until: Date.now() + DEDUP_MS }
    return data
  })
}

export function fetchCoalescedDashboardSparklines(
  opts?: ClientFetchDedupeOpts,
): Promise<Record<string, number[] | undefined>> {
  const bypass = opts?.bypassDedupe === true
  if (!bypass && recentSparklines && Date.now() < recentSparklines.until) {
    return Promise.resolve(recentSparklines.data)
  }
  return singleFlight('client:dashboard:sparklines:v1', async () => {
    const r = await fetch('/api/dashboard/sparklines')
    const j: unknown = await r.json().catch(() => null)
    if (!j || typeof j !== 'object') {
      const empty: Record<string, number[] | undefined> = {}
      recentSparklines = { data: empty, until: Date.now() + DEDUP_MS }
      return empty
    }
    const sparklines = (j as { sparklines?: unknown }).sparklines
    if (!sparklines || typeof sparklines !== 'object') {
      const empty: Record<string, number[] | undefined> = {}
      recentSparklines = { data: empty, until: Date.now() + DEDUP_MS }
      return empty
    }
    const data = sparklines as Record<string, number[] | undefined>
    recentSparklines = { data, until: Date.now() + DEDUP_MS }
    return data
  })
}

export function fetchCoalescedDashboardOptions(
  opts?: ClientFetchDedupeOpts,
): Promise<OptionsLaneJson | null> {
  const bypass = opts?.bypassDedupe === true
  if (!bypass && recentOptions && Date.now() < recentOptions.until) {
    return Promise.resolve(recentOptions.data)
  }
  return singleFlight('client:dashboard:options:v1', async () => {
    const r = await fetch('/api/dashboard/options')
    const j: unknown = await r.json().catch(() => null)
    let data: OptionsLaneJson | null = null
    if (j && typeof j === 'object') {
      const o = j as Partial<OptionsLaneJson>
      if (o.options && o.regime && o.alerts) {
        data = { options: o.options, regime: o.regime, alerts: o.alerts }
      }
    }
    recentOptions = { data, until: Date.now() + DEDUP_MS }
    return data
  })
}

/**
 * Same regime fingerprint → one POST. Survives Strict Mode sequential remount
 * via recentAiByKey for DEDUP_MS when bypassDedupe is false.
 */
export function fetchCoalescedAiSummary(
  packetKey: string,
  packet: RegimeSummaryPacket,
  opts?: ClientFetchDedupeOpts,
): Promise<TopLevelBriefing> {
  const bypass = opts?.bypassDedupe === true
  if (!bypass) {
    const hit = recentAiByKey.get(packetKey)
    if (hit && Date.now() < hit.until) {
      return Promise.resolve(hit.brief)
    }
  }
  return singleFlight(`client:ai:summary:${packetKey}`, async () => {
    const res = await fetch('/api/ai/summary', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ packet }),
    })
    const body: unknown = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg =
        typeof body === 'object' && body !== null && 'error' in body && typeof (body as { error: unknown }).error === 'string'
          ? (body as { error: string }).error
          : `HTTP ${res.status}`
      throw new Error(msg)
    }
    const brief = body as TopLevelBriefing
    if (typeof brief?.fullBrief !== 'string') {
      throw new Error('Invalid response from /api/ai/summary (expected briefing JSON).')
    }
    recentAiByKey.set(packetKey, { brief, until: Date.now() + DEDUP_MS })
    if (recentAiByKey.size > 12) {
      const now = Date.now()
      for (const [k, v] of recentAiByKey) {
        if (now >= v.until) recentAiByKey.delete(k)
      }
    }
    return brief
  })
}
