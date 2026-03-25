// ============================================================
// FOMC CALENDAR
// Source: Federal Reserve (https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm)
// Update this file when new dates are published.
// Last updated: 2026-03 — 2026 dates from federalreserve.gov/monetarypolicy/fomccalendars.htm
// ============================================================

export interface FOMCMeeting {
  startDate:    string   // ISO date
  endDate:      string
  statementDate:string
  minutesDate?: string
  projection:   boolean  // SEP/dot plot released at this meeting
  label:        string
}

export const FOMC_MEETINGS_2024: FOMCMeeting[] = [
  {
    startDate: '2024-01-30', endDate: '2024-01-31', statementDate: '2024-01-31',
    minutesDate: '2024-02-21', projection: false, label: 'Jan 2024',
  },
  {
    startDate: '2024-03-19', endDate: '2024-03-20', statementDate: '2024-03-20',
    minutesDate: '2024-04-10', projection: true, label: 'Mar 2024 (SEP)',
  },
  {
    startDate: '2024-04-30', endDate: '2024-05-01', statementDate: '2024-05-01',
    minutesDate: '2024-05-22', projection: false, label: 'May 2024',
  },
  {
    startDate: '2024-06-11', endDate: '2024-06-12', statementDate: '2024-06-12',
    minutesDate: '2024-07-03', projection: true, label: 'Jun 2024 (SEP)',
  },
  {
    startDate: '2024-07-30', endDate: '2024-07-31', statementDate: '2024-07-31',
    minutesDate: '2024-08-21', projection: false, label: 'Jul 2024',
  },
  {
    startDate: '2024-09-17', endDate: '2024-09-18', statementDate: '2024-09-18',
    minutesDate: '2024-10-09', projection: true, label: 'Sep 2024 (SEP)',
  },
  {
    startDate: '2024-11-06', endDate: '2024-11-07', statementDate: '2024-11-07',
    minutesDate: '2024-11-26', projection: false, label: 'Nov 2024',
  },
  {
    startDate: '2024-12-17', endDate: '2024-12-18', statementDate: '2024-12-18',
    minutesDate: '2025-01-08', projection: true, label: 'Dec 2024 (SEP)',
  },
]

export const FOMC_MEETINGS_2025: FOMCMeeting[] = [
  {
    startDate: '2025-01-28', endDate: '2025-01-29', statementDate: '2025-01-29',
    minutesDate: '2025-02-19', projection: false, label: 'Jan 2025',
  },
  {
    startDate: '2025-03-18', endDate: '2025-03-19', statementDate: '2025-03-19',
    minutesDate: '2025-04-09', projection: true, label: 'Mar 2025 (SEP)',
  },
  {
    startDate: '2025-05-06', endDate: '2025-05-07', statementDate: '2025-05-07',
    minutesDate: '2025-05-28', projection: false, label: 'May 2025',
  },
  {
    startDate: '2025-06-17', endDate: '2025-06-18', statementDate: '2025-06-18',
    minutesDate: '2025-07-09', projection: true, label: 'Jun 2025 (SEP)',
  },
  {
    startDate: '2025-07-29', endDate: '2025-07-30', statementDate: '2025-07-30',
    minutesDate: '2025-08-20', projection: false, label: 'Jul 2025',
  },
  {
    startDate: '2025-09-16', endDate: '2025-09-17', statementDate: '2025-09-17',
    minutesDate: '2025-10-08', projection: true, label: 'Sep 2025 (SEP)',
  },
  {
    startDate: '2025-10-28', endDate: '2025-10-29', statementDate: '2025-10-29',
    minutesDate: '2025-11-19', projection: false, label: 'Oct 2025',
  },
  {
    startDate: '2025-12-09', endDate: '2025-12-10', statementDate: '2025-12-10',
    minutesDate: '2026-01-07', projection: true, label: 'Dec 2025 (SEP)',
  },
]

export const FOMC_MEETINGS_2026: FOMCMeeting[] = [
  {
    startDate: '2026-01-27', endDate: '2026-01-28', statementDate: '2026-01-28',
    minutesDate: '2026-02-18', projection: false, label: 'Jan 2026',
  },
  {
    startDate: '2026-03-17', endDate: '2026-03-18', statementDate: '2026-03-18',
    minutesDate: '2026-04-08', projection: true, label: 'Mar 2026 (SEP)',
  },
  {
    startDate: '2026-04-28', endDate: '2026-04-29', statementDate: '2026-04-29',
    minutesDate: '2026-05-20', projection: false, label: 'Apr 2026',
  },
  {
    startDate: '2026-06-16', endDate: '2026-06-17', statementDate: '2026-06-17',
    minutesDate: '2026-07-08', projection: true, label: 'Jun 2026 (SEP)',
  },
  {
    startDate: '2026-07-28', endDate: '2026-07-29', statementDate: '2026-07-29',
    minutesDate: '2026-08-19', projection: false, label: 'Jul 2026',
  },
  {
    startDate: '2026-09-15', endDate: '2026-09-16', statementDate: '2026-09-16',
    minutesDate: '2026-10-07', projection: true, label: 'Sep 2026 (SEP)',
  },
  {
    startDate: '2026-10-27', endDate: '2026-10-28', statementDate: '2026-10-28',
    minutesDate: '2026-11-18', projection: false, label: 'Oct 2026',
  },
  {
    startDate: '2026-12-08', endDate: '2026-12-09', statementDate: '2026-12-09',
    minutesDate: '2027-01-06', projection: true, label: 'Dec 2026 (SEP)',
  },
]

export const ALL_FOMC = [...FOMC_MEETINGS_2024, ...FOMC_MEETINGS_2025, ...FOMC_MEETINGS_2026]

/** Returns the next upcoming FOMC meeting from today */
export function getNextFOMC(): FOMCMeeting | null {
  const today = new Date().toISOString().split('T')[0]!
  return ALL_FOMC.find(m => m.statementDate >= today) ?? null
}

/** Returns the most recently completed FOMC meeting */
export function getLastFOMC(): FOMCMeeting | null {
  const today = new Date().toISOString().split('T')[0]!
  const past = ALL_FOMC.filter(m => m.statementDate < today)
  return past[past.length - 1] ?? null
}

/** Days until next FOMC statement */
export function daysToNextFOMC(): number | null {
  const next = getNextFOMC()
  if (!next) return null
  return Math.ceil(
    (new Date(next.statementDate + 'T12:00:00Z').getTime() - Date.now()) / 86_400_000
  )
}

/** User-facing note when the static schedule needs extending */
export function fomcCoverageCaveat(): string | undefined {
  if (getNextFOMC()) return undefined
  return 'No upcoming FOMC in bundled schedule — extend fomc-calendar.ts when the Fed publishes new meeting dates.'
}
