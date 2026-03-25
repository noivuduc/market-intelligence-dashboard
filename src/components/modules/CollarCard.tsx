import type { CollarModule } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { InferredModuleBand } from '@/components/ui/InferredModuleBand'
import { ModuleMetaFooter } from '@/components/ui/ModuleMetaFooter'
import { StatusBadge, ConfidenceBar } from '@/components/ui/StatusChip'
import { clsx } from 'clsx'

interface Props { data: CollarModule; spotPrice?: number }

export function CollarCard({ data, spotPrice = 5305 }: Props) {
  return (
    <Card
      title="JPM COLLAR WATCH"
      variant="compact"
      sourceType="inferred"
      lastUpdated={data.meta.fetchedAt}
      subtitle="Structure estimate — not confirmed flow"
      footer={<ModuleMetaFooter meta={data.meta} />}
      headerRight={
        <div className="flex gap-1.5">
          <StatusBadge
            status={data.isActive ? 'watch' : 'inactive'}
            label={data.isActive ? 'ACTIVE' : 'INACTIVE'}
            size="xs"
          />
          <StatusBadge
            status="inferred"
            label="INFERRED"
            size="xs"
          />
        </div>
      }
    >
      <InferredModuleBand caveat={data.caveat}>
      {/* Confidence bar */}
      <div className="py-2 pb-3 border-b border-ops-700">
        <div className="flex justify-between items-center mb-1">
          <span className="text-2xs font-mono uppercase tracking-wider text-ink-ghost">SIGNAL CONFIDENCE</span>
          <span className="text-2xs font-mono text-ink-ghost capitalize">{data.confidence}</span>
        </div>
        <ConfidenceBar value={data.confidence === 'high' ? 80 : data.confidence === 'medium' ? 55 : 25} />
      </div>

      {/* Strike zones */}
      {data.estimatedPutZone && data.estimatedCallZone && (
        <div className="mb-3">
          <div className="text-2xs font-mono uppercase tracking-wider text-ink-ghost mb-2">
            ESTIMATED STRUCTURE
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={clsx('p-2 border rounded-sm', 'border-crit-900 bg-crit-900/10')}>
              <div className="text-2xs font-mono uppercase text-crit-600 mb-0.5">PUT ZONE</div>
              <div className="font-mono text-sm text-crit-400">
                {data.estimatedPutZone.lower.toLocaleString()} – {data.estimatedPutZone.upper.toLocaleString()}
              </div>
              <div className="text-2xs text-ink-ghost mt-0.5">
                Spot: {spotPrice > data.estimatedPutZone.upper
                  ? `+${(spotPrice - data.estimatedPutZone.upper).toFixed(0)} pts above`
                  : spotPrice < data.estimatedPutZone.lower
                  ? `${(spotPrice - data.estimatedPutZone.lower).toFixed(0)} pts below`
                  : 'IN ZONE'
                }
              </div>
            </div>
            <div className={clsx('p-2 border rounded-sm', 'border-tac-900 bg-tac-900/10')}>
              <div className="text-2xs font-mono uppercase text-tac-600 mb-0.5">CALL ZONE</div>
              <div className="font-mono text-sm text-tac-400">
                {data.estimatedCallZone.lower.toLocaleString()} – {data.estimatedCallZone.upper.toLocaleString()}
              </div>
              <div className="text-2xs text-ink-ghost mt-0.5">
                Spot: {spotPrice < data.estimatedCallZone.lower
                  ? `${(data.estimatedCallZone.lower - spotPrice).toFixed(0)} pts below`
                  : spotPrice > data.estimatedCallZone.upper
                  ? `+${(spotPrice - data.estimatedCallZone.upper).toFixed(0)} pts above`
                  : 'IN ZONE'
                }
              </div>
            </div>
          </div>

          {/* Spot position */}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-2xs text-ink-ghost">SPOT RELATIVE TO COLLAR:</span>
            <StatusBadge
              status={
                data.spotRelative === 'in-range' ? 'stable' :
                data.spotRelative === 'below-put' ? 'critical' :
                data.spotRelative === 'above-call' ? 'elevated' : 'delayed'
              }
              label={data.spotRelative.replace('-', ' ').toUpperCase()}
              size="xs"
            />
          </div>
        </div>
      )}

      {/* Next roll */}
      {data.nextRollWindow && (
        <div className="pt-3 border-t border-ops-700 flex items-center justify-between">
          <div>
            <div className="text-2xs font-mono uppercase tracking-wider text-ink-ghost mb-0.5">
              NEXT ESTIMATED ROLL
            </div>
            <div className="font-mono text-sm text-amber-400">{data.nextRollWindow}</div>
          </div>
          <StatusBadge status="inferred" label="INFERRED DATE" size="xs" />
        </div>
      )}

      {data.explanation && (
        <div className="mt-2 pt-2 border-t border-ops-700/80 pb-1">
          <div className="text-[0.65rem] font-mono uppercase tracking-wider text-tac-700 mb-1">Assessment</div>
          <div className="text-xs text-ink-secondary italic leading-relaxed">
            {data.explanation.oneLiner}
          </div>
          <div className="mt-1 text-[0.65rem] text-ink-ghost">
            Watch: {data.explanation.watchNext}
          </div>
        </div>
      )}
      </InferredModuleBand>
    </Card>
  )
}
