import type { ResponsiveLayouts } from 'react-grid-layout/legacy'
import { cloneLayouts, normalizeLayouts } from './dashboard-layout-merge'
import { DEFAULT_LAYOUT_VERSION } from './dashboard-layout-config'

// Key embeds the layout version so any save from a prior version is silently
// abandoned rather than merged into the new default positions.
export const DASHBOARD_LAYOUT_STORAGE_KEY =
  `market-intel-dashboard-layout-v${DEFAULT_LAYOUT_VERSION}`

// Cleans up storage keys from previous layout versions so they don't
// accumulate in localStorage. Called on first load.
function pruneOldVersionKeys(): void {
  if (typeof window === 'undefined') return
  try {
    const prefix = 'market-intel-dashboard-layout-v'
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(prefix) && key !== DASHBOARD_LAYOUT_STORAGE_KEY) {
        localStorage.removeItem(key)
      }
    }
  } catch {
    // localStorage may be unavailable in restricted contexts
  }
}

export interface PersistedDashboardLayout {
  version: typeof DEFAULT_LAYOUT_VERSION
  layouts: ResponsiveLayouts
  collapsed: Record<string, boolean>
  layoutLocked: boolean
}

export function loadPersistedLayout(): PersistedDashboardLayout | null {
  if (typeof window === 'undefined') return null
  pruneOldVersionKeys()
  try {
    const raw = localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const o = parsed as Record<string, unknown>
    // Reject any save that doesn't match current version
    if (o.version !== DEFAULT_LAYOUT_VERSION) return null
    if (typeof o.layouts !== 'object' || o.layouts === null) return null
    return {
      version: DEFAULT_LAYOUT_VERSION,
      layouts: normalizeLayouts(o.layouts as ResponsiveLayouts),
      collapsed:
        typeof o.collapsed === 'object' && o.collapsed !== null && !Array.isArray(o.collapsed)
          ? (o.collapsed as Record<string, boolean>)
          : {},
      layoutLocked: Boolean(o.layoutLocked),
    }
  } catch {
    return null
  }
}

export function savePersistedLayout(
  payload: Omit<PersistedDashboardLayout, 'version'>,
): void {
  if (typeof window === 'undefined') return
  const body: PersistedDashboardLayout = {
    version: DEFAULT_LAYOUT_VERSION,
    layouts: cloneLayouts(payload.layouts),
    collapsed: { ...payload.collapsed },
    layoutLocked: payload.layoutLocked,
  }
  localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(body))
}

export function clearPersistedLayout(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(DASHBOARD_LAYOUT_STORAGE_KEY)
}
