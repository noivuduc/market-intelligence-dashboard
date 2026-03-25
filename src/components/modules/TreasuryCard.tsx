'use client'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { TreasuryModule } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { ModuleMetaFooter } from '@/components/ui/ModuleMetaFooter'
import { StatusBadge } from '@/components/ui/StatusChip'
import { clsx } from 'clsx'

interface Props { data: TreasuryModule }

const curvePoints = (d: TreasuryModule) => [
  { tenor: '3M', yield: d.curve.m3.value   },
  { tenor: '1Y', yield: d.curve.y1.value   },
  { tenor: '2Y', yield: d.curve.y2.value   },
  { tenor: '5Y', yield: d.curve.y5.value   },
  { tenor: '10Y',yield: d.curve.y10.value  },
  { tenor: '30Y',yield: d.curve.y30.value  },
]

const regimeChip = (r: TreasuryModule['ratesRegime']) => {
  if (r === 'rising')      return 'elevated' as const
  if (r === 'falling')     return 'stable'   as const
  return 'watch' as const
}

const bondEquityChip = (b: TreasuryModule['bondsVsEquities']) => {
  if (b === 'helping')  return 'stable'   as const
  if (b === 'hurting')  return 'critical' as const
  return 'watch' as const
}

export function TreasuryCard({ data }: Props) {
  const pts = curvePoints(data)

  return (
    <Card
      title="TREASURY & RATES"
      variant="primary"
      sourceType="observed"
      lastUpdated={data.meta.fetchedAt}
      subtitle="TreasuryDirect · FRED"
      footer={<ModuleMetaFooter meta={data.meta} />}
      headerRight={
        <div className="flex gap-1.5">
          <StatusBadge status={regimeChip(data.ratesRegime)}      label={data.ratesRegime.toUpperCase()}      size="xs" />
          <StatusBadge status={bondEquityChip(data.bondsVsEquities)} label={`BONDS ${data.bondsVsEquities.toUpperCase()}`} size="xs" />
        </div>
      }
    >
      {/* Yield curve chart */}
      <div className="h-28 mb-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pts} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <XAxis
              dataKey="tenor"
              tick={{ fill: '#5A7390', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: '#1C2636' }}
              tickLine={false}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fill: '#5A7390', fontSize: 9, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v.toFixed(2)}`}
            />
            <Tooltip
              contentStyle={{ background: '#0D1117', border: '1px solid #1C2636', borderRadius: 4, fontSize: 11 }}
              itemStyle={{ color: '#5A8EAF' }}
              formatter={(v: number) => [`${v?.toFixed(2)}%`, 'Yield']}
            />
            <Line
              type="monotone"
              dataKey="yield"
              stroke="#5A8EAF"
              strokeWidth={2}
              dot={{ fill: '#5A8EAF', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 4, fill: '#76A4C3' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Key yields grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: '3M', m: data.curve.m3 },
          { label: '2Y', m: data.curve.y2 },
          { label: '5Y', m: data.curve.y5 },
          { label: '10Y',m: data.curve.y10},
          { label: '30Y',m: data.curve.y30},
          { label: '10Y TIPS',m: data.curve.tip10y},
        ].map(({ label, m }) => (
          <div key={label} className="flex flex-col">
            <span className="text-2xs text-ink-ghost font-mono uppercase">{label}</span>
            <span className="font-mono text-sm font-semibold text-ink-primary">
              {m.formatted}
            </span>
            <span className={clsx(
              'text-2xs font-mono',
              (m.change ?? 0) > 0 ? 'text-negative' : (m.change ?? 0) < 0 ? 'text-positive' : 'text-neutral',
            )}>
              {m.formattedChange ?? (m.change != null ? `${m.change >= 0 ? '+' : ''}${m.change.toFixed(1)} bps` : '—')}
            </span>
          </div>
        ))}
      </div>

      {/* Spreads */}
      <div className="pt-3 border-t border-ops-700">
        <div className="text-2xs font-mono uppercase tracking-wider text-ink-ghost mb-2">CURVE SPREADS</div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '2s10s', m: data.spreads.twoTen },
            { label: '2s30s', m: data.spreads.twoThirty },
            { label: '3m10s', m: data.spreads.threeMTen },
          ].map(({ label, m }) => (
            <div key={label} className="flex flex-col">
              <span className="text-2xs text-ink-ghost font-mono">{label}</span>
              <span className={clsx(
                'font-mono text-sm font-semibold',
                (m.value ?? 0) < 0 ? 'text-amber-400' : 'text-tac-400'
              )}>
                {m.formatted}
              </span>
              <span className="text-2xs text-ink-ghost capitalize">
                {data.curveRegime}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Next auction */}
      {data.nextAuction && (
        <div className="mt-3 pt-3 border-t border-ops-700 flex items-center justify-between">
          <div>
            <div className="text-2xs font-mono uppercase tracking-wider text-ink-ghost mb-0.5">
              NEXT AUCTION
            </div>
            <div className="text-sm font-mono text-amber-400">
              {data.nextAuction.tenor} — ${data.nextAuction.size}B
            </div>
            <div className="text-2xs text-ink-ghost">{data.nextAuction.date}</div>
          </div>
          <StatusBadge
            status={data.supplyPressure === 'high' ? 'elevated' : 'watch'}
            label={`SUPPLY: ${data.supplyPressure.toUpperCase()}`}
            size="xs"
          />
        </div>
      )}

      {data.explanation && (
        <div className="mt-3 pt-3 border-t border-ops-700">
          <div className="text-2xs font-mono uppercase tracking-wider text-tac-700 mb-1">
            ASSESSMENT
          </div>
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
