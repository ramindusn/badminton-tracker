interface StatCardProps {
  label: string
  value: string
  icon: string
  hint?: string
  tone?: 'default' | 'positive' | 'negative' | 'warning'
}

const tones: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'text-slate-800',
  positive: 'text-emerald-600',
  negative: 'text-red-500',
  warning: 'text-amber-600',
}

export function StatCard({ label, value, icon, hint, tone = 'default' }: StatCardProps) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        <span aria-hidden>{icon}</span>
        {label}
      </div>
      <div className={`mt-1 text-xl font-bold ${tones[tone]}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-400">{hint}</div>}
    </div>
  )
}
