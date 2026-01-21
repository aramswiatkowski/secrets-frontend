import React from 'react'
import { api } from '../lib/api'
import type { Me } from '../lib/types'
import { Card, CardHeader, CardBody } from '../components/Card'
import { Link } from 'react-router-dom'

export default function Library() {
  const [me, setMe] = React.useState<Me | null>(null)
  const [err, setErr] = React.useState('')

  React.useEffect(() => {
    (async () => {
      try { setMe(await api<Me>('/me')) } catch (e:any) { setErr(e.message) }
    })()
  }, [])

  if (err) return <div className="max-w-5xl mx-auto px-4 py-6 text-red-600 text-sm">{err}</div>

  const allowed = me?.plan === 'vip_digital' && me?.subscription_status === 'active'

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <Card>
        <CardHeader title="VIP Library" subtitle="Only for VIP Digital (as agreed: early access not used)." />
        <CardBody>
          {allowed ? (
            <div className="space-y-3">
              <div className="text-sm text-slate-700">
                This is the place for tutorials, printable guides, and “everything in one place” so users don’t have to search elsewhere.
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-sm font-semibold">Getting started: rice paper basics</div>
                  <div className="text-sm text-slate-600 mt-1">How to apply rice paper smoothly (no bubbles, minimal wrinkles).</div>
                  <div className="text-xs text-slate-500 mt-2">Placeholder item</div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-sm font-semibold">Sealing & finishing</div>
                  <div className="text-sm text-slate-600 mt-1">Best practices for bottles, wood, and furniture finishes.</div>
                  <div className="text-xs text-slate-500 mt-2">Placeholder item</div>
                </div>
              </div>
              <div className="text-xs text-slate-500">
                Next step: connect this to your real VIP content (Shopify files / S3 / CMS).
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-slate-700">
                VIP Library is available in <span className="font-semibold">VIP Digital</span> plan.
              </div>
              <Link to="/app/plans" className="text-sm underline">View plans</Link>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
