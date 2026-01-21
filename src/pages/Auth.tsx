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

  type PublicTrick = {
    id: number
    title: string
    body: string
    media_url?: string | null
    is_vip: boolean
    created_at: string
  }

  const [tip, setTip] = React.useState<PublicTrick | null>(null)
  const [tipLoading, setTipLoading] = React.useState(false)

  async function loadTip() {
    setTipLoading(true)
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const res = await fetch(`${API_URL}/tricks`, { headers: { accept: 'application/json' } })
      if (!res.ok) throw new Error(await res.text())
      const list = (await res.json()) as PublicTrick[]
      if (list?.length) {
        // Stable pick for everyone for a given day (UTC date key)
      const dayKey = new Date().toISOString().slice(0, 10)
      let acc = 0
      for (const ch of dayKey) acc = (acc + ch.charCodeAt(0)) % 100000
      const pick = list[acc % list.length]
      setTip(pick)
      }
    } catch {
      // Tip of the day is optional — ignore failures on the login screen
    } finally {
      setTipLoading(false)
    }
  }

  React.useEffect(() => {
    loadTip()
  }, [])

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

        {tip ? (
          <div className="mb-4">
            <Card>
              <CardHeader title="Tip of the day (public)" subtitle={tip.title} />
              <CardBody>
                <div className="text-sm text-slate-700 whitespace-pre-wrap">
                  {tip.body}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button type="button" variant="secondary" onClick={loadTip} disabled={tipLoading}>
                    {tipLoading ? 'Loading…' : 'Another tip'}
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        ) : null}

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
