'use client'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import type { DashboardState, TopLevelBriefing } from '@/lib/types'
import { buildDeterministicBriefing, isPlaceholderBriefing } from '@/lib/brief/deterministicBrief'
import {
  buildFedPacket, buildTreasuryPacket, buildMacroPacket,
  buildLiquidityPacket, buildBreadthPacket, buildOptionsPacket,
  buildRegimeSummaryPacket,
} from '@/lib/ai/packets'
import { TopBar }              from '@/components/layout/TopBar'
import { DataQualityBanner }   from '@/components/ui/DataQualityBanner'
import { CrossAssetStrip }     from '@/components/command/CrossAssetStrip'
import type { SitrepSource }   from '@/components/command/CommandBriefHero'
import { DashboardDeck }       from '@/components/dashboard/DashboardDeck'

const MARKET_REFRESH_MS  = 60_000    // Layer 1: prices
const AI_REFRESH_MS      = 15 * 60_000  // Layer 3: AI summary

export default function DashboardPage() {
  const [state,    setState]    = useState<DashboardState | null>(null)
  const [briefing, setBriefing] = useState<TopLevelBriefing | null>(null)
  const [aiBriefError, setAiBriefError] = useState<string | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [lastFetch,setLastFetch]= useState('')
  const aiRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ---- Fetch market data ----
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data: DashboardState = await res.json()
      setState(data)
      setLastFetch(new Date().toISOString())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fetch failed')
    } finally {
      setLoading(false)
    }
  }, [])

  // ---- Fetch AI summary (separate 15-min cycle) ----
  const fetchAISummary = useCallback(async (data: DashboardState) => {
    if (!data.dataQuality.aiAvailable) {
      setAiBriefError(null)
      return
    }
    setAiBriefError(null)
    try {
      const packet = buildRegimeSummaryPacket(
        data.regime,
        data.fed,
        data.treasury,
        data.macro,
        data.liquidity,
        data.breadth,
        data.options,
      )
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
        setAiBriefError(msg)
        console.warn('[AI summary]', msg)
        return
      }
      const brief = body as TopLevelBriefing
      if (typeof brief?.fullBrief !== 'string') {
        setAiBriefError('Invalid response from /api/ai/summary (expected briefing JSON).')
        console.warn('[AI summary] missing fullBrief in response', body)
        return
      }
      setBriefing(brief)
      setAiBriefError(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'AI summary request failed'
      setAiBriefError(msg)
      console.warn('[AI summary]', e)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const marketTimer = setInterval(fetchData, MARKET_REFRESH_MS)
    return () => clearInterval(marketTimer)
  }, [fetchData])

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

  // When state first loads, trigger AI summary + set up 15-min AI refresh
  useEffect(() => {
    if (!state) return
    fetchAISummary(state)
    if (aiRefreshRef.current) clearInterval(aiRefreshRef.current)
    aiRefreshRef.current = setInterval(() => fetchAISummary(state), AI_REFRESH_MS)
    return () => {
      if (aiRefreshRef.current) clearInterval(aiRefreshRef.current)
    }
  }, [state?.regime.label, state?.regime.confidence]) // re-trigger on regime change

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

        {state.crossAsset.length > 0 && (
          <section className="scroll-mt-16 mb-4" aria-label="Cross-asset">
            <CrossAssetStrip items={state.crossAsset} />
          </section>
        )}

        <section className="scroll-mt-16" aria-label="Command grid">
          <DashboardDeck
            state={state}
            executive={executive}
            sitrep={sitrep}
            sitrepSource={sitrepSource}
            aiBriefError={aiBriefError}
            lastFetch={lastFetch}
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
