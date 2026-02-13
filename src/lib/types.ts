import type { BingoCard } from './bingo'

export interface Profile {
  id: string
  name: string
  phone: string
  email: string
  avatar_url: string | null
  is_admin: boolean
  created_at: string
}

export interface Round {
  id: string
  status: 'active' | 'finished'
  drawn_numbers: number[]
  created_at: string
  finished_at: string | null
}

export interface Participant {
  id: string
  round_id: string
  user_id: string
  card: BingoCard
  marked_numbers: number[]
  has_bingo: boolean
  bingo_claimed_at: string | null
  created_at: string
  // joined from profiles
  profiles?: Profile
}
