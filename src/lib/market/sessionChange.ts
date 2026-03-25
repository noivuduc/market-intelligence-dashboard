// ============================================================
// Session / 1D change from ordered closes (oldest → newest)
// ============================================================

export interface SessionChange {
  changePct: number | null
  changeAbs: number | null
}

/** Last bar vs prior completed bar — aligns watchlist 1D% with sparkline path */
export function sessionChangeFromCloses(closes: number[]): SessionChange {
  if (closes.length < 2) return { changePct: null, changeAbs: null }
  const prev = closes[closes.length - 2]!
  const last = closes[closes.length - 1]!
  if (!Number.isFinite(prev) || !Number.isFinite(last) || prev <= 0) {
    return { changePct: null, changeAbs: null }
  }
  const changeAbs = last - prev
  return { changePct: (changeAbs / prev) * 100, changeAbs }
}
