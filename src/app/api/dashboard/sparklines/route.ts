// ============================================================
// SPARKLINE LANE (Tier 2) — cached Yahoo 5d history, non-blocking for UI
// ============================================================

import { NextResponse } from 'next/server'
import { buildSparklineBundleCached } from '@/lib/features/market'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const sparklines = await buildSparklineBundleCached()
    return NextResponse.json(
      {
        lane:       'sparklines' as const,
        sparklines,
        lastUpdate: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control':    'no-store',
          'X-Dashboard-Lane': 'sparklines',
        },
      },
    )
  } catch (e) {
    console.warn('[api/dashboard/sparklines]', e)
    return NextResponse.json(
      {
        lane:       'sparklines' as const,
        sparklines: {},
        lastUpdate: new Date().toISOString(),
        error:      e instanceof Error ? e.message : 'Sparkline lane failed',
      },
      { status: 200 },
    )
  }
}
