import { describe, expect, it, vi } from 'vitest'
import { __resetSingleFlightForTests, singleFlight } from './singleFlight'

describe('singleFlight', () => {
  it('coalesces concurrent identical keys into one upstream call', async () => {
    __resetSingleFlightForTests()
    const fn = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 20))
      return 42
    })
    const a = singleFlight('k1', fn)
    const b = singleFlight('k1', fn)
    const [ra, rb] = await Promise.all([a, b])
    expect(ra).toBe(42)
    expect(rb).toBe(42)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('uses separate in-flight promises per key', async () => {
    __resetSingleFlightForTests()
    const f1 = vi.fn(async () => 1)
    const f2 = vi.fn(async () => 2)
    const [x, y] = await Promise.all([singleFlight('a', f1), singleFlight('b', f2)])
    expect(x).toBe(1)
    expect(y).toBe(2)
    expect(f1).toHaveBeenCalledTimes(1)
    expect(f2).toHaveBeenCalledTimes(1)
  })
})
