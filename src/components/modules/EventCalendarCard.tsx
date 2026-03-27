'use client'

import { clsx } from 'clsx'
import { Card } from '@/components/ui/Card'
import { ALL_FOMC, type FOMCMeeting } from '@/lib/data/fomc-calendar'
import { MACRO_RELEASES, type MacroReleaseMeta } from '@/lib/data/macro-calendar'

// ---- Unified event type ----

interface CalEvent {
  id:           string
  date:         string   // ISO date string YYYY-MM-DD
  label:        string
  sublabel?:    string
  type:         'fomc' | 'macro' | 'treasury'
  importance:   'critical' | 'high' | 'medium' | 'low'
  daysUntil:    number
  isToday:      boolean
  isPast:       boolean
  noteSEP?:     boolean   // FOMC with dot-plot
}

// ---- Build event list from static calendars ----

function buildEvents(): CalEvent[] {
  const todayStr = new Date().toISOString().split('T')[0]!
  const now      = Date.now()

  function daysDiff(isoDate: string): number {
    const t = new Date(isoDate + 'T12:00:00Z').getTime()
    return Math.round((t - now) / 86_400_000)
  }

  // FOMC events — use statementDate as the key date
  const fomcEvents: CalEvent[] = ALL_FOMC
    .filter(m => {
      const d = daysDiff(m.statementDate)
      return d > -14 && d < 90    // show recent past + next 90 days
    })
    .map((m: FOMCMeeting) => {
      const d = daysDiff(m.statementDate)
      return {
        id:         `fomc-${m.statementDate}`,
        date:       m.statementDate,
        label:      `FOMC — ${m.label}`,
        sublabel:   m.projection ? 'SEP / dot plot released' : undefined,
        type:       'fomc' as const,
        importance: m.projection ? 'critical' : 'high',
        daysUntil:  d,
        isToday:    m.statementDate === todayStr,
        isPast:     d < 0,
        noteSEP:    m.projection,
      }
    })

  // Macro release events
  const macroEvents: CalEvent[] = MACRO_RELEASES
    .filter(r => {
      const d = daysDiff(r.releaseDate)
      return d > -7 && d < 90
    })
    .map((r: MacroReleaseMeta) => {
      const d = daysDiff(r.releaseDate)
      return {
        id:         `macro-${r.series}-${r.releaseDate}`,
        date:       r.releaseDate,
        label:      r.name,
        sublabel:   r.period,
        type:       'macro' as const,
        importance: r.importance === 'high' ? 'high' : r.importance === 'medium' ? 'medium' : 'low',
        daysUntil:  d,
        isToday:    r.releaseDate === todayStr,
        isPast:     d < 0,
      }
    })

  // Merge, deduplicate by date+label, sort chronologically
  const all = [...fomcEvents, ...macroEvents]
  all.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    // Within same date: importance order
    const ord = { critical: 0, high: 1, medium: 2, low: 3 }
    return ord[a.importance] - ord[b.importance]
  })

  // Deduplicate same-date same-label (e.g. CPI + Core CPI on same day)
  const seen = new Set<string>()
  return all.filter(e => {
    const key = `${e.date}|${e.label}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ---- Countdown label ----

function countdownLabel(daysUntil: number, isToday: boolean): string {
  if (isToday) return 'TODAY'
  if (daysUntil < 0) return `${Math.abs(daysUntil)}d ago`
  if (daysUntil === 1) return 'TOMORROW'
  return `T-${daysUntil}d`
}

// ---- Type badge ----

function TypeBadge({ type }: { type: CalEvent['type'] }) {
  return (
    <span className={clsx(
      'text-[0.6rem] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-sm border shrink-0',
      type === 'fomc'     && 'border-amber-800 text-amber-500 bg-amber-900/20',
      type === 'macro'    && 'border-steel-700 text-steel-400 bg-steel-900/20',
      type === 'treasury' && 'border-tac-800 text-tac-500 bg-tac-900/20',
    )}>
      {type === 'fomc' ? 'FOMC' : type === 'treasury' ? 'TSY' : 'MACRO'}
    </span>
  )
}

// ---- Importance dot ----

function ImportanceDot({ importance }: { importance: CalEvent['importance'] }) {
  return (
    <span className={clsx(
      'inline-block w-1.5 h-1.5 rounded-full shrink-0',
      importance === 'critical' && 'bg-crit-400',
      importance === 'high'     && 'bg-amber-400',
      importance === 'medium'   && 'bg-steel-400',
      importance === 'low'      && 'bg-ops-400',
    )} />
  )
}

// ---- Main card ----

export function EventCalendarCard() {
  const events = buildEvents()
  const upcoming = events.filter(e => !e.isPast || e.isToday)
  const recent   = events.filter(e => e.isPast && !e.isToday).slice(0, 3)
  const display  = [...recent.reverse(), ...upcoming].slice(0, 14)

  const nextCritical = upcoming.find(e => e.importance === 'critical' || e.importance === 'high')

  return (
    <Card
      title="EVENT RISK CALENDAR"
      variant="secondary"
      subtitle="FOMC · macro releases · upcoming catalysts"
      sourceType="delayed"
      fillHeight
      headerRight={
        nextCritical ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[0.6rem] font-mono text-ink-ghost uppercase tracking-wider">Next</span>
            <span className="font-mono text-xs text-amber-400">
              {nextCritical.label.split(' — ')[0]} &middot; {countdownLabel(nextCritical.daysUntil, nextCritical.isToday)}
            </span>
          </div>
        ) : undefined
      }
      noPad
    >
      <div className="divide-y divide-ops-700/60">
        {display.length === 0 && (
          <div className="px-3 py-4 text-xs text-ink-ghost font-mono text-center">
            No events in calendar window. Extend fomc-calendar.ts and macro-calendar.ts.
          </div>
        )}

        {display.map(evt => {
          const isFuture = !evt.isPast
          return (
            <div
              key={evt.id}
              className={clsx(
                'flex items-start gap-3 px-3 py-2.5 transition-colors',
                evt.isToday    && 'bg-amber-900/15 border-l-2 border-amber-600',
                !evt.isToday   && isFuture && 'hover:bg-ops-800/20',
                evt.isPast     && !evt.isToday && 'opacity-45',
              )}
            >
              {/* Countdown column */}
              <div className={clsx(
                'font-mono text-xs tabular-nums shrink-0 w-16 text-right pt-0.5',
                evt.isToday    ? 'text-amber-400 font-bold' :
                evt.isPast     ? 'text-ink-ghost' :
                evt.daysUntil <= 3 ? 'text-crit-400' :
                evt.daysUntil <= 7 ? 'text-amber-500' : 'text-steel-400',
              )}>
                {countdownLabel(evt.daysUntil, evt.isToday)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                  <ImportanceDot importance={evt.importance} />
                  <span className={clsx(
                    'font-mono text-xs truncate',
                    isFuture ? 'text-ink-primary' : 'text-ink-secondary',
                  )}>
                    {evt.label}
                  </span>
                  {evt.noteSEP && (
                    <span className="text-[0.6rem] font-mono text-tac-500 border border-tac-800/60 px-1 py-px rounded-sm shrink-0">
                      SEP
                    </span>
                  )}
                </div>
                {(evt.sublabel || evt.date) && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[0.65rem] text-ink-ghost font-mono">
                      {evt.date}
                    </span>
                    {evt.sublabel && (
                      <span className="text-[0.65rem] text-ink-muted">
                        {evt.sublabel}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Type badge */}
              <div className="shrink-0 pt-0.5">
                <TypeBadge type={evt.type} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Source note */}
      <div className="px-3 py-2 border-t border-ops-700/60 text-[0.6rem] font-mono text-ink-ghost">
        FOMC dates: federalreserve.gov · Macro: BLS/BEA schedule (manual) · Consensus estimates where shown are static
      </div>
    </Card>
  )
}
