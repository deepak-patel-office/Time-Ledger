export function ProgressBar({
  ratio,
  overtime,
  label,
  className = '',
  size = 64,
  strokeWidth = 6,
}: {
  ratio: number
  overtime: boolean
  label: string
  className?: string
  size?: number
  strokeWidth?: number
}) {
  const pct = Math.min(100, Math.max(0, ratio * 100))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (pct / 100) * circumference

  const strokeColor = overtime
    ? 'stroke-[var(--warn)]'
    : ratio >= 1
      ? 'stroke-[var(--good)]'
      : 'stroke-[var(--accent)]'

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="-rotate-90 transform"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        {/* Track Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-[var(--border)]"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={`${strokeColor} transition-all duration-500 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>
      {/* Center Percentage */}
      <span className="absolute text-sm font-bold text-[var(--text)]">
        {Math.round(pct)}%
      </span>
    </div>
  )
}