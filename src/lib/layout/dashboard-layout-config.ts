// ============================================================
// Dashboard grid — card ids, default responsive layouts, constraints
// Snap: rowHeight 36px, margin 10px (matches tactical spacing)
// ============================================================

import type { Layout, LayoutItem, ResponsiveLayouts } from 'react-grid-layout/legacy'

/** Stable keys for persistence and hash anchors (#fed → data-anchor on wrapper) */
export const DASHBOARD_CARD_IDS = [
  'command-brief',
  'alerts',
  'watchlist',
  'fed',
  'treasury',
  'macro',
  'liquidity',
  'breadth',
  'options',
  'flows',
  'internals',
  'retail-organic',
  'collar',
] as const

export type DashboardCardId = (typeof DASHBOARD_CARD_IDS)[number]

/** Semantic size presets (documentation + “tidy” hints); grid uses w/h in columns/rows */
export type CardLayoutSize = 'hero' | 'large' | 'medium' | 'small' | 'collapsed'

export const CARD_SIZE_ROWS: Record<CardLayoutSize, { h: number; minH: number; maxH: number }> = {
  hero:      { h: 10, minH: 6, maxH: 24 },
  large:     { h: 9,  minH: 5, maxH: 22 },
  medium:    { h: 8,  minH: 5, maxH: 18 },
  small:     { h: 6,  minH: 4, maxH: 14 },
  collapsed: { h: 1,  minH: 1, maxH: 2 },
}

function item(
  i: DashboardCardId,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: Partial<LayoutItem> = {},
): LayoutItem {
  return { i, x, y, w, h, ...opts }
}

/** Per-card min/max in grid units — prevents overlap by bounding resize */
export const LAYOUT_CONSTRAINTS: Partial<
  Record<DashboardCardId, Pick<LayoutItem, 'minW' | 'maxW' | 'minH' | 'maxH'>>
> = {
  /** Full-width on lg; minW allows md/sm/xs column counts */
  'command-brief': { minW: 4, maxW: 12, minH: 5, maxH: 30 },
  alerts:          { minW: 4,  maxW: 12, minH: 2, maxH: 8 },
  watchlist:       { minW: 6,  maxW: 12, minH: 4, maxH: 20 },
  fed:             { minW: 3,  maxW: 12, minH: 5, maxH: 20 },
  treasury:        { minW: 3,  maxW: 12, minH: 5, maxH: 20 },
  macro:           { minW: 3,  maxW: 12, minH: 5, maxH: 20 },
  liquidity:       { minW: 3,  maxW: 12, minH: 5, maxH: 22 },
  breadth:         { minW: 4,  maxW: 12, minH: 6, maxH: 24 },
  options:         { minW: 4,  maxW: 12, minH: 5, maxH: 24 },
  flows:           { minW: 3,  maxW: 12, minH: 4, maxH: 18 },
  internals:       { minW: 4,  maxW: 12, minH: 4, maxH: 16 },
  'retail-organic':{ minW: 4,  maxW: 12, minH: 5, maxH: 22 },
  collar:          { minW: 3,  maxW: 12, minH: 4, maxH: 16 },
}

function applyConstraints(layout: Layout): Layout {
  return layout.map((li) => {
    const c = LAYOUT_CONSTRAINTS[li.i as DashboardCardId]
    if (!c) return { ...li }
    return {
      ...li,
      minW: c.minW ?? li.minW,
      maxW: c.maxW ?? li.maxW,
      minH: c.minH ?? li.minH,
      maxH: c.maxH ?? li.maxH,
    }
  })
}

/** Desktop — 12 columns */
export const DEFAULT_LAYOUT_LG: Layout = applyConstraints([
  item('command-brief', 0, 0, 12, 9, { minH: 6 }),
  item('alerts',        0, 9, 12, 3, { minH: 2 }),
  item('watchlist',     0, 12, 12, 7, { minH: 4 }),
  item('fed',           0, 19, 4, 8),
  item('treasury',      4, 19, 4, 8),
  item('macro',         8, 19, 4, 8),
  item('liquidity',     0, 27, 5, 9),
  item('breadth',       5, 27, 7, 9),
  item('options',       0, 36, 7, 10),
  item('flows',         7, 36, 5, 8),
  item('internals',     0, 46, 12, 6, { minH: 4 }),
  item('retail-organic',0, 52, 8, 9),
  item('collar',        8, 52, 4, 8),
])

/** Laptop / tablet — 10 columns */
export const DEFAULT_LAYOUT_MD: Layout = applyConstraints([
  item('command-brief', 0, 0, 10, 9, { minH: 6 }),
  item('alerts',        0, 9, 10, 3, { minH: 2 }),
  item('watchlist',     0, 12, 10, 7, { minH: 4 }),
  item('fed',           0, 19, 5, 8),
  item('treasury',      5, 19, 5, 8),
  item('macro',         0, 27, 10, 6),
  item('liquidity',     0, 33, 5, 9),
  item('breadth',       5, 33, 5, 9),
  item('options',       0, 42, 6, 9),
  item('flows',         6, 42, 4, 8),
  item('internals',     0, 50, 10, 5, { minH: 3 }),
  item('retail-organic',0, 55, 10, 8),
  item('collar',        0, 63, 10, 6),
])

/** Small tablet — 6 columns */
export const DEFAULT_LAYOUT_SM: Layout = applyConstraints([
  item('command-brief', 0, 0, 6, 10, { minH: 6 }),
  item('alerts',        0, 10, 6, 3, { minH: 2 }),
  item('watchlist',     0, 13, 6, 8, { minH: 4 }),
  item('fed',           0, 21, 6, 7),
  item('treasury',      0, 28, 6, 7),
  item('macro',         0, 35, 6, 7),
  item('liquidity',     0, 42, 6, 8),
  item('breadth',       0, 50, 6, 9),
  item('options',       0, 59, 6, 9),
  item('flows',         0, 68, 6, 7),
  item('internals',     0, 75, 6, 5, { minH: 3 }),
  item('retail-organic',0, 80, 6, 9),
  item('collar',        0, 89, 6, 7),
])

/** Narrow — 4 columns, stacked */
export const DEFAULT_LAYOUT_XS_SIMPLE: Layout = applyConstraints([
  item('command-brief', 0, 0, 4, 11, { minH: 6 }),
  item('alerts',        0, 11, 4, 3, { minH: 2 }),
  item('watchlist',     0, 14, 4, 9, { minH: 4 }),
  item('fed',           0, 23, 4, 8),
  item('treasury',      0, 31, 4, 8),
  item('macro',         0, 39, 4, 8),
  item('liquidity',     0, 47, 4, 8),
  item('breadth',       0, 55, 4, 10),
  item('options',       0, 65, 4, 10),
  item('flows',         0, 75, 4, 7),
  item('internals',     0, 82, 4, 5, { minH: 3 }),
  item('retail-organic',0, 87, 4, 10),
  item('collar',        0, 97, 4, 7),
])

export const DEFAULT_LAYOUT_XXS: Layout = applyConstraints(
  DEFAULT_LAYOUT_XS_SIMPLE.map(li => ({ ...li, w: 2, x: 0 })),
)

export const DEFAULT_LAYOUTS: ResponsiveLayouts = {
  lg:  DEFAULT_LAYOUT_LG,
  md:  DEFAULT_LAYOUT_MD,
  sm:  DEFAULT_LAYOUT_SM,
  xs:  DEFAULT_LAYOUT_XS_SIMPLE,
  xxs: DEFAULT_LAYOUT_XXS,
}

export const GRID_ROW_HEIGHT = 36
export const GRID_MARGIN: [number, number] = [10, 10]

export const HASH_BY_CARD: Record<DashboardCardId, string> = {
  'command-brief': 'overview',
  alerts:          'alerts',
  watchlist:       'watchlist',
  fed:             'fed',
  treasury:        'rates',
  macro:           'macro',
  liquidity:       'liquidity',
  breadth:         'breadth',
  options:         'options',
  flows:           'flows',
  internals:       'internals',
  'retail-organic':'retail-organic',
  collar:          'collar',
}

/** Short labels for collapsed strip + toolbar */
export const CARD_LABELS: Record<DashboardCardId, string> = {
  'command-brief': 'Command brief',
  alerts:          'Threat board',
  watchlist:       'Watchlist',
  fed:             'Fed / policy',
  treasury:        'Treasury / rates',
  macro:           'Macro',
  liquidity:       'Liquidity',
  breadth:         'Breadth',
  options:         'Options',
  flows:           'Flows',
  internals:       'Daily internals',
  'retail-organic':'Retail & organic',
  collar:          'Collar / structure',
}
