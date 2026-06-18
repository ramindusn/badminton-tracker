import type { ReactNode } from 'react'

interface CardProps {
  title: string
  icon: string
  action?: ReactNode
  children: ReactNode
}

export function Card({ title, icon, action, children }: CardProps) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-lg font-semibold text-fg">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-base"
            aria-hidden
          >
            {icon}
          </span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}
