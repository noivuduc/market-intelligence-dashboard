// ============================================================
// DASHBOARD CORE LANE (Tier 1) — FRED + Yahoo quotes/breadth only
// ============================================================

import { dashboardCoreGET } from '@/lib/dashboard/dashboard-core-http'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const GET = dashboardCoreGET
