import { clsx } from 'clsx'
import type { DashboardState } from '@/lib/types'

interface Props {
  quality: DashboardState['dataQuality']
}

export function DataQualityBanner({ quality }: Props) {
  if (quality.overallStatus === 'full') return null

  const issues: string[] = []
  if (!quality.fredAvailable)   issues.push('FRED_API_KEY not set — Fed, Treasury, Liquidity, Macro data unavailable')
  if (!quality.marketAvailable) issues.push('Market data unavailable — Yahoo Finance unreachable')
  if (!quality.aiAvailable)     issues.push('ANTHROPIC_API_KEY not set — AI explanations disabled')

  return (
    <div className={clsx(
      'border rounded-sm px-4 py-3 mb-4',
      quality.overallStatus === 'degraded'
        ? 'bg-crit-900/15 border-crit-800'
        : 'bg-amber-900/10 border-amber-900',
    )}>
      <div className={clsx(
        'text-xs font-mono uppercase tracking-wider font-semibold mb-2',
        quality.overallStatus === 'degraded' ? 'text-crit-400' : 'text-amber-400',
      )}>
        {quality.overallStatus === 'degraded' ? '⬥ DEGRADED DATA MODE' : '▲ PARTIAL DATA MODE'}
      </div>
      <div className="flex flex-col gap-1">
        {issues.map((issue, i) => (
          <div key={i} className="text-xs text-ink-secondary flex items-start gap-2">
            <span className="text-amber-600 mt-0.5 flex-shrink-0">▸</span>
            {issue}
          </div>
        ))}
      </div>
      <div className="mt-2 text-2xs text-ink-ghost">
        Copy <span className="font-mono text-steel-400">.env.example</span> to{' '}
        <span className="font-mono text-steel-400">.env.local</span> and add your API keys.
        See README for setup instructions.
      </div>
    </div>
  )
}

// ---- Unavailable metric display ----

export function UnavailableMetric({ note }: { note: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="font-mono text-sm text-ink-ghost">—</span>
      <span className="text-2xs text-ink-ghost italic">{note}</span>
    </div>
  )
}

// ---- Source availability dot ----

export function AvailabilityDot({ available }: { available: boolean }) {
  return (
    <span className={clsx(
      'inline-block w-1.5 h-1.5 rounded-full',
      available ? 'bg-tac-500' : 'bg-crit-600',
    )} />
  )
}
