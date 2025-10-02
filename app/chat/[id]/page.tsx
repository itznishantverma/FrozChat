'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ChatWindow from '@/components/chat/ChatWindow'
import AuthModal from '@/components/AuthModal'
import { supabase } from '@/lib/supabase'
import { Snowflake } from 'lucide-react'

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string

  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [partnerUser, setPartnerUser] = useState<any>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    validateAndLoadChat()
  }, [roomId])

  const validateAndLoadChat = async () => {
    try {
      const existingSession = localStorage.getItem('frozChatSession')

      if (!existingSession) {
        setShowAuthModal(true)
        setLoading(false)
        return
      }

      const sessionData = JSON.parse(existingSession)

      let user: any = null

      if (sessionData.type === 'anonymous') {
        const { data: guestUser, error } = await supabase
          .from('guest_users')
          .select('*')
          .eq('session_token', sessionData.session_token || sessionData.sessionToken)
          .maybeSingle()

        if (error || !guestUser) {
          localStorage.removeItem('frozChatSession')
          setShowAuthModal(true)
          setLoading(false)
          return
        }

        user = { ...guestUser, type: 'anonymous' }
      } else {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !authUser) {
          localStorage.removeItem('frozChatSession')
          setShowAuthModal(true)
          setLoading(false)
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (profile) {
          user = { ...profile, user: authUser, type: 'authenticated' }
        } else {
          localStorage.removeItem('frozChatSession')
          setShowAuthModal(true)
          setLoading(false)
          return
        }
      }

      setCurrentUser(user)

      const { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('id', roomId)
        .maybeSingle()

      if (roomError || !room) {
        setError('Chat room not found')
        setLoading(false)
        return
      }

      setPartnerUser({ username: 'Chat Partner' })
      setLoading(false)
    } catch (err) {
      console.error('Error loading chat:', err)
      setError('Failed to load chat')
      setLoading(false)
    }
  }

  const handleAuthSuccess = () => {
    setShowAuthModal(false)
    validateAndLoadChat()
  }

  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Snowflake className="h-16 w-16 text-cyan-600 mx-auto mb-4 animate-spin" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Loading chat...
          </h1>
          <p className="text-slate-600">
            Please wait while we connect you
          </p>
        </div>
      </div>
    )
  }

  if (showAuthModal || !currentUser) {
    return (
      <div className="h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
        <AuthModal
          isOpen={true}
          onClose={() => router.push('/')}
          onSuccess={handleAuthSuccess}
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            {error}
          </h1>
          <button
            onClick={() => router.push('/chat/new')}
            className="text-cyan-600 hover:underline"
          >
            Return to chat
          </button>
        </div>
      </div>
    )
  }

  return (
    <ChatWindow
      roomId={roomId}
      currentUser={currentUser}
      partnerUser={partnerUser}
    />
  )
}
