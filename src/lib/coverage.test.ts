import { describe, expect, it } from 'vitest'
import {
  computeDayStats,
  computeMonthStats,
  computeRecommendedCheckout,
  computeWeekBalanceThrough,
  computeWeekCoverBalance,
  computeWeekStats,
  weekStartFor,
} from './coverage'
import { DEFAULT_SETTINGS, type Session, type TimeOffEntry } from '../types'

describe('time off coverage', () => {
  const leave: TimeOffEntry[] = [{ date: '2026-07-06', type: 'leave', note: 'Annual leave' }]
  const sessions: Session[] = [{
    id: 'kept-session',
    date: '2026-07-06',
    checkIn: new Date(2026, 6, 6, 9).getTime(),
    checkOut: new Date(2026, 6, 6, 18).getTime(),
  }]

  it('excludes both target and recorded time without deleting the record', () => {
    const stats = computeDayStats('2026-07-06', sessions, DEFAULT_SETTINGS, '2026-07-06', new Date(2026, 6, 6, 18).getTime(), leave)

    expect(stats.status).toBe('leave')
    expect(stats.targetMs).toBe(0)
    expect(stats.workedMs).toBe(0)
    expect(stats.recordedWorkedMs).toBe(9 * 60 * 60 * 1000)
    expect(stats.deltaMs).toBe(0)
  })

  it('removes leave dates from monthly targets and weekly totals', () => {
    const month = computeMonthStats(2026, 6, [], DEFAULT_SETTINGS, '2026-07-31', new Date(2026, 6, 31, 18).getTime(), leave)
    const leaveDay = month.weeks.flatMap((week) => week.days).find((day) => day.date === '2026-07-06')

    expect(leaveDay?.targetMs).toBe(0)
    expect(month.targetMs).toBe(22 * 9 * 60 * 60 * 1000)
  })
})

describe('weekly balance boundaries', () => {
  function session(id: string, date: string, startHour: number, endHour: number): Session {
    const [year, month, day] = date.split('-').map(Number)
    return {
      id,
      date,
      checkIn: new Date(year, month - 1, day, startHour).getTime(),
      checkOut: new Date(year, month - 1, day, endHour).getTime(),
    }
  }

  it('does not carry surplus time from the previous week into checkout guidance', () => {
    const monday = '2026-07-13'
    const mondayStart = new Date(2026, 6, 13, 9).getTime()
    const now = new Date(2026, 6, 13, 10).getTime()
    const sessions: Session[] = [
      session('previous-friday', '2026-07-10', 8, 20),
      { id: 'open-monday', date: monday, checkIn: mondayStart, checkOut: null },
    ]

    const recommendation = computeRecommendedCheckout(monday, sessions, DEFAULT_SETTINGS, now)

    expect(recommendation?.remainingMs).toBe(8 * 60 * 60 * 1000)
    expect(recommendation?.checkoutAt).toBe(new Date(2026, 6, 13, 18).getTime())
  })

  it('pushes checkout later when prior days are short', () => {
    const tuesday = '2026-07-14'
    const now = new Date(2026, 6, 14, 10).getTime()
    const sessions: Session[] = [
      // Mon: 8h30 → −30m shortfall
      {
        id: 'monday',
        date: '2026-07-13',
        checkIn: new Date(2026, 6, 13, 9).getTime(),
        checkOut: new Date(2026, 6, 13, 17, 30).getTime(),
      },
      { id: 'open-tuesday', date: tuesday, checkIn: new Date(2026, 6, 14, 9).getTime(), checkOut: null },
    ]

    const recommendation = computeRecommendedCheckout(tuesday, sessions, DEFAULT_SETTINGS, now)

    // Need 9h30 today → checkout 6:30 PM
    expect(recommendation?.remainingMs).toBe(8.5 * 60 * 60 * 1000)
    expect(recommendation?.checkoutAt).toBe(new Date(2026, 6, 14, 18, 30).getTime())
  })

  it('pulls checkout earlier when prior days have overtime', () => {
    const tuesday = '2026-07-14'
    const now = new Date(2026, 6, 14, 10).getTime()
    const sessions: Session[] = [
      // Mon: 9h45 → +45m overtime
      {
        id: 'monday',
        date: '2026-07-13',
        checkIn: new Date(2026, 6, 13, 9).getTime(),
        checkOut: new Date(2026, 6, 13, 18, 45).getTime(),
      },
      { id: 'open-tuesday', date: tuesday, checkIn: new Date(2026, 6, 14, 9).getTime(), checkOut: null },
    ]

    const recommendation = computeRecommendedCheckout(tuesday, sessions, DEFAULT_SETTINGS, now)

    // Need 8h15 today → checkout 5:15 PM
    expect(recommendation?.remainingMs).toBe(7.25 * 60 * 60 * 1000)
    expect(recommendation?.checkoutAt).toBe(new Date(2026, 6, 14, 17, 15).getTime())
  })

  it('reports only the current week in the balance summary', () => {
    const now = new Date(2026, 6, 13, 18).getTime()
    const sessions = [
      session('previous-friday', '2026-07-10', 9, 18),
      session('current-monday', '2026-07-13', 9, 17),
    ]

    expect(computeWeekBalanceThrough('2026-07-13', sessions, DEFAULT_SETTINGS, now)).toBe(-60 * 60 * 1000)
  })
})

describe('computeWeekCoverBalance', () => {
  const min = 60 * 1000

  function session(id: string, date: string, startHour: number, endHour: number, endMin = 0) {
    const [year, month, day] = date.split('-').map(Number)
    return {
      id,
      date,
      checkIn: new Date(year, month - 1, day, startHour).getTime(),
      checkOut: new Date(year, month - 1, day, endHour, endMin).getTime(),
    }
  }

  it('shows only prior shortfalls on a fresh morning — not today’s duty hours', () => {
    const wednesday = '2026-08-05'
    const weekStart = weekStartFor(new Date(2026, 7, 5))
    // Mon: 15 min short of 9h, Tue: 10 min short of 9h
    const sessions = [
      session('mon', '2026-08-03', 9, 17, 45),
      session('tue', '2026-08-04', 9, 17, 50),
    ]
    const week = computeWeekStats(weekStart, sessions, DEFAULT_SETTINGS, wednesday, new Date(2026, 7, 5, 9).getTime(), [])
    const balance = computeWeekCoverBalance(week, wednesday)

    expect(balance.toCoverMs).toBe(25 * min)
    expect(balance.overtimeMs).toBe(0)
  })

  it('nets overtime against shortfall', () => {
    const wednesday = '2026-08-05'
    const weekStart = weekStartFor(new Date(2026, 7, 5))
    // Mon: +45 min, Tue: -15 min → net +30 overtime
    const sessions = [
      session('mon', '2026-08-03', 9, 18, 45),
      session('tue', '2026-08-04', 9, 17, 45),
    ]
    const week = computeWeekStats(weekStart, sessions, DEFAULT_SETTINGS, wednesday, new Date(2026, 7, 5, 9).getTime(), [])
    const balance = computeWeekCoverBalance(week, wednesday)

    expect(balance.toCoverMs).toBe(0)
    expect(balance.overtimeMs).toBe(30 * min)
  })

  it('does not count today’s unfinished target, but today’s overtime can offset prior shortfall', () => {
    const tuesday = '2026-08-04'
    const weekStart = weekStartFor(new Date(2026, 7, 4))
    const sessions = [
      session('mon', '2026-08-03', 9, 17, 30), // -30 min
      session('tue', '2026-08-04', 8, 17, 45), // +45 min overtime today
    ]
    const week = computeWeekStats(weekStart, sessions, DEFAULT_SETTINGS, tuesday, new Date(2026, 7, 4, 18).getTime(), [])
    const balance = computeWeekCoverBalance(week, tuesday)

    expect(balance.toCoverMs).toBe(0)
    expect(balance.overtimeMs).toBe(15 * min)
  })

  it('after early checkout today, nets today’s shortfall against prior overtime', () => {
    const tuesday = '2026-08-04'
    const weekStart = weekStartFor(new Date(2026, 7, 4))
    // Mon +45m overtime, Tue checked out 50m early → net 5m to cover
    const sessions = [
      session('mon', '2026-08-03', 9, 18, 45),
      session('tue', '2026-08-04', 9, 17, 10),
    ]
    const week = computeWeekStats(weekStart, sessions, DEFAULT_SETTINGS, tuesday, new Date(2026, 7, 4, 18).getTime(), [])
    const balance = computeWeekCoverBalance(week, tuesday)

    expect(balance.toCoverMs).toBe(5 * min)
    expect(balance.overtimeMs).toBe(0)
  })

  it('while still checked in, does not treat remaining duty as to-cover', () => {
    const tuesday = '2026-08-04'
    const weekStart = weekStartFor(new Date(2026, 7, 4))
    const sessions = [
      session('mon', '2026-08-03', 9, 18, 45), // +45m
      {
        id: 'tue-open',
        date: tuesday,
        checkIn: new Date(2026, 7, 4, 9).getTime(),
        checkOut: null,
      },
    ]
    // 1 hour into the day — still ~8h under target; prior +45 should still show as overtime
    const week = computeWeekStats(weekStart, sessions, DEFAULT_SETTINGS, tuesday, new Date(2026, 7, 4, 10).getTime(), [])
    const balance = computeWeekCoverBalance(week, tuesday)

    expect(balance.toCoverMs).toBe(0)
    expect(balance.overtimeMs).toBe(45 * min)
  })

  it('excludes leave/holiday from week target and from to-cover shortfall', () => {
    const wednesday = '2026-08-05'
    const weekStart = weekStartFor(new Date(2026, 7, 5))
    // Mon short 15m; Tue leave (would have been empty / short if still a workday)
    const sessions = [session('mon', '2026-08-03', 9, 17, 45)]
    const timeOff = [{ date: '2026-08-04', type: 'leave' as const }]
    const week = computeWeekStats(
      weekStart,
      sessions,
      DEFAULT_SETTINGS,
      wednesday,
      new Date(2026, 7, 5, 9).getTime(),
      timeOff,
    )
    const tue = week.days.find((d) => d.date === '2026-08-04')
    expect(tue?.status).toBe('leave')
    expect(tue?.targetMs).toBe(0)
    expect(week.targetMs).toBe(4 * 9 * 60 * 60 * 1000) // Wed–Fri still in week target, Mon worked day counted, Tue excluded

    const balance = computeWeekCoverBalance(week, wednesday)
    expect(balance.toCoverMs).toBe(15 * min)
    expect(balance.overtimeMs).toBe(0)
  })

  it('marks holiday status and excludes it from cover balance', () => {
    const tuesday = '2026-08-04'
    const weekStart = weekStartFor(new Date(2026, 7, 4))
    const timeOff = [{ date: '2026-08-03', type: 'holiday' as const }]
    const week = computeWeekStats(weekStart, [], DEFAULT_SETTINGS, tuesday, new Date(2026, 7, 4, 9).getTime(), timeOff)
    const mon = week.days.find((d) => d.date === '2026-08-03')
    expect(mon?.status).toBe('holiday')
    expect(computeWeekCoverBalance(week, tuesday).toCoverMs).toBe(0)
  })

  it('halves the daily target for half-day and includes it in week balance', () => {
    const tuesday = '2026-08-04'
    const weekStart = weekStartFor(new Date(2026, 7, 4))
    const timeOff = [{ date: '2026-08-03', type: 'half-day' as const }]
    const sessions = [
      {
        id: 'mon',
        date: '2026-08-03',
        checkIn: new Date(2026, 7, 3, 9).getTime(),
        checkOut: new Date(2026, 7, 3, 13, 30).getTime(), // exactly 4h30
      },
    ]
    const week = computeWeekStats(
      weekStart,
      sessions,
      DEFAULT_SETTINGS,
      tuesday,
      new Date(2026, 7, 4, 9).getTime(),
      timeOff,
    )
    const mon = week.days.find((d) => d.date === '2026-08-03')
    expect(mon?.targetMs).toBe(4.5 * 60 * 60 * 1000)
    expect(mon?.workedMs).toBe(4.5 * 60 * 60 * 1000)
    expect(mon?.deltaMs).toBe(0)
    expect(mon?.isWorkday).toBe(true)
    expect(computeWeekCoverBalance(week, tuesday).toCoverMs).toBe(0)
    expect(computeWeekCoverBalance(week, tuesday).overtimeMs).toBe(0)
  })
})
