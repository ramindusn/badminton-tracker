import type { InputHTMLAttributes } from 'react'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function Field({ label, className = '', ...rest }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-fg-muted">{label}</span>
      <input
        className={`w-full rounded-lg border border-line px-3 py-2 text-sm text-fg shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ${className}`}
        {...rest}
      />
    </label>
  )
}
