import React from 'react'
import { api } from '../lib/api'
import { Button } from '../components/Button'
import { Card, CardHeader, CardBody } from '../components/Card'
import type { Me } from '../lib/types'

type PlanKey = 'VIP_DIGITAL' | 'VIP_PRINT' | 'PRO_STUDIO'

const PLANS: Array<{ key: PlanKey; name: string; bullets: string[] }> = [
  { key: 'VIP_DIGITAL', name: 'VIP Digital', bullets: ['VIP Library', 'Community'] },
  { key: 'VIP_PRINT', name: 'VIP Print Pack', bullets: ['Community', '4 credits / month', '2 cliparts / month'] },
  { key: 'PRO_STUDIO', name: 'PRO Studio', bullets: ['Community', '8 credits / month', '4 cliparts / month'] },
]

function getSubscribeUrl(plan: PlanKey) {
  // 1) jeśli podasz osobne linki per plan – użyjemy ich
  const perPlan =
    (plan === 'VIP_DIGITAL' && import.meta.env.VITE_SUBSCRIBE_VIP_DIGITAL_URL) ||
    (plan === 'VIP_PRINT' && import.meta.env.VITE_SUBSCRIBE_VIP_PRINT_URL) ||
    (plan === 'PRO_STUDIO' && import.meta.env.VITE_SUBSCRIBE_PRO_STUDIO_URL)

  // 2) w innym wypadku jeden wspólny link
  return (perPlan || import.meta.env.VITE_VIP_SUBSCRIBE_URL || '') as string
}

export default function Plans() {
  const [me, setMe] = React.useState<Me | null>(null)
  const [hint, setHint] = React.useState('')

  React.useEffect(() => {
    ;(async () => {
      try {
        setMe(await api('/me'))
      } catch {
        setMe(null)
      }
    })()
  }, [])

  function go(plan: PlanKey) {
    setHint('')
    const url = getSubscribeUrl(plan)
    if (!url) {
      setHint('Brak linku do subskrypcji. Ustaw VITE_VIP_SUBSCRIBE_URL w Netlify env vars.')
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div>
      {hint ? (
        <div className="mb-4 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm">
          {hint}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <Card key={p.key}>
            <CardHeader title={p.name} />
            <CardBody>
              <ul className="mb-4 space-y-1 text-sm">
                {p.bullets.map((b) => (
                  <li key={b}>• {b}</li>
                ))}
              </ul>

              <Button onClick={() => go(p.key)} className="w-full">
                Subscribe (Shopify)
              </Button>

              {me?.plan === p.key ? (
                <div className="mt-3 text-xs opacity-80">Current plan</div>
              ) : null}
            </CardBody>
          </Card>
        ))}
      </div>

      <p className="mt-5 text-xs opacity-70">
        Uwaga: ceny nie są pokazywane w aplikacji — klient zobaczy właściwą cenę dopiero na Shopify (w swojej walucie/rynku).
      </p>
    </div>
  )
}
