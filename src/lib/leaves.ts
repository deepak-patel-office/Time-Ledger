import type { ISODate, Settings, TimeOffEntry, TimeOffType } from '../types'
import { parseISODate, toISODate } from './date'

export interface FinancialYearBounds {
  start: Date
  end: Date
  /** e.g. "FY 2025–26" */
  label: string
  startISO: ISODate
  endISO: ISODate
}

export interface LeaveBalance {
  fy: FinancialYearBounds
  /** Leave days credited so far this FY (1 per month elapsed, capped). */
  accrued: number
  /** Leave days used this FY (leave = 1, half-day = 0.5, holiday = 0). */
  taken: number
  /** accrued − taken */
  remaining: number
  /** Leave days used in the current calendar month. */
  thisMonthTaken: number
  thisMonthLeaveCount: number
  thisMonthHalfDayCount: number
  annualLeaveDays: number
  leavePerMonth: number
}

/** How many leave-quota days an entry consumes. Holiday does not use quota. */
export function leaveQuotaCost(type: TimeOffType): number {
  if (type === 'leave') return 1
  if (type === 'half-day') return 0.5
  return 0
}

/**
 * Indian-style FY by default: April (month 3) → next March.
 * Example: 15 Sep 2026 → FY 2026–27 (1 Apr 2026 … 31 Mar 2027).
 */
export function financialYearBounds(
  referenceDate: Date,
  fyStartMonth = 3,
): FinancialYearBounds {
  const y = referenceDate.getFullYear()
  const m = referenceDate.getMonth()
  const startYear = m >= fyStartMonth ? y : y - 1
  const start = new Date(startYear, fyStartMonth, 1)
  const end = new Date(startYear + 1, fyStartMonth, 0) // last day of month before next FY
  end.setHours(23, 59, 59, 999)
  const endYearShort = String((startYear + 1) % 100).padStart(2, '0')
  return {
    start,
    end,
    label: `FY ${startYear}–${endYearShort}`,
    startISO: toISODate(start),
    endISO: toISODate(end),
  }
}

/** Number of FY months that have started on or before `referenceDate` (1–12). */
export function monthsElapsedInFinancialYear(
  referenceDate: Date,
  fyStartMonth = 3,
): number {
  const fy = financialYearBounds(referenceDate, fyStartMonth)
  const months =
    (referenceDate.getFullYear() - fy.start.getFullYear()) * 12 +
    (referenceDate.getMonth() - fy.start.getMonth()) +
    1
  return Math.min(12, Math.max(1, months))
}

export function computeLeaveBalance(
  timeOff: TimeOffEntry[],
  settings: Settings,
  referenceDate = new Date(),
): LeaveBalance {
  const annualLeaveDays =
    typeof settings.annualLeaveDays === 'number' && Number.isFinite(settings.annualLeaveDays)
      ? settings.annualLeaveDays
      : 12
  const leavePerMonth =
    typeof settings.leavePerMonth === 'number' && Number.isFinite(settings.leavePerMonth)
      ? settings.leavePerMonth
      : 1
  const fyStartMonth =
    typeof settings.financialYearStartMonth === 'number' &&
    Number.isInteger(settings.financialYearStartMonth)
      ? settings.financialYearStartMonth
      : 3

  const fy = financialYearBounds(referenceDate, fyStartMonth)
  const elapsed = monthsElapsedInFinancialYear(referenceDate, fyStartMonth)
  const accrued = Math.min(annualLeaveDays, elapsed * leavePerMonth)

  const fyEntries = timeOff.filter((e) => e.date >= fy.startISO && e.date <= fy.endISO)
  const taken = fyEntries.reduce((sum, e) => sum + leaveQuotaCost(e.type), 0)

  const monthPrefix = toISODate(referenceDate).slice(0, 7)
  const monthEntries = fyEntries.filter((e) => e.date.startsWith(monthPrefix))
  const thisMonthTaken = monthEntries.reduce((sum, e) => sum + leaveQuotaCost(e.type), 0)
  const thisMonthLeaveCount = monthEntries.filter((e) => e.type === 'leave').length
  const thisMonthHalfDayCount = monthEntries.filter((e) => e.type === 'half-day').length

  return {
    fy,
    accrued,
    taken,
    remaining: Math.max(0, accrued - taken),
    thisMonthTaken,
    thisMonthLeaveCount,
    thisMonthHalfDayCount,
    annualLeaveDays,
    leavePerMonth,
  }
}

/**
 * When changing time-off on a date, how much additional quota is needed
 * (positive = consumes more, negative = frees quota).
 */
export function additionalLeaveQuotaNeeded(
  timeOff: TimeOffEntry[],
  date: ISODate,
  nextType: TimeOffType | 'none',
): number {
  const current = timeOff.find((e) => e.date === date)
  const currentCost = current ? leaveQuotaCost(current.type) : 0
  const nextCost = nextType === 'none' ? 0 : leaveQuotaCost(nextType)
  return nextCost - currentCost
}

export function canAffordLeaveQuota(
  timeOff: TimeOffEntry[],
  settings: Settings,
  date: ISODate,
  nextType: TimeOffType | 'none',
  referenceDate = new Date(),
): { ok: true } | { ok: false; error: string } {
  const needed = additionalLeaveQuotaNeeded(timeOff, date, nextType)
  if (needed <= 0) return { ok: true }

  const balance = computeLeaveBalance(timeOff, settings, referenceDate)
  // Only enforce for dates inside the current FY
  if (date < balance.fy.startISO || date > balance.fy.endISO) return { ok: true }

  if (balance.remaining + 1e-9 < needed) {
    const label = nextType === 'half-day' ? 'half day' : 'leave'
    return {
      ok: false,
      error: `Not enough leave balance for this ${label}. ${formatLeaveDays(balance.remaining)} left in ${balance.fy.label}.`,
    }
  }
  return { ok: true }
}

export function formatLeaveDays(n: number): string {
  if (!Number.isFinite(n)) return '0 days'
  const rounded = Math.round(n * 10) / 10
  if (Number.isInteger(rounded)) return `${rounded} day${rounded === 1 ? '' : 's'}`
  return `${rounded} days`
}

/** Earliest ISO date to keep when pruning storage to the active financial year. */
export function financialYearPruneStartISO(
  referenceDate = new Date(),
  fyStartMonth = 3,
): ISODate {
  return financialYearBounds(referenceDate, fyStartMonth).startISO
}

export function isDateInFinancialYear(
  date: ISODate,
  referenceDate: Date,
  fyStartMonth: number,
): boolean {
  const fy = financialYearBounds(referenceDate, fyStartMonth)
  return date >= fy.startISO && date <= fy.endISO
}

/** Month labels from FY start for display (e.g. Apr … Mar). */
export function financialYearMonthLabels(fyStartMonth = 3): string[] {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return Array.from({ length: 12 }, (_, i) => names[(fyStartMonth + i) % 12])
}

export function parseISODateSafe(date: ISODate): Date {
  return parseISODate(date)
}
