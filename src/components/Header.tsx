import { Button } from './Button'
import { QuickAdd } from './QuickAdd'
import { ThemeToggle } from './ThemeToggle'

interface HeaderProps {
  isAuthenticated: boolean
  onLogin: () => void
  onLogout: () => void
}

export function Header({ isAuthenticated, onLogin, onLogout }: HeaderProps) {
  const dateLabel = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <header className="mb-6 rounded-2xl border border-line bg-surface px-6 py-5 shadow-sm">
      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <h1 className="text-xl font-bold text-fg sm:text-2xl">🏸 Budget &amp; Shuttle Update</h1>
          <p className="text-sm text-fg-muted">{dateLabel}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              <span
                data-testid="editing-badge"
                className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600"
              >
                ● Editing enabled
              </span>
              <QuickAdd />
              <Button variant="secondary" data-testid="logout-button" onClick={onLogout}>
                Log out
              </Button>
            </>
          ) : (
            <Button variant="secondary" data-testid="login-button" onClick={onLogin}>
              🔒 Log in to edit
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
