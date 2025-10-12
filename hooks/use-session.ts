'use client'

import { useEffect, useState } from 'react'
import { SessionManager, SessionCheckResult } from '@/lib/session-manager'
import { supabase } from '@/lib/supabase'

export function useSession() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [isExpired, setIsExpired] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    let interval: NodeJS.Timeout

    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        setUserId(session.user.id)
        await checkSession(session.user.id)

        interval = setInterval(() => {
          checkSession(session.user.id)
        }, 5 * 60 * 1000)
      } else {
        setIsLoading(false)
      }
    }

    initSession()

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [])

  const checkSession = async (uid: string) => {
    setIsLoading(true)
    const result = await SessionManager.checkAndRefreshSession(uid)

    if (result) {
      setSessionId(result.session_id)
      setExpiresAt(result.expires_at || null)
      setIsExpired(result.expired)
    }

    setIsLoading(false)
  }

  const refreshSession = async () => {
    if (!userId) return null

    const newSessionId = await SessionManager.assignNewSession(userId)
    if (newSessionId) {
      setSessionId(newSessionId)
      setIsExpired(false)

      const { data } = await supabase
        .from('profiles')
        .select('session_expires_at')
        .eq('id', userId)
        .maybeSingle()

      if (data?.session_expires_at) {
        setExpiresAt(data.session_expires_at)
      }
    }

    return newSessionId
  }

  return {
    sessionId,
    expiresAt,
    isExpired,
    isLoading,
    userId,
    refreshSession
  }
}