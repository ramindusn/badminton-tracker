// Light/Dark theme handling. The initial `.dark` class is applied by an inline
// script in index.html (no-flash); this module owns runtime changes and
// persistence. Keep the storage key and default in sync with that script.

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'badminton-tracker-theme'

export function getStoredMode(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    // localStorage may be unavailable (private mode); fall through to default.
  }
  return 'light'
}

/** Toggle the root `.dark` class to match the given mode. */
export function applyMode(mode: ThemeMode): void {
  document.documentElement.classList.toggle('dark', mode === 'dark')
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
