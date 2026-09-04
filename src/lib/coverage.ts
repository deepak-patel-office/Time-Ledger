import type {
  DayStats,
  ISODate,
  MonthStats,
  RecommendedCheckout,
  Session,
  Settings,
  TimeOffEntry,
  WeekStats,
} from "../types";
import {
  addDays,
  hoursToMs,
  parseISODate,
  startOfWeek,
  toISODate,
  weeksOfMonth,
} from "./date";

export function endOfDayMs(date: ISODate): number {
  const d = parseISODate(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function isWorkday(date: ISODate, settings: Settings): boolean {
  const weekday = parseISODate(date).getDay();
  return settings.workdays.includes(weekday as Settings["workdays"][number]);
}

// A session can never cross midnight, so a stale open session from a past day
// is capped at that day's end rather than counting forever.
export function sessionDurationMs(
  session: Session,
  todayISO: ISODate,
  now: number,
): number {
  const end =
    session.checkOut ??
    (session.date === todayISO ? now : endOfDayMs(session.date));
  return Math.max(0, end - session.checkIn);
}

export function isFullDayOff(entry: TimeOffEntry | null | undefined): boolean {
  return entry?.type === 'leave' || entry?.type === 'holiday'
}

export function computeDayStats(
  date: ISODate,
  sessions: Session[],
  settings: Settings,
  todayISO: ISODate,
  now: number,
  timeOff: TimeOffEntry[] = [],
): DayStats {
  const daySessions = sessions.filter((s) => s.date === date)
  const recordedWorkedMs = daySessions.reduce(
    (sum, s) => sum + sessionDurationMs(s, todayISO, now),
    0,
  )
  const hasOpenSession = daySessions.some((s) => s.checkOut === null)
  const timeOffEntry = timeOff.find((entry) => entry.date === date) ?? null
  const fullDayOff = isFullDayOff(timeOffEntry)
  const halfDay = timeOffEntry?.type === 'half-day'
  const configuredWorkday = isWorkday(date, settings)
  const workday = configuredWorkday && !fullDayOff
  const fullTargetMs = configuredWorkday ? hoursToMs(settings.dailyTargetHours) : 0
  const targetMs = fullDayOff ? 0 : halfDay ? fullTargetMs / 2 : fullTargetMs
  const workedMs = fullDayOff ? 0 : recordedWorkedMs
  const deltaMs = workedMs - targetMs

  let status: DayStats['status']
  if (timeOffEntry?.type === 'leave') {
    status = 'leave'
  } else if (timeOffEntry?.type === 'holiday') {
    status = 'holiday'
  } else if (!workday) {
    status = 'day-off'
  } else if (workedMs === 0 && !hasOpenSession) {
    status = halfDay ? 'half-day' : 'not-started'
  } else if (workedMs < targetMs) {
    status = 'remaining'
  } else if (workedMs === targetMs) {
    status = 'covered'
  } else {
    status = 'overtime'
  }

  return {
    date,
    isWorkday: workday,
    targetMs,
    workedMs,
    recordedWorkedMs,
    deltaMs,
    status,
    hasOpenSession,
    timeOff: timeOffEntry,
  }
}

function sumDayStats(days: DayStats[]): {
  targetMs: number;
  workedMs: number;
  deltaMs: number;
} {
  const targetMs = days.reduce((sum, d) => sum + d.targetMs, 0);
  const workedMs = days.reduce((sum, d) => sum + d.workedMs, 0);
  return { targetMs, workedMs, deltaMs: workedMs - targetMs };
}

export function computeWeekStats(
  weekStartDate: Date,
  sessions: Session[],
  settings: Settings,
  todayISO: ISODate,
  now: number,
  timeOff: TimeOffEntry[] = [],
): WeekStats {
  const days = Array.from({ length: 7 }, (_, i) =>
    computeDayStats(
      toISODate(addDays(weekStartDate, i)),
      sessions,
      settings,
      todayISO,
      now,
      timeOff,
    ),
  );
  const totals = sumDayStats(days);
  return { weekStart: toISODate(weekStartDate), days, ...totals };
}

/**
 * Week carry balance (live): nets prior workdays' shortfall vs overtime.
 * Leave/holiday days contribute 0 (excluded from duty).
 * Half-day days use the reduced target and are included.
 *
 * Today:
 * - Not started → ignore today's duty (don't show full daily hours as to-cover)
 * - Open session → only overtime earned so far (remaining duty not counted)
 * - Checked out → full delta, so early checkout shortfall nets against prior overtime
 */
export function computeWeekCoverBalance(
  week: WeekStats,
  todayISO: ISODate,
): { toCoverMs: number; overtimeMs: number } {
  let netMs = 0
  for (const day of week.days) {
    if (day.date > todayISO) continue
    if (isFullDayOff(day.timeOff)) continue

    if (day.date < todayISO) {
      netMs += day.deltaMs
      continue
    }

    // Today
    if (day.hasOpenSession) {
      netMs += Math.max(0, day.deltaMs)
    } else if (day.workedMs > 0) {
      netMs += day.deltaMs
    }
  }
  return {
    toCoverMs: Math.max(0, -netMs),
    overtimeMs: Math.max(0, netMs),
  }
}

/** @deprecated Prefer computeWeekCoverBalance — returns only the net shortfall. */
export function computeWeekToCoverMs(week: WeekStats, todayISO: ISODate): number {
  return computeWeekCoverBalance(week, todayISO).toCoverMs
}

export function computeMonthStats(
  year: number,
  month: number,
  sessions: Session[],
  settings: Settings,
  todayISO: ISODate,
  now: number,
  timeOff: TimeOffEntry[] = [],
): MonthStats {
  const anchor = new Date(year, month, 1);
  const weeks: WeekStats[] = weeksOfMonth(anchor).map(
    ({ weekStart, datesInMonth }) => {
      const days = datesInMonth.map((d) =>
        computeDayStats(
          toISODate(d),
          sessions,
          settings,
          todayISO,
          now,
          timeOff,
        ),
      );
      const totals = sumDayStats(days);
      return { weekStart: toISODate(weekStart), days, ...totals };
    },
  );
  const totals = sumDayStats(weeks.flatMap((w) => w.days));
  return { year, month, weeks, ...totals };
}

/**
 * Net time from Monday up to (but not including) `beforeDateISO`.
 * Balances intentionally reset at the start of every week.
 */
export function computeWeekBalanceBefore(
  beforeDateISO: ISODate,
  sessions: Session[],
  settings: Settings,
  timeOff: TimeOffEntry[] = [],
): number {
  const end = parseISODate(beforeDateISO);
  let cursor = startOfWeek(end);
  let total = 0;
  while (cursor < end) {
    const iso = toISODate(cursor);
    const stats = computeDayStats(
      iso,
      sessions,
      settings,
      iso,
      endOfDayMs(iso),
      timeOff,
    );
    total += stats.deltaMs;
    cursor = addDays(cursor, 1);
  }
  return total;
}

export function computeWeekBalanceThrough(
  todayISO: ISODate,
  sessions: Session[],
  settings: Settings,
  now: number,
  timeOff: TimeOffEntry[] = [],
): number {
  const before = computeWeekBalanceBefore(
    todayISO,
    sessions,
    settings,
    timeOff,
  );
  const today = computeDayStats(
    todayISO,
    sessions,
    settings,
    todayISO,
    now,
    timeOff,
  );
  return before + today.deltaMs;
}

/** @deprecated Use computeWeekBalanceBefore; balances now reset every week. */
export const computeRollingBalanceBefore = computeWeekBalanceBefore;

/** @deprecated Use computeWeekBalanceThrough; balances now reset every week. */
export const computeRollingBalanceThrough = computeWeekBalanceThrough;

/**
 * Recommended checkout for the open session, adjusted by this week's
 * prior overtime (leave earlier) or shortfall (stay later).
 * Recalculates from live `now` + worked time every tick.
 */
export function computeRecommendedCheckout(
  todayISO: ISODate,
  sessions: Session[],
  settings: Settings,
  now: number,
  timeOff: TimeOffEntry[] = [],
): RecommendedCheckout | null {
  const openSession = sessions.find((s) => s.checkOut === null)
  if (!openSession || openSession.date !== todayISO) return null

  const todayStats = computeDayStats(todayISO, sessions, settings, todayISO, now, timeOff)
  if (isFullDayOff(todayStats.timeOff) || todayStats.targetMs <= 0) return null

  // Same net as week cover balance: prior workdays only (leave/holiday = 0; half-day included)
  let priorNetMs = 0
  const weekStart = startOfWeek(parseISODate(todayISO))
  let cursor = weekStart
  const today = parseISODate(todayISO)
  while (cursor < today) {
    const iso = toISODate(cursor)
    const day = computeDayStats(iso, sessions, settings, iso, endOfDayMs(iso), timeOff)
    if (!isFullDayOff(day.timeOff)) priorNetMs += day.deltaMs
    cursor = addDays(cursor, 1)
  }

  // Overtime banked → need less today; shortfall → need more
  const neededTodayMs = todayStats.targetMs - priorNetMs
  const workedSoFarToday = todayStats.workedMs
  const remainingMs = neededTodayMs - workedSoFarToday

  const openElapsed = Math.max(0, now - openSession.checkIn)
  const workedBeforeOpen = Math.max(0, workedSoFarToday - openElapsed)

  // Anchor to current check-in (same shape as daily expected), shifted by week balance
  const checkoutAt = openSession.checkIn + Math.max(0, neededTodayMs - workedBeforeOpen)

  if (remainingMs <= 0) {
    return {
      alreadyMet: true,
      surplusMs: -remainingMs,
      checkoutAt,
      remainingMs: 0,
    }
  }
  return {
    alreadyMet: false,
    surplusMs: 0,
    checkoutAt,
    remainingMs,
  }
}

/** Expected checkout for today's target (full or half-day) from the open session's check-in. */
export function computeDailyCheckoutFromCheckIn(
  openSession: Session,
  todayStats: DayStats,
  dailyTargetHours: number,
  now: number,
): number {
  const targetMs = todayStats.targetMs > 0 ? todayStats.targetMs : hoursToMs(dailyTargetHours)
  const openElapsed = Math.max(0, now - openSession.checkIn)
  const workedBeforeOpen = Math.max(0, todayStats.workedMs - openElapsed)
  const remaining = Math.max(0, targetMs - workedBeforeOpen)
  return openSession.checkIn + remaining
}

export function weekStartFor(date: Date): Date {
  return startOfWeek(date);
}
