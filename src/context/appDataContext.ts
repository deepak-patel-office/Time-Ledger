import { createContext } from 'react'
import type { ISODate, Session, Settings, TimeOffEntry } from '../types'
import type { SessionInput, ValidationResult } from '../lib/sessions'

export interface AppDataState {
  sessions: Session[]
  settings: Settings
  timeOff: TimeOffEntry[]
}

export interface AppDataContextValue extends AppDataState {
  saveError: boolean
  checkIn: (date: ISODate, time: number) => ValidationResult
  checkOut: (sessionId: string, time: number) => ValidationResult
  upsertSession: (input: SessionInput) => ValidationResult
  removeSession: (id: string) => ValidationResult
  updateSettings: (partial: Partial<Settings>) => void
  setTimeOff: (entry: TimeOffEntry) => ValidationResult
  removeTimeOff: (date: ISODate) => ValidationResult
  restoreWorkday: (date: ISODate, sessionInput?: SessionInput) => ValidationResult
  openSession: Session | undefined
}

export const AppDataContext = createContext<AppDataContextValue | null>(null)
