import { storage } from './storage'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = storage.get('token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as any || {})
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, { ...opts, headers })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(txt || res.statusText)
  }

  // Some endpoints may return 204 No Content (e.g. DELETE)
  if (res.status === 204) return undefined as unknown as T

  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    return res.json() as Promise<T>
  }

  const txt = await res.text().catch(() => '')
  return txt as unknown as T
}

export function apiBaseUrl() {
  return API_URL
}
