// Light/Dark/System theme handling. The initial `.dark` class is applied by an
// inline script in index.html (no-flash); this module owns runtime changes and
// persistence. Keep the storage key and resolution logic in sync with that script.

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'badminton-tracker-theme'
const systemQuery = '(prefers-color-scheme: dark)'

export function getStoredMode(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    // localStorage may be unavailable (private mode); fall through to default.
  }
  return 'system'
}

/** Does this mode resolve to dark right now? (System consults the OS.) */
export function resolvesToDark(mode: ThemeMode): boolean {
  if (mode === 'system') return window.matchMedia(systemQuery).matches
  return mode === 'dark'
}

/** Toggle the root `.dark` class to match the given mode. */
export function applyMode(mode: ThemeMode): void {
  document.documentElement.classList.toggle('dark', resolvesToDark(mode))
}

/** Persist the chosen mode and apply it immediately. */
export function setMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // Ignore persistence failures; the in-memory choice still applies this session.
  }
  applyMode(mode)
}

/** Subscribe to OS theme changes; only re-applies while mode is "system".
 *  Returns an unsubscribe function. */
export function watchSystem(getMode: () => ThemeMode): () => void {
  const mql = window.matchMedia(systemQuery)
  const onChange = () => {
    if (getMode() === 'system') applyMode('system')
  }
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}
