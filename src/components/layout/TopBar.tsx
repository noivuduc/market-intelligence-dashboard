'use client'
import { clsx } from 'clsx'
import type { RegimeState, Alert } from '@/lib/types'
import { REGIME_CONFIG } from '@/lib/regime/engine'
import { AlertBadge } from '@/components/ui/StatusChip'

interface TopBarProps {
  regime:  RegimeState
  alerts:  Alert[]
  lastUpdated: string
}

export function TopBar({ regime, alerts, lastUpdated }: TopBarProps) {
  const cfg = REGIME_CONFIG[regime.label]
  const criticalAlerts = alerts.filter(a => !a.acknowledged && a.severity === 'critical')
  const watchAlerts    = alerts.filter(a => !a.acknowledged && a.severity !== 'critical')

  return (
    <header className="bg-ops-900 border-b border-ops-600 px-4 py-0 flex items-center justify-between min-h-11 h-11 sticky top-0 z-50">
      {/* Left — branding */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {/* Tactical logo mark */}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="flex-shrink-0">
            <circle cx="10" cy="10" r="9" stroke="#3DA85E" strokeWidth="1" opacity="0.4"/>
            <circle cx="10" cy="10" r="6" stroke="#3DA85E" strokeWidth="1" opacity="0.6"/>
            <circle cx="10" cy="10" r="2" fill="#3DA85E" opacity="0.8"/>
            <line x1="1" y1="10" x2="4" y2="10" stroke="#3DA85E" strokeWidth="1" opacity="0.5"/>
            <line x1="16" y1="10" x2="19" y2="10" stroke="#3DA85E" strokeWidth="1" opacity="0.5"/>
            <line x1="10" y1="1" x2="10" y2="4" stroke="#3DA85E" strokeWidth="1" opacity="0.5"/>
            <line x1="10" y1="16" x2="10" y2="19" stroke="#3DA85E" strokeWidth="1" opacity="0.5"/>
          </svg>
          <span className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-ink-secondary">
            MARKET INTEL
          </span>
          <span className="text-ops-400 mx-1">{'//'}</span>
          <span className="font-mono text-xs uppercase tracking-widest text-ink-ghost">
            COMMAND DASHBOARD
          </span>
        </div>

        {/* Separator */}
        <div className="w-px h-5 bg-ops-600" />

        {/* Regime pill */}
        <div className={clsx(
          'flex items-center gap-2 px-2 py-0.5 border rounded-sm',
          {
            'border-tac-700 bg-tac-900/30':   regime.label === 'risk-on',
            'border-crit-800 bg-crit-900/30': regime.label === 'risk-off',
            'border-steel-700 bg-steel-900/20': regime.label === 'sideways',
            'border-amber-800 bg-amber-900/20': ['bottoming-candidate','topping-candidate'].includes(regime.label),
            'border-steel-700 bg-ops-700/20': regime.label === 'transition',
          }
        )}>
          <span className="font-mono text-xs uppercase tracking-widest text-ink-ghost">REGIME</span>
          <span className={clsx('font-mono text-sm font-bold uppercase tracking-wide', cfg.textClass)}>
            {cfg.label}
          </span>
          <span className="font-mono text-xs text-ink-ghost">{regime.confidence}%</span>
        </div>
      </div>

      {/* Center — nav links */}
      <nav className="hidden lg:flex items-center gap-0.5">
        {NAV_ITEMS.map(item => (
          <a
            key={item.href}
            href={item.href}
            className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-ink-ghost hover:text-ink-secondary hover:bg-ops-700/50 rounded-sm transition-colors"
          >
            {item.label}
          </a>
        ))}
      </nav>

      {/* Right — alerts + time */}
      <div className="flex items-center gap-3">
        {criticalAlerts.length > 0 && (
          <div className="flex items-center gap-1.5 alert-pulse">
            <AlertBadge severity="critical" label={`${criticalAlerts.length} CRITICAL`} />
          </div>
        )}
        {watchAlerts.length > 0 && (
          <AlertBadge severity="watch" label={`${watchAlerts.length} WATCH`} />
        )}
        <div className="w-px h-5 bg-ops-600" />
        <div className="text-xs font-mono text-ink-ghost">
          <span className="text-tac-700 mr-1">●</span>
          LIVE
        </div>
        <div className="text-xs font-mono text-ink-ghost">
          {new Date(lastUpdated).toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
          })}
        </div>
      </div>
    </header>
  )
}

/** In-page anchors on `/` (see `page.tsx`). Paths like `/macro` redirect to `/#macro`. */
const NAV_ITEMS = [
  { label: 'Overview',   href: '/#overview' },
  { label: 'Macro',      href: '/#macro' },
  { label: 'Rates',      href: '/#rates' },
  { label: 'Liquidity',  href: '/#liquidity' },
  { label: 'Breadth',    href: '/#breadth' },
  { label: 'Options',    href: '/#options' },
  { label: 'Flows',      href: '/#flows' },
  { label: 'Alerts',     href: '/#alerts' },
  { label: 'Watchlist',  href: '/#watchlist' },
]
