import type { LucideIcon } from 'lucide-react'
import { CheckCircle2, CircleDashed, Clock, CloudSun, Palmtree, Sun, TrendingUp } from 'lucide-react'
import type { DayStatusKind } from '../../types'
import { formatDurationMs } from '../../lib/date'

const STYLES: Record<DayStatusKind, string> = {
  'day-off': 'bg-[var(--surface-hover)] text-[var(--text-muted)]',
  leave: 'bg-[var(--leave-soft)] text-[var(--leave)]',
  holiday: 'bg-[var(--surface-hover)] text-[var(--text-muted)]',
  'half-day': 'bg-[var(--warn-soft)] text-[var(--warn)]',
  'not-started': 'bg-[var(--surface-hover)] text-[var(--text-muted)]',
  remaining: 'bg-[var(--warn-soft)] text-[var(--warn)]',
  covered: 'bg-[var(--good-soft)] text-[var(--good)]',
  overtime: 'bg-[var(--accent-soft)] text-[var(--accent)]',
}

const ICONS: Record<DayStatusKind, LucideIcon> = {
  'day-off': Sun,
  leave: Palmtree,
  holiday: Sun,
  'half-day': CloudSun,
  'not-started': CircleDashed,
  remaining: Clock,
  covered: CheckCircle2,
  overtime: TrendingUp,
}

function label(status: DayStatusKind, deltaMs: number, targetMs: number): string {
  switch (status) {
    case 'day-off':
      return deltaMs > 0 ? `Day off · +${formatDurationMs(deltaMs)}` : 'Day off'
    case 'leave':
      return 'On leave'
    case 'holiday':
      return 'Holiday'
    case 'half-day':
      return 'Half day'
    case 'not-started':
      return targetMs > 0 ? `${formatDurationMs(targetMs)} to cover` : 'Not started'
    case 'remaining':
      return `${formatDurationMs(-deltaMs)} left`
    case 'covered':
      return 'Covered'
    case 'overtime':
      return `+${formatDurationMs(deltaMs)} overtime`
  }
}

export function StatusBadge({
  status,
  deltaMs,
  targetMs,
  className = '',
}: {
  status: DayStatusKind
  deltaMs: number
  targetMs: number
  className?: string
}) {
  const Icon = ICONS[status]
  return (
    <span
      className={`pill ${STYLES[status]} ${className}`}
    >
      <Icon />
      {label(status, deltaMs, targetMs)}
    </span>
  )
}
