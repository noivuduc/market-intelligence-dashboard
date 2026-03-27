// ============================================================
// NORMALIZED SPX OPTION CHAIN — shared by Polygon + Yahoo adapters
// ============================================================

export interface NormalizedOptionContract {
  contractType: 'call' | 'put'
  expirationDate: string
  strike: number
  openInterest: number
  gamma: number | null
}

export interface SpxOptionChainSnapshot {
  contracts: NormalizedOptionContract[]
  underlyingPrice: number | null
  contractCount: number
  /** Polygon: pages fetched */
  pagesFetched?: number
  /** Yahoo: expiration pages merged into snapshot */
  expirationsMerged?: number
}

export type OptionsChainProvider = 'polygon' | 'yahoo'
