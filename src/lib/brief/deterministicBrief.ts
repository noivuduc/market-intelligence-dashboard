// ============================================================
// Deterministic executive SITREP when AI is off or not yet loaded.
// Rule-based copy from live dashboard state — never empty placeholders.
// ============================================================

import { REGIME_CONFIG } from '@/lib/regime/engine'
import type { DashboardState, TopLevelBriefing } from '@/lib/types'

export function isPlaceholderBriefing(b: TopLevelBriefing): boolean {
  if (b.regime === 'Awaiting AI analysis') return true
  if (b.fullBrief.includes('not yet generated')) return true
  if (b.fullBrief.includes('Configure ANTHROPIC_API_KEY')) return true
  if (b.fullBrief.includes('Call /api/ai/summary')) return true
  return false
}

export function buildDeterministicBriefing(state: DashboardState): TopLevelBriefing {
  const now = new Date().toISOString()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
  const { regime, fed, treasury, liquidity, macro, breadth, flows } = state
  const cfg = REGIME_CONFIG[regime.label]

  const tape = breadth.tapeQuality.replace(/-/g, ' ')
  const breadthLine = `Tape ${tape}; participation ${breadth.participation}; price ${breadth.breadthConfirmed ? 'confirmed' : 'not fully confirmed'} by breadth.`
  const liqLine = `Liquidity ${liquidity.liquidityStance}; HY stress ${liquidity.creditStress}; vol stress ${liquidity.volStress}.`
  const rateLine = `10Y ${treasury.curve.y10.formatted ?? '—'} (${treasury.ratesRegime}); 2s10s ${treasury.spreads.twoTen.formatted ?? '—'}.`
  const policyLine = `Policy ${fed.policyStance}; next FOMC ${fed.nextFomcDate || 'TBD'}${fed.daysToFomc != null ? ` (${fed.daysToFomc}d)` : ''}.`

  const nc = macro.nextCatalyst
  let catalyst = 'Watch CPI / payroll / Fed guidance for surprise regime.'
  if (nc?.date) {
    catalyst = `Scheduled focus: ${nc.name} — ${nc.date}.`
  } else if (nc?.unavailableReason) {
    catalyst = nc.unavailableReason
  } else if (nc?.name && nc.name !== 'Pending') {
    catalyst = `Scheduled focus: ${nc.name}.`
  }

  const fullBrief = [
    `${cfg.label.toUpperCase()} — ${cfg.description}`,
    policyLine,
    `${liqLine} ${rateLine}`,
    `${breadthLine} Flow pressure: ${flows.overallPressure}; demand read: ${flows.demandType}.`,
    catalyst,
  ].join(' ')

  return {
    regime:       `${cfg.label} (rules engine)`,
    why:          regime.drivers.slice(0, 2).join(' · ') || 'Engine drivers consolidating.',
    whatChanged:  'Values refreshed on last dashboard pull from policy, rates, liquidity, and tape modules.',
    whatConfirms: regime.drivers[0] ?? 'Trend and liquidity alignment.',
    whatBreaks:   regime.risks.slice(0, 2).join(' · ') || 'Breakdown in breadth confirmation or credit.',
    watchNext:    regime.watchNext.slice(0, 3).join(' · ') || 'FOMC path, HY spreads, RSP/SPY.',
    fullBrief,
    cachedAt:     now,
    expiresAt,
  }
}
