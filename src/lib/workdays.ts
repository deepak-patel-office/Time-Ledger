import type { Session, Settings, TimeOffEntry } from '../types'
import { formatMonthLabel, toISODate } from './date'
import { financialYearBounds } from './leaves'

/** Unique calendar days in a month where the user checked in (any session). */
export function countDaysWorkedInMonth(sessions: Session[], monthPrefix: string): number {
  return new Set(sessions.filter((s) => s.date.startsWith(monthPrefix)).map((s) => s.date)).size
}

export interface MonthWorkSummary {
  monthPrefix: string
  label: string
  year: number
  month: number
  daysWorked: number
  leaveCount: number
  holidayCount: number
  halfDayCount: number
  isCurrent: boolean
  isFuture: boolean
}

/** Per-month worked days + leave counts for the active financial year. */
export function monthlyWorkSummaryForFinancialYear(
  sessions: Session[],
  timeOff: TimeOffEntry[],
  settings: Settings,
  referenceDate = new Date(),
): MonthWorkSummary[] {
  const fyStartMonth =
    typeof settings.financialYearStartMonth === 'number' ? settings.financialYearStartMonth : 3
  const fy = financialYearBounds(referenceDate, fyStartMonth)
  const currentPrefix = toISODate(referenceDate).slice(0, 7)
  const rows: MonthWorkSummary[] = []

  for (let i = 0; i < 12; i += 1) {
    const year = fy.start.getFullYear() + Math.floor((fy.start.getMonth() + i) / 12)
    const month = (fy.start.getMonth() + i) % 12
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
    const monthEntries = timeOff.filter((e) => e.date.startsWith(prefix))
    rows.push({
      monthPrefix: prefix,
      label: formatMonthLabel(new Date(year, month, 1)),
      year,
      month,
      daysWorked: countDaysWorkedInMonth(sessions, prefix),
      leaveCount: monthEntries.filter((e) => e.type === 'leave').length,
      holidayCount: monthEntries.filter((e) => e.type === 'holiday').length,
      halfDayCount: monthEntries.filter((e) => e.type === 'half-day').length,
      isCurrent: prefix === currentPrefix,
      isFuture: prefix > currentPrefix,
    })
  }

  return rows
}
