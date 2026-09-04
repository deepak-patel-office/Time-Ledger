import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react'
import { NotifyContext, type NotifyKind } from './notifyContext'

interface Notification {
  id: number
  message: string
  kind: NotifyKind
}

const appearance: Record<NotifyKind, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: 'text-[var(--good)]' },
  error: { icon: CircleAlert, className: 'text-[var(--bad)]' },
  info: { icon: Info, className: 'text-[var(--accent)]' },
}

export function NotifyProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const nextId = useRef(0)
  const timers = useRef<number[]>([])
  const lastNotification = useRef<{ message: string; kind: NotifyKind; at: number } | null>(null)

  const dismiss = useCallback((id: number) => {
    setNotifications((current) => current.filter((item) => item.id !== id))
  }, [])

  const notify = useCallback((message: string, kind: NotifyKind = 'success') => {
    const timestamp = Date.now()
    const previous = lastNotification.current
    if (previous && previous.message === message && previous.kind === kind && timestamp - previous.at < 1000) return
    lastNotification.current = { message, kind, at: timestamp }

    const id = ++nextId.current
    setNotifications((current) => [...current.slice(-2), { id, message, kind }])
    const timer = window.setTimeout(() => dismiss(id), 3200)
    timers.current.push(timer)
  }, [dismiss])

  useEffect(() => () => timers.current.forEach(window.clearTimeout), [])

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <NotifyContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed right-3 bottom-3 z-[70] flex w-[calc(100%-1.5rem)] max-w-sm flex-col gap-2 sm:right-5 sm:bottom-5"
      >
        {notifications.map((item) => {
          const style = appearance[item.kind]
          const Icon = style.icon
          return (
            <div
              key={item.id}
              role={item.kind === 'error' ? 'alert' : 'status'}
              className="glass-panel-strong pointer-events-auto flex animate-[notify-in_180ms_ease-out] items-start gap-3 rounded-[var(--radius)] px-4 py-3.5"
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.className}`} />
              <p className="min-w-0 flex-1 text-sm font-semibold leading-5 text-[var(--text)]">{item.message}</p>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
                className="rounded-[var(--radius-sm)] p-1 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </NotifyContext.Provider>
  )
}
