// ============================================================
// YAHOO SOURCE CIRCUIT BREAKERS
// After sustained 429s, stop hammering; prefer cache / degraded UX.
// Separate breakers for chart (quotes + history) vs options v7 API.
// ============================================================

export class CircuitOpenError extends Error {
  readonly family: string
  constructor(family: string, message = 'Circuit open — upstream rate-limited') {
    super(message)
    this.name = 'CircuitOpenError'
    this.family = family
  }
}

function envInt(name: string, fallback: number, min: number, max: number): number {
  const n = Number(process.env[name])
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.floor(n)))
}

/**
 * Trips after `threshold` HTTP 429 responses within `windowMs`,
 * then stays open for `cooldownMs`.
 */
export class YahooFamilyCircuitBreaker {
  readonly family: string
  private readonly threshold: number
  private readonly windowMs: number
  private readonly cooldownMs: number
  private openedUntil = 0
  private readonly recent429At: number[] = []

  constructor(
    family: string,
    opts?: { threshold?: number; windowMs?: number; cooldownMs?: number },
  ) {
    this.family = family
    this.threshold = opts?.threshold ?? envInt('YAHOO_CB_429_THRESHOLD', 3, 1, 20)
    this.windowMs = opts?.windowMs ?? envInt('YAHOO_CB_429_WINDOW_MS', 60_000, 5_000, 300_000)
    this.cooldownMs = opts?.cooldownMs ?? envInt('YAHOO_CB_COOLDOWN_MS', 600_000, 60_000, 3_600_000)
  }

  /** Call before outbound request */
  assertClosed(): void {
    const now = Date.now()
    if (now < this.openedUntil) {
      throw new CircuitOpenError(this.family)
    }
  }

  /** Record a finished HTTP response (do not call for network throws) */
  observeHttpStatus(status: number): void {
    const now = Date.now()
    if (status === 429) {
      this.recent429At.push(now)
      this.prune(now)
      if (this.recent429At.length >= this.threshold) {
        this.open(now)
      }
      return
    }
    if (status >= 200 && status < 300) {
      this.recent429At.length = 0
    }
  }

  /** Force trip (e.g. after repeated failures) */
  trip(reason: string): void {
    const now = Date.now()
    console.warn(`[yahoo-circuit] ${this.family} manual trip: ${reason}`)
    this.open(now)
  }

  isOpen(): boolean {
    return Date.now() < this.openedUntil
  }

  cooldownRemainingMs(): number {
    return Math.max(0, this.openedUntil - Date.now())
  }

  /** Test hook */
  reset(): void {
    this.openedUntil = 0
    this.recent429At.length = 0
  }

  private prune(now: number): void {
    const cut = now - this.windowMs
    while (this.recent429At.length > 0 && this.recent429At[0]! < cut) {
      this.recent429At.shift()
    }
  }

  private open(now: number): void {
    this.openedUntil = now + this.cooldownMs
    this.recent429At.length = 0
    console.warn(
      `[yahoo-circuit] ${this.family} OPEN for ${Math.round(this.cooldownMs / 1000)}s (429 budget exceeded)`,
    )
  }
}

const chartBreaker = new YahooFamilyCircuitBreaker('yahoo-chart', {
  threshold: envInt('YAHOO_CHART_CB_429_THRESHOLD', 3, 1, 20),
  windowMs: envInt('YAHOO_CHART_CB_429_WINDOW_MS', 60_000, 5_000, 300_000),
  cooldownMs: envInt('YAHOO_CHART_CB_COOLDOWN_MS', 600_000, 60_000, 3_600_000),
})

const optionsBreaker = new YahooFamilyCircuitBreaker('yahoo-options', {
  threshold: envInt('YAHOO_OPTIONS_CB_429_THRESHOLD', 2, 1, 10),
  windowMs: envInt('YAHOO_OPTIONS_CB_429_WINDOW_MS', 45_000, 5_000, 300_000),
  cooldownMs: envInt('YAHOO_OPTIONS_CB_COOLDOWN_MS', 900_000, 120_000, 3_600_000),
})

export function getYahooChartCircuitBreaker(): YahooFamilyCircuitBreaker {
  return chartBreaker
}

export function getYahooOptionsCircuitBreaker(): YahooFamilyCircuitBreaker {
  return optionsBreaker
}

/** @internal vitest */
export function __resetYahooCircuitsForTests(): void {
  chartBreaker.reset()
  optionsBreaker.reset()
}
