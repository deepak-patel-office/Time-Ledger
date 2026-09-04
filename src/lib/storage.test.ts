import { describe, expect, it } from 'vitest'
import { defaultAppData, loadAppData, pruneToCurrentFinancialYear, sanitizeAppData } from './storage'

describe('pruneToCurrentFinancialYear', () => {
  it('keeps only sessions and time-off from the current financial year', () => {
    const data = {
      version: 2,
      sessions: [
        { id: '1', date: '2025-06-15', checkIn: 0, checkOut: 3600000 },
        { id: '2', date: '2026-05-10', checkIn: 0, checkOut: 3600000 },
        { id: '3', date: '2026-01-10', checkIn: 0, checkOut: 3600000 },
      ],
      settings: defaultAppData().settings,
      timeOff: [
        { date: '2025-08-01', type: 'leave' as const },
        { date: '2026-05-01', type: 'holiday' as const },
        { date: '2026-03-01', type: 'leave' as const },
      ],
    }

    // June 2026 → FY 2026–27 starts 2026-04-01
    const pruned = pruneToCurrentFinancialYear(data, new Date(2026, 5, 15))

    expect(pruned.sessions.map((s) => s.id)).toEqual(['2'])
    expect(pruned.timeOff.map((t) => t.date)).toEqual(['2026-05-01'])
  })

  it('does not reset on calendar New Year — keeps current FY data through January–March', () => {
    const data = {
      version: 2,
      sessions: [
        { id: 'fy', date: '2025-06-15', checkIn: 0, checkOut: 3600000 },
        { id: 'jan', date: '2026-01-05', checkIn: 0, checkOut: 3600000 },
        { id: 'old', date: '2025-03-20', checkIn: 0, checkOut: 3600000 },
      ],
      settings: defaultAppData().settings,
      timeOff: [{ date: '2025-09-01', type: 'leave' as const }],
    }

    // 1 Jan 2026 is still FY 2025–26 (started Apr 2025)
    const pruned = pruneToCurrentFinancialYear(data, new Date(2026, 0, 1))
    expect(pruned.sessions.map((s) => s.id).sort()).toEqual(['fy', 'jan'])
    expect(pruned.timeOff.map((t) => t.date)).toEqual(['2025-09-01'])
  })

  it('runs automatically during sanitize on load', () => {
    const raw = {
      version: 2,
      sessions: [{ id: 'old', date: '2023-01-01', checkIn: 0, checkOut: 1000 }],
      settings: defaultAppData().settings,
      timeOff: [],
    }

    const sanitized = sanitizeAppData(raw, new Date(2026, 0, 2))
    expect(sanitized.sessions).toHaveLength(0)
  })
})

describe('loadAppData', () => {
  it('returns defaults when storage is empty', () => {
    const data = loadAppData()
    expect(data.sessions).toEqual([])
    expect(data.timeOff).toEqual([])
  })
})
