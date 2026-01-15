import React from 'react'
import { api } from '../lib/api'
import { Button } from '../components/Button'
import { Card, CardHeader, CardBody } from '../components/Card'
import type { Me } from '../lib/types'

const PLANS = [
  { key: 'vip_digital', name: 'VIP Digital', price: 9.99, bullets: ['VIP Library', 'Community', '2 cliparts / month']},
  { key: 'vip_print', name: 'VIP Print Pack', price: 14.99, bullets: ['Community', '4 credits / month', '2 cliparts / month']},
  { key: 'pro_studio', name: 'PRO Studio', price: 24.99, bullets: ['Community', '8 credits / month', '4 cliparts / month']},
]

export default function Plans() {
  const [me, setMe] = React.useState<Me | null>(null)
  const [msg, setMsg] = React.useState('')
  const [err, setErr] = React.useState('')

  React.useEffect(() => {
    (async () => {
      try { setMe(await api<Me>('/me')) } catch (e:any) { setErr(e.message) }
    })()
  }, [])

  async function activateDemo(plan: string) {
    setErr(''); setMsg('')
    try {
      const adminKey = import.meta.env.VITE_ADMIN_KEY || 'dev-admin-key'
      await api('/admin/set-plan', {
        method: 'POST',
        headers: { 'X-Admin-Key': adminKey },
        body: JSON.stringify({ email: me?.email, plan, status: 'active' })
      })
      setMsg('Plan activated (demo). Refreshing…')
      setMe(await api<Me>('/me'))
    } catch (e:any) { setErr(e.message || 'Error') }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <Card>
        <CardHeader title="Plans" subtitle="3-tier model (Good / Better / Best). Payments wiring comes after MVP." />
        <CardBody>
          {msg ? <div className="text-sm text-emerald-700 mb-2">{msg}</div> : null}
          {err ? <div className="text-sm text-red-600 mb-2">{err}</div> : null}

          <div className="grid md:grid-cols-3 gap-3">
            {PLANS.map(p => (
              <div key={p.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-sm text-slate-500">{p.name}</div>
                <div className="text-3xl font-bold text-slate-900 mt-2">£{p.price.toFixed(2)}</div>
                <div className="text-sm text-slate-600 mt-1">per month</div>
                <ul className="mt-3 space-y-1 text-sm text-slate-700">
                  {p.bullets.map(b => <li key={b}>• {b}</li>)}
                </ul>
                <div className="mt-4 flex gap-2">
                  <Button onClick={()=>activateDemo(p.key)} className="w-full">Activate (demo)</Button>
                </div>
                {me?.plan === p.key ? <div className="text-xs text-slate-500 mt-2">Current plan</div> : null}
              </div>
            ))}
          </div>

          <div className="text-xs text-slate-500 mt-4">
            In production, the “Activate” button is replaced by real subscription checkout (Shopify/Stripe).
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
