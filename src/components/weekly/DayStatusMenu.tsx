import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, CloudSun, CircleSlash, Palmtree, Sun } from 'lucide-react'
import type { DayTimeOffChoice } from '../../types'

const OPTIONS: {
  value: DayTimeOffChoice
  label: string
  hint: string
  icon: typeof Sun
  tone: string
}[] = [
  {
    value: 'none',
    label: 'Working day',
    hint: 'Full daily target',
    icon: CircleSlash,
    tone: 'text-[var(--text-muted)]',
  },
  {
    value: 'leave',
    label: 'Leave',
    hint: 'Uses 1 leave day',
    icon: Palmtree,
    tone: 'text-[var(--leave)]',
  },
  {
    value: 'holiday',
    label: 'Holiday',
    hint: 'No leave balance used',
    icon: Sun,
    tone: 'text-[var(--text-muted)]',
  },
  {
    value: 'half-day',
    label: 'Half day',
    hint: 'Half target · 0.5 leave',
    icon: CloudSun,
    tone: 'text-[var(--warn)]',
  },
]

const MENU_ESTIMATE_PX = 248

export function DayStatusMenu({
  value,
  disabled,
  onChange,
  dateKey,
}: {
  value: DayTimeOffChoice
  disabled?: boolean
  onChange: (value: DayTimeOffChoice) => void
  dateKey: string
}) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number; width: number; openUp: boolean } | null>(
    null,
  )
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()
  const selected = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0]
  const SelectedIcon = selected.icon

  function updatePlacement() {
    const button = buttonRef.current
    if (!button) return
    const rect = button.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const openUp = spaceBelow < MENU_ESTIMATE_PX && spaceAbove > spaceBelow
    setCoords({
      openUp,
      top: openUp ? undefined : rect.bottom + 6,
      bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
      left: rect.left,
      width: Math.max(rect.width, 168),
    })
  }

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null)
      return
    }
    updatePlacement()
  }, [open])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || listRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    function onReposition() {
      updatePlacement()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative min-w-[10.5rem] flex-1 sm:flex-none sm:min-w-[12rem]">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-hover)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-45"
      >
        <span className="flex min-w-0 items-center gap-2">
          <SelectedIcon className={`h-4 w-4 shrink-0 ${selected.tone}`} />
          <span className="truncate">{selected.label}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open &&
        coords &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={`Day status for ${dateKey}`}
            style={{
              position: 'fixed',
              top: coords.top,
              bottom: coords.bottom,
              left: coords.left,
              width: coords.width,
              zIndex: 80,
            }}
            className="glass-panel-strong overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-1 shadow-xl"
          >
            {OPTIONS.map((option) => {
              const Icon = option.icon
              const isActive = option.value === value
              return (
                <li key={option.value} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      if (option.value !== value) onChange(option.value)
                    }}
                    className={`flex w-full items-start gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left ${
                      isActive
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'text-[var(--text)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${isActive ? 'text-[var(--accent)]' : option.tone}`} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm font-semibold ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>
                        {option.label}
                      </span>
                      <span className="block text-xs text-[var(--text-muted)]">{option.hint}</span>
                    </span>
                    {isActive && <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />}
                  </button>
                </li>
              )
            })}
          </ul>,
          document.body,
        )}
    </div>
  )
}
