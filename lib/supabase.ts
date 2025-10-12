import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database types (will be auto-generated from schema)
export interface Profile {
  id: string
  username: string
  display_name?: string
  email?: string
  gender?: string
  age?: number
  country?: string
  avatar_url?: string
  bio?: string
  session_id?: string
  session_created_at?: string
  session_expires_at?: string
  session_data?: any
  device_info?: any
  ip_details?: any
  last_ip?: string
  is_online: boolean
  last_seen_at: string
  created_at: string
  updated_at: string
}

export interface GuestUser {
  id: string
  session_token: string
  username: string
  gender?: string
  age?: number
  country?: string
  ip_details: any
  device_info: any
  claimed_at?: string
  claimed_by?: string
  is_online: boolean
  last_seen_at: string
  created_at: string
}