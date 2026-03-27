'use client'
import type { OptionsModule, GammaLevel } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { ModuleMetaFooter } from '@/components/ui/ModuleMetaFooter'
import { StatusBadge } from '@/components/ui/StatusChip'
import { clsx } from 'clsx'

interface Props { data: OptionsModule; spotPrice?: number }

// ── Formatters ────────────────────────────────────────────────────────────────

/** Integer with commas, no decimals */
function fmtStrike(n: number): string {
  return Math.round(n).toLocaleString()
}

/**
 * Distance from spot to a level.
 * Positive = level is above spot, negative = level is below spot.
 * e.g. call wall above spot → "+300 pts"
 */
function fmtPts(delta: number): string {
  const r = Math.round(delta)
  return `${r >= 0 ? '+' : ''}${r.toLocaleString()} pts`
}

// ── Corridor Map ──────────────────────────────────────────────────────────────

function CorridorMap({
  putWall,
  zeroGamma,
  callWall,
  spotPrice,
  gammaLevels,
}: {
  putWall:     number
  zeroGamma:   number
  callWall:    number
  spotPrice:   number
  gammaLevels: GammaLevel[]
}) {
  const corridorWidth = callWall - putWall
  const MARGIN        = Math.max(100, corridorWidth * 0.2)
  const rangeMin      = putWall  - MARGIN
  const rangeMax      = callWall + MARGIN
  const totalRange    = rangeMax - rangeMin

  function pct(level: number): number {
    return Math.min(98, Math.max(2, ((level - rangeMin) / totalRange) * 100))
  }

  const putPct  = pct(putWall)
  const callPct = pct(callWall)
  const zgPct   = pct(zeroGamma)
  const spotPct = pct(spotPrice)

  const clusters    = gammaLevels.filter(g => g.type === 'gamma-cluster')
  const maxClusterG = clusters.reduce((m, g) => Math.max(m, g.gammaNotional), 1)

  // Dashed line as repeating-gradient (CSS border-dashed unreliable on zero-width divs)
  const dashedAmber: React.CSSProperties = {
    backgroundImage:
      'repeating-linear-gradient(to bottom, rgba(217,119,6,0.55) 0px, rgba(217,119,6,0.55) 4px, transparent 4px, transparent 9px)',
    width: '1px',
  }

  // Keep spot label off the edges
  const spotLabelLeft = Math.min(Math.max(spotPct, 7), 87)

  return (
    <div className="mb-1">
      {/* ── Map canvas ── */}
      <div
        className="relative rounded-sm overflow-hidden border border-ops-600 bg-ops-850"
        style={{ height: '7.5rem' }}
      >
        {/* Zone fills */}
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${putPct}%`,
            background: 'linear-gradient(90deg, rgba(199,32,25,0.04) 0%, rgba(199,32,25,0.16) 100%)',
          }}
        />
        <div
          className="absolute inset-y-0"
          style={{
            left:  `${putPct}%`,
            width: `${callPct - putPct}%`,
            background: 'rgba(61,168,94,0.06)',
          }}
        />
        <div
          className="absolute inset-y-0"
          style={{
            left:  `${callPct}%`,
            right: 0,
            background: 'linear-gradient(90deg, rgba(232,155,16,0.13) 0%, rgba(232,155,16,0.04) 100%)',
          }}
        />

        {/* Gamma cluster bars — bottom-anchored */}
        {clusters.map((g, i) => {
          const p = pct(g.strike)
          const h = Math.max(6, Math.round((g.gammaNotional / maxClusterG) * 30))
          return (
            <div
              key={i}
              className="absolute bottom-0 bg-steel-600/30 rounded-t-sm"
              style={{ left: `${p}%`, width: '5px', height: `${h}%`, transform: 'translateX(-50%)' }}
            />
          )
        })}

        {/* Put wall line */}
        <div
          className="absolute inset-y-0 w-px bg-crit-600/80"
          style={{ left: `${putPct}%` }}
        />
        {/* Call wall line */}
        <div
          className="absolute inset-y-0 w-px bg-tac-600/80"
          style={{ left: `${callPct}%` }}
        />
        {/* Zero gamma — dashed */}
        <div
          className="absolute inset-y-0"
          style={{ left: `${zgPct}%`, ...dashedAmber }}
        />

        {/* Spot line */}
        <div
          className="absolute inset-y-0 w-0.5 bg-ink-primary"
          style={{ left: `${spotPct}%` }}
        />

        {/* Spot price label — floats above line */}
        <div
          className="absolute top-1.5 -translate-x-1/2 bg-ops-900/80 border border-ops-500/50 rounded-sm px-1.5 py-px text-2xs font-mono text-ink-primary font-bold whitespace-nowrap leading-none"
          style={{ left: `${spotLabelLeft}%` }}
        >
          SPX {fmtStrike(spotPrice)}
        </div>

        {/* Put wall label — bottom left of line */}
        <div
          className="absolute bottom-1 text-2xs font-mono text-crit-400/80 font-semibold whitespace-nowrap"
          style={{ left: `${putPct + 0.5}%` }}
        >
          {fmtStrike(putWall)}
        </div>

        {/* Call wall label — bottom right of line */}
        <div
          className="absolute bottom-1 text-2xs font-mono text-tac-400/80 font-semibold whitespace-nowrap"
          style={{ left: `${callPct + 0.5}%` }}
        >
          {fmtStrike(callWall)}
        </div>

        {/* Zero gamma label — centered below dashed line */}
        <div
          className="absolute bottom-1 text-2xs font-mono text-amber-500/70 whitespace-nowrap -translate-x-1/2"
          style={{ left: `${zgPct}%` }}
        >
          {fmtStrike(zeroGamma)}
        </div>

        {/* Zone micro-labels in margins */}
        <div className="absolute bottom-1 left-1 text-[0.53rem] font-mono uppercase tracking-widest text-crit-700/60 select-none pointer-events-none">
          ▼ PRESS
        </div>
        <div className="absolute bottom-1 right-1 text-[0.53rem] font-mono uppercase tracking-widest text-amber-700/60 select-none pointer-events-none text-right">
          CHASE ▲
        </div>
      </div>

      {/* Legend strip */}
      <div className="flex items-center gap-4 mt-1.5 mb-4">
        {([
          { cls: 'bg-crit-600/80',    label: 'Put Wall' },
          { cls: 'bg-ink-primary',    label: 'Spot' },
          { cls: 'bg-amber-600/55',   label: 'Zero Gamma' },
          { cls: 'bg-tac-600/80',     label: 'Call Wall' },
          { cls: 'bg-steel-600/40',   label: 'Cluster' },
        ] as const).map(({ cls, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className={clsx('w-px h-3 rounded-full', cls)} />
            <span className="text-2xs text-ink-ghost">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Distance Pills ────────────────────────────────────────────────────────────

/**
 * Distance is framed as "buffer before breach":
 *   PUT WALL  → spotPrice - putWall  (+ = above wall = safe)
 *   ZERO GAMMA→ spotPrice - zeroGamma (directional indicator)
 *   CALL WALL → callWall - spotPrice (+ = below wall = safe)
 */
function DistancePills({
  putWall, zeroGamma, callWall, spotPrice,
}: {
  putWall: number; zeroGamma: number; callWall: number; spotPrice: number
}) {
  const pills = [
    {
      key:       'put',
      label:     'PUT WALL',
      strike:    fmtStrike(putWall),
      delta:     spotPrice - putWall,
      safe:      spotPrice > putWall,
      border:    'border-crit-800/50',
      bg:        'bg-crit-900/12',
      strikeClr: 'text-crit-400',
    },
    {
      key:       'zg',
      label:     'ZERO GAMMA',
      strike:    fmtStrike(zeroGamma),
      delta:     spotPrice - zeroGamma,
      safe:      null, // neutral
      border:    'border-amber-800/50',
      bg:        'bg-amber-900/12',
      strikeClr: 'text-amber-400',
    },
    {
      key:       'call',
      label:     'CALL WALL',
      strike:    fmtStrike(callWall),
      delta:     callWall - spotPrice,
      safe:      callWall > spotPrice,
      border:    'border-tac-800/50',
      bg:        'bg-tac-900/12',
      strikeClr: 'text-tac-400',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-ops-700">
      {pills.map(p => (
        <div
          key={p.key}
          className={clsx(
            'px-2 py-2 rounded-sm border flex flex-col gap-0.5',
            p.border, p.bg,
          )}
        >
          <span className="text-2xs font-mono uppercase tracking-wider text-ink-ghost leading-none">
            {p.label}
          </span>
          <span className={clsx('font-mono text-sm font-bold leading-tight', p.strikeClr)}>
            {p.strike}
          </span>
          <span className={clsx(
            'text-2xs font-mono font-medium',
            p.safe === null
              ? 'text-amber-500'
              : p.safe
              ? 'text-tac-500'
              : 'text-crit-400',
          )}>
            {fmtPts(p.delta)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Structural summary text ───────────────────────────────────────────────────

function getStructuralSummary(
  dealer:    OptionsModule['dealerPositioning'],
  putWall:   number,
  callWall:  number,
  zeroGamma: number,
  spot:      number,
) {
  const tape =
    dealer === 'long-gamma'
      ? 'Dealers are net long gamma — buy dips, sell rips. Mean-reversion bias inside corridor.'
      : dealer === 'short-gamma'
      ? 'Dealers are net short gamma — hedges amplify moves. Directional trends are favored.'
      : 'Balanced dealer book. Corridor boundaries are the key breakout triggers to watch.'

  const flipCondition =
    dealer === 'long-gamma'
      ? `Sustained close below ${fmtStrike(putWall)} flips dealer regime to short-gamma`
      : dealer === 'short-gamma'
      ? `Recovery into ${fmtStrike(putWall)}–${fmtStrike(callWall)} corridor re-establishes long-gamma`
      : `Persistent close outside walls (${fmtStrike(putWall)} / ${fmtStrike(callWall)}) shifts regime`

  const distPut  = Math.abs(spot - putWall)
  const distCall = Math.abs(callWall - spot)
  const distZG   = Math.abs(spot - zeroGamma)

  const nearestName =
    distPut <= distCall && distPut <= distZG ? 'PUT WALL' :
    distCall <= distZG                        ? 'CALL WALL' : 'ZERO GAMMA'
  const nearestDelta =
    nearestName === 'PUT WALL'   ? spot - putWall :
    nearestName === 'CALL WALL'  ? callWall - spot : spot - zeroGamma

  return { tape, flipCondition, nearestName, nearestDelta }
}

// ── Behavioral descriptions ───────────────────────────────────────────────────

function getBehavioralDesc(key: string, val: 'high' | 'moderate' | 'low'): string {
  const map: Record<string, Record<'high' | 'moderate' | 'low', string>> = {
    'PINNING RISK': {
      high:     'Spot near max-OI strike — convergence likely into expiry',
      moderate: 'Moderate OI concentration near spot level',
      low:      'Spot well clear of any pinning zone',
    },
    'AIR POCKET RISK': {
      high:     'Sparse OI below spot — drawdowns can accelerate quickly',
      moderate: 'Some OI support below spot, limited cushion',
      low:      'Dense OI below provides downside support',
    },
    'BREAKOUT SENS': {
      high:     'Near wall boundary — dealer delta-hedging amplifies breakout',
      moderate: 'Some dealer amplification possible near boundaries',
      low:      'Well inside corridor — limited dealer amplification',
    },
  }
  return map[key]?.[val] ?? '—'
}

// ── Main component ────────────────────────────────────────────────────────────

export function OptionsCard({ data, spotPrice = 5305 }: Props) {
  const hasLive =
    data.structureAvailable &&
    data.putWall   != null &&
    data.callWall  != null &&
    data.zeroGamma != null

  // ── Unavailable state ──
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

  const putWall   = data.putWall!
  const callWall  = data.callWall!
  const zeroGamma = data.zeroGamma!

  const dealerStatus =
    data.dealerPositioning === 'long-gamma'  ? 'stable'   :
    data.dealerPositioning === 'short-gamma' ? 'elevated' : 'watch'

  const { tape, flipCondition, nearestName, nearestDelta } = getStructuralSummary(
    data.dealerPositioning, putWall, callWall, zeroGamma, spotPrice,
  )

  const corridorWidth = Math.round(callWall - putWall)

  return (
    <Card
      title="SPX OPTIONS POSITIONING"
      variant="primary"
      sourceType="derived"
      lastUpdated={data.meta.fetchedAt}
      subtitle="Derived structure · not exchange-reported"
      footer={<ModuleMetaFooter meta={data.meta} />}
      headerRight={
        <StatusBadge
          status={dealerStatus}
          label={data.dealerPositioning.replace('-', ' ').toUpperCase()}
          size="xs"
        />
      }
    >

      {/* ── 1. Hero: Corridor Map ── */}
      <CorridorMap
        putWall={putWall}
        callWall={callWall}
        zeroGamma={zeroGamma}
        spotPrice={spotPrice}
        gammaLevels={data.gammaLevels}
      />

      {/* ── 2. Distance pills ── */}
      <DistancePills
        putWall={putWall}
        zeroGamma={zeroGamma}
        callWall={callWall}
        spotPrice={spotPrice}
      />

      {/* ── 3. Structural Summary ── */}
      <div className="mb-4 pb-4 border-b border-ops-700">
        <div className="text-2xs font-mono uppercase tracking-wider text-ink-ghost mb-3">
          STRUCTURAL SUMMARY
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-3">
          {/* Dealer regime */}
          <div className="flex flex-col gap-1">
            <span className="text-2xs font-mono text-ink-ghost">DEALER REGIME</span>
            <StatusBadge
              status={dealerStatus}
              label={data.dealerPositioning.replace('-', ' ').toUpperCase()}
              size="xs"
            />
          </div>

          {/* Corridor */}
          <div className="flex flex-col gap-1">
            <span className="text-2xs font-mono text-ink-ghost">CORRIDOR</span>
            <span className="text-xs font-mono text-ink-secondary leading-tight">
              {fmtStrike(putWall)}
              <span className="text-ink-ghost mx-1">→</span>
              {fmtStrike(callWall)}
              <span className="text-ink-ghost text-2xs ml-1">({corridorWidth} pts)</span>
            </span>
          </div>

          {/* Nearest level */}
          <div className="flex flex-col gap-1 col-span-2">
            <span className="text-2xs font-mono text-ink-ghost">NEAREST LEVEL</span>
            <span className="text-xs font-mono text-ink-secondary">
              {nearestName}
              <span className={clsx(
                'ml-2 text-2xs',
                nearestDelta >= 0 ? 'text-tac-400' : 'text-crit-400',
              )}>
                {fmtPts(nearestDelta)} away
              </span>
            </span>
          </div>
        </div>

        {/* Expected tape — narrative block */}
        <div className="border-l-2 border-steel-700 pl-2.5 py-0.5 mb-2">
          <div className="text-2xs font-mono text-ink-ghost mb-0.5">EXPECTED TAPE</div>
          <p className="text-xs text-ink-secondary leading-snug">{tape}</p>
        </div>

        {/* What breaks the structure */}
        <div className="border-l-2 border-amber-800/60 pl-2.5 py-0.5">
          <div className="text-2xs font-mono text-amber-700/80 mb-0.5">WHAT BREAKS STRUCTURE</div>
          <p className="text-2xs font-mono text-ink-muted leading-snug">{flipCondition}</p>
        </div>
      </div>

      {/* ── 4. Behavioral Outlook ── */}
      <div className="mb-4 pb-4 border-b border-ops-700">
        <div className="text-2xs font-mono uppercase tracking-wider text-ink-ghost mb-2.5">
          BEHAVIORAL OUTLOOK
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'PINNING RISK',    val: data.pinningRisk },
            { key: 'AIR POCKET RISK', val: data.airPocketRisk },
            { key: 'BREAKOUT SENS',   val: data.breakoutSensitivity },
          ].map(({ key, val }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <span className="text-2xs font-mono text-ink-ghost leading-none">{key}</span>
              <StatusBadge
                status={
                  val === 'high'     ? 'elevated' :
                  val === 'moderate' ? 'watch'    : 'stable'
                }
                label={val.toUpperCase()}
                size="xs"
              />
              <span className="text-2xs text-ink-ghost leading-tight">
                {getBehavioralDesc(key, val as 'high' | 'moderate' | 'low')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. Key Expiries ── */}
      {data.keyExpiries.length > 0 && (
        <div className="mb-3">
          <div className="text-2xs font-mono uppercase tracking-wider text-ink-ghost mb-1.5">
            KEY EXPIRIES
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {data.keyExpiries.map(e => (
              <div
                key={e.date}
                className={clsx(
                  'px-1.5 py-0.5 border rounded-sm text-2xs font-mono flex items-center gap-1.5',
                  e.importance === 'quarterly'
                    ? 'border-crit-800  text-crit-400  bg-crit-900/20'
                    : e.importance === 'monthly'
                    ? 'border-amber-800 text-amber-400 bg-amber-900/20'
                    : 'border-ops-600   text-ink-muted bg-ops-800/20',
                )}
              >
                <span className={clsx(
                  'font-bold text-[0.55rem] uppercase',
                  e.importance === 'quarterly' ? 'text-crit-500'   :
                  e.importance === 'monthly'   ? 'text-amber-600'  : 'text-ink-ghost',
                )}>
                  {e.importance === 'quarterly' ? 'Q' : e.importance === 'monthly' ? 'M' : 'W'}
                </span>
                {e.date}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 6. Model confidence caveat ── */}
      {data.meta.caveat && (
        <div className="pt-2.5 border-t border-ops-700/50">
          <p className="text-2xs text-ink-ghost font-mono leading-relaxed">
            <span className="text-amber-800/90">⚠ DERIVED MODEL:</span>{' '}
            {data.meta.caveat}
          </p>
        </div>
      )}
    </Card>
  )
}
