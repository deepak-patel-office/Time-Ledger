import { createContext, useContext } from 'react'

export type NotifyKind = 'success' | 'error' | 'info'

export interface NotifyValue {
  notify: (message: string, kind?: NotifyKind) => void
}

export const NotifyContext = createContext<NotifyValue | null>(null)

export function useNotify(): NotifyValue {
  const context = useContext(NotifyContext)
  if (!context) throw new Error('useNotify must be used within NotifyProvider')
  return context
}
