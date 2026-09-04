import type { ReactNode } from 'react'

export type RingTone = 'accent' | 'good' | 'warn' | 'muted'

const TONE_VAR: Record<RingTone, string> = {
  accent: 'var(--accent)',
  good: 'var(--good)',
  warn: 'var(--warn)',
  muted: 'var(--border-strong)',
}

export function ProgressRing({
  ratio,
  tone = 'accent',
  size = 64,
  stroke = 6,
  label,
  children,
  className = '',
}: {
  ratio: number
  tone?: RingTone
  size?: number
  stroke?: number
  label: string
  children?: ReactNode
  className?: string
}) {
  const pct = Math.min(100, Math.max(0, ratio * 100))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dash = (pct / 100) * circumference

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={TONE_VAR[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: 'stroke-dasharray 420ms cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-tight">
        {children ?? <span className="text-sm font-bold text-[var(--text)]">{Math.round(pct)}%</span>}
      </div>
    </div>
  )
}
