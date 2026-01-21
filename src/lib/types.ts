export type Me = {
  email: string
  nickname?: string | null
  plan?: string | null
  subscription_status: string
  vip_discount_percent: number
}

export type Post = {
  id: number
  kind: 'question' | 'showcase'
  title?: string | null
  content: string
  image_url?: string | null
  status: string
  risk_flags?: string | null
  created_at: string
  author_nickname?: string | null
}
