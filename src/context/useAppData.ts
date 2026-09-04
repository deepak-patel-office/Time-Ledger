import { useContext } from 'react'
import { AppDataContext } from './appDataContext'
import type { AppDataContextValue } from './appDataContext'

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within an AppDataProvider')
  return ctx
}
