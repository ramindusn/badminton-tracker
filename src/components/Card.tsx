import type { ReactNode } from 'react'

interface CardProps {
  title: string
  icon: string
  accent: string // tailwind border color class, e.g. 'border-amber-400'
  action?: ReactNode
  children: ReactNode
}

export function Card({ title, icon, accent, action, children }: CardProps) {
  return (
    <section
      className={`rounded-xl border-l-4 bg-white p-5 shadow-sm sm:p-6 ${accent}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
          <span aria-hidden>{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}
