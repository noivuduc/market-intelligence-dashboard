import { describe, expect, it, beforeEach } from 'vitest'
import { serverCache } from './server'

describe('serverCache.getOrFetchWithStaleFallback', () => {
  beforeEach(() => {
    serverCache.invalidate('test:stale:key')
  })

  it('returns fresh data from fetcher on empty cache', async () => {
    const r = await serverCache.getOrFetchWithStaleFallback('test:stale:key', 60_000, async () => ({ v: 1 }))
    expect(r.data.v).toBe(1)
    expect(r.servedStale).toBe(false)
    expect(r.fromCache).toBe(false)
  })

  it('serves stale entry when fetcher throws', async () => {
    await serverCache.getOrFetch('test:stale:key', 1, async () => ({ v: 99 }))
    await new Promise((r) => setTimeout(r, 5))
    const r = await serverCache.getOrFetchWithStaleFallback<{ v: number }>('test:stale:key', 1, async () => {
      throw new Error('upstream down')
    })
    expect(r.data.v).toBe(99)
    expect(r.servedStale).toBe(true)
  })

  it('rethrows when fetcher throws and no stale exists', async () => {
    await expect(
      serverCache.getOrFetchWithStaleFallback('test:stale:missing', 60_000, async () => {
        throw new Error('fail')
      }),
    ).rejects.toThrow('fail')
  })
})
