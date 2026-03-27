// ============================================================
// PLACEHOLDER MODULE DATA
// Used when real data sources are unavailable or not yet integrated.
// All values explicitly labeled as unavailable / inferred.
// ============================================================

import { makeMeta, SOURCES } from '@/lib/sources/types'
import type {
  FedPolicyModule,
  TreasuryModule,
  MacroModule,
  LiquidityModule,
  RetailModule,
  OrganicVolumeModule,
  OptionsModule,
  InternalsModule,
  CollarModule,
  TopLevelBriefing,
  MetricValue,
  TimeSeries,
} from '@/lib/types'
import type { MarketSnapshot } from '@/lib/features/market'

const now = () => new Date().toISOString()

function unavailableMV(unit: string, note: string): MetricValue {
  return {
    value:     null,
    prior:     null,
    change:    null,
    changePct: null,
    unit,
    formatted: `—`,
    trend:     'flat',
    meta:      makeMeta({
      ...SOURCES.DERIVED_ENGINE,
      dataClass:  'derived',
      confidence: 'unavailable',
      caveat:     note,
    }),
  }
}

function emptyTS(key: string, label: string): TimeSeries {
  return { key, label, data: [], meta: makeMeta(SOURCES.DERIVED_ENGINE) }
}

// ---- Module placeholders ----

function placeholderFed(): FedPolicyModule {
  const meta = makeMeta({
    ...SOURCES.FRED,
    isFallback: true,
    fetchError: 'FRED_API_KEY not configured',
  })
  const mv = (unit: string) => unavailableMV(unit, 'FRED_API_KEY required')
  return {
    fedFundsTarget:    { lower: 0, upper: 0 },
    iorb:              mv('%'),
    onRrp:             mv('$T'),
    discountRate:      mv('%'),
    balanceSheet:      mv('$T'),
    qtMonthly:         mv('$T/mo'),
    nextFomcDate:      '',
    daysToFomc:        null,
    lastFomcDate:      '',
    marketImpliedPath: [],
    policyStance:      'ambiguous',
    liquidityImplication:'neutral',
    trendDrift:        'stable',
    meta,
  }
}

function placeholderTreasury(): TreasuryModule {
  const mv = (u: string) => unavailableMV(u, 'FRED_API_KEY required')
  return {
    curve: {
      m3:    mv('%'), y1: mv('%'), y2: mv('%'),
      y5:    mv('%'), y10:mv('%'), y30:mv('%'),
      tip5y: mv('%'), tip10y: mv('%'),
    },
    spreads: {
      twoTen:    mv('bps'),
      twoThirty: mv('bps'),
      threeMTen: mv('bps'),
    },
    curveRegime:    'normalizing',
    supplyPressure: 'moderate',
    bondsVsEquities:'neutral',
    ratesRegime:    'range-bound',
    meta: makeMeta({ ...SOURCES.FRED, isFallback: true, fetchError: 'FRED_API_KEY not configured' }),
  }
}

function placeholderLiquidity(): LiquidityModule {
  const mv = (u: string) => unavailableMV(u, 'FRED_API_KEY required')
  return {
    sofr:             mv('%'),
    reserveBalances:  mv('$T'),
    onRrpUsage:       mv('$T'),
    qtTrend:          'flat',
    fciAdjusted:      mv('index'),
    fciChicago:       mv('index'),
    recessionProb:    mv('%'),
    hySpread:         mv('bps'),
    igSpread:         mv('bps'),
    vix:              mv('index'),
    creditStress:     'moderate',
    volStress:        'moderate',
    liquidityStance:  'neutral',
    trend:            'stable',
    vulnerabilityScore: 50,
    meta: makeMeta({ ...SOURCES.FRED, isFallback: true, fetchError: 'FRED_API_KEY not configured' }),
  }
}

function placeholderMacro(): MacroModule {
  const release = (name: string) => ({
    name, actual: null, expected: null, prior: null, surprise: null, date: '', period: 'Unavailable',
  })
  return {
    cpi:           release('CPI YoY'),
    pce:           release('Core PCE MoM'),
    payrolls:      release('Nonfarm Payrolls'),
    unemployment:  release('Unemployment Rate'),
    joblessClaims: release('Initial Claims'),
    retailSales:   release('Retail Sales'),
    gdp:           release('GDP QoQ'),
    ismMfg:        release('ISM Mfg PMI'),
    ismSvc:        release('ISM Svc PMI'),
    growthTrend:   'stable',
    inflationTrend:'stable',
    laborTrend:    'softening',
    surpriseRegime:'neutral',
    nextCatalyst:  {
      name: 'Macro calendar',
      date: '',
      importance: 'low',
      unavailableReason: 'FRED unavailable — update MACRO_RELEASES when API is configured.',
    },
    meta: makeMeta({ ...SOURCES.BLS, isFallback: true, fetchError: 'FRED_API_KEY not configured' }),
  }
}

function placeholderMarket(): MarketSnapshot {
  const emptyIndex = {
    symbol: '—',
    price: null as null,
    change1d: null as null,
    change1w: null,
    pctFrom20d: null,
    pctFrom50d: null,
    pctFrom200d: null,
    trend: 'flat' as const,
  }
  const mv = (u: string) => unavailableMV(u, 'Yahoo Finance unavailable')
  return {
    breadth: {
      spx: emptyIndex,
      ndx: emptyIndex,
      rut: emptyIndex,
      ewsVsCap:     mv('ratio'),
      advDecLine:   mv('net'),
      upVsDownVol:  mv('ratio'),
      newHighs52w:  mv('count'),
      newLows52w:   mv('count'),
      sectorBreadth:[],
      tapeQuality:  'mixed',
      participation:'narrow',
      breadthConfirmed: false,
      meta: makeMeta({ ...SOURCES.YAHOO_FINANCE, isFallback: true }),
    },
    flows: {
      etfDollarVolume:   mv('$B'),
      futuresPressure:   'neutral',
      optionsPremiumFlow:'balanced',
      offExchangeShare:  mv('%'),
      blockIntensity:    mv('%'),
      sectorRotation:    [],
      overallPressure:   'mixed',
      demandType:        'mixed',
      meta: makeMeta({ ...SOURCES.INFERRED_ENGINE, isFallback: true }),
    },
    watchlist: [],
    crossAsset: [],
  }
}

function placeholderRetail(): RetailModule {
  const mv = (u: string) => unavailableMV(u, 'No real-time retail data source configured')
  return {
    participationLevel: 'low',
    fractionalProxy:    mv('index'),
    oddLotProxy:        mv('%'),
    retailOptionsProxy: mv('put/call'),
    confidence:         'low',
    caveat:             'Retail flow data requires a premium data provider (e.g., Snowflake Data Marketplace, Vanda Research). All metrics are unavailable until a source is connected.',
    meta: makeMeta({ ...SOURCES.INFERRED_ENGINE }),
  }
}

function placeholderOrganic(): OrganicVolumeModule {
  const mv = (u: string) => unavailableMV(u, 'Requires consolidated tape tick data')
  return {
    totalVolume:         mv('B shares'),
    auctionVolume:       mv('B shares'),
    mechanicalWindow:    mv('B shares'),
    adjustedOrganic:     mv('B shares'),
    organicScore:        50,
    isMechanical:        false,
    tapeQualityScore:    50,
    priceActionSupported:true,
    meta: makeMeta({ ...SOURCES.DERIVED_ENGINE, caveat: 'Organic volume requires consolidated tape. Not available without real-time feed.' }),
  }
}

function placeholderOptions(): OptionsModule {
  return {
    structureAvailable: false,
    greeksAvailable:    false,
    putWall:   null,
    callWall:  null,
    zeroGamma: null,
    gammaLevels: [],
    dealerPositioning:   'neutral',
    pinningRisk:         'moderate',
    airPocketRisk:       'moderate',
    breakoutSensitivity: 'moderate',
    keyExpiries:         [],
    meta: makeMeta({
      ...SOURCES.CBOE,
      isFallback: true,
      fetchError:  'Options positioning requires OPRA/OCC data. Connect Polygon.io or a licensed options analytics provider.',
    }),
  }
}

function placeholderInternals(): InternalsModule {
  return {
    advDecLine:           emptyTS('adv-dec', 'A/D Line'),
    upDownVolRatio:       emptyTS('updn-vol', 'Up/Down Vol'),
    vwapParticipation:    emptyTS('vwap', 'VWAP Participation'),
    sectorBreadthIntraday:[],
    openingGapFollowThrough:'neutral',
    internalsConfirmPrice:   false,
    momentumDirection:       'stable',
    meta: makeMeta({ ...SOURCES.DERIVED_ENGINE, caveat: 'Intraday internals require real-time breadth feed from NYSE or Nasdaq.' }),
  }
}

function placeholderCollar(): CollarModule {
  return {
    isActive:          false,
    estimatedPutZone:  null,
    estimatedCallZone: null,
    nextRollWindow:    null,
    spotRelative:      'unknown',
    influenceActive:   false,
    confidence:        'low',
    caveat:            'JPM collar positions are inferred from public OI patterns. Not confirmed. Confidence is LOW. Do not treat as primary signal.',
    meta: makeMeta({ ...SOURCES.INFERRED_ENGINE }),
  }
}

function placeholderBriefing(): TopLevelBriefing {
  const now_ = now()
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString()
  return {
    regime:       'Awaiting AI analysis',
    why:          'Call /api/ai/summary with a RegimeSummaryPacket to generate the executive brief.',
    whatChanged:  '',
    whatConfirms: '',
    whatBreaks:   '',
    watchNext:    '',
    fullBrief:    'AI briefing not yet generated. Configure ANTHROPIC_API_KEY and call /api/ai/summary.',
    cachedAt:     now_,
    expiresAt:    expires,
  }
}

// ---- Main export ----

export function buildPlaceholders() {
  return {
    fed:       placeholderFed(),
    treasury:  placeholderTreasury(),
    liquidity: placeholderLiquidity(),
    macro:     placeholderMacro(),
    market:    placeholderMarket(),
    retail:    placeholderRetail(),
    organic:   placeholderOrganic(),
    options:   placeholderOptions(),
    internals: placeholderInternals(),
    collar:    placeholderCollar(),
    briefing:  placeholderBriefing(),
  }
}
