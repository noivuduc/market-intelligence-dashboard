'use client'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import type { DashboardState, TopLevelBriefing } from '@/lib/types'
import { buildDeterministicBriefing, isPlaceholderBriefing } from '@/lib/brief/deterministicBrief'
import { buildRegimeSummaryPacket } from '@/lib/ai/packets'
import { regimeSummaryPacketCacheKey } from '@/lib/ai/summaryPacketHash'
import { TopBar }              from '@/components/layout/TopBar'
import { DataQualityBanner }   from '@/components/ui/DataQualityBanner'
import type { SitrepSource }   from '@/components/command/CommandBriefHero'
import { DashboardDeck }       from '@/components/dashboard/DashboardDeck'
import { applyOptionsLane, applySparklineLane } from '@/lib/dashboard/client-merge'
import {
  fetchCoalescedAiSummary,
  fetchCoalescedDashboardCore,
  fetchCoalescedDashboardOptions,
  fetchCoalescedDashboardSparklines,
} from '@/lib/dashboard/coalesced-dashboard-fetches'

const MARKET_REFRESH_MS = 60_000 // Layer 1: prices

/** Defer options lane after core paint so Yahoo chart burst finishes before v7/options */
const OPTIONS_LANE_DEFER_MS = (() => {
  const n = Number(process.env.NEXT_PUBLIC_OPTIONS_LANE_DEFER_MS)
  return Number.isFinite(n) && n >= 0 ? n : 800
})()

/** Layer 3: AI poll — default 30m; set NEXT_PUBLIC_AI_REFRESH_MS (milliseconds) to override */
const AI_REFRESH_MS = (() => {
  const n = Number(process.env.NEXT_PUBLIC_AI_REFRESH_MS)
  return Number.isFinite(n) && n >= 60_000 ? n : 30 * 60_000
})()

export default function DashboardPage() {
  const [state,        setState]       = useState<DashboardState | null>(null)
  const [briefing,     setBriefing]    = useState<TopLevelBriefing | null>(null)
  const [aiBriefError, setAiBriefError]= useState<string | null>(null)
  const [loading,      setLoading]     = useState(true)
  const [error,        setError]       = useState<string | null>(null)
  const [lastFetch,    setLastFetch]   = useState('')
  /** True only during background polls — never set during initial load so skeleton shows instead. */
  const [isRefreshing, setIsRefreshing]= useState(false)
  const aiRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stateRef = useRef<DashboardState | null>(null)
  const briefingRef = useRef<TopLevelBriefing | null>(null)
  const lastAiPacketKeyRef = useRef<string | null>(null)
  /** Tracks regime label across effect runs; `undefined` = first run for this mount (Strict Mode resets refs). */
  const prevAiRegimeLabelRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    briefingRef.current = briefing
  }, [briefing])

  /**
   * Core → sparklines. `bypassDedupe: false` (initial load) avoids a second HTTP call
   * when Strict Mode remounts after the first response (micro-cache + singleFlight).
   * `bypassDedupe: true` for 60s poll and manual retry — always hit the network.
   */
  const refreshDashboardLanes = useCallback(async (opts?: { bypassDedupe?: boolean }) => {
    const bypass = opts?.bypassDedupe === true
    // Flag background refreshes (state already has data) so the deck can show a
    // subtle SYNCING badge instead of blanking cards.
    const isSubsequent = stateRef.current !== null
    if (isSubsequent) setIsRefreshing(true)
    try {
      const data = await fetchCoalescedDashboardCore({ bypassDedupe: bypass })
      // Merge with previous good state to prevent cards from flashing when an
      // individual module temporarily degrades (e.g. options 429 → placeholder).
      setState((prev) => {
        if (!prev) return data
        // Preserve a live options structure if the new core response has a placeholder.
        const nextOptions =
          prev.options.structureAvailable && !data.options.structureAvailable
            ? prev.options
            : data.options
        return nextOptions === data.options ? data : { ...data, options: nextOptions }
      })
      setLastFetch(new Date().toISOString())
      setError(null)

      void fetchCoalescedDashboardSparklines({ bypassDedupe: bypass })
        .then((sparklines) => {
          setState((s) => (s ? applySparklineLane(s, sparklines) : null))
        })
        .catch(() => {})
    } catch (e) {
      // On poll failure: keep previous data visible; only surface error on initial load.
      if (!isSubsequent) setError(e instanceof Error ? e.message : 'Fetch failed')
    } finally {
      setLoading(false)
      if (isSubsequent) setIsRefreshing(false)
    }
  }, [])

  /** Deferred options lane; return timeout id for cleanup between interval ticks. */
  const scheduleOptionsLane = useCallback((bypassDedupe: boolean): number => {
    return window.setTimeout(() => {
      void fetchCoalescedDashboardOptions({ bypassDedupe })
        .then((o) => {
          if (!o) return
          setState((s) => (s ? applyOptionsLane(s, o) : null))
        })
        .catch(() => {})
    }, OPTIONS_LANE_DEFER_MS)
  }, [])

  /** Manual retry — always bypass client micro-cache */
  const fetchData = useCallback(async () => {
    await refreshDashboardLanes({ bypassDedupe: true })
    scheduleOptionsLane(true)
  }, [refreshDashboardLanes, scheduleOptionsLane])

  /**
   * Executive AI brief — skips HTTP entirely when regime fingerprint matches last success
   * and the current briefing is still within expiresAt (saves cost vs polling every N minutes).
   * Server still dedupes with the same fingerprint + in-memory cache on actual POSTs.
   */
  const fetchAISummary = useCallback(async (opts?: { force?: boolean }) => {
    const data = stateRef.current
    if (!data?.dataQuality.aiAvailable) {
      setAiBriefError(null)
      return
    }
    const packet = buildRegimeSummaryPacket(
      data.regime,
      data.fed,
      data.treasury,
      data.macro,
      data.liquidity,
      data.breadth,
      data.options,
    )
    const fp = regimeSummaryPacketCacheKey(packet)
    const currentBrief = briefingRef.current
    if (
      !opts?.force &&
      fp === lastAiPacketKeyRef.current &&
      currentBrief &&
      typeof currentBrief.expiresAt === 'string' &&
      new Date(currentBrief.expiresAt).getTime() > Date.now()
    ) {
      return
    }

    setAiBriefError(null)
    try {
      const brief = await fetchCoalescedAiSummary(fp, packet)
      setBriefing(brief)
      lastAiPacketKeyRef.current = fp
      setAiBriefError(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'AI summary request failed'
      setAiBriefError(msg)
      console.warn('[AI summary]', e)
    }
  }, [])

  useEffect(() => {
    let optionsTimeout: number | null = null

    /** Initial mount (incl. Strict Mode remount): allow micro-cache dedupe. */
    const runInitial = async () => {
      await refreshDashboardLanes({ bypassDedupe: false })
      if (optionsTimeout != null) window.clearTimeout(optionsTimeout)
      optionsTimeout = scheduleOptionsLane(false)
    }

    /** Timed refresh: must fetch fresh quotes from Yahoo/FRED. */
    const runPoll = async () => {
      await refreshDashboardLanes({ bypassDedupe: true })
      if (optionsTimeout != null) window.clearTimeout(optionsTimeout)
      optionsTimeout = scheduleOptionsLane(true)
    }

    void runInitial()
    const marketTimer = setInterval(runPoll, MARKET_REFRESH_MS)
    return () => {
      if (optionsTimeout != null) window.clearTimeout(optionsTimeout)
      clearInterval(marketTimer)
    }
  }, [refreshDashboardLanes, scheduleOptionsLane])

  // Hash targets (e.g. /#macro) only exist after dashboard data renders — scroll after load.
  useEffect(() => {
    if (!state) return
    const scrollToHash = () => {
      const id = window.location.hash.slice(1)
      if (!id) return
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
    scrollToHash()
    window.addEventListener('hashchange', scrollToHash)
    return () => window.removeEventListener('hashchange', scrollToHash)
  }, [state])

  // AI: one initial POST after options lane time (stateRef has merged options); immediate refetch only
  // when regime *label* changes. Never key on confidence — options merge nudges it and doubled /summary.
  useEffect(() => {
    if (!state) return
    const label = state.regime.label

    let initialDelayTimer: number | undefined
    const prev = prevAiRegimeLabelRef.current
    if (prev === undefined) {
      initialDelayTimer = window.setTimeout(() => {
        void fetchAISummary({ force: false })
      }, OPTIONS_LANE_DEFER_MS + 500)
    } else if (prev !== label) {
      void fetchAISummary({ force: false })
    }
    prevAiRegimeLabelRef.current = label

    if (aiRefreshRef.current) clearInterval(aiRefreshRef.current)
    aiRefreshRef.current = setInterval(() => {
      void fetchAISummary()
    }, AI_REFRESH_MS)

    return () => {
      if (initialDelayTimer != null) window.clearTimeout(initialDelayTimer)
      if (aiRefreshRef.current) clearInterval(aiRefreshRef.current)
    }
  }, [state?.regime.label, fetchAISummary])

  // Merge AI briefing into state for components
  const executive = state ? {
    ...state.executive,
    briefing: briefing ?? state.executive.briefing,
  } : null

  const { sitrep, sitrepSource } = useMemo((): { sitrep: TopLevelBriefing | null; sitrepSource: SitrepSource } => {
    if (!state || !executive) return { sitrep: null, sitrepSource: 'deterministic' }
    const merged = executive.briefing
    if (briefing && !isPlaceholderBriefing(briefing)) {
      return { sitrep: briefing, sitrepSource: 'ai' }
    }
    if (isPlaceholderBriefing(merged)) {
      return { sitrep: buildDeterministicBriefing(state), sitrepSource: 'deterministic' }
    }
    return { sitrep: merged, sitrepSource: 'ai' }
  }, [state, executive, briefing])

  if (loading) return <LoadingScreen />
  if (error || !state || !executive || !sitrep) return <ErrorScreen message={error ?? 'No data'} retry={fetchData} />

  return (
    <div className="min-h-screen bg-ops-black grid-overlay">
      <TopBar
        regime={state.regime}
        alerts={state.alerts}
        lastUpdated={lastFetch}
      />

      <main className="px-4 py-4 max-w-[1920px] mx-auto">

        {/* Data quality warning */}
        <DataQualityBanner quality={state.dataQuality} />

        <section className="scroll-mt-16" aria-label="Command grid">
          <DashboardDeck
            state={state}
            executive={executive}
            sitrep={sitrep}
            sitrepSource={sitrepSource}
            aiBriefError={aiBriefError}
            lastFetch={lastFetch}
            isRefreshing={isRefreshing}
          />
        </section>

        {/* Footer */}
        <footer className="mt-8 pt-4 border-t border-ops-700 pb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-2xs font-mono text-ink-ghost uppercase tracking-widest">
              MARKET INTEL // COMMAND DASHBOARD v2.0
            </div>
            <div className="flex items-center gap-4">
              <DataStatusDot label="FRED" ok={state.dataQuality.fredAvailable} />
              <DataStatusDot label="MARKET" ok={state.dataQuality.marketAvailable} />
              <DataStatusDot label="AI" ok={state.dataQuality.aiAvailable} />
            </div>
            <div className="text-2xs font-mono text-ink-ghost">
              All inferred/proxy signals carry LOW confidence.
              Not investment advice. Data sources: FRED · Yahoo Finance · Derived.
            </div>
            <div className="text-2xs font-mono text-ink-ghost">
              Updated: {lastFetch ? new Date(lastFetch).toLocaleTimeString() : '—'}
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}

function DataStatusDot({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-tac-500' : 'bg-crit-600'}`} />
      <span className="text-2xs font-mono text-ink-ghost">{label}</span>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-ops-black flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="animate-spin" style={{ animationDuration: '3s' }}>
          <circle cx="32" cy="32" r="28" stroke="#1C2636" strokeWidth="2"/>
          <circle cx="32" cy="32" r="28" stroke="#3DA85E" strokeWidth="2" strokeDasharray="44 132" strokeLinecap="round"/>
          <circle cx="32" cy="32" r="18" stroke="#3DA85E" strokeWidth="1" opacity="0.3"/>
          <circle cx="32" cy="32" r="4"  fill="#3DA85E"   opacity="0.6"/>
        </svg>
      </div>
      <div className="font-mono text-xs uppercase tracking-[0.3em] text-tac-600 animate-pulse">
        INITIALIZING FEED
      </div>
      <div className="font-mono text-2xs text-ink-ghost">
        MARKET INTEL // COMMAND DASHBOARD
      </div>
    </div>
  )
}

function ErrorScreen({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="min-h-screen bg-ops-black flex flex-col items-center justify-center gap-4">
      <div className="font-mono text-xs uppercase tracking-wider text-crit-400">FEED ERROR</div>
      <div className="font-mono text-2xs text-ink-ghost">{message}</div>
      <button
        onClick={retry}
        className="px-4 py-1.5 border border-steel-700 text-2xs font-mono uppercase tracking-wider text-steel-400 hover:bg-steel-900/30 transition-colors rounded-sm"
      >
        RETRY CONNECTION
      </button>
    </div>
  )
}
