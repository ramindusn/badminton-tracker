import { useState } from 'react'
import { getStoredMode, setMode, type ThemeMode } from '../lib/theme'

const META: Record<ThemeMode, { icon: string; label: string }> = {
  light: { icon: '☀︎', label: 'Light' },
  dark: { icon: '☽', label: 'Dark' },
}

export function ThemeToggle() {
  const [mode, setModeState] = useState<ThemeMode>(() => getStoredMode())

  function toggle() {
    const next: ThemeMode = mode === 'dark' ? 'light' : 'dark'
    setMode(next)
    setModeState(next)
  }

  const { icon, label } = META[mode]
  return (
    <button
      type="button"
      onClick={toggle}
      data-testid="theme-toggle"
      title={`Theme: ${label} (click to switch)`}
      aria-label={`Theme: ${label}. Click to switch.`}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-2 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1"
    >
      <span aria-hidden className="text-base leading-none">
        {icon}
      </span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
