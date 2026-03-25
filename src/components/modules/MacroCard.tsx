import type { MacroModule, MacroRelease } from '@/lib/types'
import { macroImplication } from '@/lib/macro/implication'
import { Card } from '@/components/ui/Card'
import { ModuleMetaFooter } from '@/components/ui/ModuleMetaFooter'
import { StatusBadge } from '@/components/ui/StatusChip'
import { clsx } from 'clsx'

interface Props { data: MacroModule }

function SurpriseBar({ release }: { release: MacroRelease }) {
  const surprise = release.surprise
  const isPos = surprise != null && surprise > 0
  const isNeg = surprise != null && surprise < 0
  const abs = surprise != null
    ? Math.min(Math.abs(surprise / (Math.abs(release.expected ?? 1) * 0.5)) * 50, 50)
    : 0

  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-ops-700 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-ink-secondary truncate">{release.name}</div>
        <div className="text-2xs text-ink-ghost">
          {release.period}
          {release.date ? ` · data ${release.date}` : ''}
          {release.releaseDate ? ` · release ${release.releaseDate}` : ''}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* Actual */}
        <span className="font-mono text-xs text-ink-primary w-14 text-right">
          {release.actual?.toLocaleString() ?? '—'}
        </span>
        {/* Surprise bar */}
        <div className="w-16 flex items-center justify-center">
          <div className="w-full h-1 bg-ops-500 rounded-full relative">
            <div className="absolute top-0 left-1/2 w-px h-full bg-ops-300" />
            {surprise != null && surprise !== 0 && (
              <div
                className={clsx('absolute top-0 h-full rounded-full', isPos ? 'bg-tac-500 left-1/2' : 'bg-crit-600 right-1/2')}
                style={{ width: `${abs}%` }}
              />
            )}
          </div>
        </div>
        {/* Surprise value */}
        <span className={clsx(
          'font-mono text-2xs w-14 text-right',
          isPos ? 'text-positive' : isNeg ? 'text-negative' : 'text-neutral'
        )}>
          {surprise == null ? '—' : surprise === 0 ? '0' : `${isPos ? '+' : ''}${surprise.toLocaleString()}`}
        </span>
      </div>
    </div>
  )
}

const trendChip = (t: string) => {
  if (['accelerating', 'strong', 'positive'].includes(t))   return 'stable'   as const
  if (['decelerating', 'softening', 'negative'].includes(t)) return 'watch'    as const
  if (['contraction', 'weak'].includes(t))                   return 'elevated' as const
  return 'transitioning' as const
}

export function MacroCard({ data }: Props) {
  const releases = [
    data.payrolls,
    data.cpi,
    data.pce,
    data.gdp,
    data.retailSales,
    data.ismMfg,
    data.ismSvc,
    data.unemployment,
    data.joblessClaims,
  ]

  return (
    <Card
      title="MACRO FUNDAMENTALS"
      variant="secondary"
      sourceType="delayed"
      lastUpdated={data.meta.fetchedAt}
      subtitle="FRED observations · static consensus calendar"
      footer={<ModuleMetaFooter meta={data.meta} />}
      headerRight={
        <StatusBadge
          status={data.surpriseRegime === 'positive' ? 'stable' : data.surpriseRegime === 'negative' ? 'watch' : 'transitioning'}
          label={`SURPRISE: ${data.surpriseRegime.toUpperCase()}`}
          size="xs"
        />
      }
    >
      {/* Trend summary */}
      <div className="grid grid-cols-4 gap-2 mb-3 pb-3 border-b border-ops-700">
        {[
          { label: 'GROWTH',    value: data.growthTrend },
          { label: 'INFLATION', value: data.inflationTrend },
          { label: 'LABOR',     value: data.laborTrend },
          { label: 'SURPRISE',  value: data.surpriseRegime },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-2xs font-mono uppercase tracking-wider text-ink-ghost">{label}</span>
            <StatusBadge status={trendChip(value)} label={value.toUpperCase().replace('-', ' ')} size="xs" />
          </div>
        ))}
      </div>

      <div className="mb-3 p-2.5 rounded-sm border border-steel-800/80 bg-steel-950/20 border-l-2 border-l-steel-500">
        <div className="text-[0.65rem] font-mono uppercase tracking-wider text-steel-500 mb-1">
          Command read
        </div>
        <p className="text-sm text-ink-secondary leading-snug">
          {macroImplication(data)}
        </p>
      </div>

      {/* Releases with surprise bars */}
      <div>
        <div className="grid grid-cols-3 items-center gap-2 mb-1">
          <span className="text-2xs font-mono uppercase tracking-wider text-ink-ghost">RELEASE</span>
          <div className="flex justify-end">
            <span className="text-2xs font-mono uppercase text-ink-ghost">ACTUAL</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xs font-mono uppercase text-ink-ghost w-16 text-center">VS EST</span>
            <span className="text-2xs font-mono uppercase text-ink-ghost w-14 text-right">SURPRISE</span>
          </div>
        </div>
        {releases.map((r) => (
          <SurpriseBar key={r.name} release={r} />
        ))}
      </div>

      {/* Next catalyst */}
      <div className="mt-3 pt-3 border-t border-ops-700 flex items-center justify-between">
        <div>
          <div className="text-2xs font-mono uppercase tracking-wider text-ink-ghost mb-0.5">
            NEXT CATALYST
          </div>
          <div className="text-sm font-mono text-amber-400">
            {data.nextCatalyst.name}
          </div>
          <div className="text-2xs text-ink-ghost">
            {data.nextCatalyst.date || '—'}
            {data.nextCatalyst.referencePeriod ? ` · ref ${data.nextCatalyst.referencePeriod}` : ''}
          </div>
          {data.nextCatalyst.unavailableReason && !data.nextCatalyst.date && (
            <div className="text-2xs text-amber-700 mt-1 max-w-[280px] leading-snug">
              {data.nextCatalyst.unavailableReason}
            </div>
          )}
        </div>
        <StatusBadge
          status={data.nextCatalyst.importance === 'high' ? 'elevated' : 'watch'}
          label={data.nextCatalyst.importance.toUpperCase()}
          size="xs"
        />
      </div>

      {data.explanation && (
        <div className="mt-3 pt-3 border-t border-ops-700">
          <div className="text-2xs font-mono uppercase tracking-wider text-tac-700 mb-1">
            ASSESSMENT
          </div>
          <div className="text-xs text-ink-secondary leading-relaxed italic">
            {data.explanation.oneLiner}
          </div>
          <div className="mt-1 text-2xs text-ink-ghost">
            Watch: {data.explanation.watchNext}
          </div>
        </div>
      )}
    </Card>
  )
}
