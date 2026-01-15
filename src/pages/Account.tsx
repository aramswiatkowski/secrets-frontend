import React from 'react'
import { api } from '../lib/api'
import { storage } from '../lib/storage'
import type { Me } from '../lib/types'
import { Card, CardHeader, CardBody } from '../components/Card'
import { Button } from '../components/Button'
import { useNavigate } from 'react-router-dom'

export default function Account() {
  const nav = useNavigate()
  const [me, setMe] = React.useState<Me | null>(null)
  const [nickname, setNickname] = React.useState('')
  const [msg, setMsg] = React.useState('')
  const [err, setErr] = React.useState('')

  React.useEffect(() => {
    (async () => {
      try {
        const m = await api<Me>('/me')
        setMe(m)
        setNickname(m.nickname || '')
      } catch (e:any) { setErr(e.message) }
    })()
  }, [])

  async function saveNick() {
    setErr(''); setMsg('')
    try {
      const m = await api<Me>('/me/nickname', { method:'POST', body: JSON.stringify({ nickname }) })
      setMe(m)
      setMsg('Saved ✅')
    } catch (e:any) { setErr(e.message) }
  }

  function logout() {
    storage.del('token')
    nav('/')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <Card>
        <CardHeader title="Account" subtitle="Nick is required (email stays hidden in Community)." />
        <CardBody>
          {msg ? <div className="text-sm text-emerald-700 mb-2">{msg}</div> : null}
          {err ? <div className="text-sm text-red-600 mb-2">{err}</div> : null}

          <div className="grid md:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Email</div>
              <div className="text-sm font-semibold mt-1">{me?.email || '—'}</div>
              <div className="text-xs text-slate-500 mt-3">Plan</div>
              <div className="text-sm font-semibold mt-1">{me?.plan || '—'} ({me?.subscription_status || '—'})</div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Nickname (public)</div>
              <input value={nickname} onChange={e=>setNickname(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" placeholder="e.g. DaisyDecoupage" />
              <div className="mt-2 flex gap-2">
                <Button onClick={saveNick}>Save</Button>
                <Button variant="ghost" onClick={logout}>Log out</Button>
              </div>
              <div className="text-xs text-slate-500 mt-3">
                Moderation is automatic: posts with phone/email/address get auto-hidden.
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
