import React from 'react'
import { api } from '../lib/api'
import { Card, CardHeader, CardBody } from '../components/Card'
import { Button } from '../components/Button'
import type { Post } from '../lib/types'

export default function Community() {
  const [posts, setPosts] = React.useState<Post[]>([])
  const [kind, setKind] = React.useState<'question'|'showcase'>('question')
  const [title, setTitle] = React.useState('')
  const [content, setContent] = React.useState('')
  const [imageUrl, setImageUrl] = React.useState('')
  const [err, setErr] = React.useState('')
  const [msg, setMsg] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  async function load() {
    const feed = await api<Post[]>('/community/feed')
    setPosts(feed)
  }

  React.useEffect(() => { load().catch(()=>{}) }, [])

  // MVP “suggestion shield”: simple client-side hints (server still moderates)
  const suggestions = React.useMemo(() => {
    const q = (title + ' ' + content).toLowerCase()
    if (!q.trim()) return []
    const base = [
      'Try: apply a thin coat of decoupage glue/varnish (avoid PVA for rice paper).',
      'For bottles/glass: let each layer dry fully; use soft brush and minimal water.',
      'If images are different sizes on multi-image sheets, cut them out and test-fit before sealing.'
    ]
    return base.slice(0, 3)
  }, [title, content])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr(''); setMsg('')
    try {
      const p = await api<Post>('/community/post', {
        method: 'POST',
        body: JSON.stringify({
          kind,
          title: title || null,
          content,
          image_url: imageUrl || null
        })
      })
      setMsg(p.status === 'published'
        ? 'Posted ✅'
        : 'Posted, but auto-hidden for safety (pending review). You can still see it.'
      )
      setTitle(''); setContent(''); setImageUrl('')
      await load()
    } catch (e:any) { setErr(e.message || 'Error') }
    finally { setBusy(false) }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <Card>
        <CardHeader title="Ask & Share" subtitle="No admin duty: suggestions appear before posting. PII/abuse is auto-hidden." />
        <CardBody>
          {msg ? <div className="text-sm text-emerald-700 mb-2">{msg}</div> : null}
          {err ? <div className="text-sm text-red-600 mb-2">{err}</div> : null}

          <form onSubmit={submit} className="space-y-3">
            <div className="flex gap-2">
              <button type="button"
                className={`px-3 py-2 rounded-xl text-sm font-medium ${kind==='question'?'bg-slate-900 text-white':'bg-slate-100 text-slate-700'}`}
                onClick={()=>setKind('question')}>Question</button>
              <button type="button"
                className={`px-3 py-2 rounded-xl text-sm font-medium ${kind==='showcase'?'bg-slate-900 text-white':'bg-slate-100 text-slate-700'}`}
                onClick={()=>setKind('showcase')}>Showcase</button>
            </div>

            <div>
              <label className="text-sm text-slate-700">Title (optional)</label>
              <input value={title} onChange={e=>setTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
            </div>

            <div>
              <label className="text-sm text-slate-700">{kind==='question'?'Your question':'Describe your project'}</label>
              <textarea value={content} onChange={e=>setContent(e.target.value)} rows={4}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" required />
            </div>

            {kind==='showcase' ? (
              <div>
                <label className="text-sm text-slate-700">Image URL (MVP)</label>
                <input value={imageUrl} onChange={e=>setImageUrl(e.target.value)}
                  placeholder="https://…"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
                <div className="text-xs text-slate-500 mt-1">Later we’ll add direct upload.</div>
              </div>
            ) : null}

            {suggestions.length ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-700 mb-2">Suggestions (to reduce repeats)</div>
                <ul className="text-sm text-slate-700 space-y-1">
                  {suggestions.map((s, i) => <li key={i}>• {s}</li>)}
                </ul>
              </div>
            ) : null}

            <Button disabled={busy} className="w-full">{busy ? 'Posting…' : 'Post'}</Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Community feed" subtitle="Published posts + your own hidden posts." />
        <CardBody>
          <div className="space-y-3">
            {posts.map(p => (
              <div key={p.id} className={`rounded-2xl border p-4 ${p.status==='published'?'border-slate-200':'border-amber-300 bg-amber-50'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">
                    {p.title || (p.kind === 'question' ? 'Question' : 'Showcase')}
                  </div>
                  <div className="text-xs text-slate-500">{new Date(p.created_at).toLocaleString()}</div>
                </div>
                <div className="text-xs text-slate-500 mt-1">by {p.author_nickname || 'member'}</div>
                {p.status !== 'published' ? (
                  <div className="text-xs text-amber-700 mt-2">Auto-hidden: {p.risk_flags || 'risk'} </div>
                ) : null}
                <div className="text-sm text-slate-800 mt-3 whitespace-pre-wrap">{p.content}</div>
                {p.image_url ? (
                  <div className="mt-3">
                    <img src={p.image_url} className="rounded-2xl border border-slate-200 max-h-[420px] object-cover" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
