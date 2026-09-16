import type { ISODate, WeekdayIndex } from '../types'

export const HOUR_MS = 60 * 60 * 1000
export const DAY_MS = 24 * HOUR_MS

export function toISODate(d: Date): ISODate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISODate(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function startOfDay(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + days)
  return copy
}

export function addMonths(d: Date, months: number): Date {
  const copy = new Date(d)
  copy.setDate(1)
  copy.setMonth(copy.getMonth() + months)
  return copy
}

export function isSameISODate(a: ISODate, b: ISODate): boolean {
  return a === b
}

/** Monday-starting week. Returns the Monday of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const copy = startOfDay(d)
  const dow = copy.getDay() // 0 = Sunday
  const diff = dow === 0 ? -6 : 1 - dow
  return addDays(copy, diff)
}

export function endOfWeek(d: Date): Date {
  return addDays(startOfWeek(d), 6)
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

/** All 7 dates (Mon-Sun) of the week containing `d`. */
export function daysOfWeek(d: Date): Date[] {
  const start = startOfWeek(d)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/**
 * Weeks (Mon-Sun) that intersect the month containing `d`.
 * Each week reports only the dates that actually fall inside the month.
 */
export function weeksOfMonth(d: Date): { weekStart: Date; datesInMonth: Date[] }[] {
  const monthStart = startOfMonth(d)
  const monthEnd = endOfMonth(d)
  const weeks: { weekStart: Date; datesInMonth: Date[] }[] = []
  let cursor = startOfWeek(monthStart)
  while (cursor <= monthEnd) {
    const week = daysOfWeek(cursor)
    const datesInMonth = week.filter((day) => day >= monthStart && day <= monthEnd)
    if (datesInMonth.length > 0) {
      weeks.push({ weekStart: cursor, datesInMonth })
    }
    cursor = addDays(cursor, 7)
  }
  return weeks
}

export function formatTimeOfDay(ms: number): string {
  const d = new Date(ms)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function formatDayLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

/** e.g. "Sep 14" */
export function formatMonthDay(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatMonthLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function formatMonthName(monthIndex: number): string {
  return new Date(2000, monthIndex, 1).toLocaleDateString(undefined, { month: 'long' })
}

export function formatWeekRangeLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6)
  const sameMonth = weekStart.getMonth() === end.getMonth()
  const startLabel = weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const endLabel = end.toLocaleDateString(
    undefined,
    sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' },
  )
  return `${startLabel} – ${endLabel}`
}

/** Date range for configured workdays within the week containing `weekStart` (Monday). */
export function formatWorkWeekRangeLabel(weekStart: Date, workdays: WeekdayIndex[]): string {
  const workDates = daysOfWeek(weekStart).filter((d) => workdays.includes(d.getDay() as WeekdayIndex))
  if (workDates.length === 0) return formatWeekRangeLabel(weekStart)
  const start = workDates[0]
  const end = workDates[workDates.length - 1]
  const sameMonth = start.getMonth() === end.getMonth()
  const startLabel = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const endLabel = end.toLocaleDateString(
    undefined,
    sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' },
  )
  return `${startLabel} – ${endLabel}`
}

/** Formats a duration in milliseconds as e.g. "3h 25m", "45m", or "-1h 10m". */
export function formatDurationMs(ms: number): string {
  const sign = ms < 0 ? '-' : ''
  const abs = Math.abs(ms)
  const totalMinutes = Math.round(abs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${sign}${minutes}m`
  if (minutes === 0) return `${sign}${hours}h`
  return `${sign}${hours}h ${minutes}m`
}

export function hoursToMs(hours: number): number {
  return hours * HOUR_MS
}

export function combineDateAndTime(date: ISODate, timeOfDay: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeOfDay)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  const d = parseISODate(date)
  d.setHours(hours, minutes, 0, 0)
  return d.getTime()
}

export function toTimeInputValue(ms: number): string {
  const d = new Date(ms)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}
