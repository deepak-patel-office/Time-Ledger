import { useEffect, useState } from 'react'
import { CalendarDays, CalendarOff, Menu, Moon, PanelLeftClose, Settings, Sun, TimerReset, X, AlertTriangle } from 'lucide-react'
import { AppDataProvider } from './context/AppDataProvider'
import { useAppData } from './context/useAppData'
import { WeeklyView } from './components/weekly/WeeklyView'
import { TimeOffView } from './components/timeoff/TimeOffView'
import { SettingsView } from './components/settings/SettingsView'
import { NotifyProvider } from './components/shared/Notify'
import { useNotify } from './components/shared/notifyContext'

type Tab = 'weekly' | 'timeoff' | 'settings'
type Theme = 'light' | 'dark'

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem('time-ledger:theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Storage fallback
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const PAGE_COPY: Record<Tab, { title: string; subtitle: string }> = {
  weekly: {
    title: 'Weekly timesheet',
    subtitle: 'Log daily work hours and track remaining target hours for this week.',
  },
  timeoff: {
    title: 'Leaves & holidays',
    subtitle: 'Monitor leave balance, monthly work logs, and time-off records.',
  },
  settings: {
    title: 'Settings',
    subtitle: 'Configure daily targets, active workdays, and financial year rules.',
  },
}

function AppContent() {
  const [tab, setTab] = useState<Tab>('weekly')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const { saveError } = useAppData()
  const { notify } = useNotify()
  const pageCopy = PAGE_COPY[tab]

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.classList.toggle('light', theme === 'light')
    root.style.colorScheme = theme
    try {
      localStorage.setItem('time-ledger:theme', theme)
    } catch {
      // Storage fallback
    }
  }, [theme])

  useEffect(() => {
    document.title = `Time Ledger · ${pageCopy.title}`
  }, [pageCopy.title])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    notify(`${next === 'dark' ? 'Dark' : 'Light'} theme enabled.`, 'info')
  }

  function selectTab(nextTab: Tab) {
    setTab(nextTab)
    setSidebarOpen(false)
  }

  const navBtnClass = (active: boolean) =>
    `flex w-full items-center gap-3 rounded-[var(--radius)] px-3.5 py-2.5 text-sm font-medium transition-colors ${
      active
        ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
        : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'
    }`

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--bg)] text-[var(--text)]">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/40"
        />
      )}

      <aside
        className={`custom-scrollbar fixed inset-y-0 left-0 z-40 flex w-[17rem] flex-col overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-3">
            <span className="icon-box text-white" style={{ background: 'var(--accent)', color: '#fff' }}>
              <TimerReset className="h-5 w-5" />
            </span>
            <div>
              <p className="app-heading">Time Ledger</p>
              <p className="app-subhead">Work hours tracker</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            className="rounded-[var(--radius-sm)] p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex-1">
          <p className="app-label mb-2 px-1">Menu</p>
          <nav className="space-y-1" aria-label="Main navigation">
            <button type="button" onClick={() => selectTab('weekly')} className={navBtnClass(tab === 'weekly')}>
              <CalendarDays className="h-4 w-4 shrink-0" /> Weekly timesheet
            </button>
            <button type="button" onClick={() => selectTab('timeoff')} className={navBtnClass(tab === 'timeoff')}>
              <CalendarOff className="h-4 w-4 shrink-0" /> Leaves &amp; holidays
            </button>
            <button type="button" onClick={() => selectTab('settings')} className={navBtnClass(tab === 'settings')}>
              <Settings className="h-4 w-4 shrink-0" /> Settings
            </button>
          </nav>
        </div>

        <div className="border-t border-[var(--border)] pt-3 text-center">
          <p className="app-subhead">Time Ledger</p>
        </div>
      </aside>

      <div className={`flex min-h-screen flex-1 flex-col transition-[padding] duration-200 ${sidebarOpen ? 'lg:pl-[17rem]' : ''}`}>
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-3.5 py-2.5 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              aria-expanded={sidebarOpen}
              className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
            >
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>

            <span className="icon-box shrink-0" style={{ background: 'var(--accent)', color: '#fff' }}>
              <TimerReset className="h-4 w-4" aria-hidden="true" />
            </span>

            <div className="min-w-0 flex-1">
              <h1 className="app-heading truncate">Time Ledger</h1>
              <p className="app-subhead truncate">Work hours tracker</p>
            </div>

            <span
              className="chip chip-accent max-w-[11rem] shrink-0 truncate sm:max-w-none"
              title={pageCopy.subtitle}
            >
              {pageCopy.title}
            </span>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {saveError && (
          <div
            role="alert"
            className="flex items-center justify-center gap-2 border-b border-[var(--bad-border)] bg-[var(--bad-soft)] px-4 py-2 text-center text-sm font-medium text-[var(--bad)]"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Changes couldn&apos;t be saved automatically. Local storage might be restricted.</span>
          </div>
        )}

        <main className="mx-auto w-full max-w-7xl flex-1 px-3.5 py-4 sm:px-6 sm:py-6 lg:px-8">
          {tab === 'weekly' && <WeeklyView />}
          {tab === 'timeoff' && <TimeOffView />}
          {tab === 'settings' && <SettingsView />}
        </main>

        <footer className="border-t border-[var(--border)] bg-[var(--header-bg)]">
          <p className="mx-auto max-w-7xl px-4 py-3 text-center text-sm text-[var(--text-muted)] sm:px-6 lg:px-8">
            Made with <span aria-hidden="true">❤️</span> by Aditya Patel &amp; Team
          </p>
        </footer>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <NotifyProvider>
      <AppDataProvider>
        <AppContent />
      </AppDataProvider>
    </NotifyProvider>
  )
}
