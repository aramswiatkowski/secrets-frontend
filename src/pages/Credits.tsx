import React from 'react'
import { api } from '../lib/api'
import { Card, CardHeader, CardBody } from '../components/Card'
import { Button } from '../components/Button'
import type { Me } from '../lib/types'

export default function Credits() {
  const [me, setMe] = React.useState<Me | null>(null)
  const [err, setErr] = React.useState('')
  const [msg, setMsg] = React.useState('')
  const [add, setAdd] = React.useState('')

  React.useEffect(() => {
    ;(async () => {
      setErr('')
      try {
        setMe(await api<Me>('/me'))
      } catch (e:any) {
        setErr(e?.message || 'Error')
      }
    })()
  }, [])

  async function addCredits() {
    if (!me?.is_admin) return
    const n = parseInt(add, 10)
    if (!Number.isFinite(n) || n <= 0) {
      setErr('Enter a positive number.')
      return
    }
    setErr(''); setMsg('')
    try {
      await api('/credits/redeem-code', { method: 'POST', body: JSON.stringify({ credits: n }) })
      setMsg(`Added ${n} credits ✅`)
      setAdd('')
      setMe(await api<Me>('/me'))
    } catch (e:any) {
      setErr(e?.message || 'Error')
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Credits</h1>
      <div className="text-sm text-slate-600">
        Credits are used for free sheets in VIP plans (A4 = 1 credit, A3 = 2 credits).
      </div>

      {err ? <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{err}</div> : null}
      {msg ? <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">{msg}</div> : null}

      <Card>
        <CardHeader title="Your wallet" subtitle="Current balance and monthly credits" />
        <CardBody>
          <div className="text-4xl font-semibold">{me?.credits_balance ?? 0}</div>
          <div className="text-sm text-slate-700 mt-2">
            Monthly credits: <b>{me?.monthly_credits ?? 0}</b>
          </div>
          <div className="text-sm text-slate-700 mt-1">
            Plan: <b>{me?.plan || '—'}</b> • VIP discount: <b>{me?.discount_percent ?? 0}%</b>
          </div>
          <div className="mt-3 text-sm text-slate-600">
            Credit costs: A4 = <b>{me?.credit_costs?.A4 ?? 1}</b> • A3 = <b>{me?.credit_costs?.A3 ?? 2}</b>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="How it works" subtitle="Quick rules" />
        <CardBody>
          <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
            <li>1 credit = 1 A4 rice paper sheet.</li>
            <li>A3 sheet costs 2 credits.</li>
            <li>Credits are added monthly with your VIP plan.</li>
            <li>Orders paid with credits don’t earn loyalty points (by design).</li>
          </ul>
        </CardBody>
      </Card>

      {me?.is_admin ? (
        <Card>
          <CardHeader title="Admin: add credits" subtitle="Temporary helper (manual)" />
          <CardBody>
            <div className="flex gap-2">
              <input
                className="flex-1 border border-slate-200 rounded-xl p-3 text-sm"
                placeholder="e.g. 4"
                value={add}
                onChange={(e) => setAdd(e.target.value)}
              />
              <Button onClick={addCredits}>Add</Button>
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  )
}
