// ============================================================
// Shared HTTP handler for GET /api/dashboard and /api/dashboard/core
// ============================================================

import { NextResponse } from 'next/server'
import { buildDashboardCoreState } from '@/lib/dashboard/dashboard-core-builder'

export async function dashboardCoreGET(): Promise<NextResponse> {
  try {
    const state = await buildDashboardCoreState()
    return NextResponse.json(state, {
      headers: {
        'Cache-Control':      'no-store',
        'X-Dashboard-Lane':   'core',
        'X-Data-As-Of':       state.lastFullUpdate,
        'X-FRED-Available':   String(state.dataQuality.fredAvailable),
        'X-Market-Available': String(state.dataQuality.marketAvailable),
        'X-Overall-Status':   state.dataQuality.overallStatus,
      },
    })
  } catch (e) {
    console.error('[api/dashboard/core]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Core lane failed' },
      { status: 502 },
    )
  }
}
