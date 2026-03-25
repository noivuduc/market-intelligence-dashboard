import type { RetailModule, OrganicVolumeModule } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { InferredModuleBand } from '@/components/ui/InferredModuleBand'
import { ModuleMetaFooter } from '@/components/ui/ModuleMetaFooter'
import { StatusBadge, ConfidenceBar } from '@/components/ui/StatusChip'
import { clsx } from 'clsx'

interface Props {
  retail:  RetailModule
  organic: OrganicVolumeModule
}

export function RetailOrganicCard({ retail, organic }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {/* Retail proxy */}
      <Card
        title="RETAIL PARTICIPATION"
        variant="compact"
        sourceType="inferred"
        lastUpdated={retail.meta.fetchedAt}
        subtitle="Proxy only — do not trade on this block"
        footer={<ModuleMetaFooter meta={retail.meta} />}
        headerRight={
          <StatusBadge
            status={
              retail.participationLevel === 'high'   ? 'elevated' :
              retail.participationLevel === 'medium' ? 'watch'    :
              'stable'
            }
            label={retail.participationLevel.toUpperCase()}
            size="xs"
          />
        }
      >
        <InferredModuleBand caveat={retail.caveat}>
          <div className="py-2 grid grid-cols-3 gap-2">
            {[
              { label: 'Fractional', val: retail.fractionalProxy },
              { label: 'Odd-lot', val: retail.oddLotProxy },
              { label: 'Ret. opt', val: retail.retailOptionsProxy },
            ].map(({ label, val }) => (
              <div key={label} className="flex flex-col gap-1">
                <span className="text-[0.6rem] font-mono uppercase text-ink-muted">{label}</span>
                <span className="font-mono text-xs font-semibold text-ink-primary">
                  {val.formatted ?? (val.value != null ? String(val.value) : '—')}
                </span>
                <ConfidenceBar value={28} showNumber={false} size="sm" />
              </div>
            ))}
          </div>
          {retail.explanation && (
            <div className="pb-2 text-[0.7rem] text-ink-secondary italic border-t border-ops-700/80 pt-2">
              {retail.explanation.oneLiner}
            </div>
          )}
        </InferredModuleBand>
      </Card>

      {/* Organic volume */}
      <Card
        title="ORGANIC VOLUME"
        variant="secondary"
        sourceType="derived"
        lastUpdated={organic.meta.fetchedAt}
        subtitle="Derived — proprietary decomposition"
        footer={<ModuleMetaFooter meta={organic.meta} />}
        headerRight={
          <StatusBadge
            status={organic.isMechanical ? 'inferred' : 'confirmed'}
            label={organic.isMechanical ? 'MECHANICAL' : 'ORGANIC'}
            size="xs"
          />
        }
      >
        {/* Volume breakdown */}
        <div className="mb-3 pb-3 border-b border-ops-700">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xs font-mono uppercase tracking-wider text-ink-ghost">
              TAPE QUALITY SCORE
            </span>
            <span className={clsx(
              'font-mono text-sm font-bold ml-auto',
              organic.tapeQualityScore >= 70 ? 'text-tac-400' :
              organic.tapeQualityScore >= 45 ? 'text-amber-400' :
              'text-crit-400'
            )}>
              {organic.tapeQualityScore}/100
            </span>
          </div>
          <div className="h-1.5 bg-ops-500 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${organic.tapeQualityScore}%`,
                backgroundColor: organic.tapeQualityScore >= 70 ? '#3DA85E' : organic.tapeQualityScore >= 45 ? '#E89B10' : '#C72019',
              }}
            />
          </div>
        </div>

        {/* Volume stack */}
        <div className="space-y-1">
          {[
            { label: 'TOTAL VOLUME',      val: organic.totalVolume.formatted ?? '',    color: 'text-ink-primary' },
            { label: '- AUCTION VOL',     val: organic.auctionVolume.formatted ?? '',   color: 'text-crit-500' },
            { label: '- MECHANICAL WIND.',val: organic.mechanicalWindow.formatted ?? '', color: 'text-amber-500' },
            { label: '= ORGANIC VOL',     val: organic.adjustedOrganic.formatted ?? '', color: 'text-tac-400', bold: true },
          ].map(({ label, val, color, bold }) => (
            <div key={label} className={clsx(
              'flex items-center justify-between py-1',
              bold && 'border-t border-ops-600 pt-2 mt-1',
            )}>
              <span className="text-2xs font-mono uppercase text-ink-ghost">{label}</span>
              <span className={clsx('font-mono text-xs', color, bold && 'font-bold text-sm')}>{val}</span>
            </div>
          ))}
        </div>

        <div className={clsx(
          'mt-3 p-2 rounded-sm border text-xs',
          organic.priceActionSupported
            ? 'bg-tac-900/20 border-tac-800 text-tac-400'
            : 'bg-crit-900/20 border-crit-800 text-crit-400'
        )}>
          {organic.priceActionSupported
            ? '✓ Price action supported by organic participation'
            : '✗ Price action not supported — mechanical flow suspected'
          }
        </div>

        {organic.explanation && (
          <div className="mt-3 pt-3 border-t border-ops-700">
            <div className="text-2xs font-mono uppercase tracking-wider text-tac-700 mb-1">ASSESSMENT</div>
            <div className="text-xs text-ink-secondary italic leading-relaxed">
              {organic.explanation.oneLiner}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
