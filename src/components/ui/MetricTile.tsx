import { clsx } from 'clsx'
import type { MetricValue, DataSourceType } from '@/lib/types'
import { SourceBadge, ConfidenceBar } from './StatusChip'

interface MetricTileProps {
  label:        string
  metric:       MetricValue
  size?:        'sm' | 'md' | 'lg'
  showMeta?:    boolean
  showBar?:     boolean
  className?:   string
  suffix?:      string
}

export function MetricTile({
  label,
  metric,
  size = 'md',
  showMeta = true,
  showBar = false,
  className,
  suffix,
}: MetricTileProps) {
  const isPositive = (metric.change ?? 0) > 0
  const isNegative = (metric.change ?? 0) < 0
  const changeColor = isPositive ? 'text-positive' : isNegative ? 'text-negative' : 'text-neutral'

  const valueSize = {
    sm: 'text-xl font-mono',
    md: 'text-2xl font-mono',
    lg: 'text-3xl font-mono',
  }[size]

  return (
    <div className={clsx('flex flex-col gap-0.5', className)}>
      <div className="text-2xs uppercase tracking-widest text-ink-muted font-medium">
        {label}
      </div>

      <div className="flex items-baseline gap-2">
        <span className={clsx(valueSize, 'text-ink-primary font-semibold tracking-tight')}>
          {metric.formatted ?? (metric.value?.toLocaleString() ?? '—')}
          {suffix && <span className="text-ink-muted text-sm ml-1">{suffix}</span>}
        </span>
        {metric.change !== undefined && metric.change !== null && (
          <span className={clsx('text-xs font-mono', changeColor)}>
            {isPositive ? '+' : ''}{metric.changePct?.toFixed(2)}%
          </span>
        )}
      </div>

      {metric.change !== undefined && metric.change !== null && metric.prior !== null && (
        <div className="text-2xs text-ink-ghost font-mono">
          Prior: {metric.prior?.toLocaleString()} {metric.unit}
          <span className={clsx('ml-2', changeColor)}>
            {isPositive ? '▲' : isNegative ? '▼' : '—'}
            {' '}
            {Math.abs(metric.change ?? 0).toFixed(
              metric.unit === '%' || metric.unit === 'bps' ? 2 : 0
            )} {metric.unit}
          </span>
        </div>
      )}

      {showBar && metric.percentile !== undefined && (
        <div className="mt-1">
          <ConfidenceBar
            value={metric.percentile}
            label={`${metric.percentile}th pct`}
            size="sm"
          />
          <div className="text-2xs text-ink-ghost mt-0.5">
            {metric.percentile}th pct vs history
          </div>
        </div>
      )}

      {showMeta && (
        <div className="flex items-center gap-1.5 mt-0.5">
          <SourceBadge sourceType={metric.meta.dataClass} />
          <span className="text-2xs text-ink-ghost">
            {metric.meta.sourceName.split('/')[0].trim()}
          </span>
        </div>
      )}
    </div>
  )
}

// ---- Inline metric row ----

interface MetricRowProps {
  label:  string
  value:  string | number
  change?: number | null
  unit?:  string
  source?: DataSourceType
  note?:  string
}

export function MetricRow({ label, value, change, unit, source, note }: MetricRowProps) {
  const isPositive = (change ?? 0) > 0
  const isNegative = (change ?? 0) < 0
  const changeColor = isPositive ? 'text-positive' : isNegative ? 'text-negative' : 'text-neutral'

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-ops-700 last:border-0">
      <div className="flex items-center gap-2">
        {source && <SourceBadge sourceType={source} showLabel={false} />}
        <span className="text-xs text-ink-secondary">{label}</span>
        {note && <span className="text-2xs text-ink-ghost">({note})</span>}
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-ink-primary">
          {typeof value === 'number' ? value.toLocaleString() : value}
          {unit && <span className="text-ink-muted text-xs ml-0.5">{unit}</span>}
        </span>
        {change !== undefined && change !== null && (
          <span className={clsx('font-mono text-xs w-14 text-right', changeColor)}>
            {isPositive ? '+' : ''}{change?.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  )
}
