'use client'

import { useState, useEffect } from 'react'
import { Bell, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

interface FriendRequest {
  id: string
  sender_user_id: string | null
  sender_guest_id: string | null
  receiver_user_id: string | null
  receiver_guest_id: string | null
  chat_room_id: string
  status: string
  created_at: string
  sender_name?: string
}

interface FriendRequestNotificationProps {
  currentUser: any
}

export default function FriendRequestNotification({ currentUser }: FriendRequestNotificationProps) {
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([])
  const [requestCount, setRequestCount] = useState(0)
  const { toast } = useToast()

  useEffect(() => {
    if (currentUser) {
      console.log('🔔 FriendRequestNotification mounted with user:', currentUser)
      loadPendingRequests()
      const cleanup = setupRealtimeListener()
      return cleanup
    }
  }, [currentUser])

  const loadPendingRequests = async () => {
    if (!currentUser) {
      console.log('❌ No currentUser, skipping load')
      return
    }

    const userId = currentUser.type === 'authenticated' ? currentUser.id : null
    const guestId = currentUser.type === 'anonymous' ? currentUser.id : null

    console.log('📩 Loading pending requests for:', {
      userId,
      guestId,
      userType: currentUser.type
    })

    try {
      let query = supabase
        .from('friend_requests')
        .select('*')
        .eq('status', 'pending')

      if (userId) {
        query = query.eq('receiver_user_id', userId)
      } else if (guestId) {
        query = query.eq('receiver_guest_id', guestId)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error loading friend requests:', error)
        return
      }

      console.log('📬 Loaded pending requests:', {
        count: data?.length || 0,
        requests: data
      })

      const requestsWithNames = await Promise.all(
        (data || []).map(async (request) => {
          let senderName = 'Someone'

          if (request.sender_user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', request.sender_user_id)
              .maybeSingle()

            if (profile) {
              senderName = profile.username
            }
          } else if (request.sender_guest_id) {
            const { data: guestUser } = await supabase
              .from('guest_users')
              .select('username')
              .eq('id', request.sender_guest_id)
              .maybeSingle()

            if (guestUser) {
              senderName = guestUser.username
            }
          }

          return {
            ...request,
            sender_name: senderName
          }
        })
      )

      setPendingRequests(requestsWithNames)
      setRequestCount(requestsWithNames.length)
    } catch (error) {
      console.error('❌ Exception in loadPendingRequests:', error)
    }
  }

  const setupRealtimeListener = () => {
    if (!currentUser) return

    const userId = currentUser.type === 'authenticated' ? currentUser.id : null
    const guestId = currentUser.type === 'anonymous' ? currentUser.id : null

    console.log('🔴 Setting up realtime listener for friend_requests')

    const channel = supabase
      .channel('friend_requests_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: userId
            ? `receiver_user_id=eq.${userId}`
            : `receiver_guest_id=eq.${guestId}`
        },
        (payload) => {
          console.log('🔴 Realtime friend request update:', payload)

          if (payload.eventType === 'INSERT' && payload.new.status === 'pending') {
            toast({
              title: 'New friend request',
              description: 'You have received a new friend request',
            })
          }

          loadPendingRequests()
        }
      )
      .subscribe((status) => {
        console.log('🔴 Realtime subscription status:', status)
      })

    return () => {
      console.log('🔴 Cleaning up realtime listener')
      channel.unsubscribe()
    }
  }

  const handleAcceptRequest = async (requestId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const userId = currentUser.type === 'authenticated' ? currentUser.id : null
    const guestId = currentUser.type === 'anonymous' ? currentUser.id : null

    console.log('✅ Accepting friend request:', requestId)

    try {
      const { data, error } = await supabase.rpc('accept_friend_request_v2', {
        p_request_id: requestId,
        p_receiver_user_id: userId,
        p_receiver_guest_id: guestId
      })

      if (error) {
        console.error('❌ Error accepting request:', error)
        toast({
          title: 'Error',
          description: error.message || 'Failed to accept friend request',
          variant: 'destructive',
        })
        return
      }

      console.log('✅ Accept response:', data)

      if (data?.success) {
        setPendingRequests(prev => prev.filter(req => req.id !== requestId))
        setRequestCount(prev => Math.max(0, prev - 1))

        toast({
          title: 'Friend request accepted',
          description: 'You are now friends!',
        })

        window.dispatchEvent(new CustomEvent('friendshipAccepted', {
          detail: { chatRoomId: data.chat_room_id, friendshipId: data.friendship_id }
        }))
      } else {
        toast({
          title: 'Error',
          description: data?.error || 'Failed to accept friend request',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('❌ Exception accepting request:', error)
      toast({
        title: 'Error',
        description: 'Failed to accept friend request',
        variant: 'destructive',
      })
    }
  }

  const handleRejectRequest = async (requestId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const userId = currentUser.type === 'authenticated' ? currentUser.id : null
    const guestId = currentUser.type === 'anonymous' ? currentUser.id : null

    console.log('❌ Rejecting friend request:', requestId)

    try {
      const { data, error } = await supabase.rpc('reject_friend_request_v2', {
        p_request_id: requestId,
        p_receiver_user_id: userId,
        p_receiver_guest_id: guestId
      })

      if (error) {
        console.error('❌ Error rejecting request:', error)
        toast({
          title: 'Error',
          description: error.message || 'Failed to reject friend request',
          variant: 'destructive',
        })
        return
      }

      if (data?.success) {
        setPendingRequests(prev => prev.filter(req => req.id !== requestId))
        setRequestCount(prev => Math.max(0, prev - 1))

        toast({
          title: 'Friend request rejected',
        })
      } else {
        toast({
          title: 'Error',
          description: data?.error || 'Failed to reject friend request',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('❌ Exception rejecting request:', error)
      toast({
        title: 'Error',
        description: 'Failed to reject friend request',
        variant: 'destructive',
      })
    }
  }

  if (!currentUser) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-7 w-7 sm:h-8 sm:w-8 p-1">
          <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
          {requestCount > 0 && (
            <Badge className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 bg-red-500 text-white text-[9px] sm:text-xs">
              {requestCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 sm:w-80">
        <div className="px-2 py-1.5 text-sm font-semibold">
          Friend Requests ({requestCount})
        </div>
        <DropdownMenuSeparator />
        {pendingRequests.length > 0 ? (
          <div className="max-h-96 overflow-y-auto">
            {pendingRequests.map((request, index) => (
              <div key={request.id}>
                <div className="px-2 py-3">
                  <p className="text-sm font-medium text-slate-800 mb-2">
                    {request.sender_name} wants to be your friend
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={(e) => handleAcceptRequest(request.id, e)}
                      className="flex-1 bg-green-600 hover:bg-green-700 h-8"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => handleRejectRequest(request.id, e)}
                      className="flex-1 border-red-300 text-red-700 hover:bg-red-50 h-8"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
                {index < pendingRequests.length - 1 && <DropdownMenuSeparator />}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-2 py-8 text-center text-sm text-slate-500">
            No pending friend requests
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
