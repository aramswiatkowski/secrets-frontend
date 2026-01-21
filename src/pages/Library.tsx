import React from 'react'
import { api, apiBaseUrl } from '../lib/api'
import type { Me } from '../lib/types'
import { Button } from '../components/Button'
import { Card, CardHeader, CardBody } from '../components/Card'
import { useNavigate } from 'react-router-dom'

type Trick = {
  id: number
  title: string
  body: string
  media_url?: string | null
  is_vip: boolean
  created_at: string
}

function contains(hay: string, needle: string) {
  return hay.toLowerCase().includes(needle.toLowerCase())
}

export default function Library() {
  const nav = useNavigate()

  const [me, setMe] = React.useState<Me | null>(null)
  const [tricks, setTricks] = React.useState<Trick[]>([])
  const [loading, setLoading] = React.useState(true)
  const [err, setErr] = React.useState('')

  const [q, setQ] = React.useState('')
  const filtered = React.useMemo(() => {
    const s = q.trim()
    if (!s) return tricks
    return tricks.filter((t) => contains(t.title || '', s) || contains(t.body || '', s))
  }, [tricks, q])

  // Admin create form (backend will enforce permissions)
  const [showAdmin, setShowAdmin] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [body, setBody] = React.useState('')
  const [mediaUrl, setMediaUrl] = React.useState('')
  const [vipOnly, setVipOnly] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    ;(async () => {
      setErr('')
      setLoading(true)
      try {
        const [meRes, tricksRes] = await Promise.all([api<Me>('/me'), api<Trick[]>('/tricks')])
        setMe(meRes)
        setTricks(tricksRes || [])
      } catch (e: any) {
        setErr(e?.message || 'Error')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function askQuestion() {
    const question = q.trim()
    if (!question) return
    setErr('')
    try {
      await api('/posts', {
        method: 'POST',
        body: JSON.stringify({
          text: `Q: ${question}`,
          image_url: null,
        }),
      })
      nav('/app/community')
    } catch (e: any) {
      setErr(e?.message || 'Error')
    }
  }

  async function createTrick() {
    setErr('')
    if (!title.trim() || !body.trim()) {
      setErr('Title and body are required.')
      return
    }
    setSaving(true)
    try {
      const created = await api<Trick>('/tricks', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          media_url: mediaUrl.trim() || null,
          is_vip: vipOnly,
        }),
      })
      setTricks((prev) => [created, ...prev])
      setTitle('')
      setBody('')
      setMediaUrl('')
      setVipOnly(false)
    } catch (e: any) {
      setErr(e?.message || 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function deleteTrick(id: number) {
    setErr('')
    try {
      await api(`/tricks/${id}`, { method: 'DELETE' })
      setTricks((prev) => prev.filter((t) => t.id !== id))
    } catch (e: any) {
      setErr(e?.message || 'Error')
    }
  }

  const total = tricks.length
  const vipCount = tricks.filter((t) => t.is_vip).length

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tricks & Tips</h1>
          <div className="text-sm text-slate-600 mt-1">
            Search answers first. If you can’t find it — ask the Community.
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Loaded: <b>{total}</b> tips (VIP-only: <b>{vipCount}</b>).
          </div>
        </div>

        <Button variant="secondary" onClick={() => setShowAdmin((v) => !v)}>
          {showAdmin ? 'Hide admin tools' : 'Admin tools'}
        </Button>
      </div>

      {err ? (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{err}</div>
      ) : null}

      <Card>
        <CardHeader title="Search tips" subtitle="Type a keyword (e.g., glue, bubbles, varnish, rice paper)." />
        <CardBody>
          <div className="flex gap-2">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Button onClick={askQuestion} variant="primary" disabled={!q.trim()}>
              Ask
            </Button>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            Tip: “Ask” will post your question in Community so others (and we) can answer.
          </div>
        </CardBody>
      </Card>

      {showAdmin ? (
        <Card>
          <CardHeader
            title="Create a new tip (admin)"
            subtitle="This will only work if your account is allowed by the backend."
          />
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs text-slate-600">Title</label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />

                <label className="text-xs text-slate-600">Media URL (optional)</label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                />

                <label className="inline-flex items-center gap-2 text-sm mt-2">
                  <input type="checkbox" checked={vipOnly} onChange={(e) => setVipOnly(e.target.checked)} />
                  VIP only
                </label>

                <div className="pt-2">
                  <Button onClick={createTrick} disabled={saving}>
                    {saving ? 'Saving…' : 'Create tip'}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-600">Body</label>
                <textarea
                  className="w-full min-h-[140px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
                <div className="text-xs text-slate-500">
                  Backend URL: <span className="font-mono">{apiBaseUrl()}</span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (
          <div className="text-sm text-slate-600">Loading tips…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-slate-600">
            No tips found for <b>{q.trim()}</b>. Click <b>Ask</b> to post this question in Community.
          </div>
        ) : (
          filtered.map((t) => (
            <Card key={t.id}>
              <CardHeader title={t.title} subtitle={t.is_vip ? 'VIP only' : 'Public'} />
              <CardBody>
                <div className="text-sm text-slate-700 whitespace-pre-wrap">{t.body}</div>

                {t.media_url ? (
                  <a className="text-sm underline mt-3 inline-block" href={t.media_url} target="_blank" rel="noreferrer">
                    Open media
                  </a>
                ) : null}

                {showAdmin ? (
                  <div className="mt-4">
                    <Button variant="secondary" onClick={() => deleteTrick(t.id)}>
                      Delete
                    </Button>
                  </div>
                ) : null}
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
