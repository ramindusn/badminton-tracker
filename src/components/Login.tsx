import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Button } from './Button'
import { Field } from './Field'

export function Login({ onClose }: { onClose: () => void }) {
  const { login } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (login(password)) {
      onClose()
    } else {
      setError(true)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
      <p className="text-sm text-slate-500">
        Enter the password to edit the inventory and fund.
      </p>
      <Field
        label="Password"
        type="password"
        autoFocus
        data-testid="login-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value)
          setError(false)
        }}
        placeholder="••••••••"
      />
      {error && (
        <p data-testid="login-error" className="text-sm font-medium text-red-600">
          Incorrect password.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" data-testid="login-submit">
          Log in
        </Button>
      </div>
    </form>
  )
}
