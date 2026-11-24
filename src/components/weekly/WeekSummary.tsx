import { useMemo } from 'react'
import {
  Calendar,
  Clock,
  Target,
  Briefcase,
  Umbrella,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAppData } from '../../context/useAppData'
import { useNow } from '../../hooks/useNow'
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
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div className="flex min-w-0 items-start gap-3 lg:flex-1">
          <div className="icon-box shrink-0">
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

        <div className="grid w-full min-w-0 grid-cols-3 gap-2 lg:w-auto lg:min-w-[23rem]">
          <div className="app-tile flex h-full min-w-0 items-center gap-2 p-2 sm:p-2.5">
            <Clock className="h-4 w-4 shrink-0 text-[var(--accent)]" />
            <div className="min-w-0 flex-1">
              <span className="app-label block truncate">Worked</span>
              <p className="app-value truncate">{formatDurationMs(week.workedMs)}</p>
            </div>
          </div>

          <div className="app-tile flex h-full min-w-0 items-center gap-2 p-2 sm:p-2.5">
            <Target className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
            <div className="min-w-0 flex-1">
              <span className="app-label block truncate">Target</span>
              <p className="app-value truncate">{formatDurationMs(week.targetMs)}</p>
            </div>
          </div>

          <div className="app-tile flex h-full min-w-0 items-center gap-2 p-2 sm:p-2.5">
            <Briefcase className="h-4 w-4 shrink-0 text-[var(--accent)]" />
            <div className="min-w-0 flex-1">
              <span className="app-label block truncate" title={`Attended (${monthLabel})`}>
                Attended ({monthLabel})
              </span>
              <p className="app-value truncate">{daysWorkedThisMonth} days</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
