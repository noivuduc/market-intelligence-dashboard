import { clsx } from 'clsx'
import type { RegimeState } from '@/lib/types'
import { REGIME_CONFIG } from '@/lib/regime/engine'
import { ConfidenceBar } from './StatusChip'

interface RegimeBannerProps {
  regime:    RegimeState
  compact?:  boolean
  className?:string
}

export function RegimeBanner({ regime, compact, className }: RegimeBannerProps) {
  const cfg = REGIME_CONFIG[regime.label]

  const accentBorder = {
    'risk-on':            'border-tac-600',
    'risk-off':           'border-crit-700',
    'sideways':           'border-steel-700',
    'bottoming-candidate':'border-amber-700',
    'topping-candidate':  'border-amber-600',
    'transition':         'border-steel-600',
  }[regime.label]

  const accentBg = {
    'risk-on':            'bg-tac-900/20',
    'risk-off':           'bg-crit-900/20',
    'sideways':           'bg-steel-900/20',
    'bottoming-candidate':'bg-amber-900/20',
    'topping-candidate':  'bg-amber-900/15',
    'transition':         'bg-ops-700/20',
  }[regime.label]

  if (compact) {
    return (
      <div className={clsx(
        'flex items-center gap-3 px-3 py-2 border rounded-sm',
        accentBorder, accentBg, className,
      )}>
        <span className="text-2xs font-mono uppercase tracking-[0.2em] text-ink-ghost">
          REGIME
        </span>
        <span className={clsx('font-mono text-sm font-bold tracking-wide', cfg.textClass)}>
          {cfg.label}
        </span>
        <div className="flex-1 max-w-24">
          <ConfidenceBar value={regime.confidence} />
        </div>
        <span className="font-mono text-2xs text-ink-ghost">{regime.confidence}% conf</span>
      </div>
    )
  }

  return (
    <div className={clsx(
      'border rounded-sm px-4 py-3 flex flex-col gap-2',
      accentBorder, accentBg, className,
    )}>
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xs font-mono uppercase tracking-[0.2em] text-ink-ghost mb-1">
            MARKET REGIME
          </div>
          <div className={clsx('font-mono text-2xl font-bold tracking-wide', cfg.textClass)}>
            {cfg.label}
          </div>
          <div className="text-sm text-ink-secondary mt-1 max-w-md">
            {cfg.description}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 min-w-32">
          <div className="text-2xs font-mono uppercase tracking-wider text-ink-ghost">
            CONFIDENCE
          </div>
          <div className={clsx('font-mono text-3xl font-bold', cfg.textClass)}>
            {regime.confidence}<span className="text-lg">%</span>
          </div>
          <div className="w-full">
            <ConfidenceBar value={regime.confidence} showNumber={false} size="md" />
          </div>
        </div>
      </div>

      {/* Sub-scores */}
      <div className="grid grid-cols-6 gap-2 pt-2 border-t border-ops-600">
        {Object.entries(regime.subScores).map(([key, val]) => (
          <div key={key} className="flex flex-col gap-1">
            <div className="text-2xs uppercase tracking-wider text-ink-ghost font-mono">
              {key}
            </div>
            <div className="h-1 bg-ops-500 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${val}%`,
                  backgroundColor: val >= 60 ? '#3DA85E' : val >= 40 ? '#E89B10' : '#C72019',
                }}
              />
            </div>
            <div className="text-2xs font-mono text-ink-muted">{val}</div>
          </div>
        ))}
      </div>

      {/* Drivers */}
      <div className="grid grid-cols-3 gap-3 pt-1">
        <div>
          <div className="text-2xs font-mono uppercase tracking-wider text-tac-600 mb-1">
            TOP DRIVERS
          </div>
          {regime.drivers.slice(0, 3).map((d, i) => (
            <div key={i} className="text-xs text-ink-secondary py-0.5 flex items-start gap-1.5">
              <span className="text-tac-600 mt-0.5">▸</span>{d}
            </div>
          ))}
        </div>
        <div>
          <div className="text-2xs font-mono uppercase tracking-wider text-crit-600 mb-1">
            TOP RISKS
          </div>
          {regime.risks.slice(0, 3).map((r, i) => (
            <div key={i} className="text-xs text-ink-secondary py-0.5 flex items-start gap-1.5">
              <span className="text-crit-600 mt-0.5">▸</span>{r}
            </div>
          ))}
        </div>
        <div>
          <div className="text-2xs font-mono uppercase tracking-wider text-amber-600 mb-1">
            WATCH NEXT
          </div>
          {regime.watchNext.slice(0, 3).map((w, i) => (
            <div key={i} className="text-xs text-ink-secondary py-0.5 flex items-start gap-1.5">
              <span className="text-amber-600 mt-0.5">▸</span>{w}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
