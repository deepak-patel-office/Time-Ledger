import type { MonthStats } from '../types'
import { parseISODate } from './date'

function hours(ms: number): string {
  return (ms / 3_600_000).toFixed(2)
}

function csvCell(value: string | number): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function weekDatesLabel(monthWeek: MonthStats['weeks'][number]): string {
  const first = parseISODate(monthWeek.days[0].date)
  const last = parseISODate(monthWeek.days[monthWeek.days.length - 1].date)
  const firstLabel = first.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const lastLabel = last.toLocaleDateString(
    undefined,
    first.getMonth() === last.getMonth() ? { day: 'numeric' } : { month: 'short', day: 'numeric' },
  )
  return `${firstLabel} – ${lastLabel}`
}

export function monthlyWeeksCsv(month: MonthStats): string {
  const header = ['Week', 'Date range', 'Workdays', 'Leave / holidays', 'Worked hours', 'Target hours', 'Balance hours']
  const rows = month.weeks.map((week, index) => [
    index + 1,
    weekDatesLabel(week),
    week.days.filter((day) => day.isWorkday).length,
    week.days.filter((day) => day.timeOff).length,
    hours(week.workedMs),
    hours(week.targetMs),
    hours(week.deltaMs),
  ])
  rows.push(['Monthly total', '', month.weeks.flatMap((week) => week.days).filter((day) => day.isWorkday).length, month.weeks.flatMap((week) => week.days).filter((day) => day.timeOff).length, hours(month.workedMs), hours(month.targetMs), hours(month.deltaMs)])
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
}

export function downloadMonthlyWeeksCsv(month: MonthStats): void {
  const blob = new Blob([`\uFEFF${monthlyWeeksCsv(month)}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `time-ledger-${month.year}-${String(month.month + 1).padStart(2, '0')}-weekly.csv`
  link.click()
  URL.revokeObjectURL(url)
}
