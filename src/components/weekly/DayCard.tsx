import { useState } from 'react'
import {
  CloudSun,
  Palmtree,
  Pencil,
  Plus,
  Sun,
  Trash2,
  Clock,
  CalendarX2,
  Calendar,
  Briefcase,
  Sparkles,
} from 'lucide-react'
import { useAppData } from '../../context/useAppData'
import { computeDailyCheckoutFromCheckIn, computeRecommendedCheckout, isFullDayOff } from '../../lib/coverage'
import { getPriorWorkBlockMessages, getUnresolvedPriorWorkdays, hasCompletedSessionForDate, isDayBlockedByOpenSession } from '../../lib/sessions'
import { formatDayLabel, formatDurationMs, formatTimeOfDay, parseISODate, toISODate } from '../../lib/date'
import type { DayStats, DayTimeOffChoice, Session, TimeOffType } from '../../types'
import { ProgressBar } from '../shared/ProgressBar'
import { StatusBadge } from '../shared/StatusBadge'
import { TimeOffReasonModal } from '../timeoff/TimeOffReasonModal'
import { QuickCheckControls } from './QuickCheckControls'
import { DayStatusMenu } from './DayStatusMenu'
import { SessionForm } from './SessionForm'
import { useNotify } from '../shared/notifyContext'

function timeOffLabel(type: TimeOffType): string {
  if (type === 'leave') return 'Leave'
  if (type === 'holiday') return 'Holiday'
  return 'Half day'
}

export function DayCard({
  stats,
  now,
  isToday,
}: {
  stats: DayStats
  now: number
  isToday: boolean
}) {
  const { sessions, settings, timeOff, openSession, setTimeOff, removeTimeOff, restoreWorkday, removeSession } =
    useAppData()
  const { notify } = useNotify()
  const [editing, setEditing] = useState<Session | 'new' | 'restore' | null>(null)
  const [pendingMark, setPendingMark] = useState<TimeOffType | null>(null)
  const [resumeHalfDayAfterSession, setResumeHalfDayAfterSession] = useState(false)
  const [editingReason, setEditingReason] = useState(false)
  const todayISO = toISODate(new Date(now))

  const daySessions = sessions
    .filter((s) => s.date === stats.date)
    .sort((a, b) => a.checkIn - b.checkIn)

  const isFullOff = isFullDayOff(stats.timeOff)
  const isHalfDay = stats.timeOff?.type === 'half-day'
  const canTrackTime = !isFullOff
  const needsReasonEdit =
    stats.timeOff?.type === 'leave' || stats.timeOff?.type === 'half-day' || stats.timeOff?.type === 'holiday'

  const weekRecommendation =
    openSession?.date === stats.date && canTrackTime
      ? computeRecommendedCheckout(stats.date, sessions, settings, now, timeOff)
      : null

  const dailyCheckoutAt =
    openSession?.date === stats.date && canTrackTime
      ? computeDailyCheckoutFromCheckIn(openSession, stats, settings.dailyTargetHours, now)
      : null

  const ratio = stats.targetMs > 0 ? stats.workedMs / stats.targetMs : stats.workedMs > 0 ? 1 : 0
  const isLeave = stats.timeOff?.type === 'leave'
  const isFutureDay = stats.date > todayISO
  const unresolvedPrior = getUnresolvedPriorWorkdays(stats.date, sessions, settings, timeOff)
  const priorDaysBlocked = unresolvedPrior.length > 0
  const openSessionBlocksDay = isDayBlockedByOpenSession(stats.date, sessions)
  const hasOpenSessionOnDay = openSession?.date === stats.date || stats.hasOpenSession
  const actionsBlocked = isFutureDay || priorDaysBlocked || openSessionBlocksDay
  const blockMessages = getPriorWorkBlockMessages(stats.date, sessions, settings, timeOff)
  const showCompletionWarning = isToday && canTrackTime && blockMessages.length > 0

  function applyTimeOff(type: TimeOffType, reason: string) {
    const result = setTimeOff({
      date: stats.date,
      type,
      note: reason.trim() || undefined,
    })
    if (!result.ok) {
      notify(result.error, 'error')
      return false
    }
    notify(`${timeOffLabel(type)} marked for ${formatDayLabel(parseISODate(stats.date))}.`, 'success')
    return true
  }

  function onDayStatusChange(choice: DayTimeOffChoice) {
    if (choice === 'none') {
      restoreWorkdayClick()
      return
    }
    if (choice === 'half-day' && stats.date < todayISO && !hasCompletedSessionForDate(stats.date, sessions)) {
      notify('Add a completed session for this past day first, then mark half day.', 'info')
      setResumeHalfDayAfterSession(true)
      setEditing('new')
      return
    }
    if (choice === 'leave' || choice === 'half-day') {
      setPendingMark(choice)
      return
    }
    setPendingMark('holiday')
  }

  function addSessionClick() {
    if (hasOpenSessionOnDay) {
      notify('Check out the open session before adding another on this day.', 'error')
      return
    }
    setResumeHalfDayAfterSession(false)
    setEditing('new')
  }

  function restoreWorkdayClick() {
    if (isHalfDay && hasOpenSessionOnDay) {
      const result = removeTimeOff(stats.date)
      if (!result.ok) {
        notify(result.error, 'error')
        return
      }
      notify(`${formatDayLabel(parseISODate(stats.date))} restored to full day.`, 'info')
      return
    }
    if (!hasCompletedSessionForDate(stats.date, sessions)) {
      setResumeHalfDayAfterSession(false)
      setEditing('restore')
      notify('Add a session to restore this workday.', 'info')
      return
    }
    if (isHalfDay) {
      const result = removeTimeOff(stats.date)
      if (!result.ok) {
        notify(result.error, 'error')
        return
      }
      notify(`${formatDayLabel(parseISODate(stats.date))} restored to full day.`, 'info')
      return
    }
    const result = restoreWorkday(stats.date)
    if (!result.ok) {
      notify(result.error, 'error')
      return
    }
    notify(`${formatDayLabel(parseISODate(stats.date))} restored as a workday.`, 'info')
  }

  function saveReason(reason: string) {
    if (!stats.timeOff) return
    const result = setTimeOff({ date: stats.date, type: stats.timeOff.type, note: reason.trim() || undefined })
    if (!result.ok) {
      notify(result.error, 'error')
      return
    }
    setEditingReason(false)
    notify('Reason updated.')
  }

  function deleteSession(session: Session) {
    const result = removeSession(session.id)
    if (!result.ok) {
      notify(result.error, 'error')
      return
    }
    notify('Session removed.', 'info')
  }

  return (
    <div
      data-testid={`day-card-${stats.date}`}
      className={`app-card relative flex flex-col justify-between ${isToday ? 'day-card-today' : ''}`}
    >
      <div>
        {/* Header - Compact & Clean */}
        <div className="mb-3 flex flex-col gap-2 border-b border-[var(--border)] pb-2.5">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
            <h3 className="app-heading whitespace-nowrap text-[0.9375rem]">
              {formatDayLabel(parseISODate(stats.date))}
            </h3>
            {isToday && (
              <span className="pill" style={{ background: 'var(--accent)', color: '#fff' }}>
                <Sparkles />
                Today
              </span>
            )}
          </div>

          {(canTrackTime || isFullOff) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {canTrackTime && (
                <>
                  {isHalfDay && (
                    <span className="pill chip-warn">
                      <CloudSun />
                      Half day
                    </span>
                  )}
                  {stats.status !== 'half-day' && (
                    <StatusBadge status={stats.status} deltaMs={stats.deltaMs} targetMs={stats.targetMs} />
                  )}
                </>
              )}
              {isFullOff && (
                <span className={`pill ${isLeave ? 'chip-leave' : 'chip-muted'}`}>
                  {isLeave ? <Palmtree /> : <Sun />}
                  {isLeave ? 'Leave' : 'Holiday'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Content Section */}
        {isFullOff ? (
          <div className="app-tile mb-3 p-3 text-sm">
            <p className="text-[var(--text-muted)]">
              Excluded from weekly worked and target totals.
            </p>
            {stats.recordedWorkedMs > 0 && (
              <p className="mt-1 text-[var(--text-muted)]">
                {formatDurationMs(stats.recordedWorkedMs)} logged time retained.
              </p>
            )}
            {stats.timeOff?.note && (
              <p className="mt-2 text-[var(--text)]">
                <span className="font-semibold">Reason:</span> {stats.timeOff.note}
              </p>
            )}
            {needsReasonEdit && (
              <button
                type="button"
                onClick={() => setEditingReason(true)}
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)]"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit reason
              </button>
            )}
          </div>
        ) : (
          <div className="mb-3 space-y-2.5">
            {isHalfDay && (
              <div className="rounded-[var(--radius)] border p-2.5 text-sm tone-warn">
                {stats.timeOff?.note && (
                  <p className="text-[var(--text)]">
                    <span className="font-semibold">Reason:</span> {stats.timeOff.note}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setEditingReason(true)}
                  className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-[var(--warn)]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit reason
                </button>
              </div>
            )}

            {/* Compact Progress & Metrics Row */}
            <div className="app-tile flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2.5">
                <Briefcase className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                <div>
                  <span className="app-label">Worked time</span>
                  <p className="app-value mt-0.5">
                    {formatDurationMs(stats.workedMs)}
                  </p>
                </div>
              </div>

              <ProgressBar
                ratio={ratio}
                overtime={stats.status === 'overtime'}
                label="Coverage"
                size={48}
                strokeWidth={4.5}
              />
            </div>
          </div>
        )}

        {/* Sessions List - Tight Spacing */}
        {daySessions.length > 0 && (
          <ul className="mb-3 space-y-1.5">
            {daySessions.map((s) => (
              <li key={s.id}>
                <div className="app-tile group flex items-center justify-between px-2.5 py-1.5 text-sm">
                  <div className="flex items-center gap-2 text-[var(--text)]">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
                    <span className="font-semibold">
                      {formatTimeOfDay(s.checkIn)} –{' '}
                      {s.checkOut != null ? (
                        formatTimeOfDay(s.checkOut)
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-[var(--good)]">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--good)] opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--good)]"></span>
                          </span>
                          Live · {formatDurationMs(now - s.checkIn)}
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => setEditing(s)}
                      aria-label="Edit session"
                      className="rounded-[var(--radius-sm)] p-1 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSession(s)}
                      aria-label="Remove session"
                      className="rounded-[var(--radius-sm)] p-1 text-[var(--text-muted)] hover:bg-[var(--bad-soft)] hover:text-[var(--bad)]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Checkout Info Banner */}
        {dailyCheckoutAt && openSession && canTrackTime && (
          <div aria-live="polite" className="mb-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--accent-soft)] p-2.5 text-sm">
            <p className="font-medium text-[var(--text)]">
              Today's checkout time:{' '}
              <span className="font-bold text-[var(--accent)]">
                {formatTimeOfDay(dailyCheckoutAt)}
              </span>
            </p>
            {weekRecommendation && (
              <p className="mt-0.5 text-[var(--text-muted)]">
                Week-adjusted checkout:{' '}
                <span className="font-semibold text-[var(--text)]">
                  {formatTimeOfDay(weekRecommendation.checkoutAt)}
                </span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer / Actions */}
      <div className="space-y-2 border-t border-[var(--border)] pt-2.5">
        {((openSession?.date === stats.date && !isFutureDay) || (isToday && canTrackTime)) && (
          <QuickCheckControls date={stats.date} openSession={openSession} />
        )}

        <div className="flex flex-col gap-1.5">
          {showCompletionWarning &&
            blockMessages.map((message) => (
              <div
                key={message}
                className="flex items-start gap-1.5 rounded-[var(--radius)] p-2 text-sm tone-warn text-[var(--warn)]"
              >
                <CalendarX2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{message}</span>
              </div>
            ))}

          {!isFutureDay && (
            <div className="flex items-center justify-between gap-2">
              {canTrackTime ? (
                <button
                  type="button"
                  disabled={actionsBlocked}
                  onClick={addSessionClick}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add session
                </button>
              ) : <div />}

              <DayStatusMenu
                dateKey={stats.date}
                value={stats.timeOff?.type ?? 'none'}
                disabled={actionsBlocked}
                onChange={onDayStatusChange}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals & Session Forms */}
      {pendingMark && (
        <TimeOffReasonModal
          type={pendingMark}
          mode="mark"
          onClose={() => setPendingMark(null)}
          onConfirm={(reason) => {
            if (applyTimeOff(pendingMark, reason)) setPendingMark(null)
          }}
        />
      )}

      {editingReason && stats.timeOff && (
        <TimeOffReasonModal
          type={stats.timeOff.type}
          mode="edit"
          initialReason={stats.timeOff.note ?? ''}
          onClose={() => setEditingReason(false)}
          onConfirm={saveReason}
        />
      )}

      {editing && (
        <SessionForm
          date={stats.date}
          session={editing === 'new' || editing === 'restore' ? undefined : editing}
          restoreMode={editing === 'restore'}
          successMessage={
            editing === 'restore' ? `${formatDayLabel(parseISODate(stats.date))} restored as a workday.` : undefined
          }
          onSaved={() => {
            if (resumeHalfDayAfterSession) {
              setPendingMark('half-day')
            }
            setResumeHalfDayAfterSession(false)
          }}
          onClose={() => {
            setEditing(null)
            setResumeHalfDayAfterSession(false)
          }}
        />
      )}
    </div>
  )
}