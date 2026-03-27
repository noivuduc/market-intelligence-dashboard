'use client'

import type { InternalsModule, BreadthModule, FlowsModule } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { ModuleMetaFooter } from '@/components/ui/ModuleMetaFooter'
import { StatusBadge } from '@/components/ui/StatusChip'
import { clsx } from 'clsx'
import { buildProxyInternals, type ProxyInternals } from '@/lib/features/internals-proxy'

interface Props {
  data:     InternalsModule
  breadth?: BreadthModule | null
  flows?:   FlowsModule    | null
}

// ── Mode detection ────────────────────────────────────────────────────────────

type InternalsMode = 'full' | 'proxy' | 'provider-required'

function detectMode(
  data:    InternalsModule,
  breadth: BreadthModule | null | undefined,
): InternalsMode {
  const hasLiveFeed =
    data.advDecLine.data.length      > 0 ||
    data.upDownVolRatio.data.length  > 0 ||
    data.vwapParticipation.data.length > 0
  if (hasLiveFeed) return 'full'
  if (breadth && breadth.sectorBreadth.length > 0) return 'proxy'
  return 'provider-required'
}

// ── Shared mini-stat cell ─────────────────────────────────────────────────────

function StatCell({
  label, children, className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={clsx(
      'flex flex-col gap-1 border border-ops-700 rounded-sm px-2 py-1.5 bg-ops-950/40',
      className,
    )}>
      <span className="text-2xs font-mono uppercase tracking-wider text-ink-ghost leading-none">
        {label}
      </span>
      <div className="min-h-0">{children}</div>
    </div>
  )
}

// ── Sector breadth bar ────────────────────────────────────────────────────────

function SectorBar({
  advancing, declining, neutral, total,
}: {
  advancing: number; declining: number; neutral: number; total: number
}) {
  if (total === 0) return null
  const advPct = Math.round((advancing / total) * 100)
  const decPct = Math.round((declining / total) * 100)
  const neuPct = 100 - advPct - decPct

  return (
    <div>
      <div className="flex items-center gap-1 mb-1">
        <div className="flex-1 h-1.5 flex rounded-full overflow-hidden bg-ops-700">
          <div className="bg-tac-700 transition-all" style={{ width: `${advPct}%` }} />
          <div className="bg-ops-600 transition-all" style={{ width: `${neuPct}%` }} />
          <div className="bg-crit-800 transition-all" style={{ width: `${decPct}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-3 text-2xs font-mono">
        <span className="text-tac-500">{advancing} ADV</span>
        <span className="text-ink-ghost">{neutral} NEU</span>
        <span className="text-crit-500">{declining} DEC</span>
      </div>
    </div>
  )
}

// ── Overall-read badge helper ─────────────────────────────────────────────────

function overallReadStatus(r: ProxyInternals['overallRead']): 'stable' | 'watch' | 'elevated' | 'critical' {
  if (r === 'RISK-ON')  return 'stable'
  if (r === 'RISK-OFF') return 'elevated'
  if (r === 'NEUTRAL')  return 'watch'
  return 'watch'
}

// ── Proxy view ────────────────────────────────────────────────────────────────

function ProxyView({ proxy }: { proxy: ProxyInternals }) {
  return (
    <>
      {/* Overall session read — hero row */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-ops-700">
        <div className="flex flex-col gap-0.5">
          <span className="text-2xs font-mono uppercase tracking-wider text-ink-ghost">
            SESSION READ
          </span>
          <StatusBadge
            status={overallReadStatus(proxy.overallRead)}
            label={proxy.overallRead}
            size="sm"
          />
        </div>
        <div className="flex-1 pl-3 border-l border-ops-700">
          <p className="text-xs text-ink-secondary leading-snug">
            {proxy.tapeInterpretation}
          </p>
        </div>
      </div>

      {/* 2×2 signal grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <StatCell label="PARTICIPATION">
          <StatusBadge
            status={proxy.participationStatus}
            label={proxy.participationLabel}
            size="xs"
          />
          <p className="text-2xs text-ink-ghost leading-snug mt-1">
            {proxy.participationDetail}
          </p>
        </StatCell>

        <StatCell label="EW CONFIRMATION">
          <StatusBadge
            status={proxy.ewStatus}
            label={proxy.ewLabel}
            size="xs"
          />
          <p className="text-2xs text-ink-ghost leading-snug mt-1">
            {proxy.ewDetail}
          </p>
        </StatCell>

        <StatCell label="MOMENTUM PROXY">
          <StatusBadge
            status={proxy.momentumStatus}
            label={proxy.momentumLabel}
            size="xs"
          />
        </StatCell>

        <StatCell label="FLOW PRESSURE">
          <StatusBadge
            status={proxy.flowStatus}
            label={proxy.flowPressure}
            size="xs"
          />
        </StatCell>
      </div>

      {/* Sector breadth bar */}
      <div className="mb-3 pb-3 border-b border-ops-700">
        <div className="text-2xs font-mono uppercase tracking-wider text-ink-ghost mb-2">
          SECTOR BREADTH PROXY
        </div>
        <SectorBar
          advancing={proxy.sectorAdvancing}
          declining={proxy.sectorDeclining}
          neutral={proxy.sectorNeutral}
          total={proxy.sectorTotal}
        />
        {proxy.topSectors.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
            {proxy.topSectors.map(s => (
              <span key={s} className="text-2xs font-mono text-tac-600">↑ {s}</span>
            ))}
            {proxy.weakSectors.map(s => (
              <span key={s} className="text-2xs font-mono text-crit-600">↓ {s}</span>
            ))}
          </div>
        )}
      </div>

      {/* Index alignment + follow-through */}
      <div className="grid grid-cols-2 gap-2 mb-3 pb-3 border-b border-ops-700">
        <StatCell label="INDEX ALIGNMENT">
          <span className={clsx(
            'text-xs font-mono font-semibold',
            proxy.indexAlignment === 'ALIGNED-UP'   ? 'text-tac-400' :
            proxy.indexAlignment === 'ALIGNED-DOWN' ? 'text-crit-400' :
            proxy.indexAlignment === 'FLAT'         ? 'text-ink-muted' :
            'text-amber-400',
          )}>
            {proxy.indexAlignment}
          </span>
          <p className="text-2xs text-ink-ghost leading-snug mt-1">
            {proxy.alignmentDetail}
          </p>
        </StatCell>

        <StatCell label="SESSION FOLLOW-THRU">
          <span className={clsx(
            'text-xs font-mono font-semibold uppercase',
            proxy.gapFollowThrough === 'confirmed' ? 'text-tac-400' :
            proxy.gapFollowThrough === 'faded'     ? 'text-crit-400' :
            'text-ink-muted',
          )}>
            {proxy.gapFollowThrough}
          </span>
          <p className="text-2xs text-ink-ghost leading-snug mt-1">
            {proxy.gapFollowThrough === 'confirmed'
              ? 'Price trend + flow pressure aligned'
              : proxy.gapFollowThrough === 'faded'
              ? 'Selling pressure consistent with decline'
              : 'No strong directional persistence detected'}
          </p>
        </StatCell>
      </div>

      {/* Proxy caveat */}
      <div className="border-l-2 border-amber-800/60 pl-2.5 py-1">
        <p className="text-2xs font-mono text-amber-700/80 leading-snug">
          PROXY MODE — signals derived from sector ETF quotes, not exchange breadth tape.
          True A/D line, up/down volume, and VWAP participation require a dedicated intraday feed.
        </p>
      </div>
    </>
  )
}

// ── Full mode view ────────────────────────────────────────────────────────────

function FullView({ data }: { data: InternalsModule }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <StatCell label="GAP FOLLOW-THROUGH">
          <span className={clsx(
            'text-xs font-mono font-semibold uppercase',
            data.openingGapFollowThrough === 'confirmed' ? 'text-tac-400' :
            data.openingGapFollowThrough === 'faded'     ? 'text-crit-400' :
            'text-ink-muted',
          )}>
            {data.openingGapFollowThrough}
          </span>
        </StatCell>

        <StatCell label="MOMENTUM DIRECTION">
          <span className={clsx(
            'text-xs font-mono font-semibold uppercase',
            data.momentumDirection === 'strengthening' ? 'text-tac-400' :
            data.momentumDirection === 'weakening'     ? 'text-crit-400' :
            'text-ink-muted',
          )}>
            {data.momentumDirection}
          </span>
        </StatCell>

        <StatCell label="INTERNALS VS PRICE" className="col-span-2">
          <span className={clsx(
            'text-xs font-mono',
            data.internalsConfirmPrice ? 'text-tac-400' : 'text-amber-400',
          )}>
            {data.internalsConfirmPrice ? 'CONFIRMING' : 'NOT CONFIRMING'}
          </span>
        </StatCell>
      </div>

      {/* Series availability */}
      <div className="text-2xs font-mono text-ink-ghost border-t border-ops-700 pt-2">
        A/D {data.advDecLine.data.length} pts ·
        Up/Dn Vol {data.upDownVolRatio.data.length} pts ·
        VWAP {data.vwapParticipation.data.length} pts
      </div>
    </>
  )
}

// ── Provider-required view ────────────────────────────────────────────────────

function ProviderRequiredView() {
  return (
    <div className="rounded-sm border border-dashed border-steel-700/60 bg-ops-900/20 px-3 py-3">
      <div className="text-2xs font-mono uppercase tracking-wider text-steel-500 mb-1.5">
        Feed not connected
      </div>
      <p className="text-xs text-ink-secondary leading-relaxed mb-2">
        Connect a market-data provider with intraday breadth and tape analytics to populate
        this module. All other dashboard modules are fully operational.
      </p>
      <p className="text-2xs font-mono text-ink-ghost leading-snug">
        Required: exchange breadth / consolidated tape — e.g. Polygon Stocks API,
        Databento, or equivalent intraday U.S. equity feed.
      </p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function InternalsCard({ data, breadth, flows }: Props) {
  const mode = detectMode(data, breadth)

  // Proxy requires both breadth and flows; fall back to provider-required if either is absent.
  const proxy =
    mode === 'proxy' && breadth && flows
      ? buildProxyInternals(breadth, flows)
      : null

  const modeBadgeStatus =
    mode === 'full'              ? 'confirmed'   as const :
    mode === 'proxy'             ? 'inferred'    as const :
    /* provider-required */        'unavailable' as const

  const modeBadgeLabel =
    mode === 'full'    ? 'LIVE FEED' :
    mode === 'proxy'   ? 'PROXY MODE' :
    'NO FEED'

  const subtitle =
    mode === 'full'    ? 'Live intraday breadth · exchange-grade feed' :
    mode === 'proxy'   ? 'Proxy signals · sector ETF quote layer · medium confidence' :
    'Exchange-grade intraday breadth required'

  return (
    <Card
      title="DAILY INTERNALS"
      variant="secondary"
      sourceType={mode === 'full' ? 'observed' : mode === 'proxy' ? 'derived' : 'inferred'}
      lastUpdated={data.meta.fetchedAt}
      subtitle={subtitle}
      footer={<ModuleMetaFooter meta={data.meta} />}
      headerRight={
        <StatusBadge status={modeBadgeStatus} label={modeBadgeLabel} size="xs" />
      }
    >
      {mode === 'full' && <FullView data={data} />}
      {mode === 'proxy' && proxy && <ProxyView proxy={proxy} />}
      {(mode === 'provider-required' || (mode === 'proxy' && !proxy)) && (
        <ProviderRequiredView />
      )}
    </Card>
  )
}
