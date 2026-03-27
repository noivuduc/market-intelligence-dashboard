// ============================================================
// Yahoo symbol strings only — safe for client bundles (no yahoo-finance2).
// ============================================================

export const YF_SYMBOLS = {
  // Indices
  SPX:  '^GSPC',
  /** SPX index options chain on Yahoo v7/options (not the same as ^GSPC spot index) */
  SPX_OPTIONS: '^SPX',
  NDX:  '^NDX',
  DJI:  '^DJI',
  RUT:  '^RUT',
  VIX:  '^VIX',
  MOVE: '^MOVE',  // May not be on Yahoo

  // Broad ETFs
  SPY:  'SPY',
  QQQ:  'QQQ',
  IWM:  'IWM',
  DIA:  'DIA',
  RSP:  'RSP',   // Equal-weight S&P 500
  MDY:  'MDY',   // Mid cap

  // Sector ETFs
  XLK:  'XLK',   // Tech
  XLC:  'XLC',   // Communication
  XLF:  'XLF',   // Financials
  XLV:  'XLV',   // Healthcare
  XLE:  'XLE',   // Energy
  XLI:  'XLI',   // Industrials
  XLB:  'XLB',   // Materials
  XLRE: 'XLRE',  // Real Estate
  XLU:  'XLU',   // Utilities
  XLP:  'XLP',   // Staples
  XLY:  'XLY',   // Discretionary

  // Fixed income
  TLT:  'TLT',   // 20Y Treasury
  IEF:  'IEF',   // 7-10Y Treasury
  SHY:  'SHY',   // 1-3Y Treasury
  HYG:  'HYG',   // HY corp bonds
  LQD:  'LQD',   // IG corp bonds
  BND:  'BND',   // Total bond

  // Commodities / safe havens
  GLD:  'GLD',
  SLV:  'SLV',
  USO:  'USO',
  BTC:  'BTC-USD',
  GOLD_FUT: 'GC=F',
  OIL_FUT:  'CL=F',
  DXY:  'DX-Y.NYB',
  US10Y: '^TNX',

  // Vol
  SVXY: 'SVXY',
  UVXY: 'UVXY',
} as const

export type YFSymbol = typeof YF_SYMBOLS[keyof typeof YF_SYMBOLS]
