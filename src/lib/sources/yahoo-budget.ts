// ============================================================
// PER-MINUTE OUTBOUND BUDGET (Yahoo chart family)
// When exhausted, callers should skip or serve cache only.
// ============================================================

export class BudgetExceededError extends Error {
  constructor() {
    super('Yahoo chart request budget exhausted for this minute')
    this.name = 'BudgetExceededError'
  }
}

function envInt(name: string, fallback: number, min: number, max: number): number {
  const n = Number(process.env[name])
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.floor(n)))
}

export class MinuteRequestBudget {
  private windowStart = Date.now()
  private used = 0
  private readonly maxPerMinute: number

  constructor(envName: string, defaultMax: number) {
    const raw = envInt(envName, defaultMax, 0, 10_000)
    this.maxPerMinute = raw
  }

  /** 0 max = unlimited */
  tryConsume(n = 1): boolean {
    if (this.maxPerMinute <= 0) return true
    this.roll()
    if (this.used + n > this.maxPerMinute) return false
    this.used += n
    return true
  }

  private roll(): void {
    const now = Date.now()
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now
      this.used = 0
    }
  }
}

const chartBudget = new MinuteRequestBudget('YAHOO_CHART_MAX_PER_MINUTE', 0)

export function getYahooChartMinuteBudget(): MinuteRequestBudget {
  return chartBudget
}
