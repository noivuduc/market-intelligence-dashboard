// ============================================================
// Normalized metric helpers — explicit units, no silent zeros
// Complements domain MetricValue on DashboardState.
// ============================================================

import type { TrendDirection } from '@/lib/types'

/** Canonical numeric snapshot for display and APIs */
export interface NormalizedNumericMetric {
  value:          number | null
  prior:          number | null
  change:         number | null
  changePct:      number | null
  changeBps:      number | null
  unit:           string
  displayUnit:    string
  formatted:      string
  formattedChange: string | null
  trend:          TrendDirection
  /** True when value is null or non-finite */
  unavailable:    boolean
}

export function emptyNormalizedMetric(unit: string, displayUnit = unit): NormalizedNumericMetric {
  return {
    value: null,
    prior: null,
    change: null,
    changePct: null,
    changeBps: null,
    unit,
    displayUnit,
    formatted: '—',
    formattedChange: null,
    trend: 'flat',
    unavailable: true,
  }
}

/** Format a yield level in percent (e.g. 4.25 → "4.25%") */
export function formatYieldPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${value.toFixed(2)}%`
}

/** Format a change in basis points with sign */
export function formatBpsChange(bps: number | null): string | null {
  if (bps == null || !Number.isFinite(bps)) return null
  const sign = bps > 0 ? '+' : ''
  return `${sign}${bps.toFixed(1)} bps`
}
