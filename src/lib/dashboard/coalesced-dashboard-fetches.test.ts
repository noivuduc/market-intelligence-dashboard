import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { __resetSingleFlightForTests } from '@/lib/util/singleFlight'
import {
  __resetClientDashboardFetchCacheForTests,
  fetchCoalescedDashboardCore,
  fetchCoalescedAiSummary,
} from './coalesced-dashboard-fetches'

describe('coalesced dashboard fetches', () => {
  beforeEach(() => {
    __resetSingleFlightForTests()
    __resetClientDashboardFetchCacheForTests()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    __resetSingleFlightForTests()
    __resetClientDashboardFetchCacheForTests()
  })

  it('issues only one HTTP request when two callers await core in parallel', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ lastFullUpdate: 't', regime: {}, executive: {} }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const [a, b] = await Promise.all([
      fetchCoalescedDashboardCore(),
      fetchCoalescedDashboardCore(),
    ])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(a.lastFullUpdate).toBe('t')
    expect(b.lastFullUpdate).toBe('t')
  })

  it('issues one POST per packet key when summary is requested twice in parallel', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        fullBrief: 'x',
        regime: 'r',
        why: '',
        whatChanged: '',
        whatConfirms: '',
        whatBreaks: '',
        watchNext: '',
        cachedAt: '',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const packet = { regimeLabel: 'risk-on' as const, fingerprint: 'abc' }
    const [u, v] = await Promise.all([
      fetchCoalescedAiSummary('same-key', packet as never),
      fetchCoalescedAiSummary('same-key', packet as never),
    ])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(u.fullBrief).toBe('x')
    expect(v.fullBrief).toBe('x')
  })

  it('sequential core calls reuse micro-cache (Strict Mode remount) without second HTTP', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ lastFullUpdate: 't2', regime: {}, executive: {} }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchCoalescedDashboardCore({ bypassDedupe: false })
    await fetchCoalescedDashboardCore({ bypassDedupe: false })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('bypassDedupe forces a new core HTTP call', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ lastFullUpdate: 't3', regime: {}, executive: {} }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchCoalescedDashboardCore({ bypassDedupe: false })
    await fetchCoalescedDashboardCore({ bypassDedupe: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
