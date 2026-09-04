import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { useAppData } from '../../context/useAppData'
import { combineDateAndTime, toISODate } from '../../lib/date'
import { getUnresolvedPriorWorkdays, isDayBlockedByOpenSession } from '../../lib/sessions'
import type { ISODate, Session } from '../../types'
import { LogIn, LogOut } from 'lucide-react'
import { useNotify } from '../shared/notifyContext'

function InlineTimeEntry({
  label,
  onSubmit,
  onCancel,
}: {
  label: string
  onSubmit: (time: string) => { ok: true } | { ok: false; error: string }
  onCancel: () => void
}) {
  const [time, setTime] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputId = useId()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const result = onSubmit(time)
    if (!result.ok) setError(result.error)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        id={inputId}
        type="time"
        required
        autoFocus
        value={time}
        onChange={(e) => setTime(e.target.value)}
        className="glass-input rounded-[var(--radius)] border px-2 py-1.5 text-sm text-[var(--text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
      />
      <button
        type="submit"
        className="btn-primary"
      >
        Confirm
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="btn-ghost"
      >
        Cancel
      </button>
      {error && (
        <p role="alert" className="w-full text-sm text-[var(--bad)]">
          {error}
        </p>
      )}
    </form>
  )
}

export function QuickCheckControls({ date, openSession }: { date: ISODate; openSession: Session | undefined }) {
  const { checkIn, checkOut, sessions, settings, timeOff } = useAppData()
  const { notify } = useNotify()
  const [mode, setMode] = useState<'idle' | 'check-in' | 'custom-out'>('idle')
  const [error, setError] = useState<string | null>(null)

  const unresolvedPrior = getUnresolvedPriorWorkdays(date, sessions, settings, timeOff)
  const priorDaysBlocked = unresolvedPrior.length > 0
  const openSessionBlocksDay = isDayBlockedByOpenSession(date, sessions)
  const todayISO = toISODate(new Date())
  const isFutureDay = date > todayISO
  const isActualToday = date === todayISO
  const checkInBlocked = !!openSession || priorDaysBlocked || openSessionBlocksDay || isFutureDay

  const openSessionIsToday = openSession?.date === date

  if (openSessionIsToday && openSession) {
    if (mode === 'custom-out') {
      return (
        <InlineTimeEntry
          label="Check-out time"
          onCancel={() => setMode('idle')}
          onSubmit={(time) => {
            const ms = combineDateAndTime(date, time)
            if (ms === null) return { ok: false, error: 'Enter a valid time.' }
            const result = checkOut(openSession.id, ms)
            if (result.ok) {
              setMode('idle')
              notify('Checked out successfully.')
            } else {
              notify(result.error, 'error')
            }
            return result
          }}
        />
      )
    }
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!isActualToday}
          onClick={() => {
            const result = checkOut(openSession.id, Date.now())
            setError(result.ok ? null : result.error)
            notify(result.ok ? 'Checked out successfully.' : result.error, result.ok ? 'success' : 'error')
          }}
          className="btn-primary disabled:cursor-not-allowed disabled:bg-[var(--border)] disabled:text-[var(--text-muted)] disabled:shadow-none"
        >
          <LogOut className="h-4 w-4" />
          Check out now
        </button>
        <button
          type="button"
          onClick={() => setMode('custom-out')}
          className="btn-ghost"
        >
          At a specific time
        </button>
        {error && (
          <p role="alert" className="w-full text-sm text-[var(--bad)]">
            {error}
          </p>
        )}
      </div>
    )
  }

  if (mode === 'check-in') {
    return (
      <InlineTimeEntry
        label="Check-in time"
        onCancel={() => setMode('idle')}
        onSubmit={(time) => {
          const ms = combineDateAndTime(date, time)
          if (ms === null) return { ok: false, error: 'Enter a valid time.' }
          const result = checkIn(date, ms)
          if (result.ok) {
            setMode('idle')
            notify('Checked in successfully.')
          } else {
            notify(result.error, 'error')
          }
          return result
        }}
      />
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={checkInBlocked}
        onClick={() => setMode('check-in')}
        className="btn-primary disabled:cursor-not-allowed disabled:bg-[var(--border)] disabled:text-[var(--text-muted)] disabled:shadow-none"
      >
        <LogIn className="h-4 w-4" />
        Check in
      </button>
      {error && (
        <p role="alert" className="w-full text-sm text-[var(--bad)]">
          {error}
        </p>
      )}
    </div>
  )
}
