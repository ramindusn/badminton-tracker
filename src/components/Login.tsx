import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Button } from './Button'
import { Field } from './Field'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export function Login({ onClose }: { onClose: () => void }) {
  const { signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('sending')
    const res = await signInWithEmail(email.trim())
    if (!res.ok) {
      setError(res.error || 'Could not send the sign-in link.')
      setStatus('error')
      return
    }
    // res.sent === false means auth was granted immediately (e2e) — just close.
    if (res.sent) setStatus('sent')
    else onClose()
  }

  if (status === 'sent') {
    return (
      <div className="space-y-3" data-testid="login-sent">
        <p className="text-sm text-fg-muted">
          ✉️ Check your inbox — we sent a sign-in link to{' '}
          <span className="font-medium">{email}</span>. Click it to log in.
        </p>
        <p className="text-xs text-fg-subtle">
          The link opens the app already signed in. You can close this window.
        </p>
        <div className="flex justify-end">
          <Button type="button" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
      <p className="text-sm text-fg-muted">
        Enter your email and we'll send you a one-time sign-in link. Only club
        admins can edit the fund and inventory.
      </p>
      <Field
        label="Email"
        type="email"
        autoFocus
        data-testid="magic-link-email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
          if (status === 'error') setStatus('idle')
        }}
        placeholder="you@example.com"
      />
      {status === 'error' && (
        <p data-testid="login-error" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" data-testid="login-submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Send magic link'}
        </Button>
      </div>
    </form>
  )
}
