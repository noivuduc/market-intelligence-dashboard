import type { MacroModule } from '@/lib/types'

/** One-line institutional read from macro trend registers (deterministic). */
export function macroImplication(m: MacroModule): string {
  const g = m.growthTrend
  const i = m.inflationTrend
  const l = m.laborTrend
  const s = m.surpriseRegime

  if (g === 'contraction' && i === 'rising') {
    return 'Stagflation risk register: growth cooling while inflation pressure persists — favors duration underweight and quality bias until data inflects.'
  }
  if (g === 'accelerating' && i === 'falling') {
    return 'Goldilocks-style register: growth firming with disinflation — supports risk if liquidity and credit cooperate.'
  }
  if (l === 'softening' && g !== 'contraction') {
    return 'Labor rebalancing without hard landing signal — watch payroll surprises for confirmation of cooling demand.'
  }
  if (s === 'negative') {
    return 'Recent releases skewing soft vs expectations — revise tactical bias until next high-impact print.'
  }
  if (s === 'positive') {
    return 'Data beating expectations — validate against breadth and rates before adding risk.'
  }
  return 'Macro vectors mixed — size for event risk; wait for aligned surprise + tape confirmation.'
}
