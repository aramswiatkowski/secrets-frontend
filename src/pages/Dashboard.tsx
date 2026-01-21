import React from 'react'
import { api } from '../lib/api'
import type { Me, Post, Trick } from '../lib/types'
import { Card, CardHeader, CardBody } from '../components/Card'
import { Button } from '../components/Button'
import { Link } from 'react-router-dom'

const isQuestion = (text: string) => /^\s*(q:|\[q\]|❓)/i.test(text || '')
const stripQ = (text: string) => (text || '').replace(/^\s*(q:|\[q\]|❓)\s*/i, '').trim()

function pickTipOfDay(tricks: Trick[]) {
  if (!tricks.length) return null
  // Stable for everyone on a given day (UTC date key)
  const dayKey = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  let acc = 0
  for (const ch of dayKey) acc = (acc + ch.charCodeAt(0)) % 100000
  const idx = acc % tricks.length
  return tricks[idx]
}

export default function Dashboard() {
  const [me, setMe] = React.useState<Me | null>(null)
  const [posts, setPosts] = React.useState<Post[]>([])
  const [tricks, setTricks] = React.useState<Trick[]>([])
  const [err, setErr] = React.useState('')

  React.useEffect(() => {
    ;(async () => {
      setErr('')
      try {
        const [m, p, t] = await Promise.all([
          api<Me>('/me'),
          api<Post[]>('/posts'),
          api<Trick[]>('/tricks'),
        ])
        setMe(m)
        setPosts(p || [])
        setTricks(t || [])
      } catch (e: any) {
        setErr(e?.message || 'Error')
      }
    })()
  }, [])

  const works = posts.filter(p => !isQuestion(p.text) && !!p.image_url).slice(0, 8)
  const questions = posts.filter(p => isQuestion(p.text)).slice(0, 5)
  const tip = pickTipOfDay(tricks)

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      {err ? (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {err}
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Hi{me?.display_name ? `, ${me.display_name}` : ''} 👋
          </h1>
          <div className="text-sm text-slate-600 mt-1">
            VIP hub: tip of the day, credits, and community.
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Link to="/app/library"><Button>Tricks / Q&A</Button></Link>
          <Link to="/app/community"><Button variant="secondary">Community</Button></Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Your plan" subtitle="Status and VIP perks" />
          <CardBody>
            <div className="text-sm text-slate-700">
              Plan: <b>{me?.plan || '—'}</b>
            </div>
            <div className="text-sm text-slate-700 mt-1">
              VIP discount: <b>{me?.discount_percent ?? 0}%</b>
            </div>
            <div className="mt-3 flex gap-2 flex-wrap">
              <Link to="/app/plans"><Button variant="secondary">Manage plans</Button></Link>
              <a href="https://thesecretsofdecoupage.com" target="_blank" rel="noreferrer">
                <Button variant="secondary">Open shop</Button>
              </a>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Credits wallet" subtitle="1 credit = A4 • A3 = 2 credits" />
          <CardBody>
            <div className="text-3xl font-semibold">{me?.credits_balance ?? 0}</div>
            <div className="text-sm text-slate-600 mt-2">
              Monthly credits: <b>{me?.monthly_credits ?? 0}</b>
            </div>
            <div className="mt-3">
              <Link to="/app/credits" className="text-sm underline">How credits work</Link>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Tip of the day" subtitle="Visible to everyone (public tip)" />
          <CardBody>
            {!tip ? (
              <div className="text-sm text-slate-600">No tips yet.</div>
            ) : (
              <div className="space-y-2">
                <div className="font-semibold text-slate-900">{tip.title}</div>
                <div className="text-sm text-slate-700 whitespace-pre-line">
                  {tip.body.length > 220 ? tip.body.slice(0, 220) + '…' : tip.body}
                </div>
                <Link to="/app/library" className="text-sm underline">Browse all tips</Link>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Wasze prace" subtitle="Latest creations from the community" />
          <CardBody>
            {works.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {works.map(w => (
                  <a key={w.id} href={w.image_url || '#'} target="_blank" rel="noreferrer" className="group block">
                    <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={w.image_url || ''} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition" />
                    </div>
                    <div className="mt-1 text-xs text-slate-600 truncate">
                      {w.author_display_name}
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-600">No works yet — be the first to post in Community 😊</div>
            )}
            <div className="mt-3">
              <Link to="/app/community" className="text-sm underline">Go to Community</Link>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Pytania (Q&A)" subtitle="Ask a question — others can answer" />
          <CardBody>
            {questions.length ? (
              <div className="space-y-2">
                {questions.map(p => (
                  <div key={p.id} className="text-sm">
                    <div className="font-medium text-slate-900 line-clamp-2">
                      {stripQ(p.text)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {p.author_display_name} • {new Date(p.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-600">No questions yet.</div>
            )}
            <div className="mt-3 flex gap-2 flex-wrap">
              <Link to="/app/library"><Button>Ask in Tricks</Button></Link>
              <Link to="/app/community"><Button variant="secondary">Answer</Button></Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
