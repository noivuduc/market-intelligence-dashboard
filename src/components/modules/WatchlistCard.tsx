'use client'

import type { WatchlistItem, StatusChip, TrendDirection } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { ModuleMetaFooter } from '@/components/ui/ModuleMetaFooter'
import { StatusBadge, AlertBadge, SourceBadge } from '@/components/ui/StatusChip'
import { clsx } from 'clsx'

interface Props {
  items: WatchlistItem[]
}

/** Credit / duration ETFs — analytical bucket separate from sector tape */
const CREDIT_RATE_SYMS = new Set(['HYG', 'LQD', 'TLT', 'IEF', 'SHY', 'US10Y', 'US2Y'])

const GROUPS: { id: string; label: string; pred: (i: WatchlistItem) => boolean }[] = [
  { id: 'idx', label: 'Indices', pred: i => i.category === 'index' },
  { id: 'vol', label: 'Volatility', pred: i => i.category === 'vol' },
  {
    id: 'credit',
    label: 'Credit & rates proxies',
    pred: i => CREDIT_RATE_SYMS.has(i.symbol) || i.category === 'rate' || i.category === 'breadth',
  },
  {
    id: 'etf',
    label: 'Sectors & equity risk',
    pred: i =>
      i.category === 'etf' && !CREDIT_RATE_SYMS.has(i.symbol),
  },
  { id: 'fxcm', label: 'FX · commodities · crypto', pred: i => i.category === 'fx' || i.category === 'commodity' || i.category === 'crypto' },
  { id: 'stock', label: 'Single names', pred: i => i.category === 'stock' },
]

function watchInsight(item: WatchlistItem): { status: StatusChip; label: string } {
  if (item.alert) {
    return item.alert.severity === 'critical'
      ? { status: 'critical', label: 'ALERT' }
      : { status: 'elevated', label: 'WATCH' }
  }
  const c = item.changePct1d
  if (item.category === 'vol' && c != null && Number.isFinite(c)) {
    if (c > 0.75) return { status: 'elevated', label: 'VOL EXPAND' }
    if (c < -0.5) return { status: 'stable', label: 'VOL COMPRESS' }
  }
  if (c != null && Number.isFinite(c) && Math.abs(c) >= 0.35 && displayTrend(item) !== 'flat') {
    return { status: 'watch', label: c > 0 ? 'DIRECTIONAL +' : 'DIRECTIONAL −' }
  }
  return { status: 'stable', label: 'NEUTRAL' }
}

/** When API trend is flat but % change is non-trivial, show direction for scanability */
function displayTrend(item: WatchlistItem): TrendDirection {
  if (item.trend !== 'flat') return item.trend
  const c = item.changePct1d
  if (c == null || !Number.isFinite(c)) return 'flat'
  if (Math.abs(c) < 0.015) return 'flat'
  return c > 0 ? 'rising' : 'falling'
}

function buildSections(items: WatchlistItem[]) {
  const used = new Set<string>()
  const sections: { label: string; rows: WatchlistItem[] }[] = []
  for (const g of GROUPS) {
    const rows = items.filter(i => !used.has(i.symbol) && g.pred(i))
    rows.forEach(r => used.add(r.symbol))
    if (rows.length) sections.push({ label: g.label, rows })
  }
  const rest = items.filter(i => !used.has(i.symbol))
  if (rest.length) sections.push({ label: 'Unclassified', rows: rest })
  return sections
}

function MiniSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="text-ink-ghost font-mono text-[0.6rem]">—</span>
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const w = 44
  const h = 14
  const pad = 1
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - 2 * pad)
    const y = pad + (1 - (v - min) / span) * (h - 2 * pad)
    return `${x},${y}`
  })
  return (
    <svg width={w} height={h} className="inline-block align-middle text-steel-500" aria-hidden>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
        points={pts.join(' ')}
      />
    </svg>
  )
}

export function WatchlistCard({ items }: Props) {
  const meta0 = items[0]?.meta
  const sections = buildSections(items)

  return (
    <Card
      title="WATCHLIST"
      variant="secondary"
      sourceType="observed"
      footer={meta0 ? <ModuleMetaFooter meta={meta0} /> : undefined}
      subtitle="Indices · vol · credit/rates · sectors · 5D path"
      noPad
    >
      <div className="divide-y divide-ops-700">
        {sections.map(sec => (
          <div key={sec.label}>
            <div className="px-3 py-2 bg-ops-900/60 border-b border-ops-700">
              <span className="text-[0.65rem] font-mono uppercase tracking-[0.2em] text-ink-muted">
                {sec.label}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="tac-table w-full table-fixed min-w-[720px]">
                <colgroup>
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '6%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '22%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="text-left">Symbol</th>
                    <th className="text-left">Name</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">1D%</th>
                    <th className="text-center">Trend</th>
                    <th className="text-center">5D</th>
                    <th className="text-center">Read</th>
                    <th className="text-left">Alert</th>
                  </tr>
                </thead>
                <tbody>
                  {sec.rows.map(item => {
                    const insight = watchInsight(item)
                    const tr = displayTrend(item)
                    return (
                      <tr key={item.symbol} className="hover:bg-ops-700/15">
                        <td className="text-left align-middle">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <SourceBadge sourceType={item.meta.dataClass} showLabel quiet />
                            <span className="font-mono text-xs font-semibold text-ink-primary truncate">
                              {item.symbol}
                            </span>
                          </div>
                        </td>
                        <td className="text-left align-middle min-w-0">
                          <span className="text-xs text-ink-secondary block truncate" title={item.name}>
                            {item.name}
                          </span>
                        </td>
                        <td className="text-right align-middle font-mono text-xs text-ink-primary tabular-nums whitespace-nowrap">
                          {item.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'}
                        </td>
                        <td className="text-right align-middle whitespace-nowrap">
                          <span className={clsx(
                            'font-mono text-xs tabular-nums',
                            item.changePct1d != null && Number.isFinite(item.changePct1d) && item.changePct1d > 0
                              ? 'text-positive'
                              : item.changePct1d != null && Number.isFinite(item.changePct1d) && item.changePct1d < 0
                                ? 'text-negative'
                                : 'text-neutral',
                          )}>
                            {item.changePct1d != null && Number.isFinite(item.changePct1d)
                              ? `${item.changePct1d > 0 ? '+' : ''}${item.changePct1d.toFixed(2)}%`
                              : '—'}
                          </span>
                        </td>
                        <td className="text-center align-middle text-sm whitespace-nowrap">
                          <span className={clsx(
                            tr === 'rising' ? 'text-positive' :
                            tr === 'falling' ? 'text-negative' : 'text-neutral',
                          )}>
                            {tr === 'rising' ? '▲' : tr === 'falling' ? '▼' : '—'}
                          </span>
                        </td>
                        <td className="text-center align-middle">
                          <MiniSparkline values={item.sparkline ?? []} />
                        </td>
                        <td className="text-center align-middle">
                          <div className="flex justify-center">
                            <StatusBadge status={insight.status} label={insight.label} size="xs" />
                          </div>
                        </td>
                        <td className="text-left align-middle min-w-0">
                          {item.alert ? (
                            <div className="flex items-center gap-1.5 min-w-0">
                              <AlertBadge severity={item.alert.severity} />
                              <span className="text-[0.65rem] text-ink-muted truncate" title={item.alert.message}>
                                {item.alert.message}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[0.65rem] text-ink-ghost">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
