// ============================================================
// CORE DOMAIN TYPES — Market Intelligence Dashboard
// ============================================================

import type {
  DataClass,
  ConfidenceLevel,
  FreshnessState,
  SourceMeta,
  SourcedValue,
  SourcedTimeSeries,
} from '@/lib/sources/types'

export type {
  DataClass,
  ConfidenceLevel,
  FreshnessState,
  SourceMeta,
  SourcedValue,
  SourcedTimeSeries,
}

// ---- Legacy alias ----
export type DataSourceMeta = SourceMeta
export type DataSourceType = DataClass

// ---- Other core types ----
export type TrendDirection = 'rising' | 'falling' | 'flat' | 'volatile'
export type AlertSeverity  = 'critical' | 'elevated' | 'watch' | 'info'

// ---- Regime ----

export type RegimeLabel =
  | 'risk-on'
  | 'risk-off'
  | 'sideways'
  | 'bottoming-candidate'
  | 'topping-candidate'
  | 'transition'

export type RegimeSubScore = {
  policy:      number
  liquidity:   number
  risk:        number
  trend:       number
  flow:        number
  positioning: number
}

export interface RegimeState {
  label:       RegimeLabel
  confidence:  number
  subScores:   RegimeSubScore
  drivers:     string[]
  risks:       string[]
  watchNext:   string[]
  lastUpdated: string
  changedAt?:  string
}

// ---- AI explanation types ----

export interface ModuleAIExplanation {
  oneLiner:    string
  explanation: string[]
  whyNow:      string
  confidence:  ConfidenceLevel
  caveat?:     string
  watchNext:   string
  cachedAt:    string
  expiresAt:   string
}

export interface TopLevelBriefing {
  regime:       string
  why:          string
  whatChanged:  string
  whatConfirms: string
  whatBreaks:   string
  watchNext:    string
  fullBrief:    string
  cachedAt:     string
  expiresAt:    string
}

// ---- Metric primitives ----

export interface MetricValue {
  value:      number | null
  unit?:      string
  /** Display unit for UI labels when different from stored `unit` */
  displayUnit?: string
  formatted?: string
  prior?:     number | null
  /** Generic delta — meaning depends on module (often bps for yields, raw for levels) */
  change?:    number | null
  changePct?: number | null
  /** When level is in % and session delta is in basis points */
  changeBps?: number | null
  /** Pre-formatted session / period change, e.g. "+3.2 bps" */
  formattedChange?: string | null
  percentile?:number
  trend:      TrendDirection
  meta:       SourceMeta
}

export interface TimeSeriesPoint {
  timestamp: string
  value:     number
}

export interface TimeSeries {
  key:   string
  label: string
  data:  TimeSeriesPoint[]
  meta:  SourceMeta
}

// ---- Status chips ----

export type StatusChip =
  | 'stable'
  | 'elevated'
  | 'critical'
  | 'watch'
  | 'confirmed'
  | 'inferred'
  | 'delayed'
  | 'transitioning'
  | 'inactive'
  | 'unavailable'

// ============================================================
// MODULE TYPES
// ============================================================

export interface ExecutiveSummary {
  regime:      RegimeState
  briefing:    TopLevelBriefing
  topChanges:  string[]
  topRisks:    string[]
  topWatch:    string[]
  whatBreaks:  string
  lastUpdated: string
}

export interface FedPolicyModule {
  fedFundsTarget:     { lower: number; upper: number }
  iorb:               MetricValue
  onRrp:              MetricValue
  discountRate:       MetricValue
  balanceSheet:       MetricValue
  qtMonthly:          MetricValue
  nextFomcDate:       string
  daysToFomc:         number | null
  lastFomcDate:       string
  marketImpliedPath:  { meetingDate: string; impliedRate: number }[]
  policyStance:       'tightening' | 'easing' | 'on-hold' | 'ambiguous'
  liquidityImplication:'supportive' | 'neutral' | 'restrictive'
  trendDrift:         'tightening' | 'easing' | 'stable'
  explanation?:       ModuleAIExplanation
  meta:               SourceMeta
}

export interface TreasuryCurve {
  m3:    MetricValue
  y1:    MetricValue
  y2:    MetricValue
  y5:    MetricValue
  y10:   MetricValue
  y30:   MetricValue
  tip5y: MetricValue
  tip10y:MetricValue
}

export interface TreasuryModule {
  curve:          TreasuryCurve
  spreads: {
    twoTen:    MetricValue
    twoThirty: MetricValue
    threeMTen: MetricValue
  }
  curveRegime:    'steepening' | 'flattening' | 'inverted' | 'normalizing'
  nextAuction?:   { date: string; tenor: string; size: number }
  supplyPressure: 'high' | 'moderate' | 'low'
  bondsVsEquities:'helping' | 'hurting' | 'neutral'
  ratesRegime:    'rising' | 'falling' | 'range-bound'
  explanation?:   ModuleAIExplanation
  meta:           SourceMeta
}

export interface MacroRelease {
  name:     string
  actual:   number | null
  expected: number | null
  prior:    number | null
  surprise: number | null
  /** FRED / source observation date (data as-of) */
  date:     string
  /** Human-readable reference interval (e.g. "Jan 2026") */
  period:   string
  /** Official statistical release date when known (BLS/BEA) */
  releaseDate?: string
}

export interface MacroModule {
  cpi:           MacroRelease
  pce:           MacroRelease
  payrolls:      MacroRelease
  unemployment:  MacroRelease
  joblessClaims: MacroRelease
  retailSales:   MacroRelease
  gdp:           MacroRelease
  ismMfg:        MacroRelease
  ismSvc:        MacroRelease
  growthTrend:   'accelerating' | 'decelerating' | 'stable' | 'contraction'
  inflationTrend:'rising' | 'falling' | 'stable' | 'sticky'
  laborTrend:    'strong' | 'softening' | 'weak'
  surpriseRegime:'positive' | 'negative' | 'neutral'
  nextCatalyst:  {
    name: string
    /** ISO release date when known */
    date: string
    importance: 'high' | 'medium' | 'low'
    referencePeriod?: string
    /** When `date` is empty — why the calendar did not resolve */
    unavailableReason?: string
  }
  explanation?:  ModuleAIExplanation
  meta:          SourceMeta
}

export interface LiquidityModule {
  sofr:             MetricValue
  reserveBalances:  MetricValue
  onRrpUsage:       MetricValue
  qtTrend:          TrendDirection
  fciAdjusted:      MetricValue   // Chicago Fed ANFCI (adjusted NFCI, controls for business cycle)
  fciChicago:       MetricValue
  recessionProb:    MetricValue
  hySpread:         MetricValue
  igSpread:         MetricValue
  vix:              MetricValue
  creditStress:     'low' | 'moderate' | 'elevated' | 'high'
  volStress:        'low' | 'moderate' | 'elevated' | 'high'
  liquidityStance:  'supportive' | 'neutral' | 'restrictive'
  trend:            'easing' | 'tightening' | 'stable'
  vulnerabilityScore: number
  explanation?:     ModuleAIExplanation
  meta:             SourceMeta
}

export interface IndexTrend {
  symbol:     string
  /** Null when quote unavailable — never coerce to 0 */
  price:      number | null
  /** Daily % change; null if not computable */
  change1d:   number | null
  /** Null until computed from multi-day history (do not show 0 as placeholder) */
  change1w:   number | null
  pctFrom20d: number | null
  pctFrom50d: number | null
  pctFrom200d:number | null
  trend:      TrendDirection
}

export interface BreadthModule {
  spx:          IndexTrend
  ndx:          IndexTrend
  rut:          IndexTrend
  ewsVsCap:     MetricValue
  advDecLine:   MetricValue
  upVsDownVol:  MetricValue
  newHighs52w:  MetricValue
  newLows52w:   MetricValue
  sectorBreadth:{ sector: string; rangePosition52w: number }[]
  tapeQuality:  'healthy-rally' | 'weak-rally' | 'fragile-selloff' | 'broad-selloff' | 'mixed'
  participation:'broad' | 'narrow' | 'deteriorating' | 'improving'
  breadthConfirmed: boolean
  explanation?: ModuleAIExplanation
  meta:         SourceMeta
}

export interface FlowsModule {
  etfDollarVolume:   MetricValue   // dollar trading volume proxy — NOT fund inflow/outflow
  futuresPressure:   'buying' | 'selling' | 'neutral'
  /**
   * Hardcoded 'balanced' — not yet computed from real data.
   * Score contribution disabled until a real put/call ratio feed is connected.
   */
  optionsPremiumFlow:'call-heavy' | 'put-heavy' | 'balanced'
  offExchangeShare:  MetricValue
  blockIntensity:    MetricValue
  sectorRotation:    { from: string; to: string; confidence: ConfidenceLevel }[]
  overallPressure:   'buying' | 'selling' | 'mixed'
  demandType:        'mechanical' | 'organic' | 'mixed'
  explanation?:      ModuleAIExplanation
  meta:              SourceMeta
}

export interface RetailModule {
  participationLevel:'low' | 'medium' | 'high'
  fractionalProxy:   MetricValue
  oddLotProxy:       MetricValue
  retailOptionsProxy:MetricValue
  confidence:        ConfidenceLevel
  caveat:            string
  explanation?:      ModuleAIExplanation
  meta:              SourceMeta
}

export interface OrganicVolumeModule {
  totalVolume:         MetricValue
  auctionVolume:       MetricValue
  mechanicalWindow:    MetricValue
  adjustedOrganic:     MetricValue
  organicScore:        number
  isMechanical:        boolean
  tapeQualityScore:    number
  priceActionSupported:boolean
  explanation?:        ModuleAIExplanation
  meta:                SourceMeta
}

export interface GammaLevel {
  strike:        number
  /**
   * Relative weight for bar sizing. When greeks are available this is |gamma|×OI;
   * otherwise plain openInterest. NOT dollar-gamma notional (multiply by 100×spot² for that).
   */
  relativeWeight: number
  type:          'put-wall' | 'call-wall' | 'gamma-cluster' | 'zero-gamma'
  expiry?:       string
}

export interface OptionsModule {
  /** False until OPRA/OCC-backed gamma pipeline is connected */
  structureAvailable:  boolean
  /** True when per-contract greeks (gamma) were available from the chain source */
  greeksAvailable:     boolean
  putWall:             number | null
  callWall:            number | null
  /** Null when greeks unavailable — do not fall back to spot price */
  zeroGamma:           number | null
  gammaLevels:         GammaLevel[]
  dealerPositioning:   'long-gamma' | 'short-gamma' | 'neutral'
  pinningRisk:         'high' | 'moderate' | 'low'
  airPocketRisk:       'high' | 'moderate' | 'low'
  breakoutSensitivity: 'high' | 'moderate' | 'low'
  keyExpiries:         { date: string; importance: 'monthly' | 'weekly' | 'quarterly' }[]
  explanation?:        ModuleAIExplanation
  meta:                SourceMeta
}

export interface InternalsModule {
  advDecLine:              TimeSeries
  upDownVolRatio:          TimeSeries
  vwapParticipation:       TimeSeries
  sectorBreadthIntraday:   { sector: string; trend: TrendDirection }[]
  openingGapFollowThrough: 'confirmed' | 'faded' | 'neutral'
  internalsConfirmPrice:   boolean
  momentumDirection:       'strengthening' | 'weakening' | 'stable'
  explanation?:            ModuleAIExplanation
  meta:                    SourceMeta
}

export interface CollarModule {
  isActive:         boolean
  estimatedPutZone: { lower: number; upper: number } | null
  estimatedCallZone:{ lower: number; upper: number } | null
  nextRollWindow:   string | null
  spotRelative:     'below-put' | 'in-range' | 'above-call' | 'unknown'
  influenceActive:  boolean
  confidence:       ConfidenceLevel
  caveat:           string
  explanation?:     ModuleAIExplanation
  meta:             SourceMeta
}

export interface WatchlistItem {
  symbol:      string
  name:        string
  category:    'index' | 'etf' | 'stock' | 'rate' | 'vol' | 'breadth' | 'fx' | 'crypto' | 'commodity'
  price:       number | null
  change1d:    number | null
  changePct1d: number | null
  trend:       TrendDirection
  status:      StatusChip
  alert?:      { severity: AlertSeverity; message: string }
  meta:        SourceMeta
  /** Last N daily closes (oldest → newest) for micro-sparkline; optional */
  sparkline?:  number[]
}

/** Top-of-dashboard cross-asset situational strip */
export interface CrossAssetItem {
  symbol:       string
  displayName:  string
  yahooSymbol:  string
  price:        number | null
  changePct1d:  number | null
  trend:        TrendDirection
  regimeTag:    string
  sparkline?:   number[]
  meta:         SourceMeta
}

export interface Alert {
  id:              string
  severity:        AlertSeverity
  title:           string
  explanation:     string
  affectedModules: string[]
  watchItems:      string[]
  createdAt:       string
  acknowledged:    boolean
  /** Analytical confidence for this alert (not market prediction) */
  confidence?:     ConfidenceLevel
}

export interface DashboardState {
  regime:         RegimeState
  executive:      ExecutiveSummary
  fed:            FedPolicyModule
  treasury:       TreasuryModule
  macro:          MacroModule
  liquidity:      LiquidityModule
  breadth:        BreadthModule
  flows:          FlowsModule
  retail:         RetailModule
  organic:        OrganicVolumeModule
  options:        OptionsModule
  internals:      InternalsModule
  collar:         CollarModule
  watchlist:      WatchlistItem[]
  /** BTC, gold, oil, DXY, rates, vol — compact tape */
  crossAsset:     CrossAssetItem[]
  alerts:         Alert[]
  lastFullUpdate: string
  dataQuality: {
    fredAvailable:   boolean
    marketAvailable: boolean
    aiAvailable:     boolean
    overallStatus:   'full' | 'partial' | 'degraded'
  }
}
