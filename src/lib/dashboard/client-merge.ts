// ============================================================
// Client-side merge helpers for multi-lane dashboard responses
// ============================================================

import { mergeSparklinesIntoDashboardState } from '@/lib/features/market-sparkline-merge'
import type { DashboardState } from '@/lib/types'

export function applySparklineLane(
  state: DashboardState,
  sparklines: Record<string, number[] | undefined>,
): DashboardState {
  return mergeSparklinesIntoDashboardState(state, sparklines)
}

export function applyOptionsLane(
  state: DashboardState,
  body: {
    options: DashboardState['options']
    regime:  DashboardState['regime'] | null
    alerts:  DashboardState['alerts']
  },
): DashboardState {
  // Preserve a previously-live options structure when the new response degraded
  // (e.g. Yahoo 429 produced a placeholder). This prevents the OptionsCard from
  // flashing between its "live corridor" and "no feed" render branches.
  const nextOptions =
    state.options.structureAvailable && !body.options.structureAvailable
      ? state.options
      : body.options

  // regime is null when server cache was cold (no core lane data yet).
  // Keep the existing regime rather than overwriting with a placeholder-driven value.
  if (body.regime === null) {
    return { ...state, options: nextOptions }
  }

  const whatBreaks =
    body.regime.risks.length > 0
      ? body.regime.risks.slice(0, 3).join(' · ')
      : state.executive.whatBreaks

  return {
    ...state,
    options: nextOptions,
    regime: body.regime,
    alerts: body.alerts,
    executive: {
      ...state.executive,
      regime: body.regime,
      topChanges: body.regime.drivers,
      topRisks: body.regime.risks,
      topWatch: body.regime.watchNext,
      whatBreaks,
      lastUpdated: new Date().toISOString(),
    },
  }
}
