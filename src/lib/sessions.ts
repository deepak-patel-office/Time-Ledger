import type { ISODate, Session, Settings, TimeOffEntry, WeekdayIndex } from '../types'
import { addDays, formatDayLabel, parseISODate, startOfWeek, toISODate } from './date'
import { isWorkday } from './coverage'

export interface SessionInput {
  id?: string
  date: ISODate
  checkIn: number
  checkOut: number | null
}

export type ValidationResult = { ok: true } | { ok: false; error: string }

export function hasCompletedSessionForDate(date: ISODate, sessions: Session[]): boolean {
  return sessions.some((s) => s.date === date && s.checkOut !== null)
}

export function hasTimeOffForDate(date: ISODate, timeOff: TimeOffEntry[]): boolean {
  return timeOff.some((entry) => entry.date === date)
}

/** Configured workdays earlier in the same week that lack a session or leave/holiday entry.
 * Half-day alone is not enough — a completed session is still required.
 */
export function getUnresolvedPriorWorkdays(
  date: ISODate,
  sessions: Session[],
  settings: Settings,
  timeOff: TimeOffEntry[],
): ISODate[] {
  const target = parseISODate(date)
  const unresolved: ISODate[] = []
  let cursor = startOfWeek(target)

  while (cursor < target) {
    const iso = toISODate(cursor)
    const weekday = cursor.getDay() as WeekdayIndex

    if (!settings.workdays.includes(weekday)) {
      cursor = addDays(cursor, 1)
      continue
    }

    const entry = timeOff.find((item) => item.date === iso)
    const hasSession = hasCompletedSessionForDate(iso, sessions)

    if (entry?.type === 'leave' || entry?.type === 'holiday') {
      cursor = addDays(cursor, 1)
      continue
    }

    // Half-day or normal workday both need a completed session
    if (!hasSession) {
      unresolved.push(iso)
    }

    cursor = addDays(cursor, 1)
  }

  return unresolved
}

export function validatePriorWorkdaysInWeek(
  date: ISODate,
  sessions: Session[],
  settings: Settings,
  timeOff: TimeOffEntry[],
): ValidationResult {
  const unresolved = getUnresolvedPriorWorkdays(date, sessions, settings, timeOff)
  if (unresolved.length === 0) return { ok: true }

  const labels = unresolved.map((d) => formatDayLabel(parseISODate(d))).join(', ')
  const dayLabel = formatDayLabel(parseISODate(date))
  return {
    ok: false,
    error: `Before updating ${dayLabel}, please log time or mark leave/holiday for previous workdays: ${labels}. Half-day days also need a session logged.`,
  }
}

/** Past days can only be marked half-day after a completed session exists for that day. */
export function validateHalfDayRequiresSession(
  date: ISODate,
  type: TimeOffEntry['type'],
  sessions: Session[],
  todayISO: ISODate,
): ValidationResult {
  if (type !== 'half-day') return { ok: true }
  if (date >= todayISO) return { ok: true }
  if (hasCompletedSessionForDate(date, sessions)) return { ok: true }
  return {
    ok: false,
    error: 'Add a completed session for this past day before marking half day.',
  }
}

/** Leave/holiday need check-out first; half-day on today is allowed while still checked in. */
export function validateTimeOffWithOpenSession(
  date: ISODate,
  type: TimeOffEntry['type'],
  sessions: Session[],
  todayISO: ISODate,
): ValidationResult {
  const openOnDay = sessions.some((s) => s.date === date && s.checkOut === null)
  if (!openOnDay) return { ok: true }
  if (type === 'half-day' && date === todayISO) return { ok: true }
  return {
    ok: false,
    error: 'Check out first before marking leave or holiday.',
  }
}

/** @deprecated Use validatePriorWorkdaysInWeek */
export const validatePriorWorkdaysForCheckIn = validatePriorWorkdaysInWeek

/** While a session is still open, later days in the same week cannot be updated until check-out. */
export function validateOpenSessionBlocksFollowingDays(date: ISODate, sessions: Session[]): ValidationResult {
  const openSession = sessions.find((s) => s.checkOut === null)
  if (!openSession) return { ok: true }
  if (date <= openSession.date) return { ok: true }

  const dayLabel = formatDayLabel(parseISODate(date))
  const openLabel = formatDayLabel(parseISODate(openSession.date))
  return {
    ok: false,
    error: `Check out from ${openLabel} before updating ${dayLabel}.`,
  }
}

export function isDayBlockedByOpenSession(date: ISODate, sessions: Session[]): boolean {
  const openSession = sessions.find((s) => s.checkOut === null)
  if (!openSession) return false
  return date > openSession.date
}

export function validateSession(
  candidate: SessionInput,
  allSessions: Session[],
  excludingId?: string,
  now?: number,
): ValidationResult {
  if (toISODate(new Date(candidate.checkIn)) !== candidate.date) {
    return { ok: false, error: 'Check-in must be on the selected date.' }
  }
  if (candidate.checkOut !== null && toISODate(new Date(candidate.checkOut)) !== candidate.date) {
    return { ok: false, error: 'Check-out must be on the selected date.' }
  }

  if (now !== undefined) {
    const todayISO = toISODate(new Date(now))
    if (candidate.date > todayISO) {
      return { ok: false, error: 'Future dates cannot be updated.' }
    }
    if (candidate.checkOut === null && candidate.date < todayISO) {
      return { ok: false, error: 'Past sessions need a check-out time.' }
    }
    if (candidate.checkIn > now || (candidate.checkOut !== null && candidate.checkOut > now)) {
      return { ok: false, error: 'Session times cannot be in the future.' }
    }
  }

  if (candidate.checkOut !== null && candidate.checkOut <= candidate.checkIn) {
    return { ok: false, error: 'Check-out must be after check-in.' }
  }

  const others = allSessions.filter((s) => s.id !== excludingId && s.id !== candidate.id)

  // New session: cannot add while another session is still open on the same day
  const isNewSession = !candidate.id && !excludingId
  if (isNewSession) {
    const openOnSameDay = others.find((s) => s.date === candidate.date && s.checkOut === null)
    if (openOnSameDay) {
      return {
        ok: false,
        error: 'Check out the open session on this day before adding another.',
      }
    }
  }

  if (candidate.checkOut === null) {
    const otherOpen = others.find((s) => s.checkOut === null)
    if (otherOpen) {
      return {
        ok: false,
        error: `Already checked in since ${new Date(otherOpen.checkIn).toLocaleString()}. Check out first.`,
      }
    }
  }

  const sameDayOthers = others.filter((s) => s.date === candidate.date)
  const candidateEnd = candidate.checkOut ?? Number.POSITIVE_INFINITY
  for (const other of sameDayOthers) {
    const otherEnd = other.checkOut ?? Number.POSITIVE_INFINITY
    const overlaps = candidate.checkIn < otherEnd && other.checkIn < candidateEnd
    if (overlaps) {
      return { ok: false, error: 'This overlaps with another session on this day.' }
    }
  }

  return { ok: true }
}

export function validateCanRemoveSession(
  sessionId: string,
  sessions: Session[],
  settings: Settings,
  timeOff: TimeOffEntry[],
  todayISO: ISODate,
): ValidationResult {
  const target = sessions.find((s) => s.id === sessionId)
  if (!target) return { ok: false, error: 'Session not found.' }
  const timeOffEntry = timeOff.find((entry) => entry.date === target.date)
  // Leave/holiday resolve the day without a session; half-day still needs one.
  if (
    target.date >= todayISO ||
    !isWorkday(target.date, settings) ||
    timeOffEntry?.type === 'leave' ||
    timeOffEntry?.type === 'holiday'
  ) {
    return { ok: true }
  }

  const remainingSessions = sessions.filter((s) => s.id !== sessionId)
  if (hasCompletedSessionForDate(target.date, remainingSessions)) return { ok: true }

  return {
    ok: false,
    error: 'Previous workdays cannot be left blank. Keep at least one completed session or mark leave/holiday.',
  }
}

export function validateCanRemoveTimeOff(
  date: ISODate,
  sessions: Session[],
  settings: Settings,
  todayISO: ISODate,
): ValidationResult {
  if (date >= todayISO || !isWorkday(date, settings) || hasCompletedSessionForDate(date, sessions)) {
    return { ok: true }
  }

  return {
    ok: false,
    error: 'Previous workdays cannot be left blank. Keep at least one completed session or mark leave/holiday.',
  }
}
