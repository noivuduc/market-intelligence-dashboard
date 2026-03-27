// ============================================================
// Dashboard grid — card ids, default responsive layouts, constraints
// Snap: rowHeight 36px, margin 10px (matches tactical spacing)
//
// DEFAULT_LAYOUT_VERSION: bump this whenever the default positions
// change in a way that would make a saved v(n-1) layout look wrong.
// Storage uses this version in the localStorage key, so old saves
// are automatically abandoned without any migration code.
//
// Canonical module order (top → bottom, priority → advanced):
//
//  [TOP]      cross-asset  alerts  command-brief  event-calendar
//  [POLICY]   fed  treasury  macro  liquidity  flows
//  [MARKET]   breadth  watchlist
//  [ADVANCED] options  internals  collar  retail-organic
// ============================================================

import type { Layout, LayoutItem, ResponsiveLayouts } from 'react-grid-layout/legacy'

/** Bump when default positions change enough that old saved layouts
 *  would appear mis-ordered. The storage key embeds this version so
 *  any save from version N is silently discarded at version N+1. */
export const DEFAULT_LAYOUT_VERSION = 3

/**
 * Stable card IDs — order defines the canonical visual sequence.
 * normalizeLayouts() iterates this array, so order here = merge order.
 */
export const DASHBOARD_CARD_IDS = [
  // Top section
  'command-brief',
  'cross-asset',
  'event-calendar',
  'alerts',
  // Macro / policy row
  'fed',
  'treasury',
  'macro',
  'liquidity',
  // Market state row
  'breadth',
  'watchlist',
  'flows',
  // Advanced overlays (provider-required modules kept low)
  'options',
  'internals',
  'retail-organic',
  'collar',
] as const

export type DashboardCardId = (typeof DASHBOARD_CARD_IDS)[number]

/** Semantic size presets (documentation + "tidy" hints); grid uses w/h in columns/rows */
export type CardLayoutSize = 'hero' | 'large' | 'medium' | 'small' | 'collapsed'

export const CARD_SIZE_ROWS: Record<CardLayoutSize, { h: number; minH: number; maxH: number }> = {
  hero:      { h: 10, minH: 6, maxH: 24 },
  large:     { h: 9,  minH: 5, maxH: 22 },
  medium:    { h: 8,  minH: 5, maxH: 18 },
  small:     { h: 6,  minH: 4, maxH: 14 },
  collapsed: { h: 1,  minH: 1, maxH: 2  },
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
  'command-brief':  { minW: 4, maxW: 12, minH: 5, maxH: 30 },
  'cross-asset':    { minW: 6, maxW: 12, minH: 3, maxH: 12 },
  'event-calendar': { minW: 3, maxW: 12, minH: 5, maxH: 22 },
  alerts:           { minW: 3, maxW: 12, minH: 2, maxH: 8  },
  fed:              { minW: 3, maxW: 12, minH: 5, maxH: 20 },
  treasury:         { minW: 3, maxW: 12, minH: 5, maxH: 20 },
  macro:            { minW: 3, maxW: 12, minH: 5, maxH: 20 },
  liquidity:        { minW: 3, maxW: 12, minH: 5, maxH: 22 },
  breadth:          { minW: 4, maxW: 12, minH: 6, maxH: 24 },
  watchlist:        { minW: 4, maxW: 12, minH: 4, maxH: 20 },
  flows:            { minW: 3, maxW: 12, minH: 4, maxH: 18 },
  options:          { minW: 4, maxW: 12, minH: 5, maxH: 24 },
  internals:        { minW: 4, maxW: 12, minH: 4, maxH: 16 },
  'retail-organic': { minW: 4, maxW: 12, minH: 5, maxH: 22 },
  collar:           { minW: 3, maxW: 12, minH: 4, maxH: 16 },
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

// ============================================================
// DESKTOP — 12 columns
//
//  y= 0  cross-asset    (full width, h=4)
//  y= 4  alerts         (full width, h=4)
//  y= 8  command-brief  (full width, h=15)
//  y=23  event-calendar (w=6) | flows (w=3) | liquidity (w=3)
//  y=31  fed (w=5) | treasury (w=3) | macro (w=4)
//  y=40  breadth (w=5) | watchlist (w=7)
//  y=53  options (w=8) | internals (w=4)
//  y=63  collar (x=8, w=4)
//  y=72  retail-organic (full width, h=13)
// ============================================================
export const DEFAULT_LAYOUT_LG: Layout = applyConstraints([
  item('cross-asset',    0,  0, 12,  4),
  item('alerts',         0,  4, 12,  4),
  item('command-brief',  0,  8, 12, 15),
  item('event-calendar', 0, 23,  6,  8),
  item('flows',          6, 23,  3,  8),
  item('liquidity',      9, 23,  3,  8),
  item('fed',            0, 31,  5,  9),
  item('treasury',       5, 31,  3,  9),
  item('macro',          8, 31,  4,  9),
  item('breadth',        0, 40,  5, 13),
  item('watchlist',      5, 40,  7, 13),
  item('options',        0, 53,  8, 19),
  item('internals',      8, 53,  4, 10),
  item('collar',         8, 63,  4,  9),
  item('retail-organic', 0, 72, 12, 13),
])

// ============================================================
// LAPTOP / TABLET — 10 columns
//
//  y= 0  command-brief (full width, h=9)
//  y= 9  cross-asset   (full width, h=5)
//  y=14  event-calendar (w=6) | alerts (w=4)
//  y=22  fed (w=5) | treasury (w=5)
//  y=30  macro (w=5) | liquidity (w=5)
//  y=38  breadth (w=6) | watchlist (w=4)
//  y=47  flows (full width, h=7)
//  y=54  options (w=6) | internals (w=4)
//  y=63  retail-organic (w=7) | collar (w=3)
// ============================================================
export const DEFAULT_LAYOUT_MD: Layout = applyConstraints([
  item('command-brief',  0,  0, 10, 9, { minH: 6 }),
  item('cross-asset',    0,  9, 10, 5),
  item('event-calendar', 0, 14,  6, 8),
  item('alerts',         6, 14,  4, 8, { minH: 2 }),
  item('fed',            0, 22,  5, 8),
  item('treasury',       5, 22,  5, 8),
  item('macro',          0, 30,  5, 8),
  item('liquidity',      5, 30,  5, 8),
  item('breadth',        0, 38,  6, 9),
  item('watchlist',      6, 38,  4, 9, { minH: 4 }),
  item('flows',          0, 47, 10, 7),
  item('options',        0, 54,  6, 9),
  item('internals',      6, 54,  4, 6, { minH: 3 }),
  item('retail-organic', 0, 63,  7, 8),
  item('collar',         7, 63,  3, 8),
])

// ============================================================
// SMALL TABLET — 6 columns (mostly stacked)
//
//  Stacks in canonical order; event-calendar + alerts stay paired.
// ============================================================
export const DEFAULT_LAYOUT_SM: Layout = applyConstraints([
  item('command-brief',  0,   0, 6, 10, { minH: 6 }),
  item('cross-asset',    0,  10, 6,  5),
  item('event-calendar', 0,  15, 6,  8),
  item('alerts',         0,  23, 6,  4, { minH: 2 }),
  item('fed',            0,  27, 6,  7),
  item('treasury',       0,  34, 6,  7),
  item('macro',          0,  41, 6,  7),
  item('liquidity',      0,  48, 6,  7),
  item('breadth',        0,  55, 6,  9),
  item('watchlist',      0,  64, 6,  8, { minH: 4 }),
  item('flows',          0,  72, 6,  7),
  item('options',        0,  79, 6,  9),
  item('internals',      0,  88, 6,  5, { minH: 3 }),
  item('retail-organic', 0,  93, 6,  9),
  item('collar',         0, 102, 6,  7),
])

// ============================================================
// NARROW — 4 columns, stacked
// ============================================================
export const DEFAULT_LAYOUT_XS: Layout = applyConstraints([
  item('command-brief',  0,   0, 4, 11, { minH: 6 }),
  item('cross-asset',    0,  11, 4,  5),
  item('event-calendar', 0,  16, 4,  8),
  item('alerts',         0,  24, 4,  3, { minH: 2 }),
  item('fed',            0,  27, 4,  8),
  item('treasury',       0,  35, 4,  8),
  item('macro',          0,  43, 4,  8),
  item('liquidity',      0,  51, 4,  8),
  item('breadth',        0,  59, 4, 10),
  item('watchlist',      0,  69, 4,  9, { minH: 4 }),
  item('flows',          0,  78, 4,  7),
  item('options',        0,  85, 4, 10),
  item('internals',      0,  95, 4,  5, { minH: 3 }),
  item('retail-organic', 0, 100, 4, 10),
  item('collar',         0, 110, 4,  7),
])

export const DEFAULT_LAYOUT_XXS: Layout = applyConstraints(
  DEFAULT_LAYOUT_XS.map(li => ({ ...li, w: 2, x: 0 })),
)

export const DEFAULT_LAYOUTS: ResponsiveLayouts = {
  lg:  DEFAULT_LAYOUT_LG,
  md:  DEFAULT_LAYOUT_MD,
  sm:  DEFAULT_LAYOUT_SM,
  xs:  DEFAULT_LAYOUT_XS,
  xxs: DEFAULT_LAYOUT_XXS,
}

export const GRID_ROW_HEIGHT = 36
export const GRID_MARGIN: [number, number] = [10, 10]

export const HASH_BY_CARD: Record<DashboardCardId, string> = {
  'command-brief':  'overview',
  'cross-asset':    'cross-asset',
  'event-calendar': 'calendar',
  alerts:           'alerts',
  fed:              'fed',
  treasury:         'rates',
  macro:            'macro',
  liquidity:        'liquidity',
  breadth:          'breadth',
  watchlist:        'watchlist',
  flows:            'flows',
  options:          'options',
  internals:        'internals',
  'retail-organic': 'retail-organic',
  collar:           'collar',
}

/** Short labels for collapsed strip + toolbar */
export const CARD_LABELS: Record<DashboardCardId, string> = {
  'command-brief':  'Command brief',
  'cross-asset':    'Cross-asset tape',
  'event-calendar': 'Event calendar',
  alerts:           'Threat board',
  fed:              'Fed / policy',
  treasury:         'Treasury / rates',
  macro:            'Macro',
  liquidity:        'Liquidity',
  breadth:          'Breadth',
  watchlist:        'Watchlist',
  flows:            'Flows',
  options:          'Options',
  internals:        'Daily internals',
  'retail-organic': 'Retail & organic',
  collar:           'Collar / structure',
}
