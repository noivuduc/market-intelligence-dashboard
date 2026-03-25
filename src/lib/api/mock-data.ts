// ============================================================
// MOCK DATA — development / demo mode
// All values are illustrative. Replace with real data feeds.
// ============================================================
import type {
  DashboardState,
  MetricValue,
  SourceMeta,
  TimeSeries,
} from '@/lib/types'
import type { DataClass, ConfidenceLevel } from '@/lib/sources/types'

const now = new Date().toISOString()
const cache15m = new Date(Date.now() + 15 * 60 * 1000).toISOString()

function mockMeta(
  sourceName: string,
  dataClass: DataClass,
  _refreshSec: number,
  _latencySec: number,
  confidence: ConfidenceLevel,
  caveat?: string
): SourceMeta {
  return {
    sourceId:        sourceName.toLowerCase().replace(/\s+/g, '-'),
    sourceName,
    dataClass,
    confidence,
    fetchedAt:       now,
    dataAsOf:        now,
    cadenceLabel:    'Mock data',
    requiresPremium: false,
    caveat,
  }
}

function mv(
  value: number,
  prior: number,
  unit: string,
  formatted: string,
  meta: SourceMeta,
  percentile?: number
): MetricValue {
  const change = value - prior
  const changePct = prior !== 0 ? (change / Math.abs(prior)) * 100 : 0
  const trend = change > 0.001 ? 'rising' : change < -0.001 ? 'falling' : 'flat'
  return { value, prior, change, changePct, unit, formatted, percentile, trend, meta }
}

function ts(key: string, label: string, points: [string, number][], meta: SourceMeta): TimeSeries {
  return { key, label, data: points.map(([timestamp, value]) => ({ timestamp, value })), meta }
}

// ---- Generate time-series stub (last 30 days) ----

function fakeSeries(base: number, vol: number, n = 30): [string, number][] {
  const pts: [string, number][] = []
  let v = base
  for (let i = n; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    v = Math.max(0, v + (Math.random() - 0.49) * vol)
    pts.push([d.toISOString(), parseFloat(v.toFixed(2))])
  }
  return pts
}

// ---- Meta presets ----

const fedMeta    = mockMeta('Federal Reserve / FRED', 'observed', 86400, 3600, 'high')
const nyFedMeta  = mockMeta('NY Fed / SOFR', 'observed', 3600, 900, 'high')
const blsMeta    = mockMeta('BLS / BEA', 'delayed', 2592000, 86400, 'high')
const equityMeta = mockMeta('Consolidated Tape / Exchange', 'observed', 60, 5, 'high')
const derivedMeta = mockMeta('Internal Derived', 'derived', 300, 0, 'medium')
const inferredMeta = mockMeta('Inferred / Proxy', 'inferred', 300, 0, 'low', 'This is a proxy measure. Not sourced from a direct data feed.')
const treasuryMeta = mockMeta('Treasury / TreasuryDirect', 'observed', 3600, 300, 'high')
const optionsMeta  = mockMeta('OPRA / OCC / Cboe', 'derived', 300, 60, 'medium', 'Gamma estimates are model-derived from OI snapshots.')

export function getMockDashboardState(): DashboardState {
  return {
    lastFullUpdate: now,

    regime: {
      label: 'transition',
      confidence: 58,
      subScores: {
        policy:      52,
        liquidity:   61,
        risk:        48,
        trend:       55,
        flow:        44,
        positioning: 50,
      },
      drivers: [
        'Liquidity conditions remain mildly supportive via elevated reserve balances',
        'Fed policy stance on hold with easing drift in market-implied path',
        'Breadth partially confirms price recovery but equal-weight lags',
      ],
      risks: [
        'Macro surprise regime turned negative — growth deceleration risk',
        'Options dealer positioning is short gamma — volatility amplification risk',
        'Treasury supply pressure elevated — auctions consuming risk capacity',
      ],
      watchNext: [
        'Watch for breakout above/below key gamma levels',
        'Monitor macro releases for regime-shifting data',
        'Track sector rotation for directional conviction signal',
      ],
      lastUpdated: now,
      changedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    },

    executive: {
      regime: {} as never, // populated by regime
      briefing: {
        regime: 'Transition / Mixed',
        why: 'Liquidity remains intact but macro surprise regime has turned negative. Breadth partially confirms the recent price move but equal-weight participation is lagging, suggesting the advance is cap-weight driven.',
        whatChanged: 'Treasury auction demand weakened last week, pushing 10Y yields higher. SPX crossed zero-gamma level intraday before reverting. Retail proxy activity has ticked up.',
        whatConfirms: 'Reserve balances elevated. Credit spreads contained. SOFR stable. Fed on-hold consensus intact.',
        whatBreaks: 'The current view breaks if 10Y yields push above 4.75% while breadth rolls over, or if credit spreads widen 50bps+ and retail flow abruptly exits.',
        watchNext: 'Next FOMC minutes, weekly jobless claims, and SPX behavior relative to the 5350 put wall.',
        fullBrief: 'Market posture is cautiously transitional. The Fed remains on hold and liquidity conditions are stable, providing a floor under risk assets. However, the macro surprise regime has degraded — payrolls and retail sales both disappointed against expectations last month — and the Treasury market is absorbing heavy supply with declining auction quality. Options dealer positioning near short-gamma adds a volatility amplification risk if SPX breaks below the 5300 put wall. Breadth confirms the current rally at a surface level, but equal-weight participation continues to lag, and sector rotation remains concentrated in a narrow set of defensive-quality names. The regime holds as transitional until one of two resolutions: either a macro beat re-engages broad participation, or a rates shock triggers a positioning-driven de-risking episode.',
        cachedAt: now,
        expiresAt: cache15m,
      },
      topChanges: [
        '10Y Treasury yield +14bps WoW — auction demand weakening',
        'Equal-weight (RSP) underperforming SPY by 1.2% — narrow rally',
        'ON RRP usage declined $40B — liquidity migration to equities',
      ],
      topRisks: [
        'Macro surprise regime: negative — growth data missing estimates',
        'Dealer positioning: short gamma — SPX break triggers vol feedback',
        'Treasury supply: heavy auction calendar this week',
      ],
      topWatch: [
        'FOMC Minutes release: tone on rate path and balance sheet',
        'SPX 5300 put wall — key structural support level this week',
        'Credit spreads — HY holding, but IG beginning to widen',
      ],
      whatBreaks: 'View breaks on: 10Y > 4.75% + breadth rollover, or HY spreads +50bps, or Fed communication hawkish pivot',
      lastUpdated: now,
    },

    fed: {
      fedFundsTarget: { lower: 5.25, upper: 5.50 },
      iorb:           mv(5.40, 5.40, '%', '5.40%', fedMeta, 90),
      onRrp:          mv(4.95, 4.95, '%', '4.95%', fedMeta, 85),
      discountRate:   mv(5.50, 5.50, '%', '5.50%', fedMeta, 90),
      balanceSheet:   mv(7.4, 7.45, '$T', '$7.40T', fedMeta, 70),
      qtMonthly:      mv(60, 60, '$B', '$60B/mo', fedMeta, 75),
      nextFomcDate:   '2024-07-31',
      lastFomcDate:   '2024-06-12',
      daysToFomc:     52,
      marketImpliedPath: [
        { meetingDate: '2024-07-31', impliedRate: 5.38 },
        { meetingDate: '2024-09-18', impliedRate: 5.25 },
        { meetingDate: '2024-11-07', impliedRate: 5.12 },
        { meetingDate: '2024-12-18', impliedRate: 5.00 },
      ],
      policyStance:         'on-hold',
      liquidityImplication: 'neutral',
      trendDrift:           'easing',
      explanation: {
        oneLiner: 'Fed on hold; market pricing 2 cuts by year-end, but data dependency intact.',
        explanation: [
          'The Fed maintained the target range at 5.25–5.50% at the last meeting.',
          'Market implied path prices 50bps of cuts by December, contingent on inflation continuing to decline.',
          'Balance sheet QT continues at $60B/month; reserve balances remain above the LCLoR threshold.',
        ],
        whyNow: 'On-hold Fed removes near-term rate shock risk, but the longer rates stay elevated, the more pressure accumulates on credit and duration.',
        confidence: 'high',
        watchNext: 'Watch FOMC Minutes for any shift in QT pace guidance or inflation tolerance language.',
        cachedAt: now,
        expiresAt: cache15m,
      },
      meta: fedMeta,
    },

    treasury: {
      curve: {
        m3:   mv(5.42, 5.40, '%', '5.42%', treasuryMeta, 92),
        y1:   mv(5.25, 5.22, '%', '5.25%', treasuryMeta, 88),
        y2:   mv(4.95, 4.88, '%', '4.95%', treasuryMeta, 82),
        y5:   mv(4.62, 4.55, '%', '4.62%', treasuryMeta, 75),
        y10:  mv(4.55, 4.41, '%', '4.55%', treasuryMeta, 78),
        y30:  mv(4.65, 4.52, '%', '4.65%', treasuryMeta, 72),
        tip5y:  mv(2.25, 2.18, '%', '2.25%', treasuryMeta, 80),
        tip10y: mv(2.15, 2.10, '%', '2.15%', treasuryMeta, 77),
      },
      spreads: {
        twoTen:    mv(-40, -47, 'bps', '-40 bps', derivedMeta, 25),
        twoThirty: mv(-30, -36, 'bps', '-30 bps', derivedMeta, 30),
        threeMTen: mv(-87, -94, 'bps', '-87 bps', derivedMeta, 15),
      },
      curveRegime:    'steepening',
      nextAuction:    { date: '2024-06-12', tenor: '10Y', size: 39 },
      supplyPressure: 'high',
      bondsVsEquities:'hurting',
      ratesRegime:    'rising',
      explanation: {
        oneLiner: 'Curve steepening from deeply inverted — long end repricing higher on supply and growth.',
        explanation: [
          '2s10s spread narrowed from -87bps to -40bps over the past 90 days — steepening in progress.',
          'Long-end yields rising on combination of elevated Treasury supply and resilient growth data.',
          'Real yields at 2.15% on 10Y TIPS remain restrictive and are crowding out equity risk premium.',
        ],
        whyNow: 'Rising long-end yields increase discount rate pressure on equities and tighten financial conditions even without Fed action.',
        confidence: 'high',
        watchNext: 'Watch next 10Y auction bid-to-cover and tail — weak demand would accelerate the selloff.',
        cachedAt: now,
        expiresAt: cache15m,
      },
      meta: treasuryMeta,
    },

    macro: {
      cpi:          { name: 'CPI YoY', actual: 3.4, expected: 3.4, prior: 3.5, surprise: 0.0, date: '2024-05-15', period: 'Apr 2024' },
      pce:          { name: 'Core PCE MoM', actual: 0.3, expected: 0.3, prior: 0.4, surprise: 0.0, date: '2024-05-31', period: 'Apr 2024' },
      payrolls:     { name: 'NFP', actual: 175000, expected: 243000, prior: 310000, surprise: -68000, date: '2024-05-03', period: 'Apr 2024' },
      unemployment: { name: 'Unemployment Rate', actual: 3.9, expected: 3.8, prior: 3.8, surprise: 0.1, date: '2024-05-03', period: 'Apr 2024' },
      joblessClaims:{ name: 'Initial Claims', actual: 231000, expected: 212000, prior: 209000, surprise: 19000, date: '2024-06-06', period: 'Wk Jun 1' },
      retailSales:  { name: 'Retail Sales MoM', actual: 0.0, expected: 0.4, prior: 0.6, surprise: -0.4, date: '2024-05-15', period: 'Apr 2024' },
      gdp:          { name: 'GDP QoQ SAAR', actual: 1.3, expected: 2.4, prior: 3.4, surprise: -1.1, date: '2024-05-30', period: 'Q1 2024 2nd' },
      ismMfg:       { name: 'ISM Mfg PMI', actual: 48.7, expected: 50.0, prior: 50.3, surprise: -1.3, date: '2024-06-03', period: 'May 2024' },
      ismSvc:       { name: 'ISM Svcs PMI', actual: 53.8, expected: 51.5, prior: 49.4, surprise: 2.3, date: '2024-06-05', period: 'May 2024' },
      growthTrend:    'decelerating',
      inflationTrend: 'falling',
      laborTrend:     'softening',
      surpriseRegime: 'negative',
      nextCatalyst:   { name: 'NFP', date: '2026-04-03', importance: 'high', referencePeriod: 'Mar 2026' },
      explanation: {
        oneLiner: 'Growth decelerating, inflation falling, labor softening — macro mix tilts toward eventual easing.',
        explanation: [
          'Q1 GDP revised down to 1.3%, payrolls undershot by 68K, and retail sales were flat — growth deceleration is broad.',
          'CPI at 3.4% YoY and core PCE at 0.3% MoM are trending lower, supporting the case for eventual rate cuts.',
          'The ISM Services re-accelerated to 53.8, providing a partial offset, but manufacturing remains below 50.',
        ],
        whyNow: 'The macro picture supports Fed patience — not enough deterioration to force cuts, not enough strength to tighten. This ambiguity is regime risk.',
        confidence: 'high',
        watchNext: 'May CPI (June 12) — a 3.2% or below print would re-accelerate the rate cut narrative.',
        cachedAt: now,
        expiresAt: cache15m,
      },
      meta: blsMeta,
    },

    liquidity: {
      sofr:              mv(5.33, 5.33, '%', '5.33%', nyFedMeta, 91),
      reserveBalances:   mv(3.35, 3.28, '$T', '$3.35T', fedMeta, 68),
      onRrpUsage:        mv(0.38, 0.42, '$T', '$380B', fedMeta, 35),
      qtTrend:           'falling',
      fciChicago:        mv(-0.22, -0.25, 'index', '-0.220', fedMeta, 40),
      fciNyfed:          mv(-0.08, -0.10, 'index', '-0.080', fedMeta, 45),
      recessionProb:     mv(28, 32, '%', '28%', derivedMeta, 55),
      hySpread:          mv(315, 302, 'bps', '315 bps', derivedMeta, 50),
      igSpread:          mv(95,  90,  'bps', '95 bps',  derivedMeta, 45),
      vix:               mv(14.2, 13.8, 'index', '14.2', equityMeta, 30),
      creditStress:      'moderate',
      volStress:         'low',
      liquidityStance:   'neutral',
      trend:             'stable',
      vulnerabilityScore: 38,
      explanation: {
        oneLiner: 'Liquidity neutral — reserves ample, but ON RRP drawdown slowing and HY spreads creeping wider.',
        explanation: [
          'Reserve balances at $3.35T remain above the Fed\'s estimated Lower Bound of Comfortable Reserves (~$3T).',
          'ON RRP usage has fallen sharply from $2.4T to $380B — this is broadly positive for liquidity as funds migrate to money markets and T-bills.',
          'HY spreads have ticked up 13bps to 315bps — still contained historically but trending in the wrong direction.',
        ],
        whyNow: 'Liquidity is adequate but the margin of safety is narrowing. ON RRP depletion eventually limits further liquidity release.',
        confidence: 'medium',
        watchNext: 'Watch if HY spreads widen beyond 350bps — that level historically triggers equity derisking.',
        cachedAt: now,
        expiresAt: cache15m,
      },
      meta: nyFedMeta,
    },

    breadth: {
      spx: { symbol: 'SPX', price: 5305, change1d: 0.4, change1w: 1.2, pctFrom20d: 1.1, pctFrom50d: 3.4, pctFrom200d: 14.2, trend: 'rising' },
      ndx: { symbol: 'NDX', price: 18742, change1d: 0.6, change1w: 2.1, pctFrom20d: 1.8, pctFrom50d: 4.2, pctFrom200d: 18.4, trend: 'rising' },
      rut: { symbol: 'RUT', price: 2074, change1d: -0.3, change1w: -0.8, pctFrom20d: -1.2, pctFrom50d: -2.1, pctFrom200d: 2.4, trend: 'falling' },
      ewsVsCap:       mv(0.964, 0.972, 'ratio', 'RSP/SPY 0.964', equityMeta, 30),
      advDecLine:     mv(412, 395, 'net', '+412', equityMeta, 55),
      upVsDownVol:    mv(1.35, 1.42, 'ratio', '1.35x', equityMeta, 52),
      newHighs52w:    mv(124, 138, 'count', '124', equityMeta, 45),
      newLows52w:     mv(31, 28, 'count', '31', equityMeta, 40),
      sectorBreadth: [
        { sector: 'Tech',     pctAbove50d: 68 },
        { sector: 'Comm',     pctAbove50d: 62 },
        { sector: 'Health',   pctAbove50d: 55 },
        { sector: 'Financials',pctAbove50d: 51 },
        { sector: 'Utilities',pctAbove50d: 48 },
        { sector: 'Energy',   pctAbove50d: 45 },
        { sector: 'Industrials',pctAbove50d: 44 },
        { sector: 'Materials',pctAbove50d: 41 },
        { sector: 'Real Estate',pctAbove50d: 37 },
        { sector: 'Staples',  pctAbove50d: 35 },
        { sector: 'Discretionary',pctAbove50d: 32 },
      ],
      tapeQuality:      'weak-rally',
      participation:    'narrow',
      breadthConfirmed: false,
      explanation: {
        oneLiner: 'Price advancing but breadth lags — rally is cap-weight driven, not broad participation.',
        explanation: [
          'SPX +3.4% above 50-day but RUT is -2.1% below — the divergence signals cap-weight dominance.',
          'Advance-decline line at +412 is positive but 52-week new highs fell from 138 to 124 — fewer stocks driving the move.',
          'RSP/SPY ratio at 0.964 and falling — equal-weight underperforming cap-weight by 0.8% this week.',
        ],
        whyNow: 'Narrow rallies driven by mega-cap concentration are fragile — they can reverse quickly if the few leading stocks weaken.',
        confidence: 'high',
        watchNext: 'Watch 52-week new highs — if they fail to re-expand above 200, breadth deterioration is confirmed.',
        cachedAt: now,
        expiresAt: cache15m,
      },
      meta: equityMeta,
    },

    flows: {
      etfFlowProxy:       mv(1850, 2200, '$M', '+$1.85B', inferredMeta, 60),
      futuresPressure:    'buying',
      optionsPremiumFlow: 'call-heavy',
      offExchangeShare:   mv(47.2, 45.8, '%', '47.2%', derivedMeta, 70),
      blockIntensity:     mv(8.4, 7.9, '%', '8.4% of vol', equityMeta, 55),
      sectorRotation: [
        { from: 'Small Cap', to: 'Large Cap Tech', confidence: 'high' },
        { from: 'Energy',    to: 'Utilities',      confidence: 'medium' },
      ],
      overallPressure: 'buying',
      demandType:      'mixed',
      explanation: {
        oneLiner: 'Net buy pressure but flow is concentrated — breadth of demand not fully convincing.',
        explanation: [
          'ETF flow proxy shows +$1.85B net inflow, down from +$2.2B prior week — inflow pace slowing.',
          'Futures positioning is net long but options premium flow is concentrated in near-term calls — may reflect hedging rather than directional conviction.',
          'Off-exchange share at 47.2% is elevated — more retail/internalized flow, which tends to be less directionally informed.',
        ],
        whyNow: 'Flow quality matters as much as direction. Elevated off-exchange and slowing ETF inflow suggest the tape is being held up by mechanical activity.',
        confidence: 'medium',
        watchNext: 'Watch closing auction pressure — if MOC orders are consistently buy-heavy, institutional demand is genuine.',
        cachedAt: now,
        expiresAt: cache15m,
      },
      meta: derivedMeta,
    },

    retail: {
      participationLevel: 'medium',
      fractionalProxy:    mv(62, 55, 'index', '62 (0–100)', inferredMeta, 35),
      oddLotProxy:        mv(11.4, 10.8, '% of trades', '11.4%', inferredMeta, 35),
      retailOptionsProxy: mv(0.38, 0.32, 'put/call', '0.38 put/call', inferredMeta, 30),
      confidence:         'low',
      caveat:             'All retail metrics are proxy-based. Sources include odd-lot order share and estimated fractional activity. Not sourced from direct retail brokerage flow data. Treat as indicative only.',
      explanation: {
        oneLiner: 'Retail participation appears moderate — proxy metrics suggest average engagement, not a panic buy or aggressive retreat.',
        explanation: [
          'Odd-lot trade share at 11.4% is mildly elevated vs the 10.5% baseline, suggesting above-average small retail activity.',
          'Retail options proxy at 0.38 put/call is balanced — no sign of aggressive upside speculation or panic hedging.',
          'Fractional activity proxy index at 62 (scale 0-100) is above the neutral level of 50 but well below the 80+ levels seen during meme-stock episodes.',
        ],
        whyNow: 'Elevated retail participation can amplify moves but is not currently at extreme levels that would signal a sentiment-driven exhaustion top.',
        confidence: 'low',
        caveat: 'All retail metrics are proxy-based. Confidence is low. Do not treat these as primary signals.',
        watchNext: 'Watch for fractional proxy approaching 80+ — historically associated with retail-driven exhaustion tops.',
        cachedAt: now,
        expiresAt: cache15m,
      },
      meta: inferredMeta,
    },

    organic: {
      totalVolume:    mv(10.8, 10.2, 'B shares', '10.8B', equityMeta, 60),
      auctionVolume:  mv(2.1, 2.0, 'B shares', '2.1B (19%)', equityMeta, 55),
      mechanicalWindow: mv(1.8, 1.7, 'B shares', '1.8B (17%)', derivedMeta, 50),
      adjustedOrganic: mv(6.9, 6.5, 'B shares', '6.9B (64%)', derivedMeta, 58),
      organicScore:    64,
      isMechanical:    false,
      tapeQualityScore:62,
      priceActionSupported: true,
      explanation: {
        oneLiner: 'Price action modestly supported by organic volume — not mechanical, but not high-conviction either.',
        explanation: [
          'Total volume of 10.8B shares minus 2.1B auction volume and 1.8B mechanical window yields ~6.9B shares of adjusted organic volume.',
          'Organic score of 64/100 is above the mechanical threshold (below 45 signals mechanical-driven tape).',
          'Tape quality score of 62 reflects adequate two-way participation but no exceptional conviction.',
        ],
        whyNow: 'Volume quality confirms price is not purely mechanical — genuine buyers are present, but the strength of participation is not expanding.',
        confidence: 'medium',
        caveat: 'Organic volume is a derived metric based on estimated auction and mechanical window exclusions. Imprecise by nature.',
        watchNext: 'Watch if organic score drops below 45 on a down day — that signals mechanical/forced selling rather than real conviction.',
        cachedAt: now,
        expiresAt: cache15m,
      },
      meta: derivedMeta,
    },

    options: {
      structureAvailable: true,
      putWall:   5200,
      callWall:  5400,
      zeroGamma: 5280,
      gammaLevels: [
        { strike: 5200, gammaNotional: 4200, type: 'put-wall', expiry: '2024-06-21' },
        { strike: 5250, gammaNotional: 2800, type: 'gamma-cluster' },
        { strike: 5280, gammaNotional: 0,    type: 'zero-gamma' },
        { strike: 5300, gammaNotional: 1900, type: 'gamma-cluster' },
        { strike: 5350, gammaNotional: 3100, type: 'gamma-cluster', expiry: '2024-06-14' },
        { strike: 5400, gammaNotional: 5100, type: 'call-wall', expiry: '2024-06-21' },
      ],
      dealerPositioning:     'short-gamma',
      pinningRisk:           'moderate',
      airPocketRisk:         'high',
      breakoutSensitivity:   'high',
      keyExpiries: [
        { date: '2024-06-14', importance: 'weekly' },
        { date: '2024-06-21', importance: 'monthly' },
        { date: '2024-09-20', importance: 'quarterly' },
      ],
      explanation: {
        oneLiner: 'Dealers short gamma between 5280–5350 — air pocket risk below 5280, pin pressure near 5350.',
        explanation: [
          'Put wall at 5200 and call wall at 5400 define the current structural range — SPX at 5305 is inside this corridor.',
          'Zero-gamma at 5280 is ~25 points below spot. Dealers short gamma means they amplify moves — buying rallies, selling dips.',
          'Air pocket risk is high below 5280 where there is limited structural support and dealer hedging would add selling pressure.',
        ],
        whyNow: 'Short-gamma dealer positioning is a volatility multiplier — it means news-driven moves will be exaggerated in both directions.',
        confidence: 'medium',
        caveat: 'Gamma levels are model-estimated from OI snapshots. Actual dealer book composition is not observable. Treat as structural guidance, not precise strikes.',
        watchNext: 'Watch SPX behavior at 5280 (zero-gamma) and 5200 (put wall). A break below 5280 with volume confirms a more aggressive derisking setup.',
        cachedAt: now,
        expiresAt: cache15m,
      },
      meta: optionsMeta,
    },

    internals: {
      advDecLine:   ts('adv-dec', 'A/D Line', fakeSeries(500, 80), equityMeta),
      upDownVolRatio: ts('updn-vol', 'Up/Down Vol Ratio', fakeSeries(1.2, 0.3), equityMeta),
      vwapParticipation: ts('vwap-part', 'VWAP Participation %', fakeSeries(62, 8), derivedMeta),
      sectorBreadthIntraday: [
        { sector: 'Tech',       trend: 'rising' },
        { sector: 'Health',     trend: 'flat' },
        { sector: 'Financials', trend: 'rising' },
        { sector: 'Energy',     trend: 'falling' },
        { sector: 'Utilities',  trend: 'flat' },
      ],
      openingGapFollowThrough: 'confirmed',
      internalsConfirmPrice:   true,
      momentumDirection:       'stable',
      explanation: {
        oneLiner: 'Internals broadly confirm price — opening gap followed through, breadth positive, no divergence detected.',
        explanation: [
          'Opening gap to the upside followed through with sustained buying — institutional order flow confirmed at the open.',
          'A/D line positive all session, up/down volume ratio at 1.35x — more volume flowing into advancing issues.',
          'Tech and Financials leading intraday; Energy and Utilities lagging, consistent with a risk-on intraday posture.',
        ],
        whyNow: 'Internal confirmation is the most reliable near-term signal. A day where price advances but internals diverge is a warning.',
        confidence: 'high',
        watchNext: 'Watch late-day auction (MOC) for institutional tone confirmation — a weak MOC after a strong day is a common institutional distribution signal.',
        cachedAt: now,
        expiresAt: cache15m,
      },
      meta: equityMeta,
    },

    collar: {
      isActive:         true,
      estimatedPutZone: { lower: 4850, upper: 5050 },
      estimatedCallZone:{ lower: 5400, upper: 5600 },
      nextRollWindow:   '2024-09-18',
      spotRelative:     'in-range',
      influenceActive:  false,
      confidence:       'low',
      caveat:           'JPM collar positions are not publicly disclosed. All estimates are inferred from public OI patterns and quarterly roll windows. Confidence is LOW. Do not act on this signal as primary intelligence.',
      explanation: {
        oneLiner: 'Collar structure estimated active but spot is mid-range — no near-term collar-related supply or demand pressure.',
        explanation: [
          'Estimated JPM quarterly collar: put zone ~4850–5050, call zone ~5400–5600 based on inferred OI clusters.',
          'SPX at 5305 is in the middle of the estimated range — collar impact is likely neutral at current levels.',
          'Next quarterly roll window is estimated at September quarterly expiry — watch for activity as that approaches.',
        ],
        whyNow: 'As SPX approaches the estimated call zone at 5400+, collar-related selling pressure may emerge. This is a structural resistance consideration.',
        confidence: 'low',
        caveat: 'Low confidence. All collar data is inferred. Do not use as primary signal.',
        watchNext: 'Watch SPX approaching 5400 — if resistance appears with outsized options flow, collar influence may be active.',
        cachedAt: now,
        expiresAt: cache15m,
      },
      meta: inferredMeta,
    },

    crossAsset: [
      { symbol: 'SPX', displayName: 'S&P 500', yahooSymbol: '^GSPC', price: 5305, changePct1d: 0.4, trend: 'rising', regimeTag: 'Broad U.S. equity / risk tether', meta: equityMeta },
      { symbol: 'NDX', displayName: 'Nasdaq 100', yahooSymbol: '^NDX', price: 18742, changePct1d: 0.6, trend: 'rising', regimeTag: 'Growth & liquidity tilt', meta: equityMeta },
      { symbol: 'RUT', displayName: 'Russell 2000', yahooSymbol: '^RUT', price: 2074, changePct1d: -0.3, trend: 'falling', regimeTag: 'Small-cap / breadth', meta: equityMeta },
      { symbol: 'VIX', displayName: 'VIX', yahooSymbol: '^VIX', price: 14.5, changePct1d: -2.1, trend: 'falling', regimeTag: 'Risk stress', meta: equityMeta },
      { symbol: 'US10Y', displayName: '10Y yield', yahooSymbol: '^TNX', price: 4.42, changePct1d: 1.1, trend: 'rising', regimeTag: 'Discount rate / multiples', meta: treasuryMeta },
      { symbol: 'DXY', displayName: 'Dollar index', yahooSymbol: 'DX-Y.NYB', price: 104.1, changePct1d: 0.12, trend: 'flat', regimeTag: 'Dollar liquidity / global pressure', meta: equityMeta },
      { symbol: 'BTC', displayName: 'Bitcoin', yahooSymbol: 'BTC-USD', price: 98500, changePct1d: -0.35, trend: 'flat', regimeTag: 'Risk appetite / liquidity proxy', meta: equityMeta },
      { symbol: 'GC', displayName: 'Gold futures', yahooSymbol: 'GC=F', price: 3020, changePct1d: 0.42, trend: 'rising', regimeTag: 'Safety / inflation hedge', meta: equityMeta },
      { symbol: 'CL', displayName: 'WTI crude', yahooSymbol: 'CL=F', price: 71.2, changePct1d: -0.8, trend: 'falling', regimeTag: 'Growth / inflation / geopolitical', meta: equityMeta },
    ],

    watchlist: [
      { symbol: 'SPX',  name: 'S&P 500',             category: 'index',   price: 5305,   change1d: 0.4,  changePct1d: 0.4,  trend: 'rising',  status: 'watch',     meta: equityMeta },
      { symbol: 'NDX',  name: 'Nasdaq 100',           category: 'index',   price: 18742,  change1d: 0.6,  changePct1d: 0.6,  trend: 'rising',  status: 'stable',    meta: equityMeta },
      { symbol: 'RUT',  name: 'Russell 2000',         category: 'index',   price: 2074,   change1d: -0.3, changePct1d: -0.3, trend: 'falling', status: 'watch',     meta: equityMeta },
      { symbol: 'SPY',  name: 'SPDR S&P 500 ETF',     category: 'etf',     price: 527.8,  change1d: 0.4,  changePct1d: 0.4,  trend: 'rising',  status: 'stable',    meta: equityMeta },
      { symbol: 'QQQ',  name: 'Invesco QQQ',          category: 'etf',     price: 455.2,  change1d: 0.6,  changePct1d: 0.6,  trend: 'rising',  status: 'stable',    meta: equityMeta },
      { symbol: 'IWM',  name: 'iShares Russell 2000', category: 'etf',     price: 206.4,  change1d: -0.3, changePct1d: -0.3, trend: 'falling', status: 'watch',     meta: equityMeta },
      { symbol: 'HYG',  name: 'iShares HY Corp Bond', category: 'etf',     price: 76.8,   change1d: -0.2, changePct1d: -0.2, trend: 'falling', status: 'watch', alert: { severity: 'watch', message: 'HY spread creeping wider — credit deterioration watch' }, meta: equityMeta },
      { symbol: 'TLT',  name: 'iShares 20Y Treasury', category: 'etf',     price: 88.4,   change1d: -0.6, changePct1d: -0.6, trend: 'falling', status: 'elevated',  meta: equityMeta },
      { symbol: 'GLD',  name: 'SPDR Gold Shares',     category: 'etf',     price: 224.7,  change1d: 0.3,  changePct1d: 0.3,  trend: 'rising',  status: 'stable',    meta: equityMeta },
      { symbol: 'US10Y',name: '10Y Treasury Yield',   category: 'rate',    price: 4.55,   change1d: 0.05, changePct1d: 1.1,  trend: 'rising',  status: 'elevated', alert: { severity: 'watch', message: 'Yield approaching 4.60% — rate shock risk' }, meta: treasuryMeta },
      { symbol: 'US2Y', name: '2Y Treasury Yield',    category: 'rate',    price: 4.95,   change1d: 0.02, changePct1d: 0.4,  trend: 'rising',  status: 'elevated',  meta: treasuryMeta },
      { symbol: 'VIX',  name: 'CBOE VIX',             category: 'vol',     price: 13.2,   change1d: -0.8, changePct1d: -5.7, trend: 'falling', status: 'stable',    meta: equityMeta },
      { symbol: 'MOVE', name: 'ICE BofA MOVE Index',  category: 'vol',     price: 104.5,  change1d: 1.2,  changePct1d: 1.2,  trend: 'rising',  status: 'watch',     meta: derivedMeta },
    ],

    dataQuality: {
      fredAvailable:   true,
      marketAvailable: true,
      aiAvailable:     false,
      overallStatus:   'partial' as const,
    },

    alerts: [
      {
        id: 'alert-001',
        severity: 'watch',
        title: '10Y Yield Rising — Approaching Key Level',
        explanation: '10Y Treasury yield has risen 14bps this week to 4.55%. A sustained break above 4.60% would tighten financial conditions materially and risk re-rating equity multiples.',
        affectedModules: ['Treasury & Rates', 'Liquidity', 'Market Trend'],
        watchItems: ['US10Y at 4.60%', 'SPX response to 10Y move', 'VIX for vol expansion'],
        createdAt: now,
        acknowledged: false,
      },
      {
        id: 'alert-002',
        severity: 'watch',
        title: 'Breadth Divergence — Equal Weight Lagging',
        explanation: 'RSP/SPY ratio has declined for 5 consecutive sessions. SPX making new highs while equal-weight underperforms indicates narrow mega-cap leadership. This is a structural warning.',
        affectedModules: ['Market Breadth', 'Market Trend', 'Flows'],
        watchItems: ['RSP/SPY ratio', '52-week new highs', 'Sector breadth > 60%'],
        createdAt: now,
        acknowledged: false,
      },
      {
        id: 'alert-003',
        severity: 'info',
        title: 'Key Macro Event: CPI Release June 12',
        explanation: 'May CPI report due June 12. Current consensus: 3.3% YoY. A print at 3.2% or below could re-accelerate rate cut expectations. A print above 3.5% could push back cut timeline to December.',
        affectedModules: ['Macro', 'Fed & Policy', 'Executive Summary'],
        watchItems: ['CPI headline', 'Core CPI', 'Market implied path shift'],
        createdAt: now,
        acknowledged: false,
      },
    ],
  }
}
