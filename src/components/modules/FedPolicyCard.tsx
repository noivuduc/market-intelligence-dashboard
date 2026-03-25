import type { FedPolicyModule } from '@/lib/types'
import { Card, BriefBlock } from '@/components/ui/Card'
import { ModuleMetaFooter } from '@/components/ui/ModuleMetaFooter'
import { StatusBadge } from '@/components/ui/StatusChip'
import { MetricRow } from '@/components/ui/MetricTile'
import { clsx } from 'clsx'

interface Props { data: FedPolicyModule }

const stanceChip = (s: FedPolicyModule['policyStance']) => {
  if (s === 'easing')     return 'stable'   as const
  if (s === 'on-hold')    return 'watch'    as const
  if (s === 'tightening') return 'elevated' as const
  return 'transitioning' as const
}

const liquidityChip = (l: FedPolicyModule['liquidityImplication']) => {
  if (l === 'supportive')  return 'stable'   as const
  if (l === 'neutral')     return 'watch'    as const
  if (l === 'restrictive') return 'elevated' as const
  return 'watch' as const
}

export function FedPolicyCard({ data }: Props) {
  return (
    <Card
      title="FED & POLICY"
      variant="primary"
      sourceType="observed"
      lastUpdated={data.meta.fetchedAt}
      subtitle="Federal Reserve · FRED"
      footer={<ModuleMetaFooter meta={data.meta} />}
      headerRight={
        <div className="flex gap-1.5">
          <StatusBadge status={stanceChip(data.policyStance)} label={data.policyStance.toUpperCase()} size="xs" />
          <StatusBadge status={liquidityChip(data.liquidityImplication)} label={data.liquidityImplication.toUpperCase()} size="xs" />
        </div>
      }
    >
      {/* Fed Funds Range */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-ops-700">
        <div>
          <div className="text-2xs uppercase tracking-widest text-ink-ghost font-mono mb-0.5">FED FUNDS TARGET</div>
          <div className="font-mono text-2xl font-bold text-ink-primary">
            {data.fedFundsTarget.lower.toFixed(2)}
            <span className="text-ink-muted text-lg mx-1">–</span>
            {data.fedFundsTarget.upper.toFixed(2)}
            <span className="text-ink-muted text-sm ml-1">%</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xs uppercase tracking-widest text-ink-ghost font-mono mb-0.5">NEXT FOMC</div>
          <div className="font-mono text-sm text-amber-400">{data.nextFomcDate || '—'}</div>
          <div className="text-2xs text-ink-ghost mt-0.5">
            {data.daysToFomc != null
              ? `${data.daysToFomc}d to statement`
              : data.nextFomcDate
                ? `${daysUntil(data.nextFomcDate)}d`
                : 'Extend FOMC calendar'}
          </div>
        </div>
      </div>

      {/* Key rates grid */}
      <div className="grid grid-cols-2 gap-x-4">
        <MetricRow label="IORB"           value={`${data.iorb.value?.toFixed(2)}%`}       change={data.iorb.change}       source="observed" />
        <MetricRow label="ON RRP"         value={data.onRrp.formatted ?? '—'}               change={data.onRrp.change}      source="observed" />
        <MetricRow label="Discount Rate"  value={`${data.discountRate.value?.toFixed(2)}%`} change={data.discountRate.change} source="observed" />
        <MetricRow label="Balance Sheet"  value={data.balanceSheet.formatted ?? ''}        source="observed" />
        <MetricRow label="QT Monthly Cap" value={data.qtMonthly.formatted ?? ''}           source="observed" />
        <MetricRow label="Trend Drift"    value={data.trendDrift.toUpperCase()}             source="derived" />
      </div>

      {/* Market implied path */}
      <div className="mt-3 pt-3 border-t border-ops-700">
        <div className="text-2xs font-mono uppercase tracking-wider text-ink-ghost mb-2">
          MARKET-IMPLIED RATE PATH
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {data.marketImpliedPath.map((p, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5 min-w-14">
              <div className="font-mono text-sm font-semibold text-steel-400">
                {p.impliedRate.toFixed(2)}%
              </div>
              <div className="text-2xs text-ink-ghost text-center">
                {new Date(p.meetingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              {i > 0 && (
                <div className={clsx(
                  'text-2xs font-mono',
                  p.impliedRate < data.marketImpliedPath[i-1]!.impliedRate ? 'text-tac-500' : 'text-crit-500'
                )}>
                  {(p.impliedRate - data.marketImpliedPath[i-1]!.impliedRate).toFixed(2)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* AI explanation */}
      {data.explanation && (
        <div className="mt-3 pt-3 border-t border-ops-700">
          <div className="text-2xs font-mono uppercase tracking-wider text-tac-700 mb-1">
            INTELLIGENCE ASSESSMENT
          </div>
          <div className="text-xs text-ink-secondary leading-relaxed italic">
            {data.explanation.oneLiner}
          </div>
          <div className="mt-1.5 text-2xs text-ink-ghost">
            Watch: {data.explanation.watchNext}
          </div>
        </div>
      )}
    </Card>
  )
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}
