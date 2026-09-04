import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
const PRIORITY_FOCUSABLE_SELECTOR =
  'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({
  title,
  onClose,
  children,
  size = 'md',
}: {
  title: string
  onClose: () => void
  children: ReactNode
  size?: 'md' | 'lg'
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null
    
    // Lock background scroll when modal is active
    const originalStyle = window.getComputedStyle(document.body).overflow
    document.body.style.overflow = 'hidden'

    const dialog = dialogRef.current
    const priorityFocusable = dialog?.querySelectorAll<HTMLElement>(PRIORITY_FOCUSABLE_SELECTOR)
    if (priorityFocusable?.length) {
      priorityFocusable[0].focus()
    } else {
      const focusable = dialog?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      focusable?.[0]?.focus()
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !dialog) return
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = originalStyle
      previouslyFocused.current?.focus()
    }
  }, [])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-0 transition-all duration-200 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`glass-panel-strong custom-scrollbar flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-2xl ${
          size === 'lg' ? 'max-w-lg' : 'max-w-md'
        }`}
      >
        {/* Mobile Bottom Sheet Drag Bar */}
        <div className="flex justify-center pt-2.5 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-[var(--border)]" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-hover)]/30 px-4 py-3 sm:px-5">
          <h2 id="modal-title" className="app-heading">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-[var(--radius-sm)] p-1.5 text-[var(--text-muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="custom-scrollbar overflow-y-auto p-4 text-[var(--text)] sm:p-5">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}