import type { LiquidityModule } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { ModuleMetaFooter } from '@/components/ui/ModuleMetaFooter'
import { StatusBadge, ConfidenceBar } from '@/components/ui/StatusChip'
import { MetricRow } from '@/components/ui/MetricTile'
import { clsx } from 'clsx'

interface Props { data: LiquidityModule }

const stanceChip = (s: LiquidityModule['liquidityStance']) => {
  if (s === 'supportive')  return 'stable'   as const
  if (s === 'neutral')     return 'watch'    as const
  if (s === 'restrictive') return 'elevated' as const
  return 'watch' as const
}

export function LiquidityCard({ data }: Props) {
  return (
    <Card
      title="LIQUIDITY & FIN. CONDITIONS"
      variant="secondary"
      sourceType="derived"
      lastUpdated={data.meta.fetchedAt}
      subtitle="Chicago Fed NFCI/ANFCI · FRED · ICE spreads"
      footer={<ModuleMetaFooter meta={data.meta} />}
      headerRight={
        <div className="flex gap-1.5">
          <StatusBadge
            status={stanceChip(data.liquidityStance)}
            label={data.liquidityStance.toUpperCase()}
            size="xs"
          />
        </div>
      }
    >
      {/* Vulnerability meter */}
      <div className="mb-3 pb-3 border-b border-ops-700">
        <div className="flex items-center justify-between mb-1">
          <span className="text-2xs font-mono uppercase tracking-wider text-ink-ghost">
            MARKET VULNERABILITY SCORE
          </span>
          <span className={clsx(
            'font-mono text-sm font-bold',
            data.vulnerabilityScore >= 70 ? 'text-crit-400' :
            data.vulnerabilityScore >= 40 ? 'text-amber-400' :
            'text-tac-400'
          )}>
            {data.vulnerabilityScore}/100
          </span>
        </div>
        <div className="h-2 bg-ops-500 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${data.vulnerabilityScore}%`,
              background: data.vulnerabilityScore >= 70
                ? 'linear-gradient(to right, #E89B10, #C72019)'
                : data.vulnerabilityScore >= 40
                ? 'linear-gradient(to right, #3DA85E, #E89B10)'
                : 'linear-gradient(to right, #2D8A48, #3DA85E)',
            }}
          />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-2xs text-tac-700">LOW RISK</span>
          <span className="text-2xs text-crit-700">HIGH RISK</span>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-x-4">
        <MetricRow label="SOFR"            value={`${data.sofr.value?.toFixed(2)}%`}       change={data.sofr.change}       source="observed" />
        <MetricRow label="Reserve Balances" value={data.reserveBalances.formatted ?? ''}   source="observed" />
        <MetricRow label="ON RRP Usage"    value={data.onRrpUsage.formatted ?? ''}          source="observed" />
        <MetricRow label="HY OAS"          value={data.hySpread.formatted ?? ''}  change={data.hySpread.change}  source="observed" />
        <MetricRow label="IG OAS"          value={data.igSpread.formatted ?? ''}  change={data.igSpread.change}  source="observed" />
        <MetricRow label="NFCI"            value={data.fciChicago.formatted ?? ''} change={data.fciChicago.change} source="observed" note="Chicago Fed" />
        <MetricRow label="ANFCI"           value={data.fciAdjusted.formatted ?? ''}   change={data.fciAdjusted.change}  source="observed" note="adj. NFCI" />
        <MetricRow label="Recession Prob"  value={data.recessionProb.formatted ?? ''} source="derived" />
      </div>

      {/* Stress badges */}
      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-ops-700">
        {[
          { label: 'CREDIT STRESS', val: data.creditStress },
          { label: 'VOL STRESS',    val: data.volStress },
        ].map(({ label, val }) => (
          <div key={label}>
            <div className="text-2xs font-mono uppercase tracking-wider text-ink-ghost mb-1">{label}</div>
            <StatusBadge
              status={
                val === 'low'      ? 'stable'   :
                val === 'moderate' ? 'watch'    :
                val === 'elevated' ? 'elevated' :
                'critical'
              }
              label={val.toUpperCase()}
              size="sm"
            />
          </div>
        ))}
      </div>

      {data.explanation && (
        <div className="mt-3 pt-3 border-t border-ops-700">
          <div className="text-2xs font-mono uppercase tracking-wider text-tac-700 mb-1">ASSESSMENT</div>
          <div className="text-xs text-ink-secondary leading-relaxed italic">
            {data.explanation.oneLiner}
          </div>
          <div className="mt-1 text-2xs text-ink-ghost">
            Watch: {data.explanation.watchNext}
          </div>
        </div>
      )}
    </Card>
  )
}
