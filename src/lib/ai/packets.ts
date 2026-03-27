// ============================================================
// AI FEATURE PACKET BUILDERS
// Converts raw module states into structured JSON packets
// that are safe to pass to an AI model.
//
// AI does NOT receive raw tick data.
// AI receives pre-computed summaries, deltas, and regime labels.
// ============================================================

import type {
  FedPolicyModule,
  TreasuryModule,
  MacroModule,
  LiquidityModule,
  BreadthModule,
  FlowsModule,
  OptionsModule,
  RetailModule,
  OrganicVolumeModule,
  CollarModule,
  RegimeState,
} from '@/lib/types'

// ---- Generic feature packet ----

export interface FeaturePacket {
  module:        string
  asOf:          string
  confidence:    'high' | 'medium' | 'low'
  sourceType:    'observed' | 'derived' | 'inferred' | 'delayed'
  keyMetrics:    Record<string, { value: string; unit: string; change?: string; trend?: string }>
  regimeLabels:  Record<string, string>
  topDrivers:    string[]
  risks:         string[]
  caveats:       string[]
  context?:      string
}

// ---- Module-specific packet builders ----

export function buildFedPacket(fed: FedPolicyModule): FeaturePacket {
  return {
    module: 'fed_policy',
    asOf:   fed.meta.fetchedAt,
    confidence:  'high',
    sourceType:  'observed',
    keyMetrics: {
      fed_funds_upper:  { value: String(fed.fedFundsTarget.upper), unit: '%', trend: 'flat' },
      fed_funds_lower:  { value: String(fed.fedFundsTarget.lower), unit: '%', trend: 'flat' },
      iorb:             { value: fed.iorb.formatted ?? '—', unit: '%', change: formatChange(fed.iorb.change, 'bps') },
      on_rrp:           { value: fed.onRrp.formatted ?? '—', unit: '$T', change: formatChange(fed.onRrp.change, '$T'), trend: fed.onRrp.trend },
      balance_sheet:    { value: fed.balanceSheet.formatted ?? '—', unit: '$T', change: formatChange(fed.balanceSheet.change, '$T'), trend: fed.balanceSheet.trend },
      days_to_fomc:     { value: String(fed.daysToFomc ?? '?'), unit: 'days' },
    },
    regimeLabels: {
      policy_stance:        fed.policyStance,
      liquidity_implication:fed.liquidityImplication,
      trend_drift:          fed.trendDrift,
    },
    topDrivers: [
      `Fed funds target ${fed.fedFundsTarget.lower}–${fed.fedFundsTarget.upper}% (${fed.policyStance})`,
      `Next FOMC: ${fed.nextFomcDate} (${fed.daysToFomc ?? '?'} days)`,
      `Balance sheet trend: ${fed.balanceSheet.trend} at ${fed.balanceSheet.formatted}`,
    ],
    risks: [
      fed.policyStance === 'tightening' ? 'Fed still tightening — rate shock risk' : '',
      fed.daysToFomc !== null && fed.daysToFomc < 14 ? 'FOMC meeting imminent — communication risk' : '',
      fed.trendDrift === 'tightening' ? 'Tightening drift in policy — liquidity pressure building' : '',
    ].filter(Boolean),
    caveats: [
      'Market-implied path not available — requires CME FedWatch or OIS data (premium source).',
    ],
  }
}

export function buildTreasuryPacket(t: TreasuryModule): FeaturePacket {
  return {
    module: 'treasury_rates',
    asOf:   t.meta.fetchedAt,
    confidence: 'high',
    sourceType: 'observed',
    keyMetrics: {
      y2:     { value: t.curve.y2.formatted ?? '—',  unit: '%', change: formatChange(t.curve.y2.change, 'bps'), trend: t.curve.y2.trend },
      y10:    { value: t.curve.y10.formatted ?? '—', unit: '%', change: formatChange(t.curve.y10.change,'bps'), trend: t.curve.y10.trend },
      y30:    { value: t.curve.y30.formatted ?? '—', unit: '%', change: formatChange(t.curve.y30.change,'bps'), trend: t.curve.y30.trend },
      tip10y: { value: t.curve.tip10y.formatted ?? '—', unit: '%', trend: t.curve.tip10y.trend },
      spread_2s10s: { value: t.spreads.twoTen.formatted ?? '—',   unit: 'bps', change: formatChange(t.spreads.twoTen.change, 'bps'), trend: t.spreads.twoTen.trend },
      spread_3m10s: { value: t.spreads.threeMTen.formatted ?? '—', unit: 'bps' },
    },
    regimeLabels: {
      curve_regime:     t.curveRegime,
      rates_regime:     t.ratesRegime,
      bonds_vs_equities:t.bondsVsEquities,
      supply_pressure:  t.supplyPressure,
    },
    topDrivers: [
      `10Y yield at ${t.curve.y10.formatted} — ${t.ratesRegime}`,
      `2s10s spread ${t.spreads.twoTen.formatted} — curve ${t.curveRegime}`,
      `Bonds are ${t.bondsVsEquities} equities right now`,
    ],
    risks: [
      t.ratesRegime === 'rising' ? 'Rising long-end yields tighten financial conditions' : '',
      t.supplyPressure === 'high' ? 'Heavy Treasury supply absorbing risk capacity' : '',
      t.curveRegime === 'inverted' ? 'Deeply inverted curve — recession signal active' : '',
    ].filter(Boolean),
    caveats: [
      'Auction results and bid-to-cover require Treasury Auction System data.',
      'Collar-related supply estimates are inferred, not confirmed.',
    ],
  }
}

export function buildMacroPacket(macro: MacroModule): FeaturePacket {
  return {
    module: 'macro',
    asOf:   macro.meta.fetchedAt,
    confidence: 'high',
    sourceType: 'delayed',
    keyMetrics: {
      cpi_yoy:         { value: macro.cpi.actual !== null ? `${macro.cpi.actual.toFixed(1)}%` : '—', unit: '%', change: formatSurprise(macro.cpi.surprise) },
      core_pce_mom:    { value: macro.pce.actual !== null ? `${macro.pce.actual.toFixed(2)}%` : '—', unit: '%', change: formatSurprise(macro.pce.surprise) },
      payrolls:        { value: macro.payrolls.actual !== null ? `${macro.payrolls.actual.toLocaleString()}K` : '—', unit: 'K', change: formatSurprise(macro.payrolls.surprise) },
      unemployment:    { value: macro.unemployment.actual !== null ? `${macro.unemployment.actual.toFixed(1)}%` : '—', unit: '%' },
      gdp_qoq:         { value: macro.gdp.actual !== null ? `${macro.gdp.actual.toFixed(1)}%` : '—', unit: '%', change: formatSurprise(macro.gdp.surprise) },
    },
    regimeLabels: {
      growth_trend:    macro.growthTrend,
      inflation_trend: macro.inflationTrend,
      labor_trend:     macro.laborTrend,
      surprise_regime: macro.surpriseRegime,
    },
    topDrivers: [
      `Growth trend: ${macro.growthTrend} — GDP ${macro.gdp.actual !== null ? macro.gdp.actual.toFixed(1) + '%' : 'n/a'}`,
      `Inflation: ${macro.inflationTrend} — CPI ${macro.cpi.actual !== null ? macro.cpi.actual.toFixed(1) + '% YoY' : 'n/a'}`,
      `Labor: ${macro.laborTrend} — ${macro.payrolls.actual !== null ? macro.payrolls.actual.toLocaleString() + 'K payrolls' : 'n/a'}`,
    ],
    risks: [
      macro.inflationTrend === 'rising' ? 'Inflation re-acceleration risk — delays Fed easing' : '',
      macro.growthTrend === 'contraction' ? 'GDP contraction — recession risk elevated' : '',
      macro.surpriseRegime === 'negative' ? 'Macro surprise regime negative — data missing estimates' : '',
    ].filter(Boolean),
    caveats: [
      'Macro data is delayed by definition. Latest available FRED observation used.',
      'ISM PMI not available on FRED — manual update required.',
      'Consensus estimates are static and require manual refresh before each release.',
    ],
  }
}

export function buildLiquidityPacket(liq: LiquidityModule): FeaturePacket {
  return {
    module: 'liquidity',
    asOf:   liq.meta.fetchedAt,
    confidence: 'high',
    sourceType: 'observed',
    keyMetrics: {
      sofr:               { value: liq.sofr.formatted ?? '—',           unit: '%', trend: liq.sofr.trend },
      reserve_balances:   { value: liq.reserveBalances.formatted ?? '—',unit: '$T', trend: liq.reserveBalances.trend },
      on_rrp_usage:       { value: liq.onRrpUsage.formatted ?? '—',    unit: '$T', trend: liq.onRrpUsage.trend },
      hy_spread:          { value: liq.hySpread.formatted ?? '—',       unit: 'bps', change: formatChange(liq.hySpread.change, 'bps'), trend: liq.hySpread.trend },
      anfci:              { value: liq.fciAdjusted.formatted ?? '—',     unit: 'index', trend: liq.fciAdjusted.trend },
      vix:                { value: liq.vix?.formatted ?? '—',           unit: 'index', trend: liq.vix?.trend },
      vulnerability_score:{ value: String(liq.vulnerabilityScore),      unit: '/100' },
    },
    regimeLabels: {
      liquidity_stance: liq.liquidityStance,
      trend:            liq.trend,
      credit_stress:    liq.creditStress,
      vol_stress:       liq.volStress,
    },
    topDrivers: [
      `Liquidity: ${liq.liquidityStance} — NFCI ${liq.fciChicago.formatted} · ANFCI-adj ${liq.fciAdjusted.formatted}`,
      `Reserve balances at ${liq.reserveBalances.formatted} (trend: ${liq.reserveBalances.trend})`,
      `HY OAS at ${liq.hySpread.formatted} — credit stress: ${liq.creditStress}`,
    ],
    risks: [
      liq.creditStress === 'elevated' ? 'HY spreads widening — credit conditions deteriorating' : '',
      liq.volStress === 'elevated' ? 'Elevated VIX — vol feedback loop risk' : '',
      liq.vulnerabilityScore > 60 ? `Vulnerability score elevated at ${liq.vulnerabilityScore}/100` : '',
    ].filter(Boolean),
    caveats: [],
  }
}

function formatBreadthDayChange(pct: number | null | undefined): string {
  if (pct == null || !Number.isFinite(pct)) return '—'
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}

export function buildBreadthPacket(b: BreadthModule): FeaturePacket {
  const advSectors = b.sectorBreadth.filter(s => s.rangePosition52w >= 60).length
  const spxCh = b.spx.change1d
  const ndxCh = b.ndx.change1d
  const rutCh = b.rut.change1d
  const ndxVsRut =
    ndxCh != null && rutCh != null && Number.isFinite(ndxCh) && Number.isFinite(rutCh) && ndxCh > rutCh + 0.5
      ? 'large-cap-leading'
      : 'balanced'
  const rutLagsSpx =
    spxCh != null && rutCh != null && Number.isFinite(spxCh) && Number.isFinite(rutCh) && rutCh < spxCh - 1.5

  return {
    module: 'breadth',
    asOf:   b.meta.fetchedAt,
    confidence: 'medium',
    sourceType: 'observed',
    keyMetrics: {
      spx_change:    { value: formatBreadthDayChange(spxCh), unit: '%', trend: b.spx.trend },
      ndx_change:    { value: formatBreadthDayChange(ndxCh), unit: '%', trend: b.ndx.trend },
      rut_change:    { value: formatBreadthDayChange(rutCh), unit: '%', trend: b.rut.trend },
      ews_vs_cap:    { value: b.ewsVsCap.formatted ?? '—', unit: 'ratio', trend: b.ewsVsCap.trend },
      sectors_advancing: { value: String(advSectors), unit: '/11 sectors' },
    },
    regimeLabels: {
      tape_quality:   b.tapeQuality,
      participation:  b.participation,
      breadth_confirmed: String(b.breadthConfirmed),
      ndx_vs_rut:    ndxVsRut,
    },
    topDrivers: [
      `Tape: ${b.tapeQuality} — SPX ${formatBreadthDayChange(spxCh)}`,
      `${advSectors}/11 sectors above 60% above 50D — participation ${b.participation}`,
      `Equal-weight vs cap-weight: ${b.ewsVsCap.trend} (${b.ewsVsCap.formatted})`,
    ],
    risks: [
      !b.breadthConfirmed ? 'Breadth not confirming price — divergence risk' : '',
      b.participation === 'narrow' ? 'Narrow participation — leadership concentrated' : '',
      rutLagsSpx ? 'RUT significantly lagging SPX — risk appetite narrow' : '',
    ].filter(Boolean),
    caveats: [
      'New highs/lows and up/down volume require NYSE data feed (premium or delayed public source).',
      'Sector breadth above 50D is approximated from 52-week range position.',
    ],
  }
}

export function buildOptionsPacket(opt: OptionsModule): FeaturePacket {
  if (!opt.structureAvailable || opt.putWall == null || opt.callWall == null || opt.zeroGamma == null) {
    return {
      module: 'options_positioning',
      asOf:   opt.meta.fetchedAt,
      confidence: 'low',
      sourceType: 'inferred',
      keyMetrics: {
        pipeline_status: { value: 'UNAVAILABLE', unit: 'status' },
      },
      regimeLabels: {
        dealer_positioning:   opt.dealerPositioning,
        pinning_risk:         opt.pinningRisk,
        air_pocket_risk:      opt.airPocketRisk,
        breakout_sensitivity: opt.breakoutSensitivity,
      },
      topDrivers: [
        'No OPRA/OCC-backed gamma pipeline connected — strikes are not shown as live levels.',
      ],
      risks: [],
      caveats: [
        opt.meta.fetchError ?? 'Connect Polygon.io, Cboe DataShop, or internal OI analytics to populate SPX gamma structure.',
      ],
    }
  }

  return {
    module: 'options_positioning',
    asOf:   opt.meta.fetchedAt,
    confidence: 'medium',
    sourceType: 'derived',
    keyMetrics: {
      put_wall:   { value: opt.putWall.toLocaleString(), unit: 'SPX level' },
      call_wall:  { value: opt.callWall.toLocaleString(), unit: 'SPX level' },
      zero_gamma: { value: opt.zeroGamma.toLocaleString(), unit: 'SPX level' },
      corridor_width: { value: `${opt.callWall - opt.putWall}`, unit: 'points' },
    },
    regimeLabels: {
      dealer_positioning:   opt.dealerPositioning,
      pinning_risk:         opt.pinningRisk,
      air_pocket_risk:      opt.airPocketRisk,
      breakout_sensitivity: opt.breakoutSensitivity,
    },
    topDrivers: [
      `Dealer: ${opt.dealerPositioning} — ${opt.dealerPositioning === 'short-gamma' ? 'amplifies moves' : 'dampens moves'}`,
      `Key corridor: ${opt.putWall} (put wall) → ${opt.zeroGamma} (ZG) → ${opt.callWall} (call wall)`,
      `Air pocket risk: ${opt.airPocketRisk} — breakout sensitivity: ${opt.breakoutSensitivity}`,
    ],
    risks: [
      opt.dealerPositioning === 'short-gamma' ? 'Short-gamma dealers amplify directional moves' : '',
      opt.airPocketRisk === 'high' ? 'Air pocket risk: gap risk if spot breaks zero-gamma' : '',
    ].filter(Boolean),
    caveats: [
      'Options positioning is model-derived from OI estimates. Not sourced from real options data.',
      'Requires OPRA/OCC data feed or premium options analytics for real values.',
    ],
  }
}

// ---- Top-level regime summary packet ----

export interface RegimeSummaryPacket {
  regime:     RegimeState
  fed:        FeaturePacket
  treasury:   FeaturePacket
  macro:      FeaturePacket
  liquidity:  FeaturePacket
  breadth:    FeaturePacket
  options:    FeaturePacket
  asOf:       string
}

export function buildRegimeSummaryPacket(
  regime:   RegimeState,
  fed:      FedPolicyModule,
  treasury: TreasuryModule,
  macro:    MacroModule,
  liq:      LiquidityModule,
  breadth:  BreadthModule,
  options:  OptionsModule,
): RegimeSummaryPacket {
  return {
    regime,
    fed:      buildFedPacket(fed),
    treasury: buildTreasuryPacket(treasury),
    macro:    buildMacroPacket(macro),
    liquidity:buildLiquidityPacket(liq),
    breadth:  buildBreadthPacket(breadth),
    options:  buildOptionsPacket(options),
    asOf:     new Date().toISOString(),
  }
}

// ---- Helpers ----

function formatChange(change: number | null | undefined, unit: string): string | undefined {
  if (change == null) return undefined
  return `${change >= 0 ? '+' : ''}${change.toFixed(2)} ${unit}`
}

function formatSurprise(surprise: number | null | undefined): string | undefined {
  if (surprise == null) return undefined
  return `surprise: ${surprise >= 0 ? '+' : ''}${surprise.toFixed(2)}`
}
