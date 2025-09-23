import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Database types
export interface PermanentUser {
  id: string;
  email: string;
  password_hash: string;
  profile_data: any;
  created_at: string;
  updated_at: string;
}

export interface GuestUser {
  id: string;
  session_id: string;
  gender: string;
  age: number;
  country: string;
  ip_address: string;
  ip_details: any;
  can_claim: boolean;
  claimed_by?: string;
  created_at: string;
}

export interface WaitingRoom {
  id: string;
  user_id: string;
  user_type: 'guest' | 'permanent';
  preferences: any;
  joined_at: string;
}

export interface ChatRoom {
  id: string;
  user1_id: string;
  user1_type: 'guest' | 'permanent';
  user2_id: string;
  user2_type: 'guest' | 'permanent';
  status: 'active' | 'ended';
  created_at: string;
  ended_at?: string;
}

export interface Message {
  id: string;
  chat_room_id: string;
  sender_id: string;
  sender_type: 'guest' | 'permanent';
  message: string;
  message_type: 'text' | 'image' | 'file';
  ip_address: string;
  ip_details: any;
  created_at: string;
}