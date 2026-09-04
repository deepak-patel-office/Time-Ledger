export function StatGrid({
  items,
  className = '',
}: {
  items: { label: string; value: string; hint?: string; tone?: 'default' | 'good' | 'warn' | 'bad' | 'accent' }[]
  className?: string
}) {
  const toneClass: Record<NonNullable<typeof items[number]['tone']>, string> = {
    default: 'text-[var(--text)]',
    good: 'text-[var(--good)]',
    warn: 'text-[var(--warn)]',
    bad: 'text-[var(--bad)]',
    accent: 'text-[var(--accent)]',
  }

  return (
    <div className={`grid gap-3 sm:grid-cols-3 ${className}`}>
      {items.map((item) => (
        <div key={item.label} className="stat-tile rounded-[var(--radius)] px-3 py-2.5">
          <p className="stat-label">{item.label}</p>
          <p className={`stat-value ${toneClass[item.tone ?? 'default']}`}>{item.value}</p>
          {item.hint && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{item.hint}</p>}
        </div>
      ))}
    </div>
  )
}
