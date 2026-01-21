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
  const [displayName, setDisplayName] = React.useState('')
  const [msg, setMsg] = React.useState('')
  const [err, setErr] = React.useState('')

  React.useEffect(() => {
    ;(async () => {
      try {
        const m = await api<Me>('/me')
        setMe(m)
        setDisplayName(m.display_name || '')
      } catch (e:any) {
        setErr(e?.message || 'Error')
      }
    })()
  }, [])

  async function save() {
    setErr(''); setMsg('')
    try {
      const m = await api<Me>('/me/display-name', {
        method: 'POST',
        body: JSON.stringify({ display_name: displayName }),
      })
      setMe(m)
      setMsg('Saved ✅')
    } catch (e:any) {
      setErr(e?.message || 'Error')
    }
  }

  function logout() {
    storage.del('token')
    nav('/')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      {err ? <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{err}</div> : null}
      {msg ? <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">{msg}</div> : null}

      <Card>
        <CardHeader title="Account" subtitle="Profile settings" />
        <CardBody>
          <div className="text-sm text-slate-700">
            Email: <b>{me?.email || '—'}</b>
          </div>

          <div className="mt-3">
            <div className="text-xs text-slate-500 mb-1">Display name (nickname shown in Community)</div>
            <input
              className="w-full border border-slate-200 rounded-xl p-3 text-sm"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Aram"
            />
          </div>

          <div className="mt-3 flex gap-2 flex-wrap">
            <Button onClick={save} disabled={!displayName.trim()}>Save</Button>
            <Button variant="secondary" onClick={logout}>Log out</Button>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            Email is not shown publicly — only your display name.
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
