// ============================================================
// Dashboard alert rules — regime, policy, rates, liquidity, tape
// Kept pure for tests and API route reuse.
// ============================================================

import type {
  Alert,
  FedPolicyModule,
  LiquidityModule,
  MacroModule,
  RegimeState,
  TreasuryModule,
} from '@/lib/types'
import type { MarketSnapshot } from '@/lib/features/market'
import type { ConfidenceLevel } from '@/lib/sources/types'

function push(
  alerts: Alert[],
  a: Omit<Alert, 'confidence'> & { confidence?: ConfidenceLevel },
): void {
  const row: Alert = { ...a, confidence: a.confidence ?? 'medium' }
  alerts.push(row)
}

function hoursUntilUtc(isoDate: string): number | null {
  const t = new Date(isoDate).getTime()
  if (!Number.isFinite(t)) return null
  return (t - Date.now()) / 3_600_000
}

export function buildDashboardAlerts(
  regime: RegimeState,
  fed: FedPolicyModule,
  treasury: TreasuryModule,
  liq: LiquidityModule,
  macro: MacroModule,
  market: MarketSnapshot | null,
): Alert[] {
  const alerts: Alert[] = []
  const now = new Date().toISOString()

  if (regime.label === 'risk-off') {
    push(alerts, {
      id: 'regime-risk-off',
      severity: 'elevated',
      title: 'Regime: Risk-Off',
      explanation:
        'Regime engine classifies current conditions as risk-off. Review liquidity, credit, and breadth signals.',
      affectedModules: ['Regime', 'Liquidity', 'Breadth'],
      watchItems: ['Credit spreads', 'SPX key support', 'VIX level'],
      createdAt: now,
      acknowledged: false,
      confidence: 'high',
    })
  }

  if (fed.daysToFomc !== null && fed.daysToFomc <= 7 && fed.nextFomcDate) {
    push(alerts, {
      id: 'fomc-imminent',
      severity: 'watch',
      title: `FOMC meeting in ${fed.daysToFomc} day(s)`,
      explanation: `Federal Reserve policy meeting on ${fed.nextFomcDate}. Expect elevated volatility in rates and equities.`,
      affectedModules: ['Fed & Policy', 'Treasury & Rates'],
      watchItems: ['Fed statement', 'Rate path revision', 'Balance sheet guidance'],
      createdAt: now,
      acknowledged: false,
      confidence: 'high',
    })
  }

  const y10 = treasury.curve.y10.value
  if (y10 !== null && y10 > 4.6) {
    push(alerts, {
      id: 'rates-elevated',
      severity: 'watch',
      title: '10Y Treasury yield above 4.6%',
      explanation: `10Y yield at ${treasury.curve.y10.formatted} tightens financial conditions. Watch equity multiple sensitivity.`,
      affectedModules: ['Treasury & Rates', 'Liquidity'],
      watchItems: ['10Y at 4.75%', 'IG spread widening', 'SPX P/E compression'],
      createdAt: now,
      acknowledged: false,
      confidence: 'medium',
    })
  }

  if (liq.volStress === 'elevated' || liq.volStress === 'high') {
    push(alerts, {
      id: 'vol-stress',
      severity: liq.volStress === 'high' ? 'elevated' : 'watch',
      title: `Volatility stress: ${liq.volStress.toUpperCase()}`,
      explanation: `VIX / vol complex flagged as ${liq.volStress}. Watch convexity, credit beta, and de-grossing flows.`,
      affectedModules: ['Liquidity', 'Cross-asset', 'Options'],
      watchItems: ['VIX term structure', 'MOVE vs VIX', 'SPX gamma'],
      createdAt: now,
      acknowledged: false,
      confidence: 'medium',
    })
  }

  const nc = macro.nextCatalyst
  if (nc?.date && nc.importance !== 'low') {
    const h = hoursUntilUtc(nc.date)
    if (h != null && h >= 0 && h <= 72) {
      push(alerts, {
        id: 'macro-catalyst-soon',
        severity: nc.importance === 'high' ? 'watch' : 'info',
        title: `Macro data window: ${nc.name}`,
        explanation: `Release scheduled ${nc.date}${nc.referencePeriod ? ` (${nc.referencePeriod})` : ''}. Watch surprise regime vs expectations — do not trade on unverified consensus.`,
        affectedModules: ['Macro', 'Rates', 'Regime'],
        watchItems: ['Actual vs expected', 'Revision to prior', 'Cross-asset reaction'],
        createdAt: now,
        acknowledged: false,
        confidence: 'medium',
      })
    }
  }

  if (liq.creditStress === 'elevated' || liq.creditStress === 'high') {
    push(alerts, {
      id: 'credit-stress',
      severity: liq.creditStress === 'high' ? 'critical' : 'elevated',
      title: `HY credit stress: ${liq.creditStress.toUpperCase()}`,
      explanation: `HY spreads at ${liq.hySpread.formatted}. ${
        liq.creditStress === 'high'
          ? 'Severe credit deterioration — systemic risk watch.'
          : 'Credit conditions deteriorating — monitor closely.'
      }`,
      affectedModules: ['Liquidity', 'Regime'],
      watchItems: ['HY spread 400+', 'IG widening confirmation', 'Equity correlation'],
      createdAt: now,
      acknowledged: false,
      confidence: liq.creditStress === 'high' ? 'high' : 'medium',
    })
  }

  if (!market) return alerts

  const { breadth, crossAsset } = market

  if (!breadth.breadthConfirmed && (breadth.tapeQuality === 'weak-rally' || breadth.tapeQuality === 'fragile-selloff')) {
    push(alerts, {
      id: 'breadth-divergence',
      severity: 'watch',
      title: 'Breadth not confirming tape',
      explanation: `Tape classified as ${breadth.tapeQuality.replace('-', ' ')} with participation ${breadth.participation}. Price may be running on narrow leadership.`,
      affectedModules: ['Breadth', 'Regime'],
      watchItems: ['RUT vs SPX', 'RSP/SPY', 'Sector internals'],
      createdAt: now,
      acknowledged: false,
      confidence: 'medium',
    })
  }

  const vix = crossAsset.find((c) => c.symbol === 'VIX')
  const spx = crossAsset.find((c) => c.symbol === 'SPX')
  const vixCh = vix?.changePct1d
  const spxCh = spx?.changePct1d
  if (vix != null && vix.price != null && vix.price >= 28) {
    push(alerts, {
      id: 'vix-elevated',
      severity: 'elevated',
      title: `VIX elevated (${vix.price.toFixed(2)})`,
      explanation: 'Volatility index indicates elevated risk pricing versus recent norms.',
      affectedModules: ['Cross-asset', 'Liquidity', 'Options'],
      watchItems: ['Term structure', 'Credit', 'Dealer gamma'],
      createdAt: now,
      acknowledged: false,
      confidence: 'medium',
    })
  } else if (
    vixCh != null &&
    Number.isFinite(vixCh) &&
    vixCh > 12 &&
    spxCh != null &&
    Number.isFinite(spxCh) &&
    spxCh > 0.15
  ) {
    push(alerts, {
      id: 'vol-equity-divergence',
      severity: 'info',
      title: 'Vol up with equities positive',
      explanation:
        'VIX rising while SPX is up on the session — watch for hedging demand or macro shock pricing.',
      affectedModules: ['Cross-asset', 'Breadth'],
      watchItems: ['Rates', 'Dollar', 'Credit'],
      createdAt: now,
      acknowledged: false,
      confidence: 'low',
    })
  }

  return alerts
}
