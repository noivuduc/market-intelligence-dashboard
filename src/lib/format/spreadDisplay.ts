// ============================================================
// ICE BofA index spreads on FRED (BAMLH0A0HYM2, BAMLC0A0CM, etc.)
// Values are expressed as **percent** (e.g. 3.21 = 3.21% = 321 bps OAS).
// ============================================================

/** Convert FRED percent-style OAS / spread to basis points */
export function spreadPercentToBps(percent: number): number {
  return percent * 100
}

export function formatSpreadBpsFromFredPercent(percent: number): string {
  const bps = spreadPercentToBps(percent)
  return `${bps.toFixed(0)} bps`
}

export function formatSpreadBpsWithPercent(percent: number): string {
  const bps = spreadPercentToBps(percent)
  return `${bps.toFixed(0)} bps (${percent.toFixed(2)}%)`
}
