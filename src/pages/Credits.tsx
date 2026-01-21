import React from 'react'
import { api } from '../lib/api'
import { Card, CardHeader, CardBody } from '../components/Card'
import { Button } from '../components/Button'

type Item = { size: 'A4'|'A3', title?: string, variant_id?: string }

export default function Credits() {
  const [balance, setBalance] = React.useState(0)
  const [items, setItems] = React.useState<Item[]>([])
  const [busy, setBusy] = React.useState(false)
  const [msg, setMsg] = React.useState('')
  const [err, setErr] = React.useState('')

  async function refresh() {
    const b = await api<{balance:number}>('/credits/balance')
    setBalance(b.balance)
  }

  React.useEffect(() => { refresh().catch(()=>{}) }, [])

  function add(size: 'A4'|'A3') {
    setItems([{ size, title: `Rice paper ${size}` }, ...items])
  }

  const cost = items.reduce((s, it) => s + (it.size === 'A4' ? 1 : 2), 0)

  async function redeem() {
    setBusy(true); setErr(''); setMsg('')
    try {
      const res = await api<{credits_used:number, new_balance:number, shopify_order_ref?:string|null}>('/credits/redeem', {
        method: 'POST',
        body: JSON.stringify({ items, shipping_required: true })
      })
      setMsg(`Redeemed ${res.credits_used} credits. New balance: ${res.new_balance}.` + (res.shopify_order_ref ? ` Draft order: ${res.shopify_order_ref}` : ''))
      setItems([])
      await refresh()
    } catch (e:any) { setErr(e.message || 'Error') }
    finally { setBusy(false) }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <Card>
        <CardHeader title="Credits wallet" subtitle="1 credit = A4 • A3 = 2 credits" />
        <CardBody>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs text-slate-500">Current balance</div>
              <div className="text-4xl font-bold text-slate-900 mt-1">{balance}</div>
            </div>
            <div className="flex gap-2">
              <Button onClick={()=>add('A4')}>+ Add A4 (1)</Button>
              <Button onClick={()=>add('A3')} variant="ghost">+ Add A3 (2)</Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Redeem credits for sheets" subtitle="MVP: add A4/A3 items. Later: browse your Shopify catalog here." />
        <CardBody>
          {msg ? <div className="text-sm text-emerald-700 mb-2">{msg}</div> : null}
          {err ? <div className="text-sm text-red-600 mb-2">{err}</div> : null}

          {items.length === 0 ? (
            <div className="text-sm text-slate-600">Add items to redeem using the buttons above.</div>
          ) : (
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                  <div className="text-sm text-slate-800">{it.title || `Rice paper ${it.size}`}</div>
                  <div className="text-sm text-slate-600">{it.size} • {it.size==='A4'?1:2} credit(s)</div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2">
                <div className="text-sm text-slate-700">Total cost</div>
                <div className="text-lg font-semibold">{cost} credits</div>
              </div>
              <Button disabled={busy || cost===0} onClick={redeem} className="w-full">
                {busy ? 'Redeeming…' : 'Redeem now'}
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
