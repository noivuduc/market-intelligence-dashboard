'use client'

import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout/legacy'
import type { DashboardState, ExecutiveSummary, TopLevelBriefing } from '@/lib/types'
import type { SitrepSource } from '@/components/command/CommandBriefHero'
import { CommandBriefHero } from '@/components/command/CommandBriefHero'
import { FedPolicyCard } from '@/components/modules/FedPolicyCard'
import { TreasuryCard } from '@/components/modules/TreasuryCard'
import { MacroCard } from '@/components/modules/MacroCard'
import { LiquidityCard } from '@/components/modules/LiquidityCard'
import { BreadthCard } from '@/components/modules/BreadthCard'
import { OptionsCard } from '@/components/modules/OptionsCard'
import { FlowsCard } from '@/components/modules/FlowsCard'
import { InternalsCard } from '@/components/modules/InternalsCard'
import { RetailOrganicCard } from '@/components/modules/RetailOrganicCard'
import { CollarCard } from '@/components/modules/CollarCard'
import { WatchlistCard } from '@/components/modules/WatchlistCard'
import { AlertsPanel } from '@/components/modules/AlertsPanel'
import { Card } from '@/components/ui/Card'
import { CrossAssetStrip } from '@/components/command/CrossAssetStrip'
import { EventCalendarCard } from '@/components/modules/EventCalendarCard'
import {
  CARD_LABELS,
  DEFAULT_LAYOUTS,
  GRID_MARGIN,
  GRID_ROW_HEIGHT,
  HASH_BY_CARD,
  type DashboardCardId,
} from '@/lib/layout/dashboard-layout-config'
import {
  applyCollapsedToLayouts,
  cloneLayouts,
  expandCardInLayouts,
} from '@/lib/layout/dashboard-layout-merge'
import {
  clearPersistedLayout,
  loadPersistedLayout,
  savePersistedLayout,
} from '@/lib/layout/dashboard-layout-storage'

const ResponsiveGridLayout = WidthProvider(Responsive)

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 } as const
const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 } as const

const DECK_DEFAULT = {
  layouts: cloneLayouts(DEFAULT_LAYOUTS),
  collapsed: {} as Record<string, boolean>,
  layoutLocked: false,
}

export interface DashboardDeckProps {
  state:          DashboardState
  executive:      ExecutiveSummary
  sitrep:         TopLevelBriefing
  sitrepSource:   SitrepSource
  aiBriefError:   string | null
  lastFetch:      string
  /** True while a background data poll is in-flight — show subtle SYNCING badge. */
  isRefreshing?:  boolean
}

export function DashboardDeck({
  state,
  executive,
  sitrep,
  sitrepSource,
  aiBriefError,
  lastFetch,
  isRefreshing = false,
}: DashboardDeckProps) {
  const [{ layouts, collapsed, layoutLocked }, setDeck] = useState(DECK_DEFAULT)
  const [editMode, setEditMode] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const spotPrice = state.breadth.spx.price || undefined

  useLayoutEffect(() => {
    const p = loadPersistedLayout()
    if (!p) return
    setDeck({
      layouts: applyCollapsedToLayouts(p.layouts, p.collapsed),
      collapsed: { ...p.collapsed },
      layoutLocked: p.layoutLocked,
    })
  }, [])

  const setLayoutLocked = useCallback((locked: boolean) => {
    setDeck((d) => ({ ...d, layoutLocked: locked }))
  }, [])

  const toggleCollapse = useCallback((id: DashboardCardId) => {
    setDeck((d) => {
      const willCollapse = !d.collapsed[id]
      const nextCollapsed = { ...d.collapsed }
      if (willCollapse) nextCollapsed[id] = true
      else delete nextCollapsed[id]
      const nextLayouts = willCollapse
        ? applyCollapsedToLayouts(d.layouts, nextCollapsed)
        : expandCardInLayouts(d.layouts, id)
      return { ...d, collapsed: nextCollapsed, layouts: nextLayouts }
    })
  }, [])

  const expandFromStrip = useCallback((id: DashboardCardId) => {
    setDeck((d) => {
      const nextCollapsed = { ...d.collapsed }
      delete nextCollapsed[id]
      return {
        ...d,
        collapsed: nextCollapsed,
        layouts: expandCardInLayouts(d.layouts, id),
      }
    })
  }, [])

  const onLayoutChange = useCallback((_layout: Layout, allLayouts: typeof layouts) => {
    setDeck((d) => {
      const current = _layout
      const nextCollapsed = { ...d.collapsed }
      let changed = false
      for (const li of current) {
        if (li.h > 1 && nextCollapsed[li.i]) {
          delete nextCollapsed[li.i]
          changed = true
        }
      }
      return {
        layouts: allLayouts,
        collapsed: changed ? nextCollapsed : d.collapsed,
        layoutLocked: d.layoutLocked,
      }
    })
  }, [])

  const handleSave = useCallback(() => {
    savePersistedLayout({
      layouts,
      collapsed,
      layoutLocked,
    })
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1600)
  }, [layouts, collapsed, layoutLocked])

  const handleReset = useCallback(() => {
    clearPersistedLayout()
    setDeck({
      layouts: cloneLayouts(DEFAULT_LAYOUTS),
      collapsed: {},
      layoutLocked: false,
    })
  }, [])

  // Same as reset but keeps lock state — lets user tidy without wiping their lock preference
  const handleRestoreRecommended = useCallback(() => {
    clearPersistedLayout()
    setDeck({
      layouts: cloneLayouts(DEFAULT_LAYOUTS),
      collapsed: {},
      layoutLocked,
    })
  }, [layoutLocked])

  const handleTidy = useCallback(() => {
    setDeck({
      layouts: cloneLayouts(DEFAULT_LAYOUTS),
      collapsed: {},
      layoutLocked,
    })
  }, [layoutLocked])

  const canEdit = editMode && !layoutLocked

  const dragHandle = useMemo(
    () => (
      <span
        className="dashboard-grid-drag-handle flex items-center gap-1.5 shrink-0 cursor-grab active:cursor-grabbing select-none text-[0.6rem] font-mono uppercase tracking-[0.2em] text-tac-600/90 hover:text-tac-500 px-1.5 py-0.5 rounded-sm border border-tac-800/40 bg-ops-950/80"
        title="Drag to reposition"
      >
        <span aria-hidden className="text-tac-500">⠿</span>
        Deploy
      </span>
    ),
    [],
  )

  function GridChrome({
    id,
    children,
  }: {
    id: DashboardCardId
    children: React.ReactNode
  }) {
    const hash = HASH_BY_CARD[id]
    const isCollapsed = Boolean(collapsed[id])

    return (
      <div
        id={hash}
        className={clsx(
          'scroll-mt-16 h-full min-h-0 min-w-0 flex flex-col dashboard-grid-cell',
          isCollapsed && 'dashboard-grid-cell--collapsed',
        )}
      >
        {canEdit && (
          <div className="flex items-center justify-between gap-2 shrink-0 mb-1.5 px-0.5">
            {dragHandle}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => toggleCollapse(id)}
                className="text-[0.6rem] font-mono uppercase tracking-wider px-2 py-0.5 rounded-sm border border-ops-600 text-ink-muted hover:text-ink-secondary hover:border-steel-600 transition-colors"
              >
                {isCollapsed ? 'Expand' : 'Collapse'}
              </button>
            </div>
          </div>
        )}
        <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
          {isCollapsed ? (
            <button
              type="button"
              onClick={() => expandFromStrip(id)}
              className="h-full w-full flex items-center justify-between gap-2 px-2 py-1 rounded-sm border border-ops-600 bg-ops-950/90 hover:border-tac-800/50 transition-colors text-left"
            >
              <span className="text-[0.65rem] font-mono uppercase tracking-wider text-ink-muted truncate">
                {CARD_LABELS[id]}
              </span>
              <span className="text-tac-500 text-2xs font-mono shrink-0">+</span>
            </button>
          ) : (
            children
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 justify-between border border-ops-700/80 bg-ops-900/25 rounded-sm px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-2xs font-mono uppercase tracking-[0.25em] text-ink-muted">
            Deck layout
          </span>
          {layoutLocked && (
            <span className="text-[0.6rem] font-mono uppercase text-amber-500/90 px-2 py-0.5 border border-amber-800/50 rounded-sm">
              Locked
            </span>
          )}
          {savedFlash && (
            <span className="text-[0.6rem] font-mono uppercase text-tac-500">Saved</span>
          )}
          {/* Subtle background-refresh indicator — never shown on initial load */}
          {isRefreshing && (
            <span className="text-[0.6rem] font-mono uppercase tracking-wider text-tac-600/70 px-1.5 py-0.5 border border-tac-900/40 rounded-sm animate-pulse-slow select-none">
              ⟳ SYNC
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!editMode ? (
            <>
              <button
                type="button"
                onClick={() => setEditMode(true)}
                disabled={layoutLocked}
                className="text-2xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-sm border border-tac-700 text-tac-500 hover:bg-tac-950/40 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Customize deck
              </button>
              {layoutLocked && (
                <button
                  type="button"
                  onClick={() => setLayoutLocked(false)}
                  className="text-2xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-sm border border-steel-600 text-steel-400 hover:bg-steel-900/30 transition-colors"
                >
                  Unlock layout
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditMode(false)
                  handleSave()
                }}
                className="text-2xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-sm border border-ops-600 text-ink-secondary hover:border-tac-700 transition-colors"
              >
                Save & exit
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="text-2xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-sm border border-ops-600 text-ink-muted hover:text-ink-secondary transition-colors"
              >
                Save layout
              </button>
              <button
                type="button"
                onClick={handleTidy}
                disabled={layoutLocked}
                className="text-2xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-sm border border-ops-600 text-ink-muted hover:text-ink-secondary disabled:opacity-40 transition-colors"
                title="Snap all cards to their default sizes (preserves positions)"
              >
                Auto tidy
              </button>
              <button
                type="button"
                onClick={handleRestoreRecommended}
                disabled={layoutLocked}
                className="text-2xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-sm border border-steel-700 text-steel-400 hover:bg-steel-900/20 disabled:opacity-40 transition-colors"
                title="Restore canonical module order and positions"
              >
                Restore order
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="text-2xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-sm border border-crit-900/50 text-crit-500/90 hover:bg-crit-950/20 transition-colors"
                title="Clear saved layout and restore all defaults including lock state"
              >
                Reset all
              </button>
              <button
                type="button"
                onClick={() => setLayoutLocked(!layoutLocked)}
                className={clsx(
                  'text-2xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-sm border transition-colors',
                  layoutLocked
                    ? 'border-tac-700 text-tac-500 hover:bg-tac-950/30'
                    : 'border-ops-600 text-ink-muted hover:text-ink-secondary',
                )}
              >
                {layoutLocked ? 'Unlock' : 'Lock layout'}
              </button>
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="text-2xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-sm border border-steel-700 text-steel-400 hover:bg-steel-900/30 transition-colors"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>

      <ResponsiveGridLayout
        measureBeforeMount
        className="dashboard-rgl -mx-1"
        rowHeight={GRID_ROW_HEIGHT}
        margin={GRID_MARGIN}
        containerPadding={[0, 0]}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        layouts={layouts}
        onLayoutChange={onLayoutChange}
        compactType="vertical"
        preventCollision={false}
        isDraggable={canEdit}
        isResizable={canEdit}
        draggableHandle=".dashboard-grid-drag-handle"
        isBounded
        useCSSTransforms
      >
        <div key="command-brief">
          <GridChrome id="command-brief">
            <div className="h-full min-h-0 overflow-y-auto rounded-sm">
              <CommandBriefHero
                state={state}
                executive={executive}
                sitrep={sitrep}
                sitrepSource={sitrepSource}
                aiBriefError={aiBriefError}
                feedUpdatedAt={lastFetch}
              />
            </div>
          </GridChrome>
        </div>

        <div key="cross-asset">
          <GridChrome id="cross-asset">
            <div className="h-full min-h-0 overflow-y-auto">
              <CrossAssetStrip items={state.crossAsset} />
            </div>
          </GridChrome>
        </div>

        <div key="event-calendar">
          <GridChrome id="event-calendar">
            <div className="h-full min-h-0 overflow-y-auto">
              <EventCalendarCard />
            </div>
          </GridChrome>
        </div>

        <div key="alerts">
          <GridChrome id="alerts">
            <div className="h-full min-h-0 overflow-y-auto">
              <AlertsPanel alerts={state.alerts} />
            </div>
          </GridChrome>
        </div>

        <div key="watchlist">
          <GridChrome id="watchlist">
            {state.watchlist.length > 0 ? (
              <WatchlistCard items={state.watchlist} />
            ) : (
              <Card
                title="Watchlist"
                subtitle="No symbols in monitor"
                variant="compact"
              >
                <p className="text-xs text-ink-muted font-mono">
                  Add tickers to populate this board.
                </p>
              </Card>
            )}
          </GridChrome>
        </div>

        <div key="fed">
          <GridChrome id="fed">
            <FedPolicyCard data={state.fed} />
          </GridChrome>
        </div>

        <div key="treasury">
          <GridChrome id="treasury">
            <TreasuryCard data={state.treasury} />
          </GridChrome>
        </div>

        <div key="macro">
          <GridChrome id="macro">
            <MacroCard data={state.macro} />
          </GridChrome>
        </div>

        <div key="liquidity">
          <GridChrome id="liquidity">
            <LiquidityCard data={state.liquidity} />
          </GridChrome>
        </div>

        <div key="breadth">
          <GridChrome id="breadth">
            <BreadthCard data={state.breadth} />
          </GridChrome>
        </div>

        <div key="options">
          <GridChrome id="options">
            <div
              className={clsx(
                'h-full min-h-0 flex flex-col',
                !state.options.structureAvailable && 'opacity-[0.92]',
              )}
            >
              <OptionsCard data={state.options} spotPrice={spotPrice} />
            </div>
          </GridChrome>
        </div>

        <div key="flows">
          <GridChrome id="flows">
            <FlowsCard data={state.flows} />
          </GridChrome>
        </div>

        <div key="internals">
          <GridChrome id="internals">
            <InternalsCard
              data={state.internals}
              breadth={state.breadth}
              flows={state.flows}
            />
          </GridChrome>
        </div>

        <div key="retail-organic">
          <GridChrome id="retail-organic">
            <RetailOrganicCard retail={state.retail} organic={state.organic} />
          </GridChrome>
        </div>

        <div key="collar">
          <GridChrome id="collar">
            <CollarCard data={state.collar} spotPrice={spotPrice} />
          </GridChrome>
        </div>
      </ResponsiveGridLayout>
    </div>
  )
}
