'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ChatWindow from '@/components/chat/ChatWindow'
import AuthModal from '@/components/AuthModal'
import { supabase } from '@/lib/supabase'
import { Snowflake } from 'lucide-react'
import FriendsSidebar from '@/components/FriendsSidebar'
import FriendRequestNotification from '@/components/FriendRequestNotification'

export default function FriendChatPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string

  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [partnerUser, setPartnerUser] = useState<any>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roomClosed, setRoomClosed] = useState(false)

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
        .eq('room_type', 'friend')
        .maybeSingle()

      if (roomError || !room) {
        setError('Friend chat room not found')
        setLoading(false)
        return
      }

      const isTemporaryClosed = room.is_temporary_closure && room.closed_at

      if (room.closed_at && !isTemporaryClosed) {
        setError('This friend chat has been closed')
        setLoading(false)
        return
      }

      if (isTemporaryClosed) {
        setRoomClosed(true)
      }

      let partner: any = null
      const isUserAuth = user.type === 'authenticated'
      const currentUserId = isUserAuth ? user.id : null
      const currentGuestId = !isUserAuth ? user.id : null

      const isParticipant = (
        (currentUserId && (room.user_id_1 === currentUserId || room.user_id_2 === currentUserId)) ||
        (currentGuestId && (room.guest_id_1 === currentGuestId || room.guest_id_2 === currentGuestId))
      )

      if (!isParticipant) {
        setError('You are not authorized to access this friend chat')
        setTimeout(() => {
          router.push('/chat/new')
        }, 2000)
        setLoading(false)
        return
      }

      if (room.user_id_1 && room.user_id_1 !== currentUserId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', room.user_id_1)
          .maybeSingle()

        partner = profile ? {
          username: profile.username,
          display_name: profile.display_name || profile.username
        } : null
      } else if (room.user_id_2 && room.user_id_2 !== currentUserId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', room.user_id_2)
          .maybeSingle()

        partner = profile ? {
          username: profile.username,
          display_name: profile.display_name || profile.username
        } : null
      } else if (room.guest_id_1 && room.guest_id_1 !== currentGuestId) {
        const { data: guestProfile } = await supabase
          .from('guest_users')
          .select('*')
          .eq('id', room.guest_id_1)
          .maybeSingle()

        partner = guestProfile ? {
          username: guestProfile.username,
          display_name: guestProfile.display_name || guestProfile.username
        } : null
      } else if (room.guest_id_2 && room.guest_id_2 !== currentGuestId) {
        const { data: guestProfile } = await supabase
          .from('guest_users')
          .select('*')
          .eq('id', room.guest_id_2)
          .maybeSingle()

        partner = guestProfile ? {
          username: guestProfile.username,
          display_name: guestProfile.display_name || guestProfile.username
        } : null
      }

      setPartnerUser(partner || { username: 'Friend', display_name: 'Friend' })
      setLoading(false)
    } catch (err) {
      console.error('Error loading friend chat:', err)
      setError('Failed to load friend chat')
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
            Loading friend chat...
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
      isFriendChat={true}
      isTemporarilyClosed={roomClosed}
    />
  )
}
