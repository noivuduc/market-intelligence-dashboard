// ============================================================
// SINGLE-FLIGHT / REQUEST COALESCING
// Concurrent identical keys share one upstream promise.
// ============================================================

const inflight = new Map<string, Promise<unknown>>()

/**
 * Runs `fn` at most once per concurrent wave for the same `key`.
 * Duplicate callers await the same promise.
 */
export function singleFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined
  if (existing) return existing
  const p = fn().finally(() => {
    inflight.delete(key)
  }) as Promise<T>
  inflight.set(key, p)
  return p
}

/** Test-only: clear registry between tests */
export function __resetSingleFlightForTests(): void {
  inflight.clear()
}
