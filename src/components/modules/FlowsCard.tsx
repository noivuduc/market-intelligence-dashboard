import type { FlowsModule } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { ModuleMetaFooter } from '@/components/ui/ModuleMetaFooter'
import { StatusBadge } from '@/components/ui/StatusChip'
import { MetricRow } from '@/components/ui/MetricTile'
import { clsx } from 'clsx'

interface Props { data: FlowsModule }

function flowImplication(d: FlowsModule): string {
  if (d.overallPressure === 'buying' && d.futuresPressure === 'buying') {
    return 'Tape leaning risk-on — futures and ETF proxy aligned to the buy side.'
  }
  if (d.overallPressure === 'selling' && d.futuresPressure === 'selling') {
    return 'Defensive lean — reduce risk appetite until flow stabilizes.'
  }
  return 'Mixed flow — no single-sided conviction; size for range / event risk.'
}

export function FlowsCard({ data }: Props) {
  const buyPct =
    data.overallPressure === 'buying' ? 72 :
    data.overallPressure === 'selling' ? 28 : 50

  return (
    <Card
      title="MONEY FLOWS"
      variant="secondary"
      sourceType="derived"
      lastUpdated={data.meta.fetchedAt}
      subtitle="ETF proxy · no consolidated tape"
      footer={<ModuleMetaFooter meta={data.meta} />}
      headerRight={
        <div className="flex gap-1.5">
          <StatusBadge
            status={data.overallPressure === 'buying' ? 'stable' : data.overallPressure === 'selling' ? 'elevated' : 'watch'}
            label={`NET: ${data.overallPressure.toUpperCase()}`}
            size="xs"
          />
          <StatusBadge
            status={data.demandType === 'organic' ? 'confirmed' : data.demandType === 'mechanical' ? 'inferred' : 'watch'}
            label={data.demandType.toUpperCase()}
            size="xs"
          />
        </div>
      }
    >
      <div className="mb-3 pb-3 border-b border-ops-700">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <div className="text-[0.65rem] font-mono uppercase tracking-widest text-ink-muted">
              Net pressure
            </div>
            <div className={clsx(
              'font-mono text-xl font-bold tracking-tight',
              data.overallPressure === 'buying' ? 'text-tac-400' :
              data.overallPressure === 'selling' ? 'text-crit-400' : 'text-amber-400',
            )}>
              {data.overallPressure.toUpperCase()}
            </div>
          </div>
          <div className="text-right text-[0.7rem] text-ink-secondary max-w-[200px] leading-snug">
            {flowImplication(data)}
          </div>
        </div>
        <div className="h-2.5 rounded-sm overflow-hidden flex bg-ops-600">
          <div
            className="h-full bg-tac-700/90 transition-all"
            style={{ width: `${buyPct}%` }}
            title="Buy-side lean"
          />
          <div
            className="h-full bg-crit-700/90 flex-1"
            title="Sell-side lean"
          />
        </div>
        <div className="flex justify-between text-[0.6rem] font-mono text-ink-muted mt-1">
          <span>Futures: {data.futuresPressure}</span>
          <span>Demand read: {data.demandType}</span>
        </div>
      </div>

      {/* Main metrics */}
      <div className="grid grid-cols-2 gap-x-4 mb-3 pb-3 border-b border-ops-700">
        <MetricRow
          label="ETF FLOW PROXY"
          value={data.etfFlowProxy.formatted ?? ''}
          change={data.etfFlowProxy.changePct}
          source="inferred"
        />
        <MetricRow
          label="OFF-EXCHANGE SHARE"
          value={data.offExchangeShare.formatted ?? ''}
          change={data.offExchangeShare.change}
          source="derived"
        />
        <MetricRow
          label="BLOCK INTENSITY"
          value={data.blockIntensity.formatted ?? ''}
          change={data.blockIntensity.change}
          source="observed"
        />
        <div className="flex items-center justify-between py-1.5 border-b border-ops-700">
          <span className="text-2xs text-ink-ghost uppercase">FUTURES PRESSURE</span>
          <StatusBadge
            status={data.futuresPressure === 'buying' ? 'stable' : data.futuresPressure === 'selling' ? 'elevated' : 'watch'}
            label={data.futuresPressure.toUpperCase()}
            size="xs"
          />
        </div>
        <div className="flex items-center justify-between py-1.5 border-b border-ops-700">
          <span className="text-2xs text-ink-ghost uppercase">OPTIONS PREM FLOW</span>
          <StatusBadge
            status={data.optionsPremiumFlow === 'call-heavy' ? 'stable' : data.optionsPremiumFlow === 'put-heavy' ? 'elevated' : 'watch'}
            label={data.optionsPremiumFlow.replace('-', ' ').toUpperCase()}
            size="xs"
          />
        </div>
      </div>

      {/* Sector rotation */}
      {data.sectorRotation.length > 0 && (
        <div>
          <div className="text-2xs font-mono uppercase tracking-wider text-ink-ghost mb-2">
            SECTOR ROTATION SIGNALS
          </div>
          {data.sectorRotation.map((r, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5 border-b border-ops-700 last:border-0">
              <span className="text-xs text-crit-400 font-mono">{r.from}</span>
              <span className="text-ink-ghost text-xs">→</span>
              <span className="text-xs text-tac-400 font-mono">{r.to}</span>
              <div className="flex-1" />
              <StatusBadge
                status={r.confidence === 'high' ? 'confirmed' : r.confidence === 'medium' ? 'watch' : 'inferred'}
                label={r.confidence.toUpperCase()}
                size="xs"
              />
            </div>
          ))}
        </div>
      )}

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
