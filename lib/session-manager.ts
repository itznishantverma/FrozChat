import { supabase } from './supabase'

export interface SessionCheckResult {
  session_id: string
  expired: boolean
  expires_at?: string
  action: 'new_session_assigned' | 'session_valid'
}

export class SessionManager {
  static async checkAndRefreshSession(
    userId: string,
    durationHours: number = 24
  ): Promise<SessionCheckResult | null> {
    try {
      const { data, error } = await supabase.rpc('check_and_refresh_session', {
        p_user_id: userId,
        p_session_duration_hours: durationHours
      })

      if (error) {
        console.error('Error checking session:', error)
        return null
      }

      return data as SessionCheckResult
    } catch (err) {
      console.error('Exception checking session:', err)
      return null
    }
  }

  static async assignNewSession(
    userId: string,
    durationHours: number = 24
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('assign_new_session', {
        p_user_id: userId,
        p_session_duration_hours: durationHours
      })

      if (error) {
        console.error('Error assigning session:', error)
        return null
      }

      return data as string
    } catch (err) {
      console.error('Exception assigning session:', err)
      return null
    }
  }

  static async getCurrentSession(userId: string): Promise<{
    session_id: string | null
    expires_at: string | null
    is_expired: boolean
  }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('session_id, session_expires_at')
        .eq('id', userId)
        .maybeSingle()

      if (error || !data) {
        return { session_id: null, expires_at: null, is_expired: true }
      }

      const isExpired = data.session_expires_at
        ? new Date(data.session_expires_at) <= new Date()
        : true

      return {
        session_id: data.session_id,
        expires_at: data.session_expires_at,
        is_expired: isExpired
      }
    } catch (err) {
      console.error('Exception getting current session:', err)
      return { session_id: null, expires_at: null, is_expired: true }
    }
  }

  static async ensureValidSession(userId: string): Promise<string | null> {
    const currentSession = await this.getCurrentSession(userId)

    if (currentSession.is_expired || !currentSession.session_id) {
      const result = await this.checkAndRefreshSession(userId)
      return result?.session_id || null
    }

    return currentSession.session_id
  }
}
