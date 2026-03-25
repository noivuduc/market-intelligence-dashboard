import { clsx } from 'clsx'
import type { DataSourceType } from '@/lib/types'
import { SourceBadge } from './StatusChip'

export type CardVariant = 'primary' | 'secondary' | 'compact'

interface CardProps {
  title:        string
  subtitle?:    string
  children:     React.ReactNode
  className?:   string
  headerRight?: React.ReactNode
  /** Prepended inside header row (e.g. grid drag handle) */
  leadSlot?:    React.ReactNode
  sourceType?:  DataSourceType
  lastUpdated?: string
  collapsible?: boolean
  noPad?:       boolean
  /** Visual weight: primary = key command modules, compact = low-signal strips */
  variant?:     CardVariant
  footer?:      React.ReactNode
  /** Fill grid cell: stretch card and scroll body */
  fillHeight?:  boolean
  /** Header-only strip (grid collapsed row) */
  layoutCollapsed?: boolean
}

export function Card({
  title,
  subtitle,
  children,
  className,
  headerRight,
  leadSlot,
  sourceType,
  lastUpdated,
  noPad,
  variant = 'secondary',
  footer,
  fillHeight,
  layoutCollapsed,
}: CardProps) {
  return (
    <div className={clsx(
      'tac-card flex flex-col',
      fillHeight && 'h-full min-h-0',
      sourceType && `source-${sourceType}`,
      variant === 'primary' && 'ring-1 ring-ops-500/50',
      variant === 'compact' && 'opacity-[0.97]',
      className,
    )}>
      {/* Header */}
      <div className={clsx(
        'tac-card-header',
        variant === 'compact' && 'py-1.5 px-2.5',
        layoutCollapsed && 'py-2',
      )}>
        <div className="flex flex-col gap-0 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            {leadSlot}
            {sourceType && <SourceBadge sourceType={sourceType} />}
            <span className={clsx(
              'font-semibold uppercase tracking-widest text-ink-secondary',
              variant === 'primary' ? 'text-sm' : variant === 'compact' ? 'text-xs' : 'text-sm',
            )}>
              {title}
            </span>
          </div>
          {subtitle && (
            <span className="text-xs text-ink-ghost ml-0">{subtitle}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-ink-ghost font-mono">
              {formatRelativeTime(lastUpdated)}
            </span>
          )}
          {headerRight}
        </div>
      </div>

      {/* Body */}
      {!layoutCollapsed && (
        <div className={clsx(
          'flex-1',
          fillHeight && 'min-h-0 overflow-y-auto',
          !noPad && (variant === 'compact' ? 'p-2.5' : 'p-3.5'),
        )}>
          {children}
        </div>
      )}
      {!layoutCollapsed && footer}
    </div>
  )
}

// ---- Section divider ----

export function SectionLabel({
  children,
  tier = 'standard',
}: {
  children: React.ReactNode
  /** major = primary deck break; more space and weight */
  tier?: 'major' | 'standard'
}) {
  return (
    <div className={clsx('flex items-center gap-3', tier === 'major' ? 'my-6 mt-8' : 'my-4')}>
      <span
        className={clsx(
          'font-mono uppercase tracking-[0.18em] text-ink-muted whitespace-nowrap',
          tier === 'major' ? 'text-sm font-semibold text-ink-secondary' : 'text-xs',
        )}
      >
        {children}
      </span>
      <div className={clsx('flex-1 bg-ops-600', tier === 'major' ? 'h-px' : 'h-px')} />
    </div>
  )
}

// ---- Intelligence brief block ----

interface BriefBlockProps {
  label:    string
  content:  string
  accent?:  'tac' | 'amber' | 'crit' | 'steel'
  className?:string
}

export function BriefBlock({ label, content, accent = 'tac', className }: BriefBlockProps) {
  const accentColor = {
    tac:   'border-tac-700',
    amber: 'border-amber-700',
    crit:  'border-crit-700',
    steel: 'border-steel-700',
  }[accent]

  const labelColor = {
    tac:   'text-tac-500',
    amber: 'text-amber-500',
    crit:  'text-crit-400',
    steel: 'text-steel-500',
  }[accent]

  return (
    <div className={clsx(
      'border-l-2 pl-3 py-1',
      accentColor,
      className,
    )}>
      <div className={clsx('text-2xs font-mono uppercase tracking-wider font-semibold mb-1', labelColor)}>
        {label}
      </div>
      <div className="text-sm text-ink-secondary leading-relaxed">
        {content}
      </div>
    </div>
  )
}

// ---- Utility ----

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
