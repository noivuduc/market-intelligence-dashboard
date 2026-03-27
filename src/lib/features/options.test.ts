import { describe, expect, it } from 'vitest'
import { buildOptionsModuleFromChain, buildOptionsModuleFromPolygonChain } from './options'
import type { SpxOptionChainSnapshot } from '@/lib/sources/option-chain-types'

describe('buildOptionsModuleFromChain', () => {
  it('derives put/call walls from max OI and zero gamma from greeks (polygon path)', () => {
    const snapshot: SpxOptionChainSnapshot = {
      contracts: [
        { contractType: 'put', expirationDate: '2025-06-20', strike: 5000, openInterest: 100, gamma: 0.001 },
        { contractType: 'put', expirationDate: '2025-06-20', strike: 4900, openInterest: 5000, gamma: 0.002 },
        { contractType: 'call', expirationDate: '2025-06-20', strike: 5200, openInterest: 800, gamma: 0.001 },
        { contractType: 'call', expirationDate: '2025-06-20', strike: 5300, openInterest: 3000, gamma: 0.003 },
      ],
      underlyingPrice: 5100,
      contractCount: 4,
    }
    const m = buildOptionsModuleFromChain(snapshot, 5100, 'polygon')
    expect(m.structureAvailable).toBe(true)
    expect(m.putWall).toBe(4900)
    expect(m.callWall).toBe(5300)
    expect(m.zeroGamma).toBe(4900)
    expect(m.meta.sourceId).toBe('polygon')
    expect(m.keyExpiries.some(e => e.date === '2025-06-20')).toBe(true)
  })

  it('uses Yahoo meta and messaging for yahoo provider', () => {
    const snapshot: SpxOptionChainSnapshot = {
      contracts: [],
      underlyingPrice: null,
      contractCount: 0,
    }
    const m = buildOptionsModuleFromChain(snapshot, null, 'yahoo')
    expect(m.structureAvailable).toBe(false)
    expect(m.meta.sourceId).toBe('yahoo')
    expect(m.meta.fetchError).toContain('Yahoo')
  })

  it('buildOptionsModuleFromPolygonChain aliases polygon provider', () => {
    const snapshot: SpxOptionChainSnapshot = {
      contracts: [
        { contractType: 'put', expirationDate: '2025-06-20', strike: 4900, openInterest: 100, gamma: null },
        { contractType: 'call', expirationDate: '2025-06-20', strike: 5300, openInterest: 200, gamma: null },
      ],
      underlyingPrice: 5100,
      contractCount: 2,
    }
    const a = buildOptionsModuleFromPolygonChain(snapshot, 5100)
    const b = buildOptionsModuleFromChain(snapshot, 5100, 'polygon')
    expect(a.putWall).toBe(b.putWall)
    expect(a.callWall).toBe(b.callWall)
  })
})
