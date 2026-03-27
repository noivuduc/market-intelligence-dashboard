// Verbose server logs for options lane + Yahoo chain. Silence with DASHBOARD_OPTIONS_LOG=false

export function optionsDebugEnabled(): boolean {
  return process.env.DASHBOARD_OPTIONS_LOG !== 'false'
}

export function logDashboardOptions(...parts: unknown[]): void {
  if (!optionsDebugEnabled()) return
  console.log('[dashboard-options]', ...parts)
}

export function logYahooOptionsChain(...parts: unknown[]): void {
  if (!optionsDebugEnabled()) return
  console.log('[yahoo-options]', ...parts)
}
