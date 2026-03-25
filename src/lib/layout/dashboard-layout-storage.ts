import type { ResponsiveLayouts } from 'react-grid-layout/legacy'
import { cloneLayouts, normalizeLayouts } from './dashboard-layout-merge'

export const DASHBOARD_LAYOUT_STORAGE_KEY = 'market-intel-dashboard-layout-v1'

export interface PersistedDashboardLayoutV1 {
  version: 1
  layouts: ResponsiveLayouts
  collapsed: Record<string, boolean>
  layoutLocked: boolean
}

export function loadPersistedLayout(): PersistedDashboardLayoutV1 | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const o = parsed as Record<string, unknown>
    if (o.version !== 1 || typeof o.layouts !== 'object' || o.layouts === null) return null
    return {
      version: 1,
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

export function savePersistedLayout(payload: Omit<PersistedDashboardLayoutV1, 'version'>): void {
  if (typeof window === 'undefined') return
  const body: PersistedDashboardLayoutV1 = {
    version: 1,
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
