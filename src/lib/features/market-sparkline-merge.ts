// Client-safe: merges sparkline closes into dashboard state (no Yahoo / Node APIs).
import { sessionChangeFromCloses } from '@/lib/market/sessionChange'
import type { DashboardState, TrendDirection, WatchlistItem } from '@/lib/types'
import { CROSS_ASSET_DEFS, WATCHLIST_ROW_DEFS } from '@/lib/features/market-defs'
import type { MarketSnapshot } from '@/lib/features/market-types'

function trend(changePct: number | null): TrendDirection {
  const c = changePct ?? 0
  if (c >  0.1) return 'rising'
  if (c < -0.1) return 'falling'
  return 'flat'
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

export function mergeSparklinesIntoSnapshot(
  core: MarketSnapshot,
  sparkByYahoo: Record<string, number[] | undefined>,
): MarketSnapshot {
  const symByWatchLabel = Object.fromEntries(
    WATCHLIST_ROW_DEFS.map(d => [d.symbol, d.sym]),
  ) as Record<string, string>
  const vixLevel = core.watchlist.find(w => w.symbol === 'VIX')?.price ?? 15

  return {
    ...core,
    watchlist: core.watchlist.map(w => {
      const line = sparkByYahoo[symByWatchLabel[w.symbol] ?? ''] ?? w.sparkline
      let changePct1d = w.changePct1d
      let change1d = w.change1d
      if ((changePct1d == null || !Number.isFinite(changePct1d)) && line && line.length >= 2) {
        const hist = sessionChangeFromCloses(line)
        changePct1d = hist.changePct
        change1d = hist.changeAbs
      }
      return {
        ...w,
        sparkline: line,
        changePct1d,
        change1d,
        trend: trend(changePct1d),
        status: deriveStatus(changePct1d, w.category, vixLevel),
      }
    }),
    crossAsset: core.crossAsset.map(c => {
      const line = sparkByYahoo[c.yahooSymbol] ?? c.sparkline
      let changePct1d = c.changePct1d
      if ((changePct1d == null || !Number.isFinite(changePct1d)) && line && line.length >= 2) {
        changePct1d = sessionChangeFromCloses(line).changePct
      }
      return {
        ...c,
        sparkline: line,
        changePct1d,
        trend: trend(changePct1d),
      }
    }),
  }
}

export function mergeSparklinesIntoDashboardState(
  state: DashboardState,
  sparkByYahoo: Record<string, number[] | undefined>,
): DashboardState {
  const m = mergeSparklinesIntoSnapshot(
    {
      breadth: state.breadth,
      flows: state.flows,
      watchlist: state.watchlist,
      crossAsset: state.crossAsset,
    },
    sparkByYahoo,
  )
  return { ...state, watchlist: m.watchlist, crossAsset: m.crossAsset }
}
