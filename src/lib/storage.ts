import {
  DEFAULT_SETTINGS,
  type AppData,
  type Session,
  type Settings,
  type TimeOffEntry,
  type WeekdayIndex,
} from '../types'
import { financialYearPruneStartISO } from './leaves'

const STORAGE_KEY = 'time-ledger:data'
const CURRENT_VERSION = 2

/** Drop sessions and time-off entries from before the current financial year (Apr–Mar by default).
 * Calendar New Year (1 Jan) does not reset data — only a new FY start does.
 */
export function pruneToCurrentFinancialYear(data: AppData, referenceDate = new Date()): AppData {
  const settings = ensureSettings(data.settings)
  const startISO = financialYearPruneStartISO(referenceDate, settings.financialYearStartMonth)
  return {
    ...data,
    settings,
    sessions: data.sessions.filter((s) => s.date >= startISO),
    timeOff: data.timeOff.filter((e) => e.date >= startISO),
  }
}

/** @deprecated Use pruneToCurrentFinancialYear */
export const pruneToCurrentYear = pruneToCurrentFinancialYear

export function defaultAppData(): AppData {
  return { version: CURRENT_VERSION, sessions: [], settings: { ...DEFAULT_SETTINGS }, timeOff: [] }
}

function isWeekdayIndex(v: unknown): v is WeekdayIndex {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 6
}

function sanitizeSettings(v: unknown): Settings {
  if (typeof v !== 'object' || v === null) return { ...DEFAULT_SETTINGS }
  const obj = v as Record<string, unknown>
  const dailyTargetHours =
    typeof obj.dailyTargetHours === 'number' && Number.isFinite(obj.dailyTargetHours) && obj.dailyTargetHours > 0
      ? obj.dailyTargetHours
      : DEFAULT_SETTINGS.dailyTargetHours
  const workdays =
    Array.isArray(obj.workdays) && obj.workdays.every(isWeekdayIndex) && obj.workdays.length > 0
      ? (obj.workdays as WeekdayIndex[])
      : DEFAULT_SETTINGS.workdays
  const annualLeaveDays =
    typeof obj.annualLeaveDays === 'number' && Number.isFinite(obj.annualLeaveDays) && obj.annualLeaveDays >= 0
      ? obj.annualLeaveDays
      : DEFAULT_SETTINGS.annualLeaveDays
  const leavePerMonth =
    typeof obj.leavePerMonth === 'number' && Number.isFinite(obj.leavePerMonth) && obj.leavePerMonth >= 0
      ? obj.leavePerMonth
      : DEFAULT_SETTINGS.leavePerMonth
  const financialYearStartMonth =
    typeof obj.financialYearStartMonth === 'number' &&
    Number.isInteger(obj.financialYearStartMonth) &&
    obj.financialYearStartMonth >= 0 &&
    obj.financialYearStartMonth <= 11
      ? obj.financialYearStartMonth
      : DEFAULT_SETTINGS.financialYearStartMonth
  return { dailyTargetHours, workdays, annualLeaveDays, leavePerMonth, financialYearStartMonth }
}

/** Ensure leave-quota fields exist even for older saved settings. */
export function ensureSettings(settings: Settings): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    annualLeaveDays:
      typeof settings.annualLeaveDays === 'number' && Number.isFinite(settings.annualLeaveDays)
        ? settings.annualLeaveDays
        : DEFAULT_SETTINGS.annualLeaveDays,
    leavePerMonth:
      typeof settings.leavePerMonth === 'number' && Number.isFinite(settings.leavePerMonth)
        ? settings.leavePerMonth
        : DEFAULT_SETTINGS.leavePerMonth,
    financialYearStartMonth:
      typeof settings.financialYearStartMonth === 'number' &&
      Number.isInteger(settings.financialYearStartMonth)
        ? settings.financialYearStartMonth
        : DEFAULT_SETTINGS.financialYearStartMonth,
  }
}

function isValidSession(v: unknown): v is Session {
  if (typeof v !== 'object' || v === null) return false
  const obj = v as Record<string, unknown>
  return (
    typeof obj.id === 'string' &&
    typeof obj.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(obj.date) &&
    typeof obj.checkIn === 'number' &&
    Number.isFinite(obj.checkIn) &&
    (obj.checkOut === null || (typeof obj.checkOut === 'number' && Number.isFinite(obj.checkOut)))
  )
}

function sanitizeSessions(v: unknown): Session[] {
  if (!Array.isArray(v)) return []
  return v.filter(isValidSession)
}

function isValidTimeOff(v: unknown): v is TimeOffEntry {
  if (typeof v !== 'object' || v === null) return false
  const obj = v as Record<string, unknown>
  const type = obj.type === 'day-off' ? 'holiday' : obj.type
  if (
    typeof obj.date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(obj.date) ||
    (type !== 'leave' && type !== 'holiday' && type !== 'half-day') ||
    (obj.note !== undefined && typeof obj.note !== 'string')
  ) {
    return false
  }
  obj.type = type
  return true
}

function sanitizeTimeOff(v: unknown): TimeOffEntry[] {
  if (!Array.isArray(v)) return []
  const byDate = new Map<string, TimeOffEntry>()
  v.filter(isValidTimeOff).forEach((entry) => byDate.set(entry.date, entry))
  return Array.from(byDate.values())
}

export function sanitizeAppData(raw: unknown, referenceDate = new Date()): AppData {
  if (typeof raw !== 'object' || raw === null) return defaultAppData()
  const obj = raw as Record<string, unknown>
  const data: AppData = {
    version: CURRENT_VERSION,
    sessions: sanitizeSessions(obj.sessions),
    settings: sanitizeSettings(obj.settings),
    timeOff: sanitizeTimeOff(obj.timeOff),
  }
  return pruneToCurrentFinancialYear(data, referenceDate)
}

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultAppData()
    const data = sanitizeAppData(JSON.parse(raw))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return data
  } catch {
    return defaultAppData()
  }
}

export function saveAppData(data: AppData): boolean {
  try {
    const pruned = pruneToCurrentFinancialYear(data)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned))
    return true
  } catch {
    return false
  }
}
