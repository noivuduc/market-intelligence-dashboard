'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { BreadthModule } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { ModuleMetaFooter } from '@/components/ui/ModuleMetaFooter'
import { StatusBadge } from '@/components/ui/StatusChip'
import { clsx } from 'clsx'

interface Props { data: BreadthModule }

const tapeChip = (t: BreadthModule['tapeQuality']) => {
  if (t === 'healthy-rally')   return 'stable'   as const
  if (t === 'weak-rally')      return 'watch'    as const
  if (t === 'fragile-selloff') return 'elevated' as const
  if (t === 'broad-selloff')   return 'critical' as const
  return 'transitioning' as const
}

function breadthVerdict(b: BreadthModule): string {
  if (b.breadthConfirmed && (b.tapeQuality === 'healthy-rally' || b.tapeQuality === 'weak-rally')) {
    return 'Price action supported — participation aligns with direction.'
  }
  if (!b.breadthConfirmed && b.tapeQuality.includes('rally')) {
    return 'Caution — rally not fully confirmed by breadth; leadership may be narrow.'
  }
  if (b.tapeQuality === 'broad-selloff' || b.tapeQuality === 'fragile-selloff') {
    return 'Defensive tape — breadth deteriorating vs prior session proxy.'
  }
  return 'Mixed tape — await sector confirmation and equal-weight follow-through.'
}

export function BreadthCard({ data }: Props) {
  const adv = data.advDecLine.value
  const advBarPct =
    adv == null || !Number.isFinite(adv)
      ? 50
      : Math.min(100, Math.max(0, ((Math.max(-11, Math.min(11, adv)) + 11) / 22) * 100))

  return (
    <Card
      title="MARKET BREADTH & TREND"
      variant="primary"
      sourceType="observed"
      lastUpdated={data.meta.fetchedAt}
      subtitle="Sector ETF proxy · NYSE tape not wired"
      footer={<ModuleMetaFooter meta={data.meta} />}
      headerRight={
        <div className="flex gap-1.5 flex-wrap justify-end">
          <StatusBadge
            status={tapeChip(data.tapeQuality)}
            label={data.tapeQuality.replace('-', ' ').toUpperCase()}
            size="xs"
          />
          <StatusBadge
            status={data.breadthConfirmed ? 'confirmed' : 'watch'}
            label={data.breadthConfirmed ? 'CONFIRMED' : 'DIVERGENCE'}
            size="xs"
          />
        </div>
      }
    >
      {/* Verdict — primary read */}
      <div className="mb-4 p-3 rounded-sm border border-ops-600 bg-ops-800/40">
        <div className="text-[0.65rem] font-mono uppercase tracking-widest text-tac-600 mb-1.5">
          Breadth verdict
        </div>
        <p className="text-sm text-ink-primary leading-snug font-medium">
          {breadthVerdict(data)}
        </p>
      </div>

      {/* Participation proxy bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 pb-4 border-b border-ops-700">
        <div>
          <div className="flex justify-between text-[0.65rem] font-mono uppercase text-ink-muted mb-1">
            <span>Sector advance / decline proxy</span>
            <span>{data.advDecLine.formatted ?? '—'}</span>
          </div>
          <div className="h-2 rounded-sm bg-ops-600 overflow-hidden flex">
            <div className="h-full bg-crit-700/80 transition-all" style={{ width: `${100 - advBarPct}%` }} />
            <div className="h-full bg-tac-700/80 transition-all" style={{ width: `${advBarPct}%` }} />
          </div>
          <div className="flex justify-between text-[0.6rem] font-mono text-ink-muted mt-0.5">
            <span>Declining bias</span>
            <span>Advancing bias</span>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[0.65rem] font-mono uppercase text-ink-muted mb-1">
            <span>Equal-weight vs cap-weight</span>
            <span className="text-ink-secondary normal-case">{data.ewsVsCap.formatted ?? '—'}</span>
          </div>
          <div className="h-2 rounded-sm bg-ops-600 overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-sm transition-all',
                data.ewsVsCap.trend === 'rising' ? 'bg-tac-600' :
                data.ewsVsCap.trend === 'falling' ? 'bg-crit-600' : 'bg-steel-600',
              )}
              style={{
                width: `${data.ewsVsCap.trend === 'flat' ? 50 : data.ewsVsCap.trend === 'rising' ? 72 : 28}%`,
              }}
            />
          </div>
          <div className="text-[0.6rem] text-ink-muted mt-0.5 font-mono capitalize">
            Trend: {data.ewsVsCap.trend} · participation {data.participation}
          </div>
        </div>
      </div>

      {/* Index summary */}
      <div className="grid grid-cols-3 gap-3 mb-3 pb-3 border-b border-ops-700">
        {[data.spx, data.ndx, data.rut].map(idx => (
          <IndexSummary key={idx.symbol} idx={idx} />
        ))}
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 gap-x-4 mb-3">
        <BreadthMetric label="ADV/DEC LINE" value={data.advDecLine.formatted ?? ''} trend={data.advDecLine.trend} source="observed" />
        <BreadthMetric label="UP/DN VOL"    value={data.upVsDownVol.formatted ?? ''} trend={data.upVsDownVol.trend} source="observed" />
        <BreadthMetric label="NEW HIGHS 52W" value={String(data.newHighs52w.value ?? '')} trend={data.newHighs52w.trend} source="observed" />
        <BreadthMetric label="NEW LOWS 52W"  value={String(data.newLows52w.value ?? '')} trend={data.newLows52w.trend} source="observed" />
        <BreadthMetric label="RSP/SPY (EW)"  value={data.ewsVsCap.formatted ?? ''} trend={data.ewsVsCap.trend} source="derived" />
        <BreadthMetric label="PARTICIPATION" value={data.participation.toUpperCase()} trend="flat" source="derived" />
      </div>

      {/* Sector breadth chart */}
      <div className="pt-3 border-t border-ops-700">
        <div className="text-2xs font-mono uppercase tracking-wider text-ink-ghost mb-2">
          SECTOR % ABOVE 50-DAY MA
        </div>
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.sectorBreadth}
              layout="vertical"
              margin={{ top: 0, right: 24, bottom: 0, left: 8 }}
              barSize={6}
            >
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fill: '#5A7390', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="sector"
                tick={{ fill: '#9AAFC2', fontSize: 9, fontFamily: 'Inter' }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip
                contentStyle={{ background: '#0D1117', border: '1px solid #1C2636', borderRadius: 4, fontSize: 11 }}
                formatter={(v: number) => [`${v}%`, '% >50D']}
              />
              <Bar dataKey="rangePosition52w" radius={[0, 2, 2, 0]}>
                {data.sectorBreadth.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.rangePosition52w >= 60 ? '#3DA85E' : entry.rangePosition52w >= 40 ? '#E89B10' : '#C72019'}
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {data.explanation && (
        <div className="mt-3 pt-3 border-t border-ops-700">
          <div className="text-2xs font-mono uppercase tracking-wider text-tac-700 mb-1">ASSESSMENT</div>
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

function IndexSummary({ idx }: { idx: BreadthModule['spx'] }) {
  const ch = idx.change1d
  const chOk = ch != null && Number.isFinite(ch)
  const isUp = chOk && ch >= 0

  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-2xs font-mono uppercase tracking-wider text-ink-ghost">{idx.symbol}</div>
      <div className="font-mono text-lg font-bold text-ink-primary">
        {idx.price != null && Number.isFinite(idx.price) ? idx.price.toLocaleString() : '—'}
      </div>
      <div
        className={clsx(
          'text-xs font-mono',
          !chOk ? 'text-ink-ghost' : isUp ? 'text-positive' : 'text-negative',
        )}
      >
        {!chOk ? '—' : `${isUp && ch > 0 ? '+' : ''}${ch.toFixed(2)}%`}
      </div>
      <div className="flex gap-1.5 mt-0.5">
        <MaDot label="20D" pct={idx.pctFrom20d} />
        <MaDot label="50D" pct={idx.pctFrom50d} />
        <MaDot label="200D" pct={idx.pctFrom200d} />
      </div>
    </div>
  )
}

function MaDot({ label, pct }: { label: string; pct: number | null | undefined }) {
  const p = pct != null && Number.isFinite(pct) ? pct : null
  if (p === null) {
    return (
      <span className="text-2xs font-mono px-1 rounded-sm bg-ops-800 text-ink-ghost">
        {label} —
      </span>
    )
  }
  return (
    <span className={clsx(
      'text-2xs font-mono px-1 rounded-sm',
      p > 0 ? 'bg-tac-900/40 text-tac-500' : 'bg-crit-900/30 text-crit-500'
    )}>
      {label} {p > 0 ? '+' : ''}{p.toFixed(1)}%
    </span>
  )
}

function BreadthMetric({ label, value, trend, source }: {
  label: string; value: string; trend: string; source: string
}) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-ops-700 last:border-0">
      <span className="text-2xs text-ink-ghost uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-1">
        <span className="font-mono text-xs text-ink-primary">{value}</span>
        <span className={clsx('text-2xs', trend === 'rising' ? 'text-positive' : trend === 'falling' ? 'text-negative' : 'text-neutral')}>
          {trend === 'rising' ? '▲' : trend === 'falling' ? '▼' : '—'}
        </span>
      </div>
    </div>
  )
}
