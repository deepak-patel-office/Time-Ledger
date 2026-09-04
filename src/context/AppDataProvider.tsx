import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { ISODate, Session, Settings, TimeOffEntry } from '../types'
import { generateId } from '../lib/id'
import type { SessionInput, ValidationResult } from '../lib/sessions'
import {
  hasCompletedSessionForDate,
  validateCanRemoveSession,
  validateCanRemoveTimeOff,
  validateHalfDayRequiresSession,
  validateOpenSessionBlocksFollowingDays,
  validatePriorWorkdaysInWeek,
  validateSession,
  validateTimeOffWithOpenSession,
} from '../lib/sessions'
import { toISODate } from '../lib/date'
import { canAffordLeaveQuota } from '../lib/leaves'
import { loadAppData, saveAppData, ensureSettings, pruneToCurrentFinancialYear } from '../lib/storage'
import { AppDataContext } from './appDataContext'
import type { AppDataContextValue, AppDataState } from './appDataContext'

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppDataState>(() => {
    const loaded = loadAppData()
    return {
      sessions: loaded.sessions,
      settings: ensureSettings(loaded.settings),
      timeOff: loaded.timeOff,
    }
  })
  const [saveError, setSaveError] = useState(false)
  const isFirstRender = useRef(true)

  useEffect(() => {
    setState((prev) => {
      const nextSettings = ensureSettings(prev.settings)
      if (
        nextSettings.annualLeaveDays === prev.settings.annualLeaveDays &&
        nextSettings.leavePerMonth === prev.settings.leavePerMonth &&
        nextSettings.financialYearStartMonth === prev.settings.financialYearStartMonth
      ) {
        return prev
      }
      return { ...prev, settings: nextSettings }
    })
  }, [])

  useEffect(() => {
    function dropPreviousFinancialYear() {
      setState((prev) => {
        const pruned = pruneToCurrentFinancialYear({
          version: 2,
          sessions: prev.sessions,
          settings: prev.settings,
          timeOff: prev.timeOff,
        })
        if (
          pruned.sessions.length === prev.sessions.length &&
          pruned.timeOff.length === prev.timeOff.length
        ) {
          return prev
        }
        return { sessions: pruned.sessions, settings: pruned.settings, timeOff: pruned.timeOff }
      })
    }

    dropPreviousFinancialYear()
    const id = window.setInterval(dropPreviousFinancialYear, 60_000)
    document.addEventListener('visibilitychange', dropPreviousFinancialYear)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', dropPreviousFinancialYear)
    }
  }, [])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const ok = saveAppData({ version: 2, sessions: state.sessions, settings: state.settings, timeOff: state.timeOff })
    setSaveError(!ok)
  }, [state])

  const checkIn = useCallback((date: ISODate, time: number): ValidationResult => {
    let result: ValidationResult = { ok: true }
    setState((prev) => {
      const now = Date.now()
      result = validateOpenSessionBlocksFollowingDays(date, prev.sessions)
      if (!result.ok) return prev
      result = validatePriorWorkdaysInWeek(date, prev.sessions, prev.settings, prev.timeOff)
      if (!result.ok) return prev
      const candidate: SessionInput = { date, checkIn: time, checkOut: null }
      result = validateSession(candidate, prev.sessions, undefined, now)
      if (!result.ok) return prev
      const newSession: Session = { id: generateId(), date, checkIn: time, checkOut: null }
      return { ...prev, sessions: [...prev.sessions, newSession] }
    })
    return result
  }, [])

  const checkOut = useCallback((sessionId: string, time: number): ValidationResult => {
    let result: ValidationResult = { ok: true }
    setState((prev) => {
      const now = Date.now()
      const target = prev.sessions.find((s) => s.id === sessionId)
      if (!target) {
        result = { ok: false, error: 'Session not found.' }
        return prev
      }
      const candidate: SessionInput = { id: target.id, date: target.date, checkIn: target.checkIn, checkOut: time }
      result = validateSession(candidate, prev.sessions, target.id, now)
      if (!result.ok) return prev
      return {
        ...prev,
        sessions: prev.sessions.map((s) => (s.id === sessionId ? { ...s, checkOut: time } : s)),
      }
    })
    return result
  }, [])

  const upsertSession = useCallback((input: SessionInput): ValidationResult => {
    let result: ValidationResult = { ok: true }
    setState((prev) => {
      const now = Date.now()
      if (!input.id) {
        result = validateOpenSessionBlocksFollowingDays(input.date, prev.sessions)
        if (!result.ok) return prev
        result = validatePriorWorkdaysInWeek(input.date, prev.sessions, prev.settings, prev.timeOff)
        if (!result.ok) return prev
      } else if (input.checkOut === null) {
        result = validateOpenSessionBlocksFollowingDays(input.date, prev.sessions)
        if (!result.ok) return prev
        result = validatePriorWorkdaysInWeek(input.date, prev.sessions, prev.settings, prev.timeOff)
        if (!result.ok) return prev
      }
      result = validateSession(input, prev.sessions, input.id, now)
      if (!result.ok) return prev
      if (input.id) {
        return {
          ...prev,
          sessions: prev.sessions.map((s) =>
            s.id === input.id ? { ...s, date: input.date, checkIn: input.checkIn, checkOut: input.checkOut } : s,
          ),
        }
      }
      const newSession: Session = {
        id: generateId(),
        date: input.date,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
      }
      return { ...prev, sessions: [...prev.sessions, newSession] }
    })
    return result
  }, [])

  const removeSession = useCallback((id: string): ValidationResult => {
    let result: ValidationResult = { ok: true }
    setState((prev) => {
      result = validateCanRemoveSession(id, prev.sessions, prev.settings, prev.timeOff, toISODate(new Date()))
      if (!result.ok) return prev
      return { ...prev, sessions: prev.sessions.filter((s) => s.id !== id) }
    })
    return result
  }, [])

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setState((prev) => ({ ...prev, settings: ensureSettings({ ...prev.settings, ...partial }) }))
  }, [])

  const setTimeOff = useCallback((entry: TimeOffEntry): ValidationResult => {
    let result: ValidationResult = { ok: true }
    setState((prev) => {
      const todayISO = toISODate(new Date())
      if (entry.date > todayISO) {
        result = { ok: false, error: 'Future dates cannot be updated.' }
        return prev
      }
      result = validateTimeOffWithOpenSession(entry.date, entry.type, prev.sessions, todayISO)
      if (!result.ok) return prev
      const alreadyMarked = prev.timeOff.some((item) => item.date === entry.date)
      if (!alreadyMarked) {
        result = validateOpenSessionBlocksFollowingDays(entry.date, prev.sessions)
        if (!result.ok) return prev
        result = validatePriorWorkdaysInWeek(entry.date, prev.sessions, prev.settings, prev.timeOff)
        if (!result.ok) return prev
      }
      const afford = canAffordLeaveQuota(prev.timeOff, prev.settings, entry.date, entry.type)
      if (!afford.ok) {
        result = afford
        return prev
      }
      result = validateHalfDayRequiresSession(entry.date, entry.type, prev.sessions, todayISO)
      if (!result.ok) return prev
      if (
        (entry.type === 'leave' || entry.type === 'half-day') &&
        !(typeof entry.note === 'string' && entry.note.trim().length > 0)
      ) {
        result = {
          ok: false,
          error: entry.type === 'leave' ? 'Please add a reason for leave.' : 'Please add a reason for half day.',
        }
        return prev
      }
      return {
        ...prev,
        timeOff: [
          ...prev.timeOff.filter((item) => item.date !== entry.date),
          { ...entry, note: entry.note?.trim() || undefined },
        ].sort((a, b) => a.date.localeCompare(b.date)),
      }
    })
    return result
  }, [])

  const removeTimeOff = useCallback((date: ISODate): ValidationResult => {
    let result: ValidationResult = { ok: true }
    setState((prev) => {
      result = validateCanRemoveTimeOff(date, prev.sessions, prev.settings, toISODate(new Date()))
      if (!result.ok) return prev
      return { ...prev, timeOff: prev.timeOff.filter((entry) => entry.date !== date) }
    })
    return result
  }, [])

  const restoreWorkday = useCallback((date: ISODate, sessionInput?: SessionInput): ValidationResult => {
    let result: ValidationResult = { ok: true }
    setState((prev) => {
      const now = Date.now()
      let sessions = prev.sessions

      if (!hasCompletedSessionForDate(date, sessions)) {
        if (!sessionInput) {
          result = { ok: false, error: 'Add a session to restore this workday.' }
          return prev
        }
        result = validateOpenSessionBlocksFollowingDays(sessionInput.date, prev.sessions)
        if (!result.ok) return prev
        result = validatePriorWorkdaysInWeek(sessionInput.date, prev.sessions, prev.settings, prev.timeOff)
        if (!result.ok) return prev
        result = validateSession(sessionInput, prev.sessions, undefined, now)
        if (!result.ok) return prev
        const newSession: Session = {
          id: generateId(),
          date: sessionInput.date,
          checkIn: sessionInput.checkIn,
          checkOut: sessionInput.checkOut,
        }
        sessions = [...prev.sessions, newSession]
      }

      result = validateCanRemoveTimeOff(date, sessions, prev.settings, toISODate(new Date()))
      if (!result.ok) return prev

      return {
        ...prev,
        sessions,
        timeOff: prev.timeOff.filter((entry) => entry.date !== date),
      }
    })
    return result
  }, [])

  const openSession = useMemo(() => state.sessions.find((s) => s.checkOut === null), [state.sessions])

  const value = useMemo<AppDataContextValue>(
    () => ({
      ...state,
      saveError,
      checkIn,
      checkOut,
      upsertSession,
      removeSession,
      updateSettings,
      setTimeOff,
      removeTimeOff,
      restoreWorkday,
      openSession,
    }),
    [state, saveError, checkIn, checkOut, upsertSession, removeSession, updateSettings, setTimeOff, removeTimeOff, restoreWorkday, openSession],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}
