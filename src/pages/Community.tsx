import React from 'react'
import { api, apiBaseUrl } from '../lib/api'
import { storage } from '../lib/storage'
import { Card, CardHeader, CardBody } from '../components/Card'
import { Button } from '../components/Button'
import type { Comment, Me, Post, Trick } from '../lib/types'

const isQuestion = (text: string) => /^\s*(q:|\[q\]|❓)/i.test(text || '')
const stripQ = (text: string) => (text || '').replace(/^\s*(q:|\[q\]|❓)\s*/i, '').trim()

async function uploadImage(file: File): Promise<string> {
  const token = storage.get('token')
  const form = new FormData()
  form.append('file', file)

  const res = await fetch(`${apiBaseUrl()}/media/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(txt || `Upload failed (${res.status})`)
  }
  const data = await res.json() as { url: string }
  return data.url
}

export default function Community() {
  const [me, setMe] = React.useState<Me | null>(null)
  const [posts, setPosts] = React.useState<Post[]>([])
  const [filter, setFilter] = React.useState<'all' | 'works' | 'questions'>('all')

  const [newKind, setNewKind] = React.useState<'work' | 'question'>('work')
  const [text, setText] = React.useState('')
  const [imageUrl, setImageUrl] = React.useState('')
  const [file, setFile] = React.useState<File | null>(null)

  const [busy, setBusy] = React.useState(false)
  const [msg, setMsg] = React.useState('')
  const [err, setErr] = React.useState('')

  const [openPostId, setOpenPostId] = React.useState<number | null>(null)
  const [commentsByPost, setCommentsByPost] = React.useState<Record<number, Comment[]>>({})
  const [commentDraft, setCommentDraft] = React.useState<Record<number, string>>({})

  async function load() {
    const [m, p] = await Promise.all([
      api<Me>('/me').catch(() => null),
      api<Post[]>('/posts'),
    ])
    setMe(m)
    setPosts(p || [])
  }

  React.useEffect(() => { load().catch((e:any)=>setErr(e?.message||'Error')) }, [])

  const visible = React.useMemo(() => {
    const list = posts.slice()
    if (filter === 'works') return list.filter(p => !isQuestion(p.text))
    if (filter === 'questions') return list.filter(p => isQuestion(p.text))
    return list
  }, [posts, filter])

  async function createPost() {
    const raw = text.trim()
    if (!raw) return
    setBusy(true); setErr(''); setMsg('')
    try {
      let finalImage = imageUrl.trim() || null
      if (file) {
        finalImage = await uploadImage(file)
      }
      const payload = {
        text: newKind === 'question' ? `Q: ${raw}` : raw,
        image_url: newKind === 'question' ? null : finalImage,
      }
      await api<Post>('/posts', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setText('')
      setImageUrl('')
      setFile(null)
      setMsg(newKind === 'question' ? 'Question posted ✅' : 'Post published ✅')
      await load()
      setFilter(newKind === 'question' ? 'questions' : 'works')
    } catch (e:any) {
      setErr(e?.message || 'Error')
    } finally {
      setBusy(false)
    }
  }

  async function toggleComments(postId: number) {
    if (openPostId === postId) {
      setOpenPostId(null)
      return
    }
    setOpenPostId(postId)
    if (!commentsByPost[postId]) {
      const c = await api<Comment[]>(`/posts/${postId}/comments`)
      setCommentsByPost(prev => ({ ...prev, [postId]: c || [] }))
    }
  }

  async function addComment(postId: number) {
    const t = (commentDraft[postId] || '').trim()
    if (!t) return
    setBusy(true); setErr(''); setMsg('')
    try {
      await api<Comment>(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: t }),
      })
      setCommentDraft(prev => ({ ...prev, [postId]: '' }))
      const c = await api<Comment[]>(`/posts/${postId}/comments`)
      setCommentsByPost(prev => ({ ...prev, [postId]: c || [] }))
      setMsg('Comment added ✅')
    } catch (e:any) {
      setErr(e?.message || 'Error')
    } finally {
      setBusy(false)
    }
  }

  async function saveAsTip(questionPost: Post, answer: Comment) {
    if (!me?.is_admin) return
    const title = stripQ(questionPost.text).slice(0, 120)
    const body = answer.text
    if (!title || !body) return
    const ok = window.confirm('Save this answer as a permanent tip in Tricks & Tips?')
    if (!ok) return

    setBusy(true); setErr(''); setMsg('')
    try {
      await api<Trick>('/tricks', {
        method: 'POST',
        body: JSON.stringify({ title, body, media_url: null, is_vip: false }),
      })
      setMsg('Saved as a new tip ✅')
    } catch (e:any) {
      setErr(e?.message || 'Error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Community</h1>
          <div className="text-sm text-slate-600 mt-1">
            Like a Facebook group: share your work, ask questions, and comment.
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant={filter === 'all' ? 'primary' : 'secondary'} onClick={() => setFilter('all')}>All</Button>
          <Button variant={filter === 'works' ? 'primary' : 'secondary'} onClick={() => setFilter('works')}>Wasze prace</Button>
          <Button variant={filter === 'questions' ? 'primary' : 'secondary'} onClick={() => setFilter('questions')}>Q&A</Button>
        </div>
      </div>

      {err ? <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{err}</div> : null}
      {msg ? <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">{msg}</div> : null}

      <Card>
        <CardHeader title="New post" subtitle="Work post (photo) or a question" />
        <CardBody>
          <div className="flex gap-2 flex-wrap">
            <Button variant={newKind === 'work' ? 'primary' : 'secondary'} onClick={() => setNewKind('work')}>Work</Button>
            <Button variant={newKind === 'question' ? 'primary' : 'secondary'} onClick={() => setNewKind('question')}>Question</Button>
          </div>

          <div className="mt-3">
            <textarea
              className="w-full border border-slate-200 rounded-xl p-3 text-sm min-h-[110px]"
              placeholder={newKind === 'question' ? 'Ask your decoupage question…' : 'Show what you made…'}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          {newKind === 'work' ? (
            <div className="mt-3 grid gap-2">
              <div className="text-xs text-slate-500">Add an image (upload) OR paste an image URL:</div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="text-sm"
              />
              <input
                className="w-full border border-slate-200 rounded-xl p-3 text-sm"
                placeholder="https://…"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <div className="text-xs text-slate-500">
                Tip: upload is easiest (the app will store it on the server).
              </div>
            </div>
          ) : null}

          <div className="mt-3">
            <Button onClick={createPost} disabled={busy || !text.trim()}>
              {busy ? 'Please wait…' : 'Publish'}
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="space-y-3">
        {visible.map(p => {
          const q = isQuestion(p.text)
          return (
            <Card key={p.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-2 items-center flex-wrap">
                    <span className="text-xs px-2 py-1 rounded-full bg-slate-100 border border-slate-200">
                      {p.author_display_name || 'Member'}
                    </span>
                    {q ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800">
                        ❓ Question
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">
                        🖼️ Work
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">{new Date(p.created_at).toLocaleString()}</div>
                </div>

                <div className="mt-2 text-sm text-slate-900 whitespace-pre-line">
                  {q ? stripQ(p.text) : p.text}
                </div>

                {p.image_url ? (
                  <div className="mt-3">
                    <a href={p.image_url} target="_blank" rel="noreferrer" className="text-sm underline">
                      Open image
                    </a>
                  </div>
                ) : null}

                <div className="mt-3 flex gap-2 flex-wrap">
                  <Button variant="secondary" onClick={() => toggleComments(p.id)}>
                    {openPostId === p.id ? 'Hide comments' : 'Comments'}
                  </Button>
                </div>

                {openPostId === p.id ? (
                  <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
                    {(commentsByPost[p.id] || []).length ? (
                      <div className="space-y-2">
                        {(commentsByPost[p.id] || []).map(c => (
                          <div key={c.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <div className="flex justify-between gap-2 text-xs text-slate-500">
                              <div><b className="text-slate-700">{c.author_display_name || 'Member'}</b></div>
                              <div>{new Date(c.created_at).toLocaleString()}</div>
                            </div>
                            <div className="mt-1 text-sm text-slate-800 whitespace-pre-line">{c.text}</div>

                            {q && me?.is_admin ? (
                              <div className="mt-2">
                                <Button variant="secondary" onClick={() => saveAsTip(p, c)}>
                                  Save as tip
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-600">No comments yet.</div>
                    )}

                    <div className="flex gap-2">
                      <input
                        className="flex-1 border border-slate-200 rounded-xl p-3 text-sm"
                        placeholder={q ? 'Write an answer…' : 'Write a comment…'}
                        value={commentDraft[p.id] || ''}
                        onChange={(e) => setCommentDraft(prev => ({ ...prev, [p.id]: e.target.value }))}
                      />
                      <Button onClick={() => addComment(p.id)} disabled={busy || !(commentDraft[p.id] || '').trim()}>
                        Send
                      </Button>
                    </div>

                    {!me ? (
                      <div className="text-xs text-slate-500">
                        Sign in to comment.
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </CardBody>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
