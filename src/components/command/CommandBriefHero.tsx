'use client'

import { clsx } from 'clsx'
import type { DashboardState, ExecutiveSummary, TopLevelBriefing } from '@/lib/types'
import { REGIME_CONFIG } from '@/lib/regime/engine'
import { ConfidenceBar } from '@/components/ui/StatusChip'

export type SitrepSource = 'ai' | 'deterministic'

interface Props {
  state:          DashboardState
  executive:      ExecutiveSummary
  sitrep:         TopLevelBriefing
  sitrepSource:   SitrepSource
  aiBriefError:   string | null
  feedUpdatedAt:  string
}

const SUB_KEYS = ['policy', 'liquidity', 'risk', 'trend', 'flow', 'positioning'] as const

export function CommandBriefHero({
  state,
  executive,
  sitrep,
  sitrepSource,
  aiBriefError,
  feedUpdatedAt,
}: Props) {
  const { regime } = state
  const cfg = REGIME_CONFIG[regime.label]
  const accentBorder = {
    'risk-on': 'border-tac-700',
    'risk-off': 'border-crit-800',
    sideways: 'border-steel-700',
    'bottoming-candidate': 'border-amber-800',
    'topping-candidate': 'border-amber-800',
    transition: 'border-steel-600',
  }[regime.label]

  const feedAge = (() => {
    const m = Math.floor((Date.now() - new Date(feedUpdatedAt).getTime()) / 60000)
    return m < 1 ? '<1m' : `${m}m`
  })()

  return (
    <div
      className={clsx(
        'rounded-sm border-l-4 bg-ops-900/40 border border-ops-600 overflow-hidden',
        accentBorder,
      )}
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-0 xl:divide-x divide-ops-700">
        {/* Command posture — dominant regime */}
        <div className="xl:col-span-5 p-4 xl:p-5 flex flex-col gap-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-ink-muted mb-2">
              Market regime
            </div>
            <div className={clsx('font-mono text-3xl xl:text-4xl font-bold tracking-tight leading-tight', cfg.textClass)}>
              {cfg.label}
            </div>
            <p className="text-sm text-ink-secondary leading-snug mt-2 max-w-prose">
              {cfg.description}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-6">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-ink-muted mb-1">
                Engine confidence
              </div>
              <div className={clsx('font-mono text-5xl font-bold tabular-nums', cfg.textClass)}>
                {regime.confidence}
                <span className="text-2xl ml-0.5 opacity-80">%</span>
              </div>
            </div>
            <div className="flex-1 min-w-[140px] max-w-xs pb-1">
              <ConfidenceBar value={regime.confidence} showNumber={false} size="md" />
            </div>
          </div>

          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-ink-muted mb-2">
              Sub-scores
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {SUB_KEYS.map(key => {
                const val = regime.subScores[key]
                return (
                  <div key={key} className="flex flex-col gap-1">
                    <span className="text-[0.65rem] uppercase tracking-wider text-ink-muted font-mono truncate">
                      {key}
                    </span>
                    <div className="h-1 bg-ops-600 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${val}%`,
                          backgroundColor: val >= 60 ? '#3DA85E' : val >= 40 ? '#E89B10' : '#C72019',
                        }}
                      />
                    </div>
                    <span className="text-[0.65rem] font-mono text-ink-muted">{val}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="text-[0.65rem] font-mono uppercase tracking-wider text-ink-muted border-t border-ops-700 pt-3">
            Feed refresh · {feedAge} ago · market layer 60s / policy 1h / macro 24h
          </div>
        </div>

        {/* Drivers / risks / watch — scan-first lists */}
        <div className="xl:col-span-4 p-4 xl:p-5 flex flex-col gap-4 bg-ops-black/20">
          <CommandList title="Top drivers" items={regime.drivers.slice(0, 3)} accent="tac" />
          <CommandList title="Top risks" items={regime.risks.slice(0, 3)} accent="crit" />
          <CommandList title="Watch next" items={regime.watchNext.slice(0, 3)} accent="amber" />
        </div>

        {/* SITREP + catalyst */}
        <div className="xl:col-span-3 p-4 xl:p-5 flex flex-col gap-3 border-t xl:border-t-0 border-ops-700">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-ink-muted mb-1">
              Upcoming focus
            </div>
            <div className="text-sm font-mono text-amber-400 leading-snug">
              {state.macro.nextCatalyst?.date
                ? `${state.macro.nextCatalyst.name} · ${state.macro.nextCatalyst.date}`
                : state.macro.nextCatalyst?.unavailableReason
                  ? state.macro.nextCatalyst.unavailableReason
                  : state.macro.nextCatalyst?.name && state.macro.nextCatalyst.name !== 'Pending'
                    ? state.macro.nextCatalyst.name
                    : 'Assign next high-impact release in macro calendar'}
            </div>
            {state.fed.daysToFomc != null && state.fed.nextFomcDate && (
              <div className="text-xs text-ink-secondary mt-2 font-mono">
                FOMC: {state.fed.nextFomcDate} ({state.fed.daysToFomc}d)
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col min-h-0 border border-ops-600 rounded-sm bg-ops-900/30">
            <div className="px-3 py-2 border-b border-ops-700 flex items-center justify-between gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-tac-600">
                Sitrep
              </span>
              <span
                className={clsx(
                  'text-[0.65rem] font-mono uppercase px-1.5 py-0.5 rounded-sm border',
                  sitrepSource === 'ai'
                    ? 'border-tac-800 text-tac-500 bg-tac-900/20'
                    : 'border-steel-700 text-steel-400 bg-steel-900/20',
                )}
              >
                {sitrepSource === 'ai' ? 'AI · Claude' : 'Rules engine'}
              </span>
            </div>
            <div className="p-3 text-sm text-ink-secondary leading-relaxed flex-1 overflow-auto max-h-[220px]">
              {sitrep.fullBrief}
            </div>
          </div>

          {aiBriefError && state.dataQuality.aiAvailable && (
            <div className="text-[0.65rem] font-mono text-amber-500 border border-amber-900/50 rounded-sm px-2 py-1.5 bg-amber-900/10">
              AI layer: {aiBriefError.slice(0, 120)}{aiBriefError.length > 120 ? '…' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Analytical strip: changes / invalidation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-t border-ops-700 divide-y lg:divide-y-0 lg:divide-x divide-ops-700">
        <SignalColumn title="Top changes" items={executive.topChanges} tone="amber" />
        <SignalColumn title="Top risks" items={executive.topRisks} tone="crit" />
        <div className="p-3 bg-crit-900/10">
          <div className="text-[0.65rem] font-mono uppercase tracking-widest text-crit-500 mb-2">
            Invalidation
          </div>
          <p className="text-xs text-ink-secondary leading-snug">
            {sitrep.whatBreaks || executive.whatBreaks}
          </p>
        </div>
      </div>

      {/* Secondary intel row — structured fields */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-0 border-t border-ops-700 divide-x divide-ops-700">
        <IntelCell label="Regime read" value={sitrep.regime} />
        <IntelCell label="Why" value={sitrep.why} />
        <IntelCell label="What changed" value={sitrep.whatChanged} />
        <IntelCell label="Confirms" value={sitrep.whatConfirms} />
        <IntelCell label="Watch" value={sitrep.watchNext} />
        <IntelCell label="Sitrep age" value={formatBriefAge(sitrep.cachedAt)} />
      </div>
    </div>
  )
}

function CommandList({
  title,
  items,
  accent,
}: {
  title: string
  items: string[]
  accent: 'tac' | 'crit' | 'amber'
}) {
  const titleCls = { tac: 'text-tac-600', crit: 'text-crit-500', amber: 'text-amber-600' }[accent]
  const bullet = { tac: 'text-tac-600', crit: 'text-crit-500', amber: 'text-amber-600' }[accent]
  return (
    <div>
      <div className={clsx('text-xs font-mono uppercase tracking-widest mb-2', titleCls)}>
        {title}
      </div>
      <ol className="space-y-2 list-none">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-ink-secondary leading-snug">
            <span className={clsx('font-mono text-xs flex-shrink-0 mt-0.5', bullet)}>{i + 1}.</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function SignalColumn({
  title,
  items,
  tone,
}: {
  title: string
  items: string[]
  tone: 'amber' | 'crit'
}) {
  const bg = tone === 'crit' ? 'bg-crit-900/5' : 'bg-amber-900/5'
  const tc = tone === 'crit' ? 'text-crit-500' : 'text-amber-600'
  return (
    <div className={clsx('p-3', bg)}>
      <div className={clsx('text-[0.65rem] font-mono uppercase tracking-widest mb-2', tc)}>
        {title}
      </div>
      <ul className="space-y-1.5">
        {items.slice(0, 4).map((item, i) => (
          <li key={i} className="text-xs text-ink-secondary leading-snug flex gap-2">
            <span className={clsx('font-mono flex-shrink-0', tc)}>▸</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function IntelCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 min-h-[4.5rem]">
      <div className="text-[0.6rem] font-mono uppercase tracking-wider text-ink-muted mb-1">{label}</div>
      <div className="text-xs text-ink-secondary leading-snug line-clamp-4">{value || '—'}</div>
    </div>
  )
}

function formatBriefAge(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}
