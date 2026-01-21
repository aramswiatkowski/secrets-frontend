import React from 'react'
import { api } from '../lib/api'
import { storage } from '../lib/storage'
import { Button } from '../components/Button'
import { Card, CardHeader, CardBody } from '../components/Card'
import { useNavigate } from 'react-router-dom'

export default function AuthPage() {
  const nav = useNavigate()
  const [mode, setMode] = React.useState<'login' | 'register'>('login')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [err, setErr] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setBusy(true)

    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register'

      // Backend expects username+password for login; register can stay email+password
      const payload =
        mode === 'login'
          ? { username: email, password }
          : { email, password }

      const res = await api<{ access_token: string }>(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      storage.set('token', res.access_token)
      nav('/app')
    } catch (e: any) {
      setErr(e?.message || 'Error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="mb-6">
          <div className="text-2xl font-bold text-slate-900">Welcome 👋</div>
          <div className="text-slate-600 mt-1">
            Sign in to access your VIP Library, Credits, and Community.
          </div>
        </div>

        <Card>
          <CardHeader
            title={mode === 'login' ? 'Sign in' : 'Create account'}
            subtitle="Email + password (MVP). Payments wiring comes next."
          />
          <CardBody>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="text-sm text-slate-700">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-slate-700">Password</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  required
                  minLength={6}
                />
              </div>

              {err ? <div className="text-sm text-red-600">{err}</div> : null}

              <Button disabled={busy} className="w-full">
                {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
              </Button>

              <button
                type="button"
                className="w-full text-sm text-slate-700 hover:underline"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              >
                {mode === 'login'
                  ? 'No account? Create one'
                  : 'Already have an account? Sign in'}
              </button>
            </form>
          </CardBody>
        </Card>

        <div className="text-xs text-slate-500 mt-4">
          Tip: after sign-in, set your nickname (required for Community).
        </div>
      </div>
    </div>
  )
}
