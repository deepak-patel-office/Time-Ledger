import { useMemo, useState } from 'react'
import { useAppData } from '../../context/useAppData'
import { computeWeekStats, weekStartFor } from '../../lib/coverage'
import { addDays, formatWorkWeekRangeLabel, parseISODate, toISODate } from '../../lib/date'
import type { WeekdayIndex } from '../../types'
import { useNow } from '../../hooks/useNow'
import { DayCard } from './DayCard'
import { WeekSummary } from './WeekSummary'

export function WeeklyView() {
  const { sessions, settings, timeOff } = useAppData()
  const now = useNow()
  const todayISO = toISODate(new Date(now))
  const [anchor, setAnchor] = useState(() => weekStartFor(new Date(now)))

  const week = useMemo(
    () => computeWeekStats(anchor, sessions, settings, todayISO, now, timeOff),
    [anchor, sessions, settings, timeOff, todayISO, now],
  )

  const displayDays = useMemo(
    () =>
      week.days.filter(
        (d) =>
          settings.workdays.includes(parseISODate(d.date).getDay() as WeekdayIndex) || d.timeOff !== null,
      ),
    [week.days, settings.workdays],
  )

  const todayInView = displayDays.some((d) => d.date === todayISO)

  return (
    <div className="space-y-4">
      <WeekSummary
        week={week}
        weekLabel={formatWorkWeekRangeLabel(anchor, settings.workdays)}
        onPrev={() => setAnchor((a) => addDays(a, -7))}
        onNext={() => setAnchor((a) => addDays(a, 7))}
        onThisWeek={() => setAnchor(weekStartFor(new Date(now)))}
        todayInView={todayInView}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {displayDays.map((day) => (
          <DayCard key={day.date} stats={day} now={now} isToday={day.date === todayISO} />
        ))}
      </div>
    </div>
  )
}
