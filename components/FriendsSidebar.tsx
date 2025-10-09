'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, MessageCircle, Bell, Check, X, UserPlus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

interface Friend {
  friendship_id: string
  friend_user_id: string | null
  friend_guest_id: string | null
  friend_username: string
  friend_chat_room_id: string
  status: string
  created_at: string
  accepted_at: string
}

interface FriendRequest {
  id: string
  sender_user_id: string | null
  sender_guest_id: string | null
  receiver_user_id: string | null
  receiver_guest_id: string | null
  chat_room_id: string
  status: string
  created_at: string
}

interface FriendsSidebarProps {
  currentUser: any
}

export default function FriendsSidebar({ currentUser }: FriendsSidebarProps) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (currentUser) {
      console.log('👥 FriendsSidebar mounted with user:', currentUser)
      loadFriendsAndRequests()
      const cleanup = setupRealtimeListeners()
      return cleanup
    }
  }, [currentUser])

  const loadFriendsAndRequests = async () => {
    if (!currentUser) return

    const userId = currentUser.type === 'authenticated' ? currentUser.id : null
    const guestId = currentUser.type === 'anonymous' ? currentUser.id : null

    console.log('📥 Loading friends and requests for:', { userId, guestId })

    try {
      // Load friends
      const { data: friendsData, error: friendsError } = await supabase.rpc('get_friends', {
        p_user_id: userId,
        p_guest_id: guestId
      })

      if (friendsError) {
        console.error('❌ Error loading friends:', friendsError)
      } else {
        console.log('✅ Loaded friends:', friendsData)
        setFriends(friendsData || [])
      }

      // Load pending requests
      let query = supabase
        .from('friend_requests')
        .select('*')
        .eq('status', 'pending')

      if (userId) {
        query = query.eq('receiver_user_id', userId)
      } else if (guestId) {
        query = query.eq('receiver_guest_id', guestId)
      }

      const { data: requestsData, error: requestsError } = await query

      if (requestsError) {
        console.error('❌ Error loading requests:', requestsError)
      } else {
        console.log('✅ Loaded requests:', requestsData)
        setPendingRequests(requestsData || [])
      }

      setLoading(false)
    } catch (error) {
      console.error('❌ Exception loading data:', error)
      setLoading(false)
    }
  }

  const setupRealtimeListeners = () => {
    if (!currentUser) return

    const userId = currentUser.type === 'authenticated' ? currentUser.id : null
    const guestId = currentUser.type === 'anonymous' ? currentUser.id : null

    console.log('🔴 Setting up realtime for FriendsSidebar')

    // Subscribe to friend requests
    const requestsChannel = supabase
      .channel('sidebar_friend_requests')
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
          console.log('🔴 Friend request update:', payload)
          loadFriendsAndRequests()
        }
      )
      .subscribe()

    // Subscribe to friendships
    const friendshipsChannel = supabase
      .channel('sidebar_friendships')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships'
        },
        (payload) => {
          console.log('🔴 Friendship update:', payload)
          loadFriendsAndRequests()
        }
      )
      .subscribe()

    return () => {
      requestsChannel.unsubscribe()
      friendshipsChannel.unsubscribe()
    }
  }

  const handleAcceptRequest = async (requestId: string) => {
    const userId = currentUser.type === 'authenticated' ? currentUser.id : null
    const guestId = currentUser.type === 'anonymous' ? currentUser.id : null

    console.log('✅ Accepting request:', requestId)

    try {
      const { data, error } = await supabase.rpc('accept_friend_request_v2', {
        p_request_id: requestId,
        p_receiver_user_id: userId,
        p_receiver_guest_id: guestId
      })

      if (error) {
        console.error('❌ Error accepting:', error)
        toast({
          title: 'Error',
          description: error.message || 'Failed to accept friend request',
          variant: 'destructive',
        })
        return
      }

      if (data?.success) {
        toast({
          title: 'Friend request accepted',
          description: 'You are now friends!',
        })
        loadFriendsAndRequests()
      } else {
        toast({
          title: 'Error',
          description: data?.error || 'Failed to accept friend request',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('❌ Exception:', error)
      toast({
        title: 'Error',
        description: 'Failed to accept friend request',
        variant: 'destructive',
      })
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    const userId = currentUser.type === 'authenticated' ? currentUser.id : null
    const guestId = currentUser.type === 'anonymous' ? currentUser.id : null

    console.log('❌ Rejecting request:', requestId)

    try {
      const { data, error } = await supabase.rpc('reject_friend_request_v2', {
        p_request_id: requestId,
        p_receiver_user_id: userId,
        p_receiver_guest_id: guestId
      })

      if (error) {
        console.error('❌ Error rejecting:', error)
        toast({
          title: 'Error',
          description: error.message || 'Failed to reject friend request',
          variant: 'destructive',
        })
        return
      }

      if (data?.success) {
        toast({
          title: 'Friend request rejected',
        })
        loadFriendsAndRequests()
      } else {
        toast({
          title: 'Error',
          description: data?.error || 'Failed to reject friend request',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('❌ Exception:', error)
      toast({
        title: 'Error',
        description: 'Failed to reject friend request',
        variant: 'destructive',
      })
    }
  }

  const handleFriendChatClick = (chatRoomId: string) => {
    console.log('💬 Opening friend chat:', chatRoomId)
    router.push(`/chat/friend/${chatRoomId}`)
  }

  if (!currentUser) return null

  return (
    <Card className="w-80 h-screen flex-shrink-0 p-4 border-cyan-200 shadow-lg overflow-y-auto">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Users className="h-5 w-5" />
        Friends & Requests
      </h3>

      {/* PENDING REQUESTS SECTION - ALWAYS VISIBLE */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Bell className="h-4 w-4 text-orange-500" />
          Pending Requests
          {pendingRequests.length > 0 && (
            <Badge className="bg-red-500 text-white ml-auto">
              {pendingRequests.length}
            </Badge>
          )}
        </h4>

        {loading ? (
          <div className="text-sm text-slate-500 text-center py-4">
            Loading...
          </div>
        ) : pendingRequests.length > 0 ? (
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-lg p-3 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="h-4 w-4 text-orange-600" />
                  <p className="text-sm font-semibold text-slate-800">
                    New Friend Request
                  </p>
                </div>
                <p className="text-xs text-slate-600 mb-3">
                  Someone wants to be your friend!
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAcceptRequest(request.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700 h-8 text-xs"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRejectRequest(request.id)}
                    className="flex-1 border-red-300 text-red-700 hover:bg-red-50 h-8 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
            <Bell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              No pending requests
            </p>
          </div>
        )}
      </div>

      {/* FRIENDS LIST SECTION */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-500" />
          My Friends
          {friends.length > 0 && (
            <Badge variant="outline" className="ml-auto">
              {friends.length}
            </Badge>
          )}
        </h4>

        {loading ? (
          <div className="text-sm text-slate-500 text-center py-4">
            Loading...
          </div>
        ) : friends.length > 0 ? (
          <div className="space-y-2">
            {friends.map((friend) => (
              <div
                key={friend.friendship_id}
                onClick={() => handleFriendChatClick(friend.friend_chat_room_id)}
                className="bg-white border border-cyan-200 rounded-lg p-3 hover:bg-cyan-50 hover:border-cyan-300 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {friend.friend_username}
                      </p>
                      <p className="text-xs text-slate-500">
                        Friends since {new Date(friend.accepted_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <MessageCircle className="h-4 w-4 text-slate-400 group-hover:text-cyan-600 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
            <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500 mb-2">
              No friends yet
            </p>
            <p className="text-xs text-slate-400">
              Send friend requests during chats!
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
