// ============================================================
// DASHBOARD THRESHOLDS CONFIGURATION
// Centralised magic-number registry.
// All scoring thresholds, level cutoffs, and classification
// boundaries live here so they can be reviewed and adjusted
// without hunting through feature modules.
// ============================================================

// ---- Breadth proxy (52-week range position, scale 10–90) ----
export const BREADTH = {
  /** ETF 52w range position >= this → classified as "advancing" sector */
  ADVANCING_THRESHOLD:   60,
  /** ETF 52w range position <= this → classified as "declining" sector */
  DECLINING_THRESHOLD:   40,
  /** Minimum advancing sectors (of 11) for "broad" participation */
  BROAD_MIN_SECTORS:      7,
  /** Minimum for "improving" */
  IMPROVING_MIN_SECTORS:  5,
  /** Maximum for "narrow" */
  NARROW_MAX_SECTORS:     3,
  // 4 → 'deteriorating' (catch-all between narrow and improving)
  /** Daily SPX % change above which tape = healthy-rally (when breadth supports) */
  TAPE_RALLY_THRESHOLD:   0.5,
  /** SPX % for fragile-selloff boundary */
  TAPE_SELLOFF_THRESHOLD: 0.1,
  /** RUT vs SPX underperformance triggering rutLagging flag (pp) */
  RUT_LAGGING_THRESHOLD: -1.0,
  /** RSP/SPY ratio deterioration for ewLagging flag */
  EW_LAGGING_THRESHOLD:   0.998,
  /** Minimum advancing sectors to confirm breadth */
  BREADTH_CONFIRMED_MIN:  6,
  /** Declining sectors for broad-selloff classification */
  BROAD_SELLOFF_SECTORS:  7,
  /** Declining sectors for fragile-selloff classification */
  FRAGILE_SELLOFF_SECTORS:5,
} as const

// ---- Liquidity / financial conditions ----
export const LIQUIDITY = {
  /** HY OAS bps below which credit stress = "low" */
  HY_LOW_BPS:       300,
  /** HY OAS bps for "moderate" ceiling */
  HY_MODERATE_BPS:  400,
  /** HY OAS bps for "elevated" ceiling */
  HY_ELEVATED_BPS:  600,
  /** VIX below which vol stress = "low" */
  VIX_LOW:          15,
  /** VIX for "moderate" ceiling */
  VIX_MODERATE:     20,
  /** VIX for "elevated" ceiling */
  VIX_ELEVATED:     30,
  /** NFCI below which stance = "supportive" */
  NFCI_SUPPORTIVE:  -0.5,
  /** NFCI above which stance = "restrictive" */
  NFCI_RESTRICTIVE:  0.5,
  /** Reserve balance ($T) below which vulnerability score is penalised */
  RESERVES_LOW_T:    2.8,
  /** Reserve balance 8-week change ($M) threshold for QT trend */
  RESERVES_QT_SWING_M: 50_000,
} as const

// ---- Treasury ----
export const TREASURY = {
  /** 2s10s spread (bps) below which curve = "inverted" */
  CURVE_INVERTED_BPS:   -50,
  /** 2s10s recent-average deviation (pp) for steepening */
  CURVE_STEEPEN_PP:      0.05,
  /** 10Y daily change (pp) above which bonds are "hurting" equities */
  BONDS_HURTING_PP:      0.10,
  /** 10Y yield above which supply pressure = "moderate" */
  SUPPLY_MODERATE_YIELD: 4.0,
  /** 10Y yield above which supply pressure = "high" (when rising) */
  SUPPLY_HIGH_YIELD:     4.5,
  /** 10Y 10-day range (pp) + trend threshold for rising/falling regime */
  RATES_REGIME_RANGE:    0.25,
  RATES_REGIME_TREND:    0.20,
} as const

// ---- Options ----
export const OPTIONS = {
  /** Distance to nearest wall / spot below which pinning risk = "high" */
  PIN_HIGH_DIST:    0.0025,
  /** Pinning "moderate" ceiling distance */
  PIN_MODERATE_DIST:0.006,
  /** Distance below which near-call-wall = short-gamma / high air-pocket */
  CALL_WALL_SHORT_GAMMA_DIST: 0.004,
  /** Distance above which inside-corridor = long-gamma */
  CORRIDOR_LONG_GAMMA_DIST:   0.012,
  /** Put-wall proximity: below this distance → stabilising support flag */
  PUT_WALL_SUPPORT_DIST:       0.008,
} as const

// ---- Regime engine ----
export const REGIME = {
  /** Composite score threshold for "risk-on" */
  RISK_ON_THRESHOLD:          65,
  /** Composite score threshold for "risk-off" */
  RISK_OFF_THRESHOLD:         35,
  /** Composite band that classifies as "transition" */
  TRANSITION_LOW:             42,
  TRANSITION_HIGH:            58,
  /** Confidence formula slope (stdDev × slope subtracted from max confidence) */
  CONFIDENCE_SLOPE:           1.8,
  /** Maximum achievable confidence (all signals fully aligned) */
  CONFIDENCE_MAX:             92,
  /** Minimum confidence floor */
  CONFIDENCE_MIN:             30,
  /** Confidence penalty per missing/forced-neutral sub-score (out of 6) */
  CONFIDENCE_MISSING_PENALTY: 10,
  WEIGHTS: {
    policy:      0.15,
    liquidity:   0.20,
    risk:        0.20,
    trend:       0.20,
    /** Reduced because flow inputs are currently circular proxies */
    flow:        0.10,
    positioning: 0.15,
  } as const,
} as const

// ---- Alerts ----
export const ALERTS = {
  /** 10Y yield above which rates alert fires */
  RATES_ALERT_YIELD:        4.6,
  /** VIX spot above which vol alert fires */
  VIX_ALERT_LEVEL:          28,
  /** VIX daily % change threshold for vol/equity divergence alert */
  VIX_DIVERGENCE_PCT:       12,
  /** FOMC imminence window (days) */
  FOMC_IMMINENT_DAYS:        7,
  /** Macro catalyst alert window (hours) */
  MACRO_CATALYST_HOURS:     72,
} as const

// ---- Macro ----
export const MACRO = {
  /** Consensus entries older than this (days) are discarded for surprise calc */
  CONSENSUS_STALE_DAYS:  90,
  /** GDP threshold for "accelerating" */
  GDP_ACCELERATING:       2.5,
  /** GDP threshold for "stable" */
  GDP_STABLE:             1.0,
  /** CPI YoY for "rising" */
  CPI_RISING:             4.0,
  /** CPI for "sticky" */
  CPI_STICKY:             3.0,
  /** CPI for "falling" */
  CPI_FALLING:            2.0,
  /** Unemployment below which labor = "strong" */
  UNEMP_STRONG:           3.8,
  /** Unemployment below which labor = "softening" ceiling */
  UNEMP_SOFTENING:        4.5,
  /** avgSurprise z-score above which surpriseRegime = "positive" */
  SURPRISE_POSITIVE:      0.3,
  /** avgSurprise z-score below which surpriseRegime = "negative" */
  SURPRISE_NEGATIVE:     -0.3,
} as const
