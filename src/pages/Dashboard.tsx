import React from 'react'
import { api } from '../lib/api'
import type { Me } from '../lib/types'
import { Card, CardHeader, CardBody } from '../components/Card'
import { Button } from '../components/Button'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const [me, setMe] = React.useState<Me | null>(null)
  const [balance, setBalance] = React.useState<number>(0)
  const [err, setErr] = React.useState('')

  React.useEffect(() => {
    (async () => {
      try {
        const m = await api<Me>('/me')
        const b = await api<{balance:number}>('/credits/balance')
        setMe(m); setBalance(b.balance)
      } catch (e:any) { setErr(e.message || 'Error') }
    })()
  }, [])

  const planName = (key?: string|null) => {
    if (!key) return 'No plan yet'
    if (key === 'vip_digital') return 'VIP Digital'
    if (key === 'vip_print') return 'VIP Print Pack'
    if (key === 'pro_studio') return 'PRO Studio'
    return key
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      {err ? <div className="text-sm text-red-600">{err}</div> : null}

      <Card>
        <CardHeader title="This month at a glance" subtitle="Fast overview: plan, credits, and your VIP perks." />
        <CardBody>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
              <div className="text-xs text-slate-500">Plan</div>
              <div className="text-lg font-semibold mt-1">{planName(me?.plan)}</div>
              <div className="text-sm text-slate-600 mt-1">Status: {me?.subscription_status || '—'}</div>
              <Link to="/app/plans" className="text-sm text-slate-900 underline mt-2 inline-block">Manage plans</Link>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
              <div className="text-xs text-slate-500">Credits wallet</div>
              <div className="text-3xl font-bold mt-1">{balance}</div>
              <div className="text-sm text-slate-600 mt-1">1 credit = A4 • A3 = 2 credits</div>
              <Link to="/app/credits" className="text-sm text-slate-900 underline mt-2 inline-block">Use credits</Link>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
              <div className="text-xs text-slate-500">VIP discount</div>
              <div className="text-3xl font-bold mt-1">{me?.vip_discount_percent ?? 12}%</div>
              <div className="text-sm text-slate-600 mt-1">On the whole shop (VIP customers)</div>
              <Link to="/app/account" className="text-sm text-slate-900 underline mt-2 inline-block">Account</Link>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/app/community"><Button>Go to Community</Button></Link>
            <Link to="/app/library"><Button variant="ghost">Open VIP Library</Button></Link>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Automation first (no admin duty)" subtitle="The app will suggest answers before a post is published. Risky content is auto-hidden." />
        <CardBody>
          <div className="text-sm text-slate-700 leading-relaxed">
            Community is built to reduce repetitive questions. Users see suggested answers + similar threads before posting.
            If someone posts a phone/email/address, it is hidden automatically.
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
