// ============================================================
// POLYGON.IO — SPX INDEX OPTIONS CHAIN SNAPSHOT (SERVER ONLY)
// GET /v3/snapshot/options/{underlyingAsset}
// Docs: https://polygon.io/docs/rest/options/snapshots/option-chain-snapshot
// ============================================================

import type {
  NormalizedOptionContract,
  SpxOptionChainSnapshot,
} from '@/lib/sources/option-chain-types'

const POLYGON_BASE = 'https://api.polygon.io'
const UNDERLYING = 'I:SPX'
const PAGE_LIMIT = 250
const MAX_PAGES = 8

/** @deprecated Use SpxOptionChainSnapshot from option-chain-types */
export type PolygonSpxOptionChainSnapshot = SpxOptionChainSnapshot

interface PolygonOptionContractRow {
  details?: {
    contract_type?: string
    expiration_date?: string
    strike_price?: number
    ticker?: string
  }
  open_interest?: number
  greeks?: { gamma?: number; delta?: number }
  underlying_asset?: { price?: number; ticker?: string }
}

interface PolygonOptionsSnapshotPage {
  status?: string
  results?: PolygonOptionContractRow[]
  next_url?: string
}

function appendApiKey(url: string, apiKey: string): string {
  const u = new URL(url)
  u.searchParams.set('apiKey', apiKey)
  return u.toString()
}

function normalizeRow(row: PolygonOptionContractRow): NormalizedOptionContract | null {
  const d = row.details
  if (!d) return null
  const ct = d.contract_type?.toLowerCase()
  if (ct !== 'call' && ct !== 'put') return null
  const strike = d.strike_price
  const exp = d.expiration_date
  if (typeof strike !== 'number' || !Number.isFinite(strike) || strike <= 0) return null
  if (typeof exp !== 'string' || !exp) return null
  const oi = row.open_interest
  const openInterest =
    typeof oi === 'number' && Number.isFinite(oi) && oi >= 0 ? Math.round(oi) : 0
  const g = row.greeks?.gamma
  const gamma =
    typeof g === 'number' && Number.isFinite(g) ? g : null
  return {
    contractType: ct,
    expirationDate: exp,
    strike,
    openInterest,
    gamma,
  }
}

/**
 * Fetches paginated option chain snapshot for SPX index (I:SPX).
 * Requires POLYGON_API_KEY with options access.
 */
export async function fetchPolygonSpxOptionChainSnapshot(): Promise<SpxOptionChainSnapshot> {
  const apiKey = process.env.POLYGON_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('POLYGON_API_KEY is not set')
  }

  const contracts: NormalizedOptionContract[] = []
  let underlyingPrice: number | null = null
  let nextUrl: string | null =
    `${POLYGON_BASE}/v3/snapshot/options/${encodeURIComponent(UNDERLYING)}?limit=${PAGE_LIMIT}`
  let pagesFetched = 0

  while (nextUrl && pagesFetched < MAX_PAGES) {
    const url = appendApiKey(nextUrl, apiKey)
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next:     { revalidate: 0 },
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Polygon options snapshot ${res.status}: ${body.slice(0, 200)}`)
    }
    const json = (await res.json()) as PolygonOptionsSnapshotPage
    if (json.status && json.status !== 'OK') {
      throw new Error(`Polygon options snapshot status: ${json.status}`)
    }
    const rows = json.results ?? []
    for (const row of rows) {
      if (underlyingPrice == null) {
        const p = row.underlying_asset?.price
        if (typeof p === 'number' && Number.isFinite(p) && p > 0) underlyingPrice = p
      }
      const n = normalizeRow(row)
      if (n && n.openInterest > 0) contracts.push(n)
    }
    pagesFetched += 1
    nextUrl = json.next_url ?? null
  }

  return {
    contracts,
    underlyingPrice,
    contractCount: contracts.length,
    pagesFetched,
  }
}
