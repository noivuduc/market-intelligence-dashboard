// ============================================================
// MARKET DATA FEATURE AGGREGATOR
// Transforms Yahoo Finance quotes into market state modules.
// ============================================================

import { fetchQuotes, fetchHistory, YF_SYMBOLS } from '@/lib/sources/yahoo'
import { makeMeta, SOURCES } from '@/lib/sources/types'
import type {
  BreadthModule,
  CrossAssetItem,
  FlowsModule,
  MetricValue,
  TrendDirection,
  IndexTrend,
  WatchlistItem,
} from '@/lib/types'
import { sessionChangeFromCloses } from '@/lib/market/sessionChange'

// ---- Cross-asset strip (institutional situational tape) ----
const CROSS_ASSET_DEFS: {
  symbol: string
  displayName: string
  yahooSymbol: string
  regimeTag: string
}[] = [
  { symbol: 'SPX', displayName: 'S&P 500', yahooSymbol: YF_SYMBOLS.SPX, regimeTag: 'Broad U.S. equity / risk tether' },
  { symbol: 'NDX', displayName: 'Nasdaq 100', yahooSymbol: YF_SYMBOLS.NDX, regimeTag: 'Growth & liquidity tilt' },
  { symbol: 'RUT', displayName: 'Russell 2000', yahooSymbol: YF_SYMBOLS.RUT, regimeTag: 'Small-cap / breadth' },
  { symbol: 'VIX', displayName: 'VIX', yahooSymbol: YF_SYMBOLS.VIX, regimeTag: 'Risk stress' },
  { symbol: 'US10Y', displayName: '10Y yield', yahooSymbol: YF_SYMBOLS.US10Y, regimeTag: 'Discount rate / multiples' },
  { symbol: 'DXY', displayName: 'Dollar index', yahooSymbol: YF_SYMBOLS.DXY, regimeTag: 'Dollar liquidity / global pressure' },
  { symbol: 'BTC', displayName: 'Bitcoin', yahooSymbol: YF_SYMBOLS.BTC, regimeTag: 'Risk appetite / liquidity proxy' },
  { symbol: 'GC', displayName: 'Gold futures', yahooSymbol: YF_SYMBOLS.GOLD_FUT, regimeTag: 'Safety / inflation hedge' },
  { symbol: 'CL', displayName: 'WTI crude', yahooSymbol: YF_SYMBOLS.OIL_FUT, regimeTag: 'Growth / inflation / geopolitical' },
]

// ---- Helpers ----

function trend(changePct: number | null): TrendDirection {
  const c = changePct ?? 0
  if (c >  0.1) return 'rising'
  if (c < -0.1) return 'falling'
  return 'flat'
}

function makeIndexTrend(
  symbol: string,
  price:  number,
  prev:   number,
  high52w: number,
  low52w:  number,
): IndexTrend {
  let changePct: number | null = null
  if (Number.isFinite(prev) && prev !== 0 && Number.isFinite(price)) {
    changePct = ((price - prev) / Math.abs(prev)) * 100
  }
  const range52 =
    Number.isFinite(high52w) && Number.isFinite(low52w) ? high52w - low52w : 0
  const midPoint = low52w + range52 * 0.5
  let pctFromMid = 0
  if (range52 > 0 && Number.isFinite(price) && Number.isFinite(midPoint) && midPoint !== 0) {
    pctFromMid = ((price - midPoint) / midPoint) * 100
  }
  if (!Number.isFinite(pctFromMid)) pctFromMid = 0

  return {
    symbol,
    price: Number.isFinite(price) ? price : null,
    change1d:    changePct,
    change1w:    null,
    pctFrom20d:  null,
    pctFrom50d:  null,
    pctFrom200d: null,
    trend:       trend(changePct),
  }
}

function mv(
  curr: number | null,
  prev: number | null,
  unit: string,
  fmt: (v: number) => string,
  meta = makeMeta(SOURCES.YAHOO_FINANCE),
): MetricValue {
  if (curr === null) return { value: null, prior: null, change: null, changePct: null, unit, formatted: '—', trend: 'flat', meta }
  const change = prev !== null ? curr - prev : null
  const changePct = (prev !== null && prev !== 0) ? (change! / Math.abs(prev)) * 100 : null
  const t: TrendDirection = change == null ? 'flat' : change > 0 ? 'rising' : change < 0 ? 'falling' : 'flat'
  return { value: curr, prior: prev, change, changePct, unit, formatted: fmt(curr), trend: t, meta }
}

// ---- Main: build market module from live quotes ----

export interface MarketSnapshot {
  breadth:    BreadthModule
  flows:      FlowsModule
  watchlist:  WatchlistItem[]
  crossAsset: CrossAssetItem[]
}

const INDEX_SYMS = [
  YF_SYMBOLS.SPX,
  YF_SYMBOLS.NDX,
  YF_SYMBOLS.RUT,
  YF_SYMBOLS.VIX,
]

const ETF_SYMS = [
  YF_SYMBOLS.SPY,
  YF_SYMBOLS.QQQ,
  YF_SYMBOLS.IWM,
  YF_SYMBOLS.RSP,
  YF_SYMBOLS.TLT,
  YF_SYMBOLS.HYG,
  YF_SYMBOLS.LQD,
  YF_SYMBOLS.GLD,
  YF_SYMBOLS.XLK,
  YF_SYMBOLS.XLC,
  YF_SYMBOLS.XLF,
  YF_SYMBOLS.XLV,
  YF_SYMBOLS.XLE,
  YF_SYMBOLS.XLI,
  YF_SYMBOLS.XLB,
  YF_SYMBOLS.XLRE,
  YF_SYMBOLS.XLU,
  YF_SYMBOLS.XLP,
  YF_SYMBOLS.XLY,
]

export async function buildMarketSnapshot(): Promise<MarketSnapshot> {
  const crossSyms = CROSS_ASSET_DEFS.map(d => d.yahooSymbol)
  const allSyms = [...new Set([...INDEX_SYMS, ...ETF_SYMS, ...crossSyms])]
  const results = await fetchQuotes(allSyms)

  const bySymbol = Object.fromEntries(
    results.map(r => [r.symbol, r.quote])
  )

  function q(sym: string) { return bySymbol[sym] }

  const spx  = q(YF_SYMBOLS.SPX)
  const ndx  = q(YF_SYMBOLS.NDX)
  const rut  = q(YF_SYMBOLS.RUT)
  const spy  = q(YF_SYMBOLS.SPY)
  const rsp  = q(YF_SYMBOLS.RSP)
  const vix  = q(YF_SYMBOLS.VIX)
  const yahooMeta = makeMeta(SOURCES.YAHOO_FINANCE)
  const derivedMeta = makeMeta(SOURCES.DERIVED_ENGINE)
  const inferredMeta = makeMeta(SOURCES.INFERRED_ENGINE)

  // ---- SPX / NDX / RUT index trends ----
  const spxTrend: IndexTrend = spx
    ? makeIndexTrend('^GSPC', spx.price, spx.previousClose, spx.high52w, spx.low52w)
    : { symbol: '^GSPC', price: null, change1d: null, change1w: null, pctFrom20d: null, pctFrom50d: null, pctFrom200d: null, trend: 'flat' }

  const ndxTrend: IndexTrend = ndx
    ? makeIndexTrend('^NDX', ndx.price, ndx.previousClose, ndx.high52w, ndx.low52w)
    : { symbol: '^NDX', price: null, change1d: null, change1w: null, pctFrom20d: null, pctFrom50d: null, pctFrom200d: null, trend: 'flat' }

  const rutTrend: IndexTrend = rut
    ? makeIndexTrend('^RUT', rut.price, rut.previousClose, rut.high52w, rut.low52w)
    : { symbol: '^RUT', price: null, change1d: null, change1w: null, pctFrom20d: null, pctFrom50d: null, pctFrom200d: null, trend: 'flat' }

  // ---- RSP/SPY ratio (equal-weight vs cap-weight) ----
  const ewRatio     = (rsp && spy && spy.price > 0) ? rsp.price / spy.price : null
  const ewRatioPrev = (rsp && spy && spy.previousClose > 0) ? (rsp.previousClose / spy.previousClose) : null
  const ewsVsCap    = mv(ewRatio, ewRatioPrev, 'ratio', v => `RSP/SPY ${v.toFixed(3)}`, yahooMeta)

  // ---- Derive sector breadth from sector ETF performance ----
  const sectorETFs: { sector: string; sym: string }[] = [
    { sector: 'Tech',          sym: YF_SYMBOLS.XLK },
    { sector: 'Comm Svc',      sym: YF_SYMBOLS.XLC },
    { sector: 'Financials',    sym: YF_SYMBOLS.XLF },
    { sector: 'Health',        sym: YF_SYMBOLS.XLV },
    { sector: 'Energy',        sym: YF_SYMBOLS.XLE },
    { sector: 'Industrials',   sym: YF_SYMBOLS.XLI },
    { sector: 'Materials',     sym: YF_SYMBOLS.XLB },
    { sector: 'Real Estate',   sym: YF_SYMBOLS.XLRE },
    { sector: 'Utilities',     sym: YF_SYMBOLS.XLU },
    { sector: 'Staples',       sym: YF_SYMBOLS.XLP },
    { sector: 'Discretionary', sym: YF_SYMBOLS.XLY },
  ]

  const sectorBreadth = sectorETFs.map(({ sector, sym }) => {
    const etfQ = q(sym)
    let pctAbove50d = 50
    if (etfQ) {
      const range = etfQ.high52w - etfQ.low52w
      if (range > 0) {
        const positionInRange = (etfQ.price - etfQ.low52w) / range
        pctAbove50d = Math.round(positionInRange * 80 + 10)
      }
    }
    return { sector, pctAbove50d }
  }).sort((a, b) => b.pctAbove50d - a.pctAbove50d)

  const advancingSectors = sectorBreadth.filter(s => s.pctAbove50d >= 55).length
  const declingSectors   = sectorBreadth.filter(s => s.pctAbove50d <= 45).length

  const spxChange = spx?.changePct
  const spxTape = spxChange != null && Number.isFinite(spxChange) ? spxChange : 0
  const rutLagging = rut && spx
    ? ((rut.changePct ?? 0) - (spx.changePct ?? 0)) < -1.0
    : false
  const ewLagging  = ewRatio && ewRatioPrev ? ewRatio < ewRatioPrev * 0.998 : false

  const tapeQuality: BreadthModule['tapeQuality'] =
    spxTape > 0.5 && !rutLagging && !ewLagging ? 'healthy-rally' :
    spxTape > 0.1 && (rutLagging || ewLagging)  ? 'weak-rally' :
    spxTape < -0.5 && declingSectors >= 7        ? 'broad-selloff' :
    spxTape < -0.1 && declingSectors >= 5        ? 'fragile-selloff' : 'mixed'

  const participation: BreadthModule['participation'] =
    advancingSectors >= 7 ? 'broad' :
    advancingSectors >= 5 ? 'improving' :
    advancingSectors <= 3 ? 'narrow' : 'deteriorating'

  const breadthConfirmed = !rutLagging && !ewLagging && advancingSectors >= 6

  const breadth: BreadthModule = {
    spx: spxTrend,
    ndx: ndxTrend,
    rut: rutTrend,
    ewsVsCap,
    advDecLine:   mv(advancingSectors - declingSectors, null, 'net', v => `${v > 0 ? '+' : ''}${v.toFixed(0)}`, derivedMeta),
    upVsDownVol:  mv(null, null, 'ratio', v => `${v.toFixed(2)}x`, derivedMeta),
    newHighs52w:  mv(null, null, 'count', v => v.toFixed(0), derivedMeta),
    newLows52w:   mv(null, null, 'count', v => v.toFixed(0), derivedMeta),
    sectorBreadth,
    tapeQuality,
    participation,
    breadthConfirmed,
    meta: yahooMeta,
  }

  const overallPressure: FlowsModule['overallPressure'] =
    spxTape > 0.5 ? 'buying' : spxTape < -0.5 ? 'selling' : 'mixed'

  const flows: FlowsModule = {
    etfFlowProxy:       mv(spy ? spy.volume * spy.price / 1e9 : null, null, '$B', v => `~$${v.toFixed(1)}B`, inferredMeta),
    futuresPressure:    spxTape > 0.3 ? 'buying' : spxTape < -0.3 ? 'selling' : 'neutral',
    optionsPremiumFlow: 'balanced',
    offExchangeShare:   mv(null, null, '%', v => `${v.toFixed(1)}%`, inferredMeta),
    blockIntensity:     mv(null, null, '%', v => `${v.toFixed(1)}%`, inferredMeta),
    sectorRotation:     [],
    overallPressure,
    demandType:         'mixed',
    meta:               inferredMeta,
  }

  const watchlistSymbols = [
    { symbol: 'SPX',   name: 'S&P 500',              category: 'index'  as const, sym: YF_SYMBOLS.SPX },
    { symbol: 'NDX',   name: 'Nasdaq 100',            category: 'index'  as const, sym: YF_SYMBOLS.NDX },
    { symbol: 'RUT',   name: 'Russell 2000',          category: 'index'  as const, sym: YF_SYMBOLS.RUT },
    { symbol: 'VIX',   name: 'CBOE Volatility Index', category: 'vol'    as const, sym: YF_SYMBOLS.VIX },
    { symbol: 'SPY',   name: 'SPDR S&P 500 ETF',      category: 'etf'    as const, sym: YF_SYMBOLS.SPY },
    { symbol: 'QQQ',   name: 'Invesco QQQ ETF',       category: 'etf'    as const, sym: YF_SYMBOLS.QQQ },
    { symbol: 'IWM',   name: 'iShares Russell 2000',  category: 'etf'    as const, sym: YF_SYMBOLS.IWM },
    { symbol: 'RSP',   name: 'Invesco Equal-Wt S&P',  category: 'etf'    as const, sym: YF_SYMBOLS.RSP },
    { symbol: 'TLT',   name: '20Y Treasury ETF',      category: 'etf'    as const, sym: YF_SYMBOLS.TLT },
    { symbol: 'HYG',   name: 'HY Corp Bond ETF',      category: 'etf'    as const, sym: YF_SYMBOLS.HYG },
    { symbol: 'LQD',   name: 'IG Corp Bond ETF',      category: 'etf'    as const, sym: YF_SYMBOLS.LQD },
    { symbol: 'GLD',   name: 'SPDR Gold Shares',      category: 'etf'    as const, sym: YF_SYMBOLS.GLD },
    { symbol: 'XLK',   name: 'Technology',            category: 'etf'    as const, sym: YF_SYMBOLS.XLK },
    { symbol: 'XLF',   name: 'Financials',            category: 'etf'    as const, sym: YF_SYMBOLS.XLF },
    { symbol: 'XLE',   name: 'Energy',                category: 'etf'    as const, sym: YF_SYMBOLS.XLE },
    { symbol: 'XLV',   name: 'Healthcare',            category: 'etf'    as const, sym: YF_SYMBOLS.XLV },
    { symbol: 'XLRE',  name: 'Real Estate',           category: 'etf'    as const, sym: YF_SYMBOLS.XLRE },
    { symbol: 'XLU',   name: 'Utilities',             category: 'etf'    as const, sym: YF_SYMBOLS.XLU },
  ]

  const sparkSymbols = [...new Set([
    ...watchlistSymbols.map(w => w.sym),
    ...crossSyms,
  ])]

  const sparklineEntries = await Promise.all(
    sparkSymbols.map(async sym => {
      try {
        const bars = await fetchHistory(sym, '5d', '1d')
        const closes = bars
          .map(b => b.close)
          .filter((c): c is number => c != null && Number.isFinite(c))
        if (closes.length < 2) return [sym, undefined] as const
        return [sym, closes.slice(-5)] as const
      } catch {
        return [sym, undefined] as const
      }
    }),
  )
  const sparkBySym: Record<string, number[] | undefined> = Object.fromEntries(sparklineEntries)

  const watchlist: WatchlistItem[] = watchlistSymbols.map(({ symbol, name, category, sym }) => {
    const quote = q(sym)
    const closes = sparkBySym[sym] ?? []
    const hist = sessionChangeFromCloses(closes)
    let changePct1d = hist.changePct
    let change1d = hist.changeAbs
    if (changePct1d == null && quote && quote.previousClose > 0 && Number.isFinite(quote.price)) {
      changePct1d = ((quote.price - quote.previousClose) / quote.previousClose) * 100
      change1d = quote.price - quote.previousClose
    }
    return {
      symbol,
      name,
      category,
      price:       quote?.price ?? null,
      change1d,
      changePct1d,
      trend:       trend(changePct1d),
      status:      deriveStatus(changePct1d, category, vix?.price ?? 15),
      meta:        yahooMeta,
      sparkline:   sparkBySym[sym],
    }
  })

  const crossAsset: CrossAssetItem[] = CROSS_ASSET_DEFS.map(def => {
    const quote = q(def.yahooSymbol)
    const closes = sparkBySym[def.yahooSymbol] ?? []
    const hist = sessionChangeFromCloses(closes)
    let changePct1d = hist.changePct
    if (changePct1d == null && quote && quote.previousClose > 0 && Number.isFinite(quote.price)) {
      changePct1d = ((quote.price - quote.previousClose) / quote.previousClose) * 100
    }
    return {
      symbol:      def.symbol,
      displayName: def.displayName,
      yahooSymbol: def.yahooSymbol,
      price:       quote?.price ?? null,
      changePct1d,
      trend:       trend(changePct1d),
      regimeTag:   def.regimeTag,
      sparkline:   sparkBySym[def.yahooSymbol],
      meta:        yahooMeta,
    }
  })

  return { breadth, flows, watchlist, crossAsset }
}

function deriveStatus(
  changePct: number | null,
  category:  WatchlistItem['category'],
  vixLevel:  number,
): WatchlistItem['status'] {
  if (category === 'vol') {
    if (vixLevel > 25) return 'elevated'
    if (vixLevel > 20) return 'watch'
    return 'stable'
  }
  if (changePct == null || !Number.isFinite(changePct)) return 'stable'
  if (Math.abs(changePct) > 2.5)  return 'critical'
  if (Math.abs(changePct) > 1.5)  return 'elevated'
  if (Math.abs(changePct) > 0.75) return 'watch'
  return 'stable'
}
