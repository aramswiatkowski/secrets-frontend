export type Me = {
  id: number
  email: string
  display_name: string
  is_admin: boolean
  is_vip: boolean
  plan: string
  discount_percent: number
  monthly_credits: number
  credits_balance: number
  credit_costs: Record<string, number>
}

export type Trick = {
  id: number
  title: string
  body: string
  media_url?: string | null
  is_vip: boolean
  created_at: string
}

export type Post = {
  id: number
  user_id: number
  author_display_name: string
  text: string
  image_url?: string | null
  created_at: string
}

export type Comment = {
  id: number
  post_id: number
  user_id: number
  author_display_name: string
  text: string
  created_at: string
}
