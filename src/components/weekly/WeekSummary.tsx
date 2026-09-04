import { useMemo } from 'react'
import {
  Calendar,
  AlertCircle,
  TrendingUp,
  Clock,
  Target,
  Flame,
  Briefcase,
  Umbrella,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAppData } from '../../context/useAppData'
import { useNow } from '../../hooks/useNow'
import { computeWeekCoverBalance } from '../../lib/coverage'
import { formatDurationMs, formatMonthLabel, hoursToMs, toISODate } from '../../lib/date'
import { countDaysWorkedInMonth } from '../../lib/workdays'
import type { WeekStats } from '../../types'

export function WeekSummary({
  week,
  weekLabel,
  onPrev,
  onNext,
  onThisWeek,
  todayInView,
}: {
  week: WeekStats
  weekLabel: string
  onPrev: () => void
  onNext: () => void
  onThisWeek: () => void
  todayInView: boolean
}) {
  const { settings, sessions } = useAppData()
  const now = useNow()
  const today = new Date(now)
  const todayISO = toISODate(today)
  const monthPrefix = todayISO.slice(0, 7)
  const monthLabel = formatMonthLabel(today)
  const dailyTargetLabel = formatDurationMs(hoursToMs(settings.dailyTargetHours))

  const { toCoverMs: totalToCoverMs, overtimeMs } = useMemo(
    () => computeWeekCoverBalance(week, todayISO),
    [week, todayISO],
  )

  const daysWorkedThisMonth = useMemo(
    () => countDaysWorkedInMonth(sessions, monthPrefix),
    [sessions, monthPrefix],
  )

  const leaveCount = week.days.filter((d) => d.timeOff?.type === 'leave').length
  const holidayCount = week.days.filter((d) => d.timeOff?.type === 'holiday').length
  const halfDayCount = week.days.filter((d) => d.timeOff?.type === 'half-day').length

  const adjustedSummary = [
    leaveCount > 0 ? `${leaveCount} leave${leaveCount !== 1 ? 's' : ''}` : null,
    holidayCount > 0 ? `${holidayCount} holiday${holidayCount !== 1 ? 's' : ''}` : null,
    halfDayCount > 0 ? `${halfDayCount} half day${halfDayCount !== 1 ? 's' : ''}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="app-card">
      <div className="mb-3 flex flex-col gap-3 border-b border-[var(--border)] pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="icon-box">
            <Calendar className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="app-heading">{weekLabel}</h2>

              <button
                type="button"
                onClick={onThisWeek}
                className="chip chip-muted"
              >
                This week
              </button>

              <div className="flex items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] p-0.5">
                <button
                  type="button"
                  onClick={onPrev}
                  aria-label="Previous week"
                  title="Previous week"
                  className="rounded-[var(--radius-sm)] p-1 text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="mx-0.5 h-3.5 w-px bg-[var(--border)]" />
                <button
                  type="button"
                  onClick={onNext}
                  aria-label="Next week"
                  title="Next week"
                  className="rounded-[var(--radius-sm)] p-1 text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {totalToCoverMs > 0 && (
                <span className="chip chip-warn">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {formatDurationMs(totalToCoverMs)} cover
                </span>
              )}

              {overtimeMs > 0 && (
                <span className="chip chip-good">
                  <TrendingUp className="h-3.5 w-3.5" />
                  +{formatDurationMs(overtimeMs)}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-[var(--text-muted)]">
              <span>
                Target: <strong className="font-semibold text-[var(--text)]">{dailyTargetLabel}/day</strong>
              </span>
              {adjustedSummary && (
                <span className="inline-flex items-center gap-1 text-[var(--warn)]">
                  <Umbrella className="h-3.5 w-3.5" />
                  {adjustedSummary}
                </span>
              )}
              {!todayInView && <span>Today isn&apos;t shown in this week view.</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <div className="app-tile flex items-center gap-2.5 p-2.5">
          <Clock className="h-4 w-4 shrink-0 text-[var(--accent)]" />
          <div className="min-w-0">
            <span className="app-label">Worked</span>
            <p className="app-value truncate">{formatDurationMs(week.workedMs)}</p>
          </div>
        </div>

        <div className="app-tile flex items-center gap-2.5 p-2.5">
          <Target className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
          <div className="min-w-0">
            <span className="app-label">Target</span>
            <p className="app-value truncate">{formatDurationMs(week.targetMs)}</p>
          </div>
        </div>

        <div className={`flex items-center gap-2.5 rounded-[var(--radius)] border p-2.5 ${totalToCoverMs > 0 ? 'tone-warn' : 'app-tile'}`}>
          <AlertCircle className={`h-4 w-4 shrink-0 ${totalToCoverMs > 0 ? 'text-[var(--warn)]' : 'text-[var(--text-muted)]'}`} />
          <div className="min-w-0">
            <span className="app-label">To cover</span>
            <p className={`truncate text-[1.0625rem] font-bold ${totalToCoverMs > 0 ? 'text-[var(--warn)]' : 'text-[var(--text)]'}`}>
              {totalToCoverMs > 0 ? formatDurationMs(totalToCoverMs) : '0m'}
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-2.5 rounded-[var(--radius)] border p-2.5 ${overtimeMs > 0 ? 'tone-good' : 'app-tile'}`}>
          <Flame className={`h-4 w-4 shrink-0 ${overtimeMs > 0 ? 'text-[var(--good)]' : 'text-[var(--text-muted)]'}`} />
          <div className="min-w-0">
            <span className="app-label">Overtime</span>
            <p className={`truncate text-[1.0625rem] font-bold ${overtimeMs > 0 ? 'text-[var(--good)]' : 'text-[var(--text)]'}`}>
              {overtimeMs > 0 ? `+${formatDurationMs(overtimeMs)}` : '0m'}
            </p>
          </div>
        </div>

        <div className="app-tile col-span-2 flex items-center gap-2.5 p-2.5 sm:col-span-1">
          <Briefcase className="h-4 w-4 shrink-0 text-[var(--accent)]" />
          <div className="min-w-0">
            <span className="app-label">Attended ({monthLabel})</span>
            <p className="app-value truncate">{daysWorkedThisMonth} days</p>
          </div>
        </div>
      </div>
    </div>
  )
}
