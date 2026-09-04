import { useState } from 'react'
import type { FormEvent } from 'react'
import type { TimeOffType } from '../../types'
import { Modal } from '../shared/Modal'

function titleFor(type: TimeOffType, mode: 'mark' | 'edit'): string {
  const label = type === 'leave' ? 'leave' : type === 'half-day' ? 'half day' : 'holiday'
  return mode === 'edit' ? `Edit ${label} reason` : `Reason for ${label}`
}

export function TimeOffReasonModal({
  type,
  mode = 'mark',
  initialReason = '',
  onClose,
  onConfirm,
}: {
  type: TimeOffType
  mode?: 'mark' | 'edit'
  initialReason?: string
  onClose: () => void
  onConfirm: (reason: string) => void
}) {
  const requiresReason = type === 'leave' || type === 'half-day'
  const [reason, setReason] = useState(initialReason)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = reason.trim()
    if (requiresReason && !trimmed) {
      setError('Reason is required.')
      return
    }
    onConfirm(trimmed)
  }

  return (
    <Modal title={titleFor(type, mode)} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="time-off-reason" className="mb-1 block text-sm font-medium text-[var(--text)]">
            Reason{requiresReason ? ' *' : ' (optional)'}
          </label>
          <textarea
            id="time-off-reason"
            rows={3}
            maxLength={200}
            required={requiresReason}
            autoFocus
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              if (error) setError(null)
            }}
            placeholder={
              type === 'leave'
                ? 'Why are you taking leave?'
                : type === 'half-day'
                  ? 'Why is this a half day?'
                  : 'Optional note'
            }
            className="glass-input w-full resize-none rounded-[var(--radius)] border px-3 py-2 text-sm text-[var(--text)]"
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">{reason.trim().length}/200</p>
        </div>

        {error && (
          <p role="alert" className="rounded-[var(--radius)] bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            {mode === 'edit' ? 'Save reason' : 'Confirm'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
