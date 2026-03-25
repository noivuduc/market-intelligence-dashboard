// ============================================================
// Reserve / balance-sheet money normalization (FRED units)
// WRESBAL & WALCL: millions of U.S. dollars
// RRPONTSYD: billions of U.S. dollars
// ============================================================

/** Convert FRED WRESBAL / WALCL observation (millions USD) to trillions USD */
export function fredMillionsToTrillions(millionsUsd: number): number {
  return millionsUsd / 1_000_000
}

/** Convert FRED RRPONTSYD observation (billions USD) to trillions USD */
export function fredBillionsToTrillions(billionsUsd: number): number {
  return billionsUsd / 1000
}

export function formatTrillionsUsd(trillions: number, fractionDigits = 2): string {
  return `$${trillions.toFixed(fractionDigits)}T`
}
