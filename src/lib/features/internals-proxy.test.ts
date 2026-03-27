// ============================================================
// Tests: buildProxyInternals
// ============================================================

import { describe, expect, it } from 'vitest'
import { buildProxyInternals } from './internals-proxy'
import type { BreadthModule, FlowsModule, SourceMeta } from '@/lib/types'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const baseMeta: SourceMeta = {
  sourceId:        'test',
  sourceName:      'Test',
  sourceUrl:       '',
  dataClass:       'derived',
  confidence:      'medium',
  cadenceLabel:    '60s',
  fetchedAt:       '2026-01-01T00:00:00.000Z',
  dataAsOf:        '2026-01-01T00:00:00.000Z',
  requiresPremium: false,
}

const metricNull = {
  value: null, prior: null, change: null, changePct: null,
  unit: '', formatted: '—', trend: 'flat' as const, meta: baseMeta,
}

function makeBreadth(overrides: Partial<BreadthModule> = {}): BreadthModule {
  return {
    spx: { symbol: '^GSPC', price: 5400, change1d: 0.5, change1w: null, pctFrom20d: null, pctFrom50d: null, pctFrom200d: null, trend: 'rising' },
    ndx: { symbol: '^NDX',  price: 18500, change1d: 0.6, change1w: null, pctFrom20d: null, pctFrom50d: null, pctFrom200d: null, trend: 'rising' },
    rut: { symbol: '^RUT',  price: 2100, change1d: 0.4, change1w: null, pctFrom20d: null, pctFrom50d: null, pctFrom200d: null, trend: 'rising' },
    ewsVsCap: { ...metricNull, trend: 'rising' as const },
    advDecLine:  { ...metricNull, value: 5 },
    upVsDownVol: metricNull,
    newHighs52w: metricNull,
    newLows52w:  metricNull,
    sectorBreadth: [
      { sector: 'Tech',          rangePosition52w: 72 },
      { sector: 'Financials',    rangePosition52w: 68 },
      { sector: 'Industrials',   rangePosition52w: 65 },
      { sector: 'Healthcare',    rangePosition52w: 62 },
      { sector: 'Energy',        rangePosition52w: 61 },
      { sector: 'Comm Svc',      rangePosition52w: 52 },
      { sector: 'Materials',     rangePosition52w: 50 },
      { sector: 'Staples',       rangePosition52w: 39 },
      { sector: 'Real Estate',   rangePosition52w: 35 },
      { sector: 'Utilities',     rangePosition52w: 30 },
      { sector: 'Discretionary', rangePosition52w: 25 },
    ],
    tapeQuality:      'healthy-rally',
    participation:    'broad',
    breadthConfirmed: true,
    meta: baseMeta,
    ...overrides,
  }
}

function makeFlows(overrides: Partial<FlowsModule> = {}): FlowsModule {
  return {
    etfDollarVolume:    metricNull,
    futuresPressure:    'buying',
    optionsPremiumFlow: 'balanced',
    offExchangeShare:   metricNull,
    blockIntensity:     metricNull,
    sectorRotation:     [],
    overallPressure:    'buying',
    demandType:         'organic',
    meta: baseMeta,
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('buildProxyInternals', () => {
  describe('overall read', () => {
    it('returns RISK-ON for healthy-rally + broad + buying', () => {
      const result = buildProxyInternals(makeBreadth(), makeFlows())
      expect(result.overallRead).toBe('RISK-ON')
      expect(result.overallStatus).toBe('stable')
    })

    it('returns RISK-OFF for broad-selloff + selling pressure', () => {
      const result = buildProxyInternals(
        makeBreadth({ tapeQuality: 'broad-selloff', participation: 'deteriorating' }),
        makeFlows({ overallPressure: 'selling' }),
      )
      expect(result.overallRead).toBe('RISK-OFF')
      expect(result.overallStatus).toBe('critical')
    })

    it('returns RISK-OFF (elevated) for fragile-selloff + selling', () => {
      const result = buildProxyInternals(
        makeBreadth({ tapeQuality: 'fragile-selloff' }),
        makeFlows({ overallPressure: 'selling' }),
      )
      expect(result.overallRead).toBe('RISK-OFF')
      expect(result.overallStatus).toBe('elevated')
    })

    it('returns MIXED for healthy-rally + selling pressure', () => {
      const result = buildProxyInternals(
        makeBreadth(),
        makeFlows({ overallPressure: 'selling' }),
      )
      // selling pressure contradicts rally tape → not cleanly risk-on
      expect(result.overallRead).toBe('MIXED')
    })

    it('returns NEUTRAL for mixed tape + mixed flows', () => {
      const result = buildProxyInternals(
        makeBreadth({ tapeQuality: 'mixed' }),
        makeFlows({ overallPressure: 'mixed' }),
      )
      expect(result.overallRead).toBe('NEUTRAL')
    })
  })

  describe('participation', () => {
    it('labels BROAD with stable status', () => {
      const r = buildProxyInternals(makeBreadth({ participation: 'broad' }), makeFlows())
      expect(r.participationLabel).toBe('BROAD')
      expect(r.participationStatus).toBe('stable')
    })

    it('labels NARROW with watch status', () => {
      const r = buildProxyInternals(makeBreadth({ participation: 'narrow' }), makeFlows())
      expect(r.participationLabel).toBe('NARROW')
      expect(r.participationStatus).toBe('watch')
    })

    it('labels DETERIORATING with elevated status', () => {
      const r = buildProxyInternals(makeBreadth({ participation: 'deteriorating' }), makeFlows())
      expect(r.participationLabel).toBe('DETERIORATING')
      expect(r.participationStatus).toBe('elevated')
    })

    it('labels IMPROVING with stable status', () => {
      const r = buildProxyInternals(makeBreadth({ participation: 'improving' }), makeFlows())
      expect(r.participationLabel).toBe('IMPROVING')
      expect(r.participationStatus).toBe('stable')
    })
  })

  describe('sector counts', () => {
    it('counts advancing (>=60) and declining (<=40) sectors correctly', () => {
      const r = buildProxyInternals(makeBreadth(), makeFlows())
      // From fixture: >=60 → Tech(72), Financials(68), Industrials(65), Healthcare(62), Energy(61) = 5
      expect(r.sectorAdvancing).toBe(5)
      // <=40 → Staples(39), RealEstate(35), Utilities(30), Discretionary(25) = 4
      expect(r.sectorDeclining).toBe(4)
      expect(r.sectorNeutral).toBe(2)
      expect(r.sectorTotal).toBe(11)
    })

    it('returns top 3 advancing sector names', () => {
      const r = buildProxyInternals(makeBreadth(), makeFlows())
      expect(r.topSectors).toHaveLength(3)
      expect(r.topSectors[0]).toBe('Tech') // highest rangePosition52w first
    })

    it('returns bottom 3 declining sector names (weakest first)', () => {
      const r = buildProxyInternals(makeBreadth(), makeFlows())
      expect(r.weakSectors).toHaveLength(3)
      expect(r.weakSectors[0]).toBe('Discretionary') // lowest rangePosition52w = weakest
    })

    it('handles empty sector array gracefully', () => {
      const r = buildProxyInternals(makeBreadth({ sectorBreadth: [] }), makeFlows())
      expect(r.sectorTotal).toBe(0)
      expect(r.sectorAdvancing).toBe(0)
      expect(r.sectorDeclining).toBe(0)
      expect(r.topSectors).toHaveLength(0)
      expect(r.weakSectors).toHaveLength(0)
    })
  })

  describe('momentum proxy', () => {
    it('maps healthy-rally → STRENGTHENING (stable)', () => {
      const r = buildProxyInternals(makeBreadth({ tapeQuality: 'healthy-rally' }), makeFlows())
      expect(r.momentumLabel).toBe('STRENGTHENING')
      expect(r.momentumStatus).toBe('stable')
    })

    it('maps broad-selloff → WEAKENING (elevated)', () => {
      const r = buildProxyInternals(makeBreadth({ tapeQuality: 'broad-selloff' }), makeFlows())
      expect(r.momentumLabel).toBe('WEAKENING')
      expect(r.momentumStatus).toBe('elevated')
    })

    it('maps fragile-selloff → WEAKENING (elevated)', () => {
      const r = buildProxyInternals(makeBreadth({ tapeQuality: 'fragile-selloff' }), makeFlows())
      expect(r.momentumLabel).toBe('WEAKENING')
      expect(r.momentumStatus).toBe('elevated')
    })

    it('maps weak-rally → STABLE (watch)', () => {
      const r = buildProxyInternals(makeBreadth({ tapeQuality: 'weak-rally' }), makeFlows())
      expect(r.momentumLabel).toBe('STABLE')
      expect(r.momentumStatus).toBe('watch')
    })
  })

  describe('index alignment', () => {
    it('returns ALIGNED-UP when all three indices are rising', () => {
      const r = buildProxyInternals(makeBreadth(), makeFlows())
      expect(r.indexAlignment).toBe('ALIGNED-UP')
    })

    it('returns ALIGNED-DOWN when all three indices are falling', () => {
      const r = buildProxyInternals(
        makeBreadth({
          spx: { ...makeBreadth().spx, trend: 'falling' },
          ndx: { ...makeBreadth().ndx, trend: 'falling' },
          rut: { ...makeBreadth().rut, trend: 'falling' },
        }),
        makeFlows(),
      )
      expect(r.indexAlignment).toBe('ALIGNED-DOWN')
    })

    it('returns MIXED when indices diverge', () => {
      const r = buildProxyInternals(
        makeBreadth({
          spx: { ...makeBreadth().spx, trend: 'rising'  },
          ndx: { ...makeBreadth().ndx, trend: 'rising'  },
          rut: { ...makeBreadth().rut, trend: 'falling' },
        }),
        makeFlows(),
      )
      expect(r.indexAlignment).toBe('MIXED')
    })

    it('returns FLAT when all indices are flat', () => {
      const r = buildProxyInternals(
        makeBreadth({
          spx: { ...makeBreadth().spx, trend: 'flat' },
          ndx: { ...makeBreadth().ndx, trend: 'flat' },
          rut: { ...makeBreadth().rut, trend: 'flat' },
        }),
        makeFlows(),
      )
      expect(r.indexAlignment).toBe('FLAT')
    })
  })

  describe('EW confirmation', () => {
    it('labels CONFIRMING when breadthConfirmed is true', () => {
      const r = buildProxyInternals(makeBreadth({ breadthConfirmed: true }), makeFlows())
      expect(r.ewLabel).toBe('CONFIRMING')
      expect(r.ewStatus).toBe('stable')
    })

    it('labels DIVERGING when not confirmed + ewsVsCap falling', () => {
      const r = buildProxyInternals(
        makeBreadth({
          breadthConfirmed: false,
          ewsVsCap: { ...metricNull, trend: 'falling' as const },
        }),
        makeFlows(),
      )
      expect(r.ewLabel).toBe('DIVERGING')
      expect(r.ewStatus).toBe('elevated')
    })

    it('labels MIXED when not confirmed and EW is flat/rising', () => {
      const r = buildProxyInternals(
        makeBreadth({
          breadthConfirmed: false,
          ewsVsCap: { ...metricNull, trend: 'flat' as const },
        }),
        makeFlows(),
      )
      expect(r.ewLabel).toBe('MIXED')
      expect(r.ewStatus).toBe('watch')
    })
  })

  describe('flow pressure', () => {
    it('maps buying → BUYING (stable)', () => {
      const r = buildProxyInternals(makeBreadth(), makeFlows({ overallPressure: 'buying' }))
      expect(r.flowPressure).toBe('BUYING')
      expect(r.flowStatus).toBe('stable')
    })

    it('maps selling → SELLING (elevated)', () => {
      const r = buildProxyInternals(makeBreadth(), makeFlows({ overallPressure: 'selling' }))
      expect(r.flowPressure).toBe('SELLING')
      expect(r.flowStatus).toBe('elevated')
    })

    it('maps mixed → MIXED (watch)', () => {
      const r = buildProxyInternals(makeBreadth(), makeFlows({ overallPressure: 'mixed' }))
      expect(r.flowPressure).toBe('MIXED')
      expect(r.flowStatus).toBe('watch')
    })
  })

  describe('gap / session follow-through proxy', () => {
    it('returns confirmed when SPX rising + buying pressure', () => {
      const r = buildProxyInternals(makeBreadth(), makeFlows({ overallPressure: 'buying' }))
      expect(r.gapFollowThrough).toBe('confirmed')
    })

    it('returns faded when SPX falling + selling pressure', () => {
      const r = buildProxyInternals(
        makeBreadth({
          spx: { ...makeBreadth().spx, trend: 'falling' },
        }),
        makeFlows({ overallPressure: 'selling' }),
      )
      expect(r.gapFollowThrough).toBe('faded')
    })

    it('returns neutral when SPX flat', () => {
      const r = buildProxyInternals(
        makeBreadth({ spx: { ...makeBreadth().spx, trend: 'flat' } }),
        makeFlows({ overallPressure: 'buying' }),
      )
      expect(r.gapFollowThrough).toBe('neutral')
    })
  })

  describe('output completeness', () => {
    it('always returns all required fields', () => {
      const r = buildProxyInternals(makeBreadth(), makeFlows())
      const required: (keyof typeof r)[] = [
        'participationLabel', 'participationStatus', 'participationDetail',
        'ewLabel', 'ewStatus', 'ewDetail',
        'sectorAdvancing', 'sectorDeclining', 'sectorNeutral', 'sectorTotal',
        'topSectors', 'weakSectors',
        'momentumLabel', 'momentumStatus',
        'indexAlignment', 'alignmentDetail',
        'flowPressure', 'flowStatus',
        'gapFollowThrough',
        'tapeInterpretation',
        'overallRead', 'overallStatus',
      ]
      for (const key of required) {
        expect(r[key]).toBeDefined()
      }
    })
  })
})
