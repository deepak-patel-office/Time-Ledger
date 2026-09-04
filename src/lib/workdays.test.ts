import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../types'
import { countDaysWorkedInMonth, monthlyWorkSummaryForFinancialYear } from './workdays'

describe('countDaysWorkedInMonth', () => {
  it('counts unique days with a check-in, including leave or half-day', () => {
    const sessions = [
      { id: '1', date: '2026-09-01', checkIn: 0, checkOut: 1000 },
      { id: '2', date: '2026-09-01', checkIn: 2000, checkOut: 3000 },
      { id: '3', date: '2026-09-02', checkIn: 0, checkOut: 1000 },
      { id: '4', date: '2026-09-03', checkIn: 0, checkOut: 1000 },
      { id: '5', date: '2026-08-31', checkIn: 0, checkOut: 1000 },
    ]
    expect(countDaysWorkedInMonth(sessions, '2026-09')).toBe(3)
  })
})

describe('monthlyWorkSummaryForFinancialYear', () => {
  it('returns 12 FY months with current month flagged', () => {
    const rows = monthlyWorkSummaryForFinancialYear([], [], DEFAULT_SETTINGS, new Date(2026, 8, 2))
    expect(rows).toHaveLength(12)
    expect(rows[0].monthPrefix).toBe('2026-04')
    expect(rows[11].monthPrefix).toBe('2027-03')
    expect(rows.find((r) => r.isCurrent)?.monthPrefix).toBe('2026-09')
  })
})
