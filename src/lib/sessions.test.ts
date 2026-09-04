import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, type Settings } from '../types'
import {
  getUnresolvedPriorWorkdays,
  validateCanRemoveSession,
  validateCanRemoveTimeOff,
  validateHalfDayRequiresSession,
  validateOpenSessionBlocksFollowingDays,
  validatePriorWorkdaysForCheckIn,
  validateSession,
  validateTimeOffWithOpenSession,
} from './sessions'

const settings: Settings = { ...DEFAULT_SETTINGS, workdays: [1, 2, 3, 4, 5] }

describe('validatePriorWorkdaysForCheckIn', () => {
  it('allows check-in on Monday with no prior days in the week', () => {
    const result = validatePriorWorkdaysForCheckIn('2026-08-03', [], settings, [])
    expect(result.ok).toBe(true)
  })

  it('blocks Wednesday check-in when Monday and Tuesday are empty', () => {
    const result = validatePriorWorkdaysForCheckIn('2026-08-05', [], settings, [])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('Mon')
      expect(result.error).toContain('Tue')
    }
  })

  it('allows Wednesday when Monday has a session and Tuesday is on leave', () => {
    const sessions = [{ id: '1', date: '2026-08-03', checkIn: 0, checkOut: 1000 }]
    const timeOff = [{ date: '2026-08-04', type: 'leave' as const }]
    const result = validatePriorWorkdaysForCheckIn('2026-08-05', sessions, settings, timeOff)
    expect(result.ok).toBe(true)
  })

  it('allows later days when a prior day is holiday without a session', () => {
    const sessions = [{ id: '1', date: '2026-08-03', checkIn: 0, checkOut: 1000 }]
    const timeOff = [{ date: '2026-08-04', type: 'holiday' as const }]
    expect(validatePriorWorkdaysForCheckIn('2026-08-05', sessions, settings, timeOff).ok).toBe(true)
  })

  it('blocks later days when a prior half-day has no completed session', () => {
    const timeOff = [{ date: '2026-08-03', type: 'half-day' as const, note: 'Doctor' }]
    const result = validatePriorWorkdaysForCheckIn('2026-08-04', [], settings, timeOff)
    expect(result.ok).toBe(false)
  })

  it('allows later days when prior half-day has a completed session', () => {
    const sessions = [{ id: '1', date: '2026-08-03', checkIn: 0, checkOut: 1000 }]
    const timeOff = [{ date: '2026-08-03', type: 'half-day' as const, note: 'Doctor' }]
    expect(validatePriorWorkdaysForCheckIn('2026-08-04', sessions, settings, timeOff).ok).toBe(true)
  })

  it('blocks marking half-day on a past day without a completed session', () => {
    const result = validateHalfDayRequiresSession('2026-08-03', 'half-day', [], '2026-08-05')
    expect(result.ok).toBe(false)
  })

  it('allows marking half-day on a past day after a completed session exists', () => {
    const sessions = [{ id: '1', date: '2026-08-03', checkIn: 0, checkOut: 1000 }]
    expect(validateHalfDayRequiresSession('2026-08-03', 'half-day', sessions, '2026-08-05').ok).toBe(true)
  })

  it('allows marking half-day on today without a session yet', () => {
    expect(validateHalfDayRequiresSession('2026-08-05', 'half-day', [], '2026-08-05').ok).toBe(true)
  })

  it('allows half-day on today while still checked in', () => {
    const sessions = [{ id: '1', date: '2026-08-05', checkIn: 0, checkOut: null }]
    expect(validateTimeOffWithOpenSession('2026-08-05', 'half-day', sessions, '2026-08-05').ok).toBe(true)
  })

  it('blocks leave on today while still checked in', () => {
    const sessions = [{ id: '1', date: '2026-08-05', checkIn: 0, checkOut: null }]
    expect(validateTimeOffWithOpenSession('2026-08-05', 'leave', sessions, '2026-08-05').ok).toBe(false)
  })

  it('treats an open prior workday session as unresolved', () => {
    const sessions = [{ id: '1', date: '2026-08-03', checkIn: 0, checkOut: null }]
    expect(getUnresolvedPriorWorkdays('2026-08-04', sessions, settings, [])).toEqual(['2026-08-03'])
  })

  it('blocks marking days after an open session until check-out', () => {
    const sessions = [{ id: '1', date: '2026-08-03', checkIn: 0, checkOut: null }]
    const result = validateOpenSessionBlocksFollowingDays('2026-08-05', sessions)
    expect(result.ok).toBe(false)
  })

  it('allows updating days on or before the open session date', () => {
    const sessions = [{ id: '1', date: '2026-08-05', checkIn: 0, checkOut: null }]
    expect(validateOpenSessionBlocksFollowingDays('2026-08-05', sessions).ok).toBe(true)
    expect(validateOpenSessionBlocksFollowingDays('2026-08-03', sessions).ok).toBe(true)
  })

  it('blocks future session dates and times when now is supplied', () => {
    const now = new Date(2026, 7, 25, 12).getTime()

    expect(validateSession({ date: '2026-08-26', checkIn: now, checkOut: null }, [], undefined, now).ok).toBe(false)
    expect(validateSession({ date: '2026-08-25', checkIn: now + 60000, checkOut: null }, [], undefined, now).ok).toBe(false)
  })

  it('keeps check-in and check-out on the selected date', () => {
    const checkIn = new Date(2026, 7, 24, 9).getTime()
    const nextDayCheckout = new Date(2026, 7, 25, 10).getTime()

    expect(validateSession({ date: '2026-08-24', checkIn, checkOut: nextDayCheckout }, []).ok).toBe(false)
  })

  it('blocks leaving past sessions open when now is supplied', () => {
    const now = new Date(2026, 7, 25, 12).getTime()
    const checkIn = new Date(2026, 7, 24, 9).getTime()

    expect(validateSession({ date: '2026-08-24', checkIn, checkOut: null }, [], undefined, now).ok).toBe(false)
  })

  it('does not allow deleting the last completed session from a previous workday', () => {
    const sessions = [{ id: '1', date: '2026-08-24', checkIn: 0, checkOut: 1000 }]
    const result = validateCanRemoveSession('1', sessions, settings, [], '2026-08-25')

    expect(result.ok).toBe(false)
  })

  it('allows deleting a previous workday session when leave or another completed session remains', () => {
    const sessions = [
      { id: '1', date: '2026-08-24', checkIn: 0, checkOut: 1000 },
      { id: '2', date: '2026-08-24', checkIn: 2000, checkOut: 3000 },
    ]

    expect(validateCanRemoveSession('1', sessions, settings, [], '2026-08-25').ok).toBe(true)
    expect(
      validateCanRemoveSession('1', sessions.slice(0, 1), settings, [{ date: '2026-08-24', type: 'leave' }], '2026-08-25')
        .ok,
    ).toBe(true)
  })

  it('does not allow deleting the last session from a previous half-day', () => {
    const sessions = [{ id: '1', date: '2026-08-24', checkIn: 0, checkOut: 1000 }]
    const result = validateCanRemoveSession(
      '1',
      sessions,
      settings,
      [{ date: '2026-08-24', type: 'half-day', note: 'Doctor' }],
      '2026-08-25',
    )
    expect(result.ok).toBe(false)
  })

  it('does not allow removing leave from a blank previous workday', () => {
    const result = validateCanRemoveTimeOff('2026-08-24', [], settings, '2026-08-25')

    expect(result.ok).toBe(false)
  })

  it('blocks adding a new session on a day that still has an open session', () => {
    const open = {
      id: 'open',
      date: '2026-08-25',
      checkIn: new Date(2026, 7, 25, 14).getTime(),
      checkOut: null,
    }
    const result = validateSession(
      {
        date: '2026-08-25',
        checkIn: new Date(2026, 7, 25, 9).getTime(),
        checkOut: new Date(2026, 7, 25, 12).getTime(),
      },
      [open],
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('Check out the open session')
    }
  })

  it('allows adding a new session after the same-day session is checked out', () => {
    const closed = {
      id: '1',
      date: '2026-08-25',
      checkIn: new Date(2026, 7, 25, 9).getTime(),
      checkOut: new Date(2026, 7, 25, 12).getTime(),
    }
    const result = validateSession(
      {
        date: '2026-08-25',
        checkIn: new Date(2026, 7, 25, 13).getTime(),
        checkOut: new Date(2026, 7, 25, 17).getTime(),
      },
      [closed],
    )

    expect(result.ok).toBe(true)
  })
})
