import type { SourceMeta } from '@/lib/types'
import { trustOperationalState, trustStyleClass } from '@/lib/data-quality/trustDisplay'
import { clsx } from 'clsx'

function ageLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

interface Props {
  meta:       SourceMeta
  className?: string
}

/** Quiet institutional footer: freshness, cadence, confidence, data class. */
export function ModuleMetaFooter({ meta, className }: Props) {
  const trust = trustOperationalState(meta)
  return (
    <div
      className={clsx(
        'flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 border-t border-ops-700/80 border-l-2',
        trustStyleClass(trust),
        'bg-ops-900/50 text-[0.65rem] font-mono uppercase tracking-wider text-ink-muted',
        className,
      )}
    >
      <span className="text-ink-ghost normal-case tracking-normal">{meta.sourceName}</span>
      <span
        className={clsx(
          trust === 'unavailable' && 'text-crit-500',
          trust === 'stale' && 'text-amber-500',
          trust === 'fallback' && 'text-amber-600',
          trust === 'fresh' && 'text-tac-600',
        )}
      >
        {trust.replace(/-/g, ' ').toUpperCase()} · {ageLabel(meta.fetchedAt)}
      </span>
      <span>Cadence {meta.cadenceLabel}</span>
      <span className="capitalize">Conf {meta.confidence}</span>
      <span>{meta.dataClass}</span>
      {meta.fetchError && (
        <span className="text-crit-500 normal-case max-w-[220px] truncate" title={meta.fetchError}>
          {meta.fetchError}
        </span>
      )}
    </div>
  )
}
