import { describe, expect, it } from 'vitest'
import { computeMonthStats } from './coverage'
import { monthlyWeeksCsv } from './export'
import { DEFAULT_SETTINGS } from '../types'

describe('monthly weekly export', () => {
  it('exports one row per intersecting week and a monthly total', () => {
    const month = computeMonthStats(2026, 6, [], DEFAULT_SETTINGS, '2026-07-31', new Date(2026, 6, 31).getTime())
    const csv = monthlyWeeksCsv(month)
    const lines = csv.split('\n')

    expect(lines[0]).toContain('Week,Date range')
    expect(lines).toHaveLength(month.weeks.length + 2)
    expect(lines.at(-1)).toContain('Monthly total')
  })
})
