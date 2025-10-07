'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface ActiveChatRoomIndicatorProps {
  userId?: string
  guestId?: string
  currentRoomId?: string
}

export default function ActiveChatRoomIndicator({
  userId,
  guestId,
  currentRoomId
}: ActiveChatRoomIndicatorProps) {
  const [activeChatRoom, setActiveChatRoom] = useState<any>(null)
  const [partnerName, setPartnerName] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    checkActiveChatRoom()

    const channel = supabase
      .channel(`active-rooms-${userId || guestId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_rooms'
        },
        () => {
          checkActiveChatRoom()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, guestId, currentRoomId])

  const checkActiveChatRoom = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('is_active', true)
        .is('closed_at', null)
        .neq('room_type', 'friend')
        .or(
          userId
            ? `user_id_1.eq.${userId},user_id_2.eq.${userId}`
            : `guest_id_1.eq.${guestId},guest_id_2.eq.${guestId}`
        )
        .maybeSingle()

      if (error || !data) {
        setActiveChatRoom(null)
        return
      }

      // Don't show indicator if we're already on this room
      if (data.id === currentRoomId) {
        setActiveChatRoom(null)
        return
      }

      setActiveChatRoom(data)

      // Get partner name
      let partnerUserId = null
      let partnerGuestId = null

      if (userId) {
        partnerUserId = data.user_id_1 === userId ? data.user_id_2 : data.user_id_1
        partnerGuestId = null
        if (!partnerUserId) {
          partnerGuestId = data.guest_id_1 || data.guest_id_2
        }
      } else {
        partnerGuestId = data.guest_id_1 === guestId ? data.guest_id_2 : data.guest_id_1
        partnerUserId = null
        if (!partnerGuestId) {
          partnerUserId = data.user_id_1 || data.user_id_2
        }
      }

      if (partnerUserId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, display_name')
          .eq('id', partnerUserId)
          .maybeSingle()

        setPartnerName(profile?.display_name || profile?.username || 'Someone')
      } else if (partnerGuestId) {
        const { data: guest } = await supabase
          .from('guest_users')
          .select('username, display_name')
          .eq('id', partnerGuestId)
          .maybeSingle()

        setPartnerName(guest?.display_name || guest?.username || 'Someone')
      }
    } catch (err) {
      console.error('Error checking active chat room:', err)
      setActiveChatRoom(null)
    }
  }

  if (!activeChatRoom) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:right-auto z-40 animate-in slide-in-from-bottom-5">
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg shadow-xl p-3 md:p-4 flex items-center gap-2 md:gap-3 max-w-sm mx-auto md:mx-0">
        <MessageSquare className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm font-semibold">Active Chat</p>
          <p className="text-xs opacity-90 truncate">with {partnerName}</p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => router.push(`/chat/${activeChatRoom.id}`)}
          className="h-7 md:h-8 text-xs whitespace-nowrap px-2 md:px-3"
        >
          Open
        </Button>
      </div>
    </div>
  )
}
