import { Button } from './Button'

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
    <header className="mb-6 rounded-xl bg-slate-800 px-6 py-5 text-white shadow-md">
      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">🏸 Budget &amp; Shuttle Update</h1>
          <p className="text-sm text-slate-300">{dateLabel}</p>
        </div>
        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300">
              ● Editing enabled
            </span>
            <Button variant="secondary" onClick={onLogout}>
              Log out
            </Button>
          </div>
        ) : (
          <Button variant="secondary" onClick={onLogin}>
            🔒 Log in to edit
          </Button>
        )}
      </div>
    </header>
  )
}
