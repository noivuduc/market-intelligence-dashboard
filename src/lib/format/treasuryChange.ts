// ============================================================
// Treasury yield deltas: level in %, session change in bps
// ============================================================

export function yieldChangeToBps(deltaPercentPoints: number): number {
  return deltaPercentPoints * 100
}

export function formatYieldDeltaBps(deltaPercentPoints: number | null): string | null {
  if (deltaPercentPoints === null || !Number.isFinite(deltaPercentPoints)) return null
  const bps = yieldChangeToBps(deltaPercentPoints)
  const sign = bps > 0 ? '+' : ''
  return `${sign}${bps.toFixed(1)} bps`
}
