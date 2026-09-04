import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAppData } from '../../context/useAppData'
import { combineDateAndTime, toISODate, toTimeInputValue } from '../../lib/date'
import type { ISODate, Session } from '../../types'
import { Modal } from '../shared/Modal'
import { useNotify } from '../shared/notifyContext'

export function SessionForm({
  date,
  session,
  onClose,
  onSaved,
  restoreMode = false,
  successMessage,
}: {
  date: ISODate
  session?: Session
  onClose: () => void
  /** Called after a successful save, before onClose. */
  onSaved?: () => void
  restoreMode?: boolean
  successMessage?: string
}) {
  const { upsertSession, restoreWorkday, openSession } = useAppData()
  const { notify } = useNotify()
  const todayISO = toISODate(new Date())
  const [checkInTime, setCheckInTime] = useState(session ? toTimeInputValue(session.checkIn) : '')
  const [checkOutTime, setCheckOutTime] = useState(
    session?.checkOut != null ? toTimeInputValue(session.checkOut) : '',
  )
  const [leaveOpen, setLeaveOpen] = useState(session ? session.checkOut === null && date === todayISO : false)
  const [error, setError] = useState<string | null>(null)

  const isEditingOpenSession = session?.checkOut === null
  const canLeaveOpen = date === todayISO && (isEditingOpenSession || !openSession)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const checkIn = combineDateAndTime(date, checkInTime)
    if (checkIn === null) {
      setError('Enter a valid check-in time.')
      return
    }

    let checkOut: number | null = null
    if (!leaveOpen) {
      checkOut = combineDateAndTime(date, checkOutTime)
      if (checkOut === null) {
        setError('Enter a valid check-out time, or mark this session as still open.')
        return
      }
    }

    const input = { id: session?.id, date, checkIn, checkOut }
    const result = restoreMode ? restoreWorkday(date, input) : upsertSession(input)
    if (!result.ok) {
      setError(result.error)
      notify(result.error, 'error')
      return
    }
    notify(successMessage ?? (session ? 'Session updated.' : 'Session added.'))
    onSaved?.()
    onClose()
  }

  return (
    <Modal title={restoreMode ? 'Add session to restore workday' : session ? 'Edit session' : 'Add session'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="session-check-in" className="mb-1 block text-sm font-medium text-[var(--text)]">
            Check-in
          </label>
          <input
            id="session-check-in"
            type="time"
            required
            autoFocus
            value={checkInTime}
            onChange={(e) => setCheckInTime(e.target.value)}
            className="glass-input w-full rounded-[var(--radius)] border px-3 py-2 text-[var(--text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="session-check-out" className="block text-sm font-medium text-[var(--text)]">
              Check-out
            </label>
            {canLeaveOpen && (
              <label className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
                <input
                  type="checkbox"
                  checked={leaveOpen}
                  onChange={(e) => setLeaveOpen(e.target.checked)}
                  className="h-3.5 w-3.5 rounded-[var(--radius-sm)] border-[var(--border)]"
                />
                Still checked in
              </label>
            )}
          </div>
          <input
            id="session-check-out"
            type="time"
            required={!leaveOpen}
            disabled={leaveOpen}
            value={checkOutTime}
            onChange={(e) => setCheckOutTime(e.target.value)}
            className="glass-input w-full rounded-[var(--radius)] border px-3 py-2 text-[var(--text)] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-[var(--radius)] bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
