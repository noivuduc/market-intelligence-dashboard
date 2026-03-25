import type { Alert } from '@/lib/types'
import { AlertBadge } from '@/components/ui/StatusChip'
import { clsx } from 'clsx'

interface Props { alerts: Alert[] }

const STRIPE: Record<Alert['severity'], string> = {
  critical: 'bg-crit-500',
  elevated: 'bg-amber-500',
  watch:    'bg-amber-600/80',
  info:     'bg-steel-500',
}

export function AlertsPanel({ alerts }: Props) {
  const active = alerts.filter(a => !a.acknowledged)

  if (active.length === 0) {
    return (
      <div className="rounded-sm border border-ops-600 bg-ops-900/30 px-4 py-3 text-center text-[0.7rem] font-mono uppercase tracking-widest text-ink-muted">
        No active threat flags
      </div>
    )
  }

  return (
    <div
      className="rounded-sm border border-ops-600 bg-ops-900/25 overflow-hidden"
      role="region"
      aria-label="Active threat board"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-ops-700 bg-ops-900/50">
        <span className="text-xs font-mono uppercase tracking-[0.2em] text-crit-500/90">
          Threat board
        </span>
        <span className="text-[0.65rem] font-mono text-ink-muted tabular-nums">
          {active.length} active
        </span>
      </div>
      <ul className="divide-y divide-ops-700/80">
        {active.map(alert => (
          <li key={alert.id} className="flex gap-0 min-h-0">
            <div className={clsx('w-1 flex-shrink-0', STRIPE[alert.severity])} aria-hidden />
            <div className="flex-1 min-w-0 py-2.5 pr-3 pl-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                <AlertBadge severity={alert.severity} />
                <span className="text-sm font-semibold text-ink-primary leading-tight">
                  {alert.title}
                </span>
                <span className="text-[0.65rem] font-mono text-ink-muted ml-auto tabular-nums">
                  {formatRelative(alert.createdAt)}
                </span>
              </div>
              <p className="text-xs text-ink-secondary leading-snug line-clamp-2 mb-1.5">
                {alert.explanation}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[0.65rem] font-mono">
                <span className="text-ink-muted">
                  MOD <span className="text-steel-400">{alert.affectedModules.join(' · ')}</span>
                </span>
                <span className="text-ink-muted">
                  WATCH <span className="text-amber-600/90">{alert.watchItems.slice(0, 3).join(' · ')}</span>
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function formatRelative(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1)  return 'now'
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h`
}
