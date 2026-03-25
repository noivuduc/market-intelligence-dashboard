import type { Layout, ResponsiveLayouts } from 'react-grid-layout/legacy'
import {
  DASHBOARD_CARD_IDS,
  type DashboardCardId,
  DEFAULT_LAYOUTS,
  LAYOUT_CONSTRAINTS,
} from './dashboard-layout-config'

const BREAKPOINTS = ['lg', 'md', 'sm', 'xs', 'xxs'] as const
type DeckBreakpoint = (typeof BREAKPOINTS)[number]

function isDeckBreakpoint(k: string): k is DeckBreakpoint {
  return (BREAKPOINTS as readonly string[]).includes(k)
}

export function cloneLayouts(source: ResponsiveLayouts): ResponsiveLayouts {
  return JSON.parse(JSON.stringify(source)) as ResponsiveLayouts
}

/** Ensure every card id exists on each breakpoint; fill missing from defaults */
export function normalizeLayouts(input: ResponsiveLayouts | null | undefined): ResponsiveLayouts {
  const defaults = cloneLayouts(DEFAULT_LAYOUTS)
  if (!input || typeof input !== 'object') return defaults

  const out: ResponsiveLayouts = {}
  for (const bp of BREAKPOINTS) {
    const incoming = input[bp]
    const fallback = defaults[bp] ?? []
    if (!Array.isArray(incoming)) {
      out[bp] = [...fallback]
      continue
    }
    const merged: Layout = DASHBOARD_CARD_IDS.map((id) => {
      const found = incoming.find((l) => l.i === id)
      const base = fallback.find((l) => l.i === id)!
      const c = LAYOUT_CONSTRAINTS[id]
      if (!found) return { ...base }
      return {
        ...base,
        ...found,
        i: id,
        minW: c?.minW ?? found.minW ?? base.minW,
        maxW: c?.maxW ?? found.maxW ?? base.maxW,
        minH: c?.minH ?? found.minH ?? base.minH,
        maxH: c?.maxH ?? found.maxH ?? base.maxH,
      }
    })
    out[bp] = merged
  }
  return out
}

export function applyCollapsedToLayouts(
  layouts: ResponsiveLayouts,
  collapsed: Record<string, boolean>,
): ResponsiveLayouts {
  const out: ResponsiveLayouts = {}
  for (const key of Object.keys(layouts)) {
    if (!isDeckBreakpoint(key)) continue
    const layout = layouts[key]
    if (!layout) continue
    out[key] = layout.map((li) => {
      if (!collapsed[li.i]) return { ...li }
      const c = LAYOUT_CONSTRAINTS[li.i as DashboardCardId]
      return {
        ...li,
        h: 1,
        minH: 1,
        maxH: 2,
        minW: li.minW ?? c?.minW,
        maxW: li.maxW ?? c?.maxW,
      }
    })
  }
  return out
}

/** Restore default heights for one card (e.g. expand from collapsed) */
export function expandCardInLayouts(
  layouts: ResponsiveLayouts,
  id: DashboardCardId,
): ResponsiveLayouts {
  const out: ResponsiveLayouts = {}
  for (const key of Object.keys(layouts)) {
    if (!isDeckBreakpoint(key)) continue
    const layout = layouts[key]
    const def = DEFAULT_LAYOUTS[key]
    if (!layout || !def) continue
    const defItem = def.find((l) => l.i === id)
    out[key] = layout.map((li) => {
      if (li.i !== id || !defItem) return li
      const c = LAYOUT_CONSTRAINTS[id]
      return {
        ...li,
        h: defItem.h,
        minH: c?.minH ?? defItem.minH ?? li.minH,
        maxH: c?.maxH ?? defItem.maxH ?? li.maxH,
        minW: c?.minW ?? defItem.minW ?? li.minW,
        maxW: c?.maxW ?? defItem.maxW ?? li.maxW,
      }
    })
  }
  return out
}
