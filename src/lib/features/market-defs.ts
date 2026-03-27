// Watchlist + cross-asset strip definitions (Yahoo tickers only — no server fetch).
import { YF_SYMBOLS } from '@/lib/sources/yahoo-symbols'
import type { WatchlistItem } from '@/lib/types'

export const CROSS_ASSET_DEFS: {
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

export const WATCHLIST_ROW_DEFS: readonly {
  symbol: string
  name: string
  category: WatchlistItem['category']
  sym: string
}[] = [
  { symbol: 'SPX',   name: 'S&P 500',               category: 'index',  sym: YF_SYMBOLS.SPX },
  { symbol: 'NDX',   name: 'Nasdaq 100',           category: 'index',  sym: YF_SYMBOLS.NDX },
  { symbol: 'RUT',   name: 'Russell 2000',         category: 'index',  sym: YF_SYMBOLS.RUT },
  { symbol: 'VIX',   name: 'CBOE Volatility Index', category: 'vol',    sym: YF_SYMBOLS.VIX },
  { symbol: 'SPY',   name: 'SPDR S&P 500 ETF',     category: 'etf',    sym: YF_SYMBOLS.SPY },
  { symbol: 'QQQ',   name: 'Invesco QQQ ETF',      category: 'etf',    sym: YF_SYMBOLS.QQQ },
  { symbol: 'IWM',   name: 'iShares Russell 2000', category: 'etf',    sym: YF_SYMBOLS.IWM },
  { symbol: 'RSP',   name: 'Invesco Equal-Wt S&P', category: 'etf',    sym: YF_SYMBOLS.RSP },
  { symbol: 'TLT',   name: '20Y Treasury ETF',     category: 'etf',    sym: YF_SYMBOLS.TLT },
  { symbol: 'HYG',   name: 'HY Corp Bond ETF',     category: 'etf',    sym: YF_SYMBOLS.HYG },
  { symbol: 'LQD',   name: 'IG Corp Bond ETF',     category: 'etf',    sym: YF_SYMBOLS.LQD },
  { symbol: 'GLD',   name: 'SPDR Gold Shares',     category: 'etf',    sym: YF_SYMBOLS.GLD },
  { symbol: 'XLK',   name: 'Technology',           category: 'etf',    sym: YF_SYMBOLS.XLK },
  { symbol: 'XLC',   name: 'Comm Svc',             category: 'etf',    sym: YF_SYMBOLS.XLC },
  { symbol: 'XLF',   name: 'Financials',           category: 'etf',    sym: YF_SYMBOLS.XLF },
  { symbol: 'XLV',   name: 'Healthcare',           category: 'etf',    sym: YF_SYMBOLS.XLV },
  { symbol: 'XLE',   name: 'Energy',               category: 'etf',    sym: YF_SYMBOLS.XLE },
  { symbol: 'XLI',   name: 'Industrials',          category: 'etf',    sym: YF_SYMBOLS.XLI },
  { symbol: 'XLB',   name: 'Materials',            category: 'etf',    sym: YF_SYMBOLS.XLB },
  { symbol: 'XLRE',  name: 'Real Estate',          category: 'etf',    sym: YF_SYMBOLS.XLRE },
  { symbol: 'XLU',   name: 'Utilities',            category: 'etf',    sym: YF_SYMBOLS.XLU },
  { symbol: 'XLP',   name: 'Staples',              category: 'etf',    sym: YF_SYMBOLS.XLP },
  { symbol: 'XLY',   name: 'Discretionary',        category: 'etf',    sym: YF_SYMBOLS.XLY },
]
