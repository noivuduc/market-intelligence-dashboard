import type {
  BreadthModule,
  CrossAssetItem,
  FlowsModule,
  WatchlistItem,
} from '@/lib/types'

export interface MarketSnapshot {
  breadth:    BreadthModule
  flows:      FlowsModule
  watchlist:  WatchlistItem[]
  crossAsset: CrossAssetItem[]
}
