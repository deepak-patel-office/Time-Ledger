import { Palmtree, Calendar, Info, TrendingUp, CheckCircle2, CalendarDays, HelpCircle } from 'lucide-react'
import { useMemo } from 'react'
import { useAppData } from '../../context/useAppData'
import { useNow } from '../../hooks/useNow'
import { formatMonthName } from '../../lib/date'
import { computeLeaveBalance, formatLeaveDays } from '../../lib/leaves'
import { monthlyWorkSummaryForFinancialYear } from '../../lib/workdays'

export function TimeOffView() {
  const { timeOff, sessions, settings } = useAppData()
  const now = useNow(60_000)

  const balance = useMemo(
    () => computeLeaveBalance(timeOff, settings, new Date(now)),
    [timeOff, settings, now],
  )

  const monthRows = useMemo(
    () => monthlyWorkSummaryForFinancialYear(sessions, timeOff, settings, new Date(now)),
    [sessions, timeOff, settings, now],
  )

  const fyResetMonth = formatMonthName(settings.financialYearStartMonth)

  return (
    <div className="space-y-4">
      <section className="app-card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <span className="icon-box">
              <Palmtree className="h-4 w-4" />
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="app-heading">Leave balance</h2>
              <span className="chip chip-muted">{balance.fy.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
            <Info className="h-4 w-4 shrink-0 text-[var(--accent)]" />
            <span>
              {formatLeaveDays(balance.leavePerMonth)} credited each month · Resets {fyResetMonth}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="app-tile group p-3">
            <div className="flex items-start justify-between gap-1">
              <div className="flex items-center gap-2">
                <span className="icon-box h-8 w-8">
                  <TrendingUp className="h-4 w-4" />
                </span>
                <div>
                  <span className="block text-sm font-semibold text-[var(--text)]">Accrued</span>
                  <span className="app-label">Earned so far this year</span>
                </div>
              </div>
              <div title="Leaves earned from the financial year start through the current month.">
                <HelpCircle className="h-4 w-4 text-[var(--text-muted)]" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline justify-between border-t border-[var(--border)] pt-2">
              <p className="app-value">{formatLeaveDays(balance.accrued)}</p>
              <span className="text-sm text-[var(--text-muted)]">of {settings.annualLeaveDays} yearly</span>
            </div>
          </div>

          <div className="group rounded-[var(--radius)] border p-3 tone-bad">
            <div className="flex items-start justify-between gap-1">
              <div className="flex items-center gap-2">
                <span className="rounded-[var(--radius)] bg-[var(--bad-soft)] p-1.5 text-[var(--bad)]">
                  <Palmtree className="h-4 w-4" />
                </span>
                <div>
                  <span className="block text-sm font-semibold text-[var(--bad)]">Taken</span>
                  <span className="text-sm text-[var(--bad)]/80">Used this financial year</span>
                </div>
              </div>
              <div title="Total leave used this financial year (full day = 1, half day = 0.5).">
                <HelpCircle className="h-4 w-4 text-[var(--bad)]" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline justify-between border-t border-[var(--bad-border)] pt-2">
              <p className="text-[1.0625rem] font-bold text-[var(--bad)]">{formatLeaveDays(balance.taken)}</p>
              <span className="text-sm text-[var(--bad)]/80">Deducted</span>
            </div>
          </div>

          <div className="group rounded-[var(--radius)] border p-3 tone-good">
            <div className="flex items-start justify-between gap-1">
              <div className="flex items-center gap-2">
                <span className="rounded-[var(--radius)] bg-[var(--good-soft)] p-1.5 text-[var(--good)]">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div>
                  <span className="block text-sm font-semibold text-[var(--good)]">Available</span>
                  <span className="text-sm text-[var(--good)]/80">Ready to use</span>
                </div>
              </div>
              <div title="Accrued minus taken.">
                <HelpCircle className="h-4 w-4 text-[var(--good)]" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline justify-between border-t border-[var(--good-border)] pt-2">
              <p className="text-[1.0625rem] font-bold text-[var(--good)]">{formatLeaveDays(balance.remaining)}</p>
              <span className="text-sm text-[var(--good)]/80">Accrued − taken</span>
            </div>
          </div>

          <div className="group rounded-[var(--radius)] border p-3 tone-warn">
            <div className="flex items-start justify-between gap-1">
              <div className="flex items-center gap-2">
                <span className="rounded-[var(--radius)] bg-[var(--warn-soft)] p-1.5 text-[var(--warn)]">
                  <CalendarDays className="h-4 w-4" />
                </span>
                <div>
                  <span className="block text-sm font-semibold text-[var(--warn)]">This month</span>
                  <span className="text-sm text-[var(--warn)]/80">Current month usage</span>
                </div>
              </div>
              <div title="Leave used in the current calendar month.">
                <HelpCircle className="h-4 w-4 text-[var(--warn)]" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline justify-between border-t border-[var(--warn-border)] pt-2">
              <p className="text-[1.0625rem] font-bold text-[var(--warn)]">{formatLeaveDays(balance.thisMonthTaken)}</p>
              <span className="text-sm text-[var(--warn)]/80">Taken this month</span>
            </div>
          </div>
        </div>
      </section>

      <section className="app-card">
        <div className="mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[var(--accent)]" />
          <h2 className="app-heading">Days worked by month</h2>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {monthRows.map((row) => {
            const maxDaysInMonth = 22
            const progressRatio = Math.min(row.daysWorked / maxDaysInMonth, 1)

            return (
              <div
                key={row.monthPrefix}
                className={`relative flex min-h-[8.75rem] flex-col justify-between rounded-[var(--radius)] border p-2.5 text-left ${
                  row.isCurrent
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'app-tile'
                } ${row.isFuture ? 'opacity-40' : ''}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-sm font-semibold ${row.isCurrent ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>
                    {row.label}
                  </span>
                  {row.isCurrent && (
                    <span className="h-2 w-2 rounded-full bg-[var(--accent)]" title="Current month" />
                  )}
                </div>

                <p className="mt-2 app-value">
                  {row.daysWorked}
                  <span className="ml-0.5 text-sm font-normal text-[var(--text-muted)]"> days worked</span>
                </p>

                <dl className="mt-2 grid grid-cols-3 gap-1 text-center text-sm leading-tight">
                  <div className="rounded-[var(--radius-sm)] bg-[var(--bad-soft)] px-1 py-1">
                    <dt className="text-[var(--bad)]">Leave</dt>
                    <dd className="font-semibold text-[var(--bad)]">{row.leaveCount}</dd>
                  </div>
                  <div className="rounded-[var(--radius-sm)] bg-[var(--warn-soft)] px-1 py-1">
                    <dt className="text-[var(--warn)]">Half</dt>
                    <dd className="font-semibold text-[var(--warn)]">{row.halfDayCount}</dd>
                  </div>
                  <div className="rounded-[var(--radius-sm)] bg-[var(--surface-hover)] px-1 py-1">
                    <dt className="text-[var(--text-muted)]">Holiday</dt>
                    <dd className="font-semibold text-[var(--text)]">{row.holidayCount}</dd>
                  </div>
                </dl>

                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-[var(--radius)] bg-[var(--border)]">
                  <div
                    className="h-full bg-[var(--accent)]"
                    style={{ width: `${progressRatio * 100}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
