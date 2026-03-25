'use client'

import type { InternalsModule } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { ModuleMetaFooter } from '@/components/ui/ModuleMetaFooter'
import { InferredModuleBand } from '@/components/ui/InferredModuleBand'

interface Props {
  data: InternalsModule
}

export function InternalsCard({ data }: Props) {
  const hasSeries =
    data.advDecLine.data.length > 0 ||
    data.upDownVolRatio.data.length > 0 ||
    data.vwapParticipation.data.length > 0

  return (
    <Card
      title="Daily internals"
      subtitle="Intraday breadth, volume, VWAP — exchange-grade feed required"
      variant="secondary"
      sourceType={data.meta.dataClass}
      lastUpdated={data.meta.fetchedAt}
      footer={<ModuleMetaFooter meta={data.meta} />}
    >
      <InferredModuleBand caveat="Intraday internals require exchange breadth + consolidated tape — not connected.">
        <p className="text-xs text-ink-secondary leading-relaxed py-2 pr-2">
          A/D line, up/down volume, VWAP participation, and live sector breadth are empty until a provider
          is configured. The posture summary below uses engine defaults only.
        </p>
      </InferredModuleBand>

      {!hasSeries ? (
        <div className="rounded-sm border border-dashed border-steel-700 bg-ops-900/30 px-3 py-4 text-center">
          <div className="text-2xs font-mono uppercase tracking-wider text-steel-500 mb-1">
            Feed unavailable
          </div>
          <p className="text-xs text-ink-secondary leading-relaxed">
            Connect a market-data provider with intraday breadth and tape analytics to populate this module.
            The dashboard remains usable; regime and end-of-day modules are unaffected.
          </p>
        </div>
      ) : (
        <div className="text-xs text-ink-muted font-mono">
          Series length: A/D {data.advDecLine.data.length} · Up/Dn vol {data.upDownVolRatio.data.length} · VWAP{' '}
          {data.vwapParticipation.data.length}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 text-2xs font-mono uppercase text-ink-muted">
        <div className="border border-ops-700 rounded-sm px-2 py-1.5 bg-ops-950/40">
          <span className="text-ink-ghost">Gap follow-through</span>
          <div className="text-ink-secondary mt-0.5">{data.openingGapFollowThrough}</div>
        </div>
        <div className="border border-ops-700 rounded-sm px-2 py-1.5 bg-ops-950/40">
          <span className="text-ink-ghost">Momentum</span>
          <div className="text-ink-secondary mt-0.5">{data.momentumDirection}</div>
        </div>
        <div className="border border-ops-700 rounded-sm px-2 py-1.5 bg-ops-950/40 col-span-2">
          <span className="text-ink-ghost">Internals vs price</span>
          <div className="text-ink-secondary mt-0.5">
            {data.internalsConfirmPrice ? 'Confirming' : 'Not confirming'} (low confidence without live tape)
          </div>
        </div>
      </div>
    </Card>
  )
}
