'use client'

import type { CrossAssetItem } from '@/lib/types'
import { clsx } from 'clsx'

interface Props {
  items: CrossAssetItem[]
}

function MiniSpark({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="text-ink-ghost font-mono text-[0.55rem]">—</span>
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const w = 36
  const h = 12
  const pad = 1
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - 2 * pad)
    const y = pad + (1 - (v - min) / span) * (h - 2 * pad)
    return `${x},${y}`
  })
  return (
    <svg width={w} height={h} className="inline-block align-middle text-steel-500 shrink-0" aria-hidden>
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

export function CrossAssetStrip({ items }: Props) {
  if (!items.length) return null

  return (
    <section
      aria-label="Cross-asset situational strip"
      className="rounded-sm border border-ops-700 bg-ops-900/40 overflow-hidden"
    >
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-ops-700 bg-ops-950/50">
        <span className="text-[0.65rem] font-mono uppercase tracking-[0.25em] text-tac-600">
          Cross-asset tape
        </span>
        <span className="text-[0.6rem] font-mono text-ink-ghost">
          Yahoo Finance (delayed) · regime context tags
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y divide-ops-800 lg:divide-y-0">
        {items.map(item => {
          const pct = item.changePct1d
          const pctOk = pct != null && Number.isFinite(pct)
          return (
            <div
              key={item.symbol}
              className="px-2.5 py-2 flex flex-col gap-1 min-h-[4.5rem] justify-between hover:bg-ops-800/25 transition-colors"
            >
              <div className="flex items-start justify-between gap-1 min-w-0">
                <div className="min-w-0">
                  <div className="font-mono text-xs font-semibold text-ink-primary truncate">
                    {item.symbol}
                  </div>
                  <div className="text-[0.6rem] text-ink-muted truncate" title={item.displayName}>
                    {item.displayName}
                  </div>
                </div>
                <MiniSpark values={item.sparkline ?? []} />
              </div>
              <div className="flex items-end justify-between gap-1">
                <div className="font-mono text-sm text-ink-primary tabular-nums truncate">
                  {item.price != null && Number.isFinite(item.price)
                    ? item.price.toLocaleString(undefined, { maximumFractionDigits: 2 })
                    : '—'}
                </div>
                <div
                  className={clsx(
                    'font-mono text-xs tabular-nums shrink-0',
                    !pctOk ? 'text-ink-ghost' :
                    pct > 0.05 ? 'text-positive' :
                    pct < -0.05 ? 'text-negative' : 'text-neutral',
                  )}
                >
                  {!pctOk ? '—' : `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`}
                </div>
              </div>
              <div className="text-[0.6rem] font-mono uppercase tracking-wider text-steel-500 leading-tight border-l-2 border-tac-700/50 pl-1.5">
                {item.regimeTag}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
