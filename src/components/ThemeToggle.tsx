import { useEffect, useRef, useState } from 'react'
import { getStoredMode, setMode, watchSystem, type ThemeMode } from '../lib/theme'

// Cycle order and how each mode presents in the header button.
const ORDER: ThemeMode[] = ['light', 'dark', 'system']
const META: Record<ThemeMode, { icon: string; label: string }> = {
  light: { icon: '☀︎', label: 'Light' },
  dark: { icon: '☽', label: 'Dark' },
  system: { icon: '🖥', label: 'System' },
}

export function ThemeToggle() {
  const [mode, setModeState] = useState<ThemeMode>(() => getStoredMode())
  const modeRef = useRef(mode)
  modeRef.current = mode

  // Re-apply on OS changes while following "system".
  useEffect(() => watchSystem(() => modeRef.current), [])

  function cycle() {
    const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]
    setMode(next)
    setModeState(next)
  }

  const { icon, label } = META[mode]
  return (
    <button
      type="button"
      onClick={cycle}
      data-testid="theme-toggle"
      title={`Theme: ${label} (click to change)`}
      aria-label={`Theme: ${label}. Click to change.`}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-2 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1"
    >
      <span aria-hidden className="text-base leading-none">
        {icon}
      </span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
