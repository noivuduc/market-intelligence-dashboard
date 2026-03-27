import { describe, it, expect } from 'vitest'
import { regimeSummaryPacketCacheKey } from './summaryPacketHash'
import type { RegimeSummaryPacket } from './packets'
import type { RegimeLabel, RegimeSubScore } from '@/lib/types'

function minimalPacket(label: RegimeLabel, confidence: number): RegimeSummaryPacket {
  const sub: RegimeSubScore = { policy: 50, liquidity: 50, risk: 50, trend: 50, flow: 50, positioning: 50 }
  return {
    regime: {
      label,
      confidence,
      subScores: sub,
      drivers: [],
      risks: [],
      watchNext: [],
      lastUpdated: new Date().toISOString(),
    },
    asOf: new Date().toISOString(),
  } as unknown as RegimeSummaryPacket
}

describe('regimeSummaryPacketCacheKey', () => {
  it('is stable for same regime inputs', () => {
    const a = minimalPacket('sideways' as RegimeLabel, 55)
    const b = minimalPacket('sideways' as RegimeLabel, 55)
    expect(regimeSummaryPacketCacheKey(a)).toBe(regimeSummaryPacketCacheKey(b))
  })

  it('changes when label changes', () => {
    const a = minimalPacket('risk-on' as RegimeLabel, 55)
    const b = minimalPacket('risk-off' as RegimeLabel, 55)
    expect(regimeSummaryPacketCacheKey(a)).not.toBe(regimeSummaryPacketCacheKey(b))
  })
})
