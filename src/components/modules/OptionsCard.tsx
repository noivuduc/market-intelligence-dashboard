'use client'
import type { OptionsModule, GammaLevel } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { ModuleMetaFooter } from '@/components/ui/ModuleMetaFooter'
import { StatusBadge } from '@/components/ui/StatusChip'
import { clsx } from 'clsx'

interface Props { data: OptionsModule; spotPrice?: number }

function GammaMapBody({
  data,
  spotPrice,
  putWall,
  callWall,
  zeroGamma,
}: {
  data: OptionsModule
  spotPrice: number
  putWall: number
  callWall: number
  zeroGamma: number
}) {
  const range = Math.max(callWall - putWall, 1)
  const spotPctRaw = ((spotPrice - putWall) / range) * 100
  const spotPct = Math.min(100, Math.max(0, spotPctRaw))
  const zgPctRaw = ((zeroGamma - putWall) / range) * 100
  const zgPct = Math.min(100, Math.max(0, zgPctRaw))

  return (
    <>
      <div className="mb-4">
        <div className="text-2xs font-mono uppercase tracking-wider text-ink-ghost mb-2">
          GAMMA STRUCTURE MAP
        </div>

        <div className="relative h-20 bg-ops-800 border border-ops-600 rounded-sm overflow-hidden">
          <div
            className="absolute inset-y-2 left-0 right-0 mx-1 rounded-sm opacity-30"
            style={{
              background: 'linear-gradient(90deg, rgba(199,32,25,0.25) 0%, rgba(232,155,16,0.15) 50%, rgba(61,168,94,0.25) 100%)',
            }}
          />
          <div className="absolute top-0 bottom-0 w-px bg-crit-600" style={{ left: '0%' }} />
          <div className="absolute top-0 bottom-0 w-px bg-tac-600" style={{ left: '100%' }} />
          <div
            className="absolute top-0 bottom-0 w-px bg-amber-600"
            style={{ left: `${zgPct}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-ink-primary"
            style={{ left: `${spotPct}%` }}
          >
            <div className="absolute -top-1 left-1 text-2xs font-mono text-ink-primary whitespace-nowrap">
              SPX {spotPrice}
            </div>
          </div>

          {data.gammaLevels.map((g: GammaLevel, i: number) => {
            const pct = ((g.strike - putWall) / range) * 100
            if (pct < 0 || pct > 100) return null
            return (
              <div
                key={i}
                className={clsx(
                  'absolute bottom-0 w-1',
                  g.type === 'put-wall'      ? 'bg-crit-700 opacity-80' :
                  g.type === 'call-wall'     ? 'bg-tac-700 opacity-80' :
                  g.type === 'zero-gamma'    ? 'bg-amber-600 opacity-60' :
                  'bg-steel-600 opacity-50'
                )}
                style={{
                  left:  `${pct}%`,
                  height: `${Math.min(90, (g.gammaNotional / 6000) * 100)}%`,
                }}
              />
            )
          })}

          <div className="absolute bottom-0.5 left-1 text-2xs font-mono text-crit-600">{putWall}</div>
          <div className="absolute bottom-0.5 right-1 text-2xs font-mono text-tac-600">{callWall}</div>
          <div
            className="absolute bottom-0.5 text-2xs font-mono text-amber-600 -translate-x-1/2"
            style={{ left: `${zgPct}%` }}
          >
            ZG
          </div>
        </div>

        <div className="flex gap-3 mt-1.5">
          {[
            { color: 'bg-crit-700',  label: 'Put Wall' },
            { color: 'bg-tac-700',   label: 'Call Wall' },
            { color: 'bg-amber-600', label: 'Zero Gamma' },
            { color: 'bg-steel-600', label: 'Cluster' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1">
              <div className={clsx('w-2 h-2 rounded-sm', color)} />
              <span className="text-2xs text-ink-ghost">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 pb-3 border-b border-ops-700">
        {[
          { label: 'PUT WALL',    val: putWall,    color: 'text-crit-400' },
          { label: 'ZERO GAMMA', val: zeroGamma,  color: 'text-amber-400' },
          { label: 'CALL WALL',   val: callWall,   color: 'text-tac-400' },
        ].map(({ label, val, color }) => (
          <div key={label} className="flex flex-col">
            <span className="text-2xs font-mono uppercase tracking-wider text-ink-ghost">{label}</span>
            <span className={clsx('font-mono text-xl font-bold', color)}>{val.toLocaleString()}</span>
            <span className="text-2xs text-ink-ghost">
              {val > spotPrice ? `+${val - spotPrice} pts` : `${val - spotPrice} pts`}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'PINNING RISK',    val: data.pinningRisk },
          { label: 'AIR POCKET RISK', val: data.airPocketRisk },
          { label: 'BREAKOUT SENS.',  val: data.breakoutSensitivity },
        ].map(({ label, val }) => (
          <div key={label}>
            <div className="text-2xs font-mono uppercase tracking-wider text-ink-ghost mb-1">{label}</div>
            <StatusBadge
              status={val === 'high' ? 'elevated' : val === 'moderate' ? 'watch' : 'stable'}
              label={val.toUpperCase()}
              size="xs"
            />
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-ops-700">
        <div className="text-2xs font-mono uppercase tracking-wider text-ink-ghost mb-2">KEY EXPIRIES</div>
        <div className="flex gap-2 flex-wrap">
          {data.keyExpiries.map(e => (
            <div key={e.date} className={clsx(
              'px-2 py-0.5 border rounded-sm text-2xs font-mono',
              e.importance === 'quarterly' ? 'border-crit-800 text-crit-400 bg-crit-900/20' :
              e.importance === 'monthly'   ? 'border-amber-800 text-amber-400 bg-amber-900/20' :
              'border-ops-500 text-ink-muted'
            )}>
              {e.date} <span className="text-ink-ghost">{e.importance.toUpperCase()[0]}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export function OptionsCard({ data, spotPrice = 5305 }: Props) {
  const hasLive =
    data.structureAvailable &&
    data.putWall != null &&
    data.callWall != null &&
    data.zeroGamma != null

  if (!hasLive) {
    return (
      <Card
        title="SPX OPTIONS POSITIONING"
        variant="primary"
        sourceType="inferred"
        lastUpdated={data.meta.fetchedAt}
        subtitle="Pipeline unavailable — OPRA / OCC required"
        footer={<ModuleMetaFooter meta={data.meta} />}
        headerRight={
          <StatusBadge status="unavailable" label="NO OPRA FEED" size="xs" />
        }
      >
        <div className="rounded-sm border border-dashed border-amber-800/50 bg-ops-900/25 p-3 mb-3">
          <p className="text-xs text-ink-secondary leading-relaxed">
            Put wall, call wall, and zero-gamma are not populated. Without a licensed options
            analytics feed, displaying placeholder strikes would misstate dealer positioning.
          </p>
          <p className="text-2xs text-amber-700 mt-2 font-mono">
            Required: OPRA / OCC-derived open interest and gamma (e.g. Polygon.io, Cboe DataShop, or internal risk engine).
          </p>
        </div>
        <div className="text-2xs text-ink-ghost font-mono">
          {data.meta.fetchError ?? 'structureAvailable=false — connect a provider to enable this module.'}
        </div>
      </Card>
    )
  }

  return (
    <Card
      title="SPX OPTIONS POSITIONING"
      variant="primary"
      sourceType="derived"
      lastUpdated={data.meta.fetchedAt}
      subtitle="Model corridor — verify against OPRA"
      footer={<ModuleMetaFooter meta={data.meta} />}
      headerRight={
        <div className="flex gap-1.5">
          <StatusBadge
            status={data.dealerPositioning === 'long-gamma' ? 'stable' : data.dealerPositioning === 'short-gamma' ? 'elevated' : 'watch'}
            label={`DEALER: ${data.dealerPositioning.toUpperCase().replace('-', ' ')}`}
            size="xs"
          />
        </div>
      }
    >
      <GammaMapBody
        data={data}
        spotPrice={spotPrice}
        putWall={data.putWall!}
        callWall={data.callWall!}
        zeroGamma={data.zeroGamma!}
      />

      {data.explanation && (
        <div className="mt-3 pt-3 border-t border-ops-700">
          <div className="text-2xs font-mono uppercase tracking-wider text-tac-700 mb-1">ASSESSMENT</div>
          <div className="text-xs text-ink-secondary leading-relaxed italic">
            {data.explanation.oneLiner}
          </div>
          {data.explanation.caveat && (
            <div className="mt-1 text-2xs text-amber-700 italic">
              ⚠ {data.explanation.caveat}
            </div>
          )}
          <div className="mt-1 text-2xs text-ink-ghost">
            Watch: {data.explanation.watchNext}
          </div>
        </div>
      )}
    </Card>
  )
}
