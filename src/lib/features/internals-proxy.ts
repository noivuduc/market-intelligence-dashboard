// ============================================================
// DAILY INTERNALS — PROXY MODE BUILDER
// Derives market-health signals from available quote-layer
// data (BreadthModule + FlowsModule) when no exchange-grade
// intraday breadth / tape feed is connected.
//
// All outputs are clearly labeled as proxies with medium/low
// confidence. No values are invented — everything traces back
// to real ETF quote data already present in the dashboard.
// ============================================================

import type { BreadthModule, FlowsModule, TrendDirection } from '@/lib/types'

// ── Output type ───────────────────────────────────────────────────────────────

export interface ProxyInternals {
  // Participation
  participationLabel:  'BROAD' | 'IMPROVING' | 'NARROW' | 'DETERIORATING'
  participationStatus: 'stable' | 'watch' | 'elevated'
  participationDetail: string

  // Equal-weight confirmation (RSP/SPY proxy)
  ewLabel:   'CONFIRMING' | 'MIXED' | 'DIVERGING'
  ewStatus:  'stable' | 'watch' | 'elevated'
  ewDetail:  string

  // Sector breadth counts (derived from pctAbove50d proxy)
  sectorAdvancing: number   // pctAbove50d >= 55
  sectorDeclining: number   // pctAbove50d <= 45
  sectorNeutral:   number
  sectorTotal:     number
  topSectors:      string[]  // top 3 advancing sector names
  weakSectors:     string[]  // bottom 3 declining sector names

  // Momentum proxy (from tape quality)
  momentumLabel:  'STRENGTHENING' | 'STABLE' | 'WEAKENING'
  momentumStatus: 'stable' | 'watch' | 'elevated'

  // Index alignment (SPX / NDX / RUT)
  indexAlignment:  'ALIGNED-UP' | 'ALIGNED-DOWN' | 'MIXED' | 'FLAT'
  alignmentDetail: string

  // Directional flow (from flows module)
  flowPressure:  'BUYING' | 'SELLING' | 'MIXED'
  flowStatus:    'stable' | 'watch' | 'elevated'

  // Gap / session follow-through proxy (inferred from flow pressure + SPX trend)
  gapFollowThrough: 'confirmed' | 'faded' | 'neutral'

  // Tape interpretation (synthesised 1–2 sentence read)
  tapeInterpretation: string

  // Overall session read
  overallRead:   'RISK-ON' | 'RISK-OFF' | 'NEUTRAL' | 'MIXED'
  overallStatus: 'stable' | 'watch' | 'elevated' | 'critical'
}

// ── Helper ────────────────────────────────────────────────────────────────────

function trendDir(t: TrendDirection): -1 | 0 | 1 {
  if (t === 'rising')  return  1
  if (t === 'falling') return -1
  return 0
}

// ── Main builder ──────────────────────────────────────────────────────────────

/**
 * Derives proxy internals from sector-ETF breadth + flows.
 * Inputs must already be validated (non-null) by the caller.
 */
export function buildProxyInternals(
  breadth: BreadthModule,
  flows:   FlowsModule,
): ProxyInternals {
  // ── Sector counts ─────────────────────────────────────────────────────────
  const sectors   = breadth.sectorBreadth
  const total     = sectors.length
  const advancing = sectors.filter(s => s.pctAbove50d >= 55)
  const declining = sectors.filter(s => s.pctAbove50d <= 45)
  const neutral   = total - advancing.length - declining.length

  const topSectors  = advancing.slice(0, 3).map(s => s.sector)
  const weakSectors = [...declining].reverse().slice(0, 3).map(s => s.sector)

  // ── Participation ─────────────────────────────────────────────────────────
  let participationLabel: ProxyInternals['participationLabel']
  let participationStatus: ProxyInternals['participationStatus']
  let participationDetail: string

  switch (breadth.participation) {
    case 'broad':
      participationLabel  = 'BROAD'
      participationStatus = 'stable'
      participationDetail = `${advancing.length}/${total} sectors above 50d proxy — healthy participation`
      break
    case 'improving':
      participationLabel  = 'IMPROVING'
      participationStatus = 'stable'
      participationDetail = `${advancing.length}/${total} sectors advancing — breadth building`
      break
    case 'narrow':
      participationLabel  = 'NARROW'
      participationStatus = 'watch'
      participationDetail = `Only ${advancing.length}/${total} sectors advancing — leadership concentrated`
      break
    default:
      participationLabel  = 'DETERIORATING'
      participationStatus = 'elevated'
      participationDetail = `${declining.length}/${total} sectors declining — breadth deteriorating`
  }

  // ── Equal-weight confirmation ─────────────────────────────────────────────
  const ewTrend = breadth.ewsVsCap?.trend ?? 'flat'
  let ewLabel:   ProxyInternals['ewLabel']
  let ewStatus:  ProxyInternals['ewStatus']
  let ewDetail:  string

  if (breadth.breadthConfirmed) {
    ewLabel  = 'CONFIRMING'
    ewStatus = 'stable'
    ewDetail = 'RSP/SPY ratio trend confirms cap-weight advance'
  } else if (ewTrend === 'falling') {
    ewLabel  = 'DIVERGING'
    ewStatus = 'elevated'
    ewDetail = 'Equal-weight underperforming — mega-cap concentration risk'
  } else {
    ewLabel  = 'MIXED'
    ewStatus = 'watch'
    ewDetail = 'Equal-weight neutral — breadth neither confirming nor diverging'
  }

  // ── Momentum proxy ────────────────────────────────────────────────────────
  let momentumLabel:  ProxyInternals['momentumLabel']
  let momentumStatus: ProxyInternals['momentumStatus']

  switch (breadth.tapeQuality) {
    case 'healthy-rally':
      momentumLabel  = 'STRENGTHENING'
      momentumStatus = 'stable'
      break
    case 'broad-selloff':
    case 'fragile-selloff':
      momentumLabel  = 'WEAKENING'
      momentumStatus = 'elevated'
      break
    default:
      momentumLabel  = 'STABLE'
      momentumStatus = 'watch'
  }

  // ── Index alignment ───────────────────────────────────────────────────────
  const scores = [
    trendDir(breadth.spx.trend),
    trendDir(breadth.ndx.trend),
    trendDir(breadth.rut.trend),
  ]
  const sumScores: number = scores.reduce((a, b) => a + b, 0 as number)

  let indexAlignment:  ProxyInternals['indexAlignment']
  let alignmentDetail: string

  if (sumScores === 3) {
    indexAlignment  = 'ALIGNED-UP'
    alignmentDetail = 'SPX, NDX, and RUT all rising — broad index confirmation'
  } else if (sumScores === -3) {
    indexAlignment  = 'ALIGNED-DOWN'
    alignmentDetail = 'SPX, NDX, and RUT all falling — broad index weakness'
  } else if (sumScores === 0 && scores.every(s => s === 0)) {
    indexAlignment  = 'FLAT'
    alignmentDetail = 'All indices flat — no directional bias'
  } else {
    const risers = ['SPX','NDX','RUT'].filter((_, i) => scores[i] === 1)
    const fallers = ['SPX','NDX','RUT'].filter((_, i) => scores[i] === -1)
    indexAlignment  = 'MIXED'
    alignmentDetail =
      risers.length && fallers.length
        ? `${risers.join('/')} rising; ${fallers.join('/')} lagging — internal divergence`
        : 'Mixed index trends — no dominant direction'
  }

  // ── Flow pressure ─────────────────────────────────────────────────────────
  let flowPressure: ProxyInternals['flowPressure']
  let flowStatus:   ProxyInternals['flowStatus']

  if (flows.overallPressure === 'buying') {
    flowPressure = 'BUYING'
    flowStatus   = 'stable'
  } else if (flows.overallPressure === 'selling') {
    flowPressure = 'SELLING'
    flowStatus   = 'elevated'
  } else {
    flowPressure = 'MIXED'
    flowStatus   = 'watch'
  }

  // ── Gap / session follow-through proxy ────────────────────────────────────
  const spxRising = breadth.spx.trend === 'rising'
  const spxFalling = breadth.spx.trend === 'falling'
  let gapFollowThrough: ProxyInternals['gapFollowThrough']

  if (spxRising && flows.overallPressure === 'buying')   gapFollowThrough = 'confirmed'
  else if (spxFalling && flows.overallPressure === 'selling') gapFollowThrough = 'faded'
  else gapFollowThrough = 'neutral'

  // ── Tape interpretation ───────────────────────────────────────────────────
  let tapeInterpretation: string

  if (breadth.tapeQuality === 'healthy-rally' && breadth.participation === 'broad') {
    tapeInterpretation =
      'Broad risk-on advance — participation and index alignment confirming the move.'
  } else if (breadth.tapeQuality === 'healthy-rally') {
    tapeInterpretation =
      'Advance present but participation narrow — leadership may be concentrated in fewer sectors.'
  } else if (breadth.tapeQuality === 'weak-rally') {
    tapeInterpretation =
      'Weak rally structure — RUT or equal-weight lagging; watch for breadth follow-through.'
  } else if (breadth.tapeQuality === 'broad-selloff') {
    tapeInterpretation =
      'Broad risk-off tape — majority of sectors under pressure, selling appears indiscriminate.'
  } else if (breadth.tapeQuality === 'fragile-selloff') {
    tapeInterpretation =
      'Fragile selling — concentrated decline with breadth deteriorating; could accelerate.'
  } else {
    tapeInterpretation =
      'Mixed tape — no clear directional bias across sectors; await further confirmation.'
  }

  // ── Overall read ──────────────────────────────────────────────────────────
  let overallRead:   ProxyInternals['overallRead']
  let overallStatus: ProxyInternals['overallStatus']

  const isRiskOn =
    (breadth.tapeQuality === 'healthy-rally') &&
    (breadth.participation === 'broad' || breadth.participation === 'improving') &&
    flows.overallPressure !== 'selling'

  const isRiskOff =
    (breadth.tapeQuality === 'broad-selloff' || breadth.tapeQuality === 'fragile-selloff') &&
    flows.overallPressure !== 'buying'

  if (isRiskOn) {
    overallRead   = 'RISK-ON'
    overallStatus = 'stable'
  } else if (isRiskOff) {
    overallRead   = 'RISK-OFF'
    overallStatus = breadth.tapeQuality === 'broad-selloff' ? 'critical' : 'elevated'
  } else if (
    breadth.tapeQuality === 'mixed' &&
    flows.overallPressure === 'mixed'
  ) {
    overallRead   = 'NEUTRAL'
    overallStatus = 'watch'
  } else {
    overallRead   = 'MIXED'
    overallStatus = 'watch'
  }

  return {
    participationLabel,
    participationStatus,
    participationDetail,
    ewLabel,
    ewStatus,
    ewDetail,
    sectorAdvancing: advancing.length,
    sectorDeclining: declining.length,
    sectorNeutral:   neutral,
    sectorTotal:     total,
    topSectors,
    weakSectors,
    momentumLabel,
    momentumStatus,
    indexAlignment,
    alignmentDetail,
    flowPressure,
    flowStatus,
    gapFollowThrough,
    tapeInterpretation,
    overallRead,
    overallStatus,
  }
}
