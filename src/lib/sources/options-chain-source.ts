// ============================================================
// WHICH BACKEND FEEDS THE SPX OPTIONS MODULE
// ============================================================

export type OptionsChainSourceMode = 'yahoo' | 'polygon' | 'auto'

/**
 * `OPTIONS_CHAIN_SOURCE` (server env):
 * - `yahoo` | `yfinance` | `yfin` — Yahoo Finance options API for **^SPX** (override with `YAHOO_OPTIONS_SYMBOL`). No Polygon key required.
 * - `polygon` — Polygon I:SPX snapshot only (requires POLYGON_API_KEY). No Yahoo fallback.
 * - `auto` — Try Polygon when POLYGON_API_KEY is set; on failure (e.g. 403) fall back to Yahoo if enabled.
 *
 * Default when unset: **`yahoo`** so a present but non-entitled Polygon key does not block Yahoo data.
 */
export function resolveOptionsChainSourceMode(): OptionsChainSourceMode {
  const v = process.env.OPTIONS_CHAIN_SOURCE?.trim().toLowerCase()
  if (v === 'yahoo' || v === 'yfinance' || v === 'yfin') return 'yahoo'
  if (v === 'polygon' || v === 'auto') return v
  return 'yahoo'
}

export function pickOptionsChainProvider(
  mode: OptionsChainSourceMode,
  hasPolygonKey: boolean,
  yahooEnabled: boolean,
): 'polygon' | 'yahoo' | null {
  if (mode === 'polygon') return hasPolygonKey ? 'polygon' : null
  if (mode === 'yahoo') return yahooEnabled ? 'yahoo' : null
  if (hasPolygonKey) return 'polygon'
  if (yahooEnabled) return 'yahoo'
  return null
}
