import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../types'
import {
  additionalLeaveQuotaNeeded,
  canAffordLeaveQuota,
  computeLeaveBalance,
  financialYearBounds,
  leaveQuotaCost,
  monthsElapsedInFinancialYear,
} from './leaves'

describe('financial year helpers', () => {
  it('uses April–March bounds for India-style FY', () => {
    const fy = financialYearBounds(new Date(2026, 8, 2), 3) // Sep 2026
    expect(fy.startISO).toBe('2026-04-01')
    expect(fy.endISO).toBe('2027-03-31')
    expect(fy.label).toBe('FY 2026–27')
  })

  it('places Jan–Mar in the FY that started the previous calendar year', () => {
    const fy = financialYearBounds(new Date(2027, 1, 10), 3) // Feb 2027
    expect(fy.startISO).toBe('2026-04-01')
    expect(fy.endISO).toBe('2027-03-31')
  })

  it('accrues one month at FY start and grows monthly', () => {
    expect(monthsElapsedInFinancialYear(new Date(2026, 3, 1), 3)).toBe(1) // Apr
    expect(monthsElapsedInFinancialYear(new Date(2026, 8, 2), 3)).toBe(6) // Sep
    expect(monthsElapsedInFinancialYear(new Date(2027, 2, 31), 3)).toBe(12) // Mar
  })
})

describe('leave balance', () => {
  const settings = { ...DEFAULT_SETTINGS }

  it('counts leave as 1 and half-day as 0.5; holiday is free', () => {
    expect(leaveQuotaCost('leave')).toBe(1)
    expect(leaveQuotaCost('half-day')).toBe(0.5)
    expect(leaveQuotaCost('holiday')).toBe(0)
  })

  it('computes accrued, taken, remaining and this-month usage', () => {
    const ref = new Date(2026, 8, 2) // Sep 2026 → 6 months accrued
    const timeOff = [
      { date: '2026-04-10', type: 'leave' as const },
      { date: '2026-05-01', type: 'holiday' as const },
      { date: '2026-09-01', type: 'half-day' as const },
      { date: '2026-09-02', type: 'leave' as const },
    ]
    const balance = computeLeaveBalance(timeOff, settings, ref)

    expect(balance.accrued).toBe(6)
    expect(balance.taken).toBe(2.5) // 1 + 0 + 0.5 + 1
    expect(balance.remaining).toBe(3.5)
    expect(balance.thisMonthTaken).toBe(1.5)
    expect(balance.thisMonthLeaveCount).toBe(1)
    expect(balance.thisMonthHalfDayCount).toBe(1)
  })

  it('resets when a new financial year begins', () => {
    const timeOff = [
      { date: '2025-06-01', type: 'leave' as const },
      { date: '2026-04-05', type: 'leave' as const },
    ]
    const balance = computeLeaveBalance(timeOff, settings, new Date(2026, 3, 5))
    expect(balance.fy.startISO).toBe('2026-04-01')
    expect(balance.taken).toBe(1)
    expect(balance.accrued).toBe(1)
    expect(balance.remaining).toBe(0)
  })

  it('blocks marking leave when balance is insufficient', () => {
    const ref = new Date(2026, 3, 10) // Apr → 1 accrued
    const timeOff = [{ date: '2026-04-02', type: 'leave' as const }]
    const result = canAffordLeaveQuota(timeOff, settings, '2026-04-10', 'leave', ref)
    expect(result.ok).toBe(false)
  })

  it('allows switching leave to holiday without extra quota', () => {
    const timeOff = [{ date: '2026-04-02', type: 'leave' as const }]
    expect(additionalLeaveQuotaNeeded(timeOff, '2026-04-02', 'holiday')).toBe(-1)
    expect(canAffordLeaveQuota(timeOff, settings, '2026-04-02', 'holiday', new Date(2026, 3, 10)).ok).toBe(true)
  })
})
