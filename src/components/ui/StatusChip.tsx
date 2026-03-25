import { clsx } from 'clsx'
import type { StatusChip, DataSourceType, ConfidenceLevel, AlertSeverity } from '@/lib/types'

// ---- Status Chip ----

const STATUS_CHIP_STYLES: Record<StatusChip, string> = {
  stable:       'bg-tac-900/50 text-tac-400 border-tac-800',
  elevated:     'bg-amber-900/40 text-amber-400 border-amber-800',
  critical:     'bg-crit-900/40 text-crit-400 border-crit-800',
  watch:        'bg-amber-900/30 text-amber-300 border-amber-700',
  confirmed:    'bg-tac-900/40 text-tac-300 border-tac-700',
  inferred:     'bg-steel-900/40 text-steel-400 border-steel-700',
  delayed:      'bg-ops-500/40 text-ink-muted border-ops-400',
  transitioning:'bg-steel-900/30 text-steel-300 border-steel-700',
  inactive:     'bg-ops-800/50 text-ink-ghost border-ops-600',
  unavailable:  'bg-ops-800/30 text-ink-ghost border-ops-700',
}

interface StatusChipProps {
  status: StatusChip
  label?: string
  size?: 'xs' | 'sm' | 'md'
  pulse?: boolean
}

export function StatusBadge({ status, label, size = 'sm', pulse }: StatusChipProps) {
  const sizeClass = {
    xs: 'text-2xs px-1 py-0',
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
  }[size]

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 border rounded-sm font-mono font-medium uppercase tracking-wide',
        STATUS_CHIP_STYLES[status],
        sizeClass,
        pulse && status === 'critical' && 'alert-pulse',
      )}
    >
      <span className={clsx('w-1 h-1 rounded-full inline-block', {
        'bg-tac-400':   ['stable', 'confirmed'].includes(status),
        'bg-amber-400': ['elevated', 'watch'].includes(status),
        'bg-crit-400':  status === 'critical',
        'bg-steel-400': ['inferred', 'transitioning'].includes(status),
        'bg-ink-muted': ['delayed', 'inactive', 'unavailable'].includes(status),
      })} />
      {label ?? status}
    </span>
  )
}

// ---- Source Type Badge ----

const SOURCE_STYLES: Record<DataSourceType, string> = {
  observed: 'text-tac-500 border-tac-800',
  derived:  'text-steel-500 border-steel-800',
  inferred: 'text-amber-600 border-amber-900',
  delayed:  'text-ink-muted border-ops-400',
}

const SOURCE_LABELS: Record<DataSourceType, string> = {
  observed: 'OBS',
  derived:  'DRV',
  inferred: 'INF',
  delayed:  'DEL',
}

interface SourceBadgeProps {
  sourceType: DataSourceType
  showLabel?: boolean
  /** Quieter metadata treatment — less competition with primary status */
  quiet?: boolean
}

export function SourceBadge({ sourceType, showLabel = true, quiet }: SourceBadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center border rounded-sm font-mono uppercase tracking-wider',
      quiet ? 'text-[0.6rem] px-0.5 py-0 opacity-70' : 'text-2xs px-1 py-0',
      SOURCE_STYLES[sourceType],
    )}>
      {showLabel ? SOURCE_LABELS[sourceType] : ''}
    </span>
  )
}

// ---- Confidence Bar ----

interface ConfidenceBarProps {
  value: number        // 0–100
  label?: ConfidenceLevel | string
  showNumber?: boolean
  size?: 'sm' | 'md'
}

export function ConfidenceBar({ value, label, showNumber = true, size = 'sm' }: ConfidenceBarProps) {
  const barColor = value >= 75 ? '#3DA85E' : value >= 50 ? '#E89B10' : '#C72019'
  const h = size === 'sm' ? 'h-0.5' : 'h-1'

  return (
    <div className="flex items-center gap-2">
      <div className={clsx('flex-1 bg-ops-500 rounded-full overflow-hidden', h)}>
        <div
          className={clsx('h-full rounded-full confidence-bar-fill')}
          style={{ width: `${value}%`, backgroundColor: barColor }}
        />
      </div>
      {showNumber && (
        <span className="font-mono text-2xs text-ink-muted w-8 text-right">
          {value}%
        </span>
      )}
    </div>
  )
}

// ---- Alert Severity Badge ----

const ALERT_STYLES: Record<AlertSeverity, string> = {
  critical: 'bg-crit-900/60 text-crit-300 border-crit-700',
  elevated: 'bg-amber-900/50 text-amber-300 border-amber-700',
  watch:    'bg-amber-900/30 text-amber-400 border-amber-800',
  info:     'bg-steel-900/30 text-steel-400 border-steel-700',
}

const ALERT_ICONS: Record<AlertSeverity, string> = {
  critical: '⬥',
  elevated: '▲',
  watch:    '◆',
  info:     '●',
}

interface AlertBadgeProps {
  severity: AlertSeverity
  label?: string
}

export function AlertBadge({ severity, label }: AlertBadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 border rounded-sm font-mono text-xs px-1.5 py-0.5 uppercase tracking-wide',
      ALERT_STYLES[severity],
    )}>
      <span>{ALERT_ICONS[severity]}</span>
      {label ?? severity}
    </span>
  )
}
