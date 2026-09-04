import { useEffect, useId, useState } from 'react'
import { Briefcase, CalendarRange, Check, Clock3, Info, Minus, Plus, AlertCircle } from 'lucide-react'
import { useAppData } from '../../context/useAppData'
import { formatMonthName } from '../../lib/date'
import type { WeekdayIndex } from '../../types'
import { useNotify } from '../shared/notifyContext'

const WEEKDAY_LABELS: { index: WeekdayIndex; label: string; fullLabel: string }[] = [
  { index: 1, label: 'Mon', fullLabel: 'Monday' },
  { index: 2, label: 'Tue', fullLabel: 'Tuesday' },
  { index: 3, label: 'Wed', fullLabel: 'Wednesday' },
  { index: 4, label: 'Thu', fullLabel: 'Thursday' },
  { index: 5, label: 'Fri', fullLabel: 'Friday' },
  { index: 6, label: 'Sat', fullLabel: 'Saturday' },
  { index: 0, label: 'Sun', fullLabel: 'Sunday' },
]

export function SettingsView() {
  const { settings, updateSettings } = useAppData()
  const { notify } = useNotify()
  const targetInputId = useId()
  const [hoursText, setHoursText] = useState(String(settings.dailyTargetHours))
  const [error, setError] = useState<string | null>(null)
  const fyMonth = formatMonthName(settings.financialYearStartMonth)

  useEffect(() => {
    setHoursText(String(settings.dailyTargetHours))
  }, [settings.dailyTargetHours])

  function commitHours(val: number) {
    if (!Number.isFinite(val) || val <= 0 || val > 24) {
      setError('Target must be between 0.5 and 24 hours.')
      return
    }
    setError(null)
    setHoursText(String(val))
    updateSettings({ dailyTargetHours: val })
  }

  function handleInputChange(text: string) {
    setHoursText(text)
    const val = Number(text)
    if (!Number.isFinite(val) || val <= 0 || val > 24) {
      setError('Target must be between 0.5 and 24 hours.')
      return
    }
    setError(null)
    updateSettings({ dailyTargetHours: val })
  }

  function adjustHours(delta: number) {
    const current = Number(hoursText) || 8
    const next = Math.min(24, Math.max(0.5, current + delta))
    commitHours(next)
  }

  function toggleWorkday(day: WeekdayIndex) {
    const has = settings.workdays.includes(day)
    const next = has ? settings.workdays.filter((d) => d !== day) : [...settings.workdays, day]
    if (next.length === 0) {
      notify('Keep at least one workday selected.', 'error')
      return
    }
    updateSettings({ workdays: next })
  }

  const weeklyTarget = (settings.workdays.length * (Number(hoursText) || 0)).toFixed(1)

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <section className="app-card">
        <div className="mb-4 flex items-center gap-3 border-b border-[var(--border)] pb-3">
          <span className="icon-box">
            <Clock3 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="app-heading">Daily work target</h2>
            <p className="app-subhead">Hours expected on a standard working day</p>
          </div>
        </div>

        <div className="app-tile flex flex-wrap items-center justify-between gap-4 p-3.5">
          <div>
            <label htmlFor={targetInputId} className="block text-sm font-semibold text-[var(--text)]">
              Daily hours target
            </label>
            <p className="text-sm text-[var(--text-muted)]">Weekly target auto-calculates to ~{weeklyTarget} hrs</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => adjustHours(-0.5)}
              aria-label="Decrease hours"
              className="grid h-9 w-9 place-items-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-hover)]"
            >
              <Minus className="h-4 w-4" />
            </button>

            <div className="relative">
              <input
                id={targetInputId}
                type="number"
                min={0.5}
                max={24}
                step={0.5}
                value={hoursText}
                onChange={(e) => handleInputChange(e.target.value)}
                className="glass-input w-20 rounded-[var(--radius)] border px-2 py-1.5 text-center font-bold text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
              />
              <span className="absolute right-2 top-2 text-sm font-medium text-[var(--text-muted)]">h</span>
            </div>

            <button
              type="button"
              onClick={() => adjustHours(0.5)}
              aria-label="Increase hours"
              className="grid h-9 w-9 place-items-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-hover)]"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-[var(--bad)]">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}
      </section>

      <section className="app-card">
        <div className="mb-4 flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-3">
            <span className="icon-box">
              <Briefcase className="h-5 w-5" />
            </span>
            <div>
              <h2 className="app-heading">Standard workdays</h2>
              <p className="app-subhead">Active days for hours and leave calculations</p>
            </div>
          </div>
          <span className="chip chip-muted hidden sm:inline-flex">{settings.workdays.length} days/week</span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {WEEKDAY_LABELS.map(({ index, label, fullLabel }) => {
            const checked = settings.workdays.includes(index)
            return (
              <button
                key={index}
                type="button"
                aria-label={fullLabel}
                aria-pressed={checked}
                onClick={() => toggleWorkday(index)}
                className={`relative flex items-center justify-center rounded-[var(--radius)] border p-3 text-sm font-semibold ${
                  checked
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--border)] bg-[var(--bg)] font-medium text-[var(--text-muted)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <span className="sm:hidden">{label}</span>
                <span className="hidden sm:inline">{fullLabel}</span>
                {checked && (
                  <span className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-[var(--radius-sm)] bg-[var(--accent)] text-white">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </section>

      <section className="app-card">
        <div className="mb-4 flex items-center gap-3 border-b border-[var(--border)] pb-3">
          <span className="icon-box">
            <CalendarRange className="h-5 w-5" />
          </span>
          <div>
            <h2 className="app-heading">Leave policy &amp; financial year</h2>
            <p className="app-subhead">
              Leave accounting follows the {fyMonth} start cycle
            </p>
          </div>
        </div>

        <div className="space-y-2.5 text-sm text-[var(--text-muted)]">
          <div className="app-tile p-3.5">
            <div className="flex items-start gap-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
              <div className="space-y-3">
                <p className="text-sm text-[var(--text)]">
                  <strong>{settings.annualLeaveDays} leave days</strong> allotted per financial year, credited at{' '}
                  <strong>{settings.leavePerMonth} day/month</strong>.
                </p>

                <div className="space-y-1.5 border-t border-[var(--border)] pt-2.5">
                  <span className="text-sm font-semibold text-[var(--text)]">Leave balance deduction</span>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <div className="chip chip-bad">
                      Full day leave: −1.0 day
                    </div>
                    <div className="chip chip-warn">
                      Half day: −0.5 day
                    </div>
                    <div className="chip chip-muted">
                      Official holiday: 0 (no deduction)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-[var(--radius)] border p-3 tone-warn text-[var(--warn)]">
            <Info className="h-4 w-4 shrink-0" />
            <p className="text-sm">
              <strong>Financial year reset:</strong> When a new year starts on 1 {fyMonth}, previous-year sessions and
              time-off are removed automatically. 1 January does not reset data.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
