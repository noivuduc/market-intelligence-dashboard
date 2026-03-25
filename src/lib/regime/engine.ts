// ============================================================
// REGIME ENGINE — transparent rules-based scoring
// ============================================================
import type {
  RegimeLabel,
  RegimeState,
  RegimeSubScore,
  FedPolicyModule,
  LiquidityModule,
  BreadthModule,
  FlowsModule,
  OptionsModule,
  TreasuryModule,
  MacroModule,
} from '@/lib/types'

// ---- Sub-score computers (each returns 0–100, higher = more "risk-on") ----

function computePolicyScore(fed: FedPolicyModule): number {
  let score = 50
  if (fed.policyStance === 'easing')        score += 25
  else if (fed.policyStance === 'on-hold')  score += 5
  else if (fed.policyStance === 'tightening') score -= 20
  if (fed.liquidityImplication === 'supportive') score += 15
  else if (fed.liquidityImplication === 'restrictive') score -= 15
  if (fed.trendDrift === 'easing')   score += 10
  else if (fed.trendDrift === 'tightening') score -= 10
  return clamp(score, 0, 100)
}

function computeLiquidityScore(liq: LiquidityModule): number {
  let score = 50
  if (liq.liquidityStance === 'supportive') score += 20
  else if (liq.liquidityStance === 'restrictive') score -= 20
  if (liq.trend === 'easing')   score += 10
  else if (liq.trend === 'tightening') score -= 10
  if (liq.creditStress === 'low')     score += 10
  else if (liq.creditStress === 'elevated') score -= 10
  else if (liq.creditStress === 'high')     score -= 20
  if (liq.volStress === 'low')     score += 5
  else if (liq.volStress === 'elevated') score -= 10
  else if (liq.volStress === 'high')     score -= 20
  // Subtract vulnerability
  score -= (liq.vulnerabilityScore / 100) * 20
  return clamp(score, 0, 100)
}

function computeRiskScore(
  liq: LiquidityModule,
  treasury: TreasuryModule,
  macro: MacroModule
): number {
  let score = 50
  if (liq.creditStress === 'low') score += 15
  else if (liq.creditStress === 'high') score -= 25
  if (treasury.bondsVsEquities === 'helping') score += 10
  else if (treasury.bondsVsEquities === 'hurting') score -= 15
  if (macro.growthTrend === 'accelerating') score += 15
  else if (macro.growthTrend === 'contraction') score -= 25
  if (macro.inflationTrend === 'falling') score += 10
  else if (macro.inflationTrend === 'rising') score -= 10
  if (macro.surpriseRegime === 'positive') score += 10
  else if (macro.surpriseRegime === 'negative') score -= 10
  return clamp(score, 0, 100)
}

function computeTrendScore(breadth: BreadthModule): number {
  let score = 50
  if (breadth.tapeQuality === 'healthy-rally') score += 30
  else if (breadth.tapeQuality === 'weak-rally') score += 10
  else if (breadth.tapeQuality === 'fragile-selloff') score -= 15
  else if (breadth.tapeQuality === 'broad-selloff') score -= 30
  if (breadth.participation === 'broad') score += 15
  else if (breadth.participation === 'deteriorating') score -= 15
  if (breadth.breadthConfirmed) score += 10
  else score -= 5
  if (breadth.ewsVsCap.trend === 'rising') score += 10
  else if (breadth.ewsVsCap.trend === 'falling') score -= 10
  return clamp(score, 0, 100)
}

function computeFlowScore(flows: FlowsModule): number {
  let score = 50
  if (flows.overallPressure === 'buying') score += 20
  else if (flows.overallPressure === 'selling') score -= 20
  if (flows.demandType === 'organic') score += 15
  else if (flows.demandType === 'mechanical') score -= 5
  if (flows.futuresPressure === 'buying') score += 10
  else if (flows.futuresPressure === 'selling') score -= 10
  if (flows.optionsPremiumFlow === 'call-heavy') score += 10
  else if (flows.optionsPremiumFlow === 'put-heavy') score -= 10
  return clamp(score, 0, 100)
}

function computePositioningScore(options: OptionsModule): number {
  if (!options.structureAvailable) return 50
  let score = 50
  if (options.dealerPositioning === 'long-gamma') score += 15
  else if (options.dealerPositioning === 'short-gamma') score -= 20
  if (options.pinningRisk === 'high') score -= 5
  if (options.airPocketRisk === 'high') score -= 20
  else if (options.airPocketRisk === 'low') score += 10
  if (options.breakoutSensitivity === 'high') score -= 10
  return clamp(score, 0, 100)
}

// ---- Regime classification from composite score ----

function classifyRegime(
  composite: number,
  subScores: RegimeSubScore,
  breadth: BreadthModule,
): RegimeLabel {
  const trendScore = subScores.trend

  // Topping candidate: high composite but deteriorating breadth/flow
  if (composite >= 65 && breadth.participation === 'deteriorating' && !breadth.breadthConfirmed) {
    return 'topping-candidate'
  }
  // Bottoming candidate: low composite but flow/positioning turning
  if (composite <= 35 && subScores.flow >= 55 && subScores.positioning >= 50) {
    return 'bottoming-candidate'
  }
  // Transition zone
  if (composite >= 42 && composite <= 58) {
    return 'transition'
  }
  // Risk-on
  if (composite >= 65) return 'risk-on'
  // Risk-off
  if (composite <= 35) return 'risk-off'
  // Sideways
  if (trendScore >= 40 && trendScore <= 60 && breadth.tapeQuality === 'mixed') {
    return 'sideways'
  }
  if (composite > 58) return 'risk-on'
  if (composite < 42) return 'risk-off'
  return 'sideways'
}

// ---- Confidence derivation ----

function computeConfidence(subScores: RegimeSubScore): number {
  const values = Object.values(subScores)
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length
  // High agreement = high confidence; high variance = low confidence
  const stdDev = Math.sqrt(variance)
  // Normalize: stdDev=0 → 95 confidence; stdDev=30 → 40 confidence
  const confidence = Math.max(30, 95 - stdDev * 1.8)
  return Math.round(confidence)
}

// ---- Narrative builders ----

function buildDrivers(subScores: RegimeSubScore, composite: number): string[] {
  const entries = Object.entries(subScores) as [keyof RegimeSubScore, number][]
  const sorted = entries.sort(([, a], [, b]) => b - a)
  const labels: Record<keyof RegimeSubScore, string> = {
    policy:      'Fed policy stance',
    liquidity:   'Market liquidity conditions',
    risk:        'Macro/credit risk backdrop',
    trend:       'Price trend and breadth',
    flow:        'Institutional flow pressure',
    positioning: 'Options dealer positioning',
  }
  if (composite >= 50) {
    return sorted.slice(0, 3).map(([k]) => `${labels[k]} is supportive`)
  }
  return sorted.slice(-3).reverse().map(([k]) => `${labels[k]} is weighing on sentiment`)
}

function buildRisks(subScores: RegimeSubScore): string[] {
  const risks: string[] = []
  if (subScores.policy < 40)      risks.push('Fed policy remains restrictive — rate-cut timing risk')
  if (subScores.liquidity < 40)   risks.push('Liquidity conditions are tightening — credit stress watch')
  if (subScores.risk < 35)        risks.push('Macro deterioration risk — growth/inflation crosscurrent')
  if (subScores.trend < 40)       risks.push('Breadth divergence — rally may not be sustainable')
  if (subScores.flow < 35)        risks.push('Institutional flow is net selling — demand quality weak')
  if (subScores.positioning < 35) risks.push('Dealer positioning short gamma — volatility amplification risk')
  if (risks.length === 0) {
    risks.push('No acute structural risks detected at this time')
    risks.push('Watch for regime reversal if macro data surprises negatively')
    risks.push('Monitor options positioning for gamma flip signals')
  }
  return risks.slice(0, 3)
}

function buildWatchNext(subScores: RegimeSubScore, label: RegimeLabel): string[] {
  const watch: string[] = []
  if (label === 'topping-candidate') {
    watch.push('Watch breadth for further deterioration below 50-day')
    watch.push('Monitor put wall for defensive hedging acceleration')
    watch.push('Track equal-weight vs cap-weight spread for confirmation')
  } else if (label === 'bottoming-candidate') {
    watch.push('Watch for breadth thrust — advance/decline line expansion')
    watch.push('Monitor credit spreads for tightening confirmation')
    watch.push('Watch Fed communication for dovish pivot signal')
  } else if (label === 'risk-off') {
    watch.push('Track credit spreads — HY spread widening is key signal')
    watch.push('Monitor zero-gamma level for dealer volatility feedback loop')
    watch.push('Watch Fed for emergency or accelerated response signals')
  } else if (label === 'risk-on') {
    watch.push('Watch call wall for breakout vs pin dynamic')
    watch.push('Monitor breadth quality — confirm participation is broad')
    watch.push('Track macro surprise regime for continuation/reversal')
  } else {
    watch.push('Watch for breakout above/below key gamma levels')
    watch.push('Monitor macro releases for regime-shifting data')
    watch.push('Track sector rotation for directional conviction signal')
  }
  return watch
}

// ---- Main engine entry point ----

export interface RegimeEngineInputs {
  fed:      FedPolicyModule
  liquidity:LiquidityModule
  treasury: TreasuryModule
  macro:    MacroModule
  breadth:  BreadthModule
  flows:    FlowsModule
  options:  OptionsModule
}

export function computeRegime(inputs: RegimeEngineInputs): RegimeState {
  const subScores: RegimeSubScore = {
    policy:      computePolicyScore(inputs.fed),
    liquidity:   computeLiquidityScore(inputs.liquidity),
    risk:        computeRiskScore(inputs.liquidity, inputs.treasury, inputs.macro),
    trend:       computeTrendScore(inputs.breadth),
    flow:        computeFlowScore(inputs.flows),
    positioning: computePositioningScore(inputs.options),
  }

  // Weighted composite — trend and risk weighted higher
  const weights = { policy: 0.15, liquidity: 0.20, risk: 0.20, trend: 0.20, flow: 0.15, positioning: 0.10 }
  const composite = Math.round(
    Object.entries(subScores).reduce(
      (sum, [k, v]) => sum + v * weights[k as keyof typeof weights],
      0
    )
  )

  const label = classifyRegime(composite, subScores, inputs.breadth)
  const confidence = computeConfidence(subScores)
  const drivers = buildDrivers(subScores, composite)
  const risks = buildRisks(subScores)
  const watchNext = buildWatchNext(subScores, label)

  return {
    label,
    confidence,
    subScores,
    drivers,
    risks,
    watchNext,
    lastUpdated: new Date().toISOString(),
  }
}

// ---- Helpers ----

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

// ---- Regime display helpers ----

export const REGIME_CONFIG: Record<RegimeLabel, {
  label: string
  color: string
  bgClass: string
  textClass: string
  borderClass: string
  description: string
}> = {
  'risk-on': {
    label: 'RISK-ON',
    color: '#3DA85E',
    bgClass: 'bg-tac-900/40',
    textClass: 'text-tac-400',
    borderClass: 'border-tac-700',
    description: 'Market posture is constructive. Broad participation, supportive liquidity, contained risk.',
  },
  'risk-off': {
    label: 'RISK-OFF',
    color: '#C72019',
    bgClass: 'bg-crit-900/40',
    textClass: 'text-crit-400',
    borderClass: 'border-crit-800',
    description: 'Defensive posture active. Capital rotating to safety. Risk signals elevated.',
  },
  'sideways': {
    label: 'SIDEWAYS',
    color: '#5A8EAF',
    bgClass: 'bg-steel-900/40',
    textClass: 'text-steel-400',
    borderClass: 'border-steel-700',
    description: 'No clear directional conviction. Mixed signals across modules.',
  },
  'bottoming-candidate': {
    label: 'BOTTOMING CANDIDATE',
    color: '#E89B10',
    bgClass: 'bg-amber-900/40',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-800',
    description: 'Early indications of reversal forming. Flow and positioning beginning to shift constructive.',
  },
  'topping-candidate': {
    label: 'TOPPING CANDIDATE',
    color: '#FBB12D',
    bgClass: 'bg-amber-900/40',
    textClass: 'text-amber-300',
    borderClass: 'border-amber-700',
    description: 'Participation narrowing. Breadth diverging from price. Caution warranted.',
  },
  'transition': {
    label: 'TRANSITION',
    color: '#76A4C3',
    bgClass: 'bg-ops-600/40',
    textClass: 'text-steel-300',
    borderClass: 'border-steel-600',
    description: 'Regime in flux. Signals mixed. Await confirmation before directional positioning.',
  },
}
