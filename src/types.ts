/** Calendar date in local time, formatted as 'YYYY-MM-DD'. */
export type ISODate = string

/** A single check-in/check-out pair. Always contained within one calendar day. */
export interface Session {
  id: string
  /** Calendar date (local) this session belongs to. */
  date: ISODate
  /** Epoch milliseconds. */
  checkIn: number
  /** Epoch milliseconds, or null while the session is still open. */
  checkOut: number | null
}

/** Day of week index: 0 = Sunday ... 6 = Saturday (matches Date#getDay). */
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Settings {
  /** Target hours to cover on a workday. */
  dailyTargetHours: number
  /** Which weekdays require coverage. */
  workdays: WeekdayIndex[]
  /** Total leave days available per financial year. */
  annualLeaveDays: number
  /** Leave days credited at the start of each FY month. */
  leavePerMonth: number
  /** Month index (0–11) when the financial year starts. 3 = April (India). */
  financialYearStartMonth: number
}

export type TimeOffType = 'leave' | 'holiday' | 'half-day'

/** A one-off date: leave/holiday exclude the day; half-day halves the daily target. */
export interface TimeOffEntry {
  date: ISODate
  type: TimeOffType
  note?: string
}

export interface AppData {
  version: number
  sessions: Session[]
  settings: Settings
  timeOff: TimeOffEntry[]
}

export const DEFAULT_SETTINGS: Settings = {
  dailyTargetHours: 9,
  workdays: [1, 2, 3, 4, 5],
  annualLeaveDays: 12,
  leavePerMonth: 1,
  financialYearStartMonth: 3, // April
}

/** Day-card dropdown value for time-off selection. */
export type DayTimeOffChoice = 'none' | TimeOffType

export type DayStatusKind =
  | 'day-off'
  | 'leave'
  | 'holiday'
  | 'half-day'
  | 'not-started'
  | 'remaining'
  | 'covered'
  | 'overtime'

export interface DayStats {
  date: ISODate
  isWorkday: boolean
  targetMs: number
  workedMs: number
  /** Time recorded on an excluded date, retained but not included in totals. */
  recordedWorkedMs: number
  /** workedMs - targetMs. Positive = overtime/surplus, negative = deficit. */
  deltaMs: number
  status: DayStatusKind
  hasOpenSession: boolean
  timeOff: TimeOffEntry | null
}

export interface WeekStats {
  /** ISO date of the Monday starting this week. */
  weekStart: ISODate
  days: DayStats[]
  targetMs: number
  workedMs: number
  deltaMs: number
}

export interface MonthStats {
  year: number
  /** 0-11 */
  month: number
  weeks: WeekStats[]
  targetMs: number
  workedMs: number
  deltaMs: number
}

export interface RecommendedCheckout {
  /** True if today's target is already met once the current week's balance is factored in. */
  alreadyMet: boolean
  /** How far ahead the user is once today's logged time is included, in ms (only when alreadyMet). */
  surplusMs: number
  /** Recommended checkout time in epoch ms (only meaningful when !alreadyMet). */
  checkoutAt: number
  /** How much more time is needed from the currently open session, in ms (only when !alreadyMet). */
  remainingMs: number
}
