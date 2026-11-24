import { useMemo } from 'react'
import { AlertCircle, Flame } from 'lucide-react'
import { useAppData } from '../../context/useAppData'
import { useNow } from '../../hooks/useNow'
import { computeWeekCoverBalance, computeWeekStats, weekStartFor } from '../../lib/coverage'
import { formatDurationMs, toISODate } from '../../lib/date'

export function HeaderWeekMetrics() {
  const { sessions, settings, timeOff } = useAppData()
  const now = useNow()
  const todayISO = toISODate(new Date(now))

  const { toCoverMs, overtimeMs } = useMemo(() => {
    const anchor = weekStartFor(new Date(now))
    const week = computeWeekStats(anchor, sessions, settings, todayISO, now, timeOff)
    return computeWeekCoverBalance(week, todayISO)
  }, [sessions, settings, timeOff, todayISO, now])

  const toCoverLabel = toCoverMs > 0 ? formatDurationMs(toCoverMs) : '0m'
  const overtimeLabel = overtimeMs > 0 ? `+${formatDurationMs(overtimeMs)}` : '0m'

  return (
    <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto sm:justify-end">
      <span
        className={`pill ${toCoverMs > 0 ? 'chip-warn' : 'chip-muted'}`}
        title="Time left to cover this week"
      >
        <AlertCircle aria-hidden="true" />
        <span className="hidden min-[400px]:inline">To cover: </span>
        <span className="font-bold">{toCoverLabel}</span>
      </span>
      <span
        className={`pill ${overtimeMs > 0 ? 'chip-good' : 'chip-muted'}`}
        title="Overtime logged this week"
      >
        <Flame aria-hidden="true" />
        <span className="hidden min-[400px]:inline">Overtime: </span>
        <span className="font-bold">{overtimeLabel}</span>
      </span>
    </div>
  )
}