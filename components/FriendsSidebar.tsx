'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, MessageCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'

function getAvatarColor(username: string): string {
  const colors = [
    'from-red-500 to-pink-500',
    'from-orange-500 to-amber-500',
    'from-yellow-500 to-orange-500',
    'from-green-500 to-emerald-500',
    'from-teal-500 to-cyan-500',
    'from-cyan-500 to-blue-500',
    'from-blue-500 to-indigo-500',
    'from-violet-500 to-purple-500',
    'from-purple-500 to-pink-500',
    'from-rose-500 to-red-500'
  ]

  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}

interface Friend {
  friendship_id: string
  friend_user_id: string | null
  friend_guest_id: string | null
  friend_username: string
  friend_chat_room_id: string
  status: string
  created_at: string
  accepted_at: string
  unread_count?: number
}

interface ActiveChatRoom {
  id: string
  room_type: string
  is_active: boolean
  created_at: string
  partner_username?: string
  partner_user_id?: string
  partner_guest_id?: string
}

interface PreviousFriend {
  friendship_id: string
  friend_username: string
  friend_chat_room_id: string
  unfriended_at: string
  status: string
}

interface FriendsSidebarProps {
  currentUser: any
}

export default function FriendsSidebar({ currentUser }: FriendsSidebarProps) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [activeChatRoom, setActiveChatRoom] = useState<ActiveChatRoom | null>(null)
  const [previousFriends, setPreviousFriends] = useState<PreviousFriend[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (currentUser) {
      console.log('👥 FriendsSidebar mounted with user:', currentUser)
      loadFriendsAndRequests()

      // Setup realtime listeners
      const cleanup = setupRealtimeListeners()

      // Listen for friendship acceptance event
      const handleFriendshipAccepted = () => {
        console.log('✅ Friendship accepted event received - reloading friends')
        loadFriendsAndRequests()
      }

      window.addEventListener('friendshipAccepted', handleFriendshipAccepted)

      return () => {
        if (cleanup) cleanup()
        window.removeEventListener('friendshipAccepted', handleFriendshipAccepted)
      }
    }
  }, [currentUser])

  const loadFriendsAndRequests = async () => {
    if (!currentUser) return

    const userId = currentUser.type === 'authenticated' ? currentUser.id : null
    const guestId = currentUser.type === 'anonymous' ? currentUser.id : null

    console.log('📥 Loading friends and requests for:', { userId, guestId })

    try {
      // Load active chat room (only random chats, not friend chats)
      console.log('🔍 Loading active chat room for user:', { userId, guestId })
      try {
        // Query for active random chat rooms where user is a participant
        const { data: activeChatData, error: activeChatError } = await supabase
          .from('chat_rooms')
          .select('id, room_type, is_active, created_at, user_id_1, user_id_2, guest_id_1, guest_id_2')
          .eq('is_active', true)
          .eq('room_type', 'anonymous')
          .order('created_at', { ascending: false })

        console.log('🔍 Query result:', { activeChatData, activeChatError })

        if (activeChatError) {
          console.error('❌ Error loading active chat:', activeChatError)
          setActiveChatRoom(null)
        } else if (activeChatData && activeChatData.length > 0) {
          // Filter client-side to find room where current user is a participant
          const userRoom = activeChatData.find(room => {
            if (userId) {
              return room.user_id_1 === userId || room.user_id_2 === userId
            } else if (guestId) {
              return room.guest_id_1 === guestId || room.guest_id_2 === guestId
            }
            return false
          })

          if (userRoom) {
            console.log('✅ Found active chat room:', userRoom)

            // Determine partner ID
            let partnerUserId = null
            let partnerGuestId = null
            let partnerUsername = 'Anonymous User'

            if (userId) {
              partnerUserId = userRoom.user_id_1 === userId ? userRoom.user_id_2 : userRoom.user_id_1
              partnerGuestId = userRoom.guest_id_1 === userId ? userRoom.guest_id_2 : userRoom.guest_id_1
              if (!partnerUserId) {
                partnerGuestId = userRoom.guest_id_1 || userRoom.guest_id_2
              }
            } else if (guestId) {
              partnerGuestId = userRoom.guest_id_1 === guestId ? userRoom.guest_id_2 : userRoom.guest_id_1
              partnerUserId = userRoom.user_id_1 === guestId ? userRoom.user_id_2 : userRoom.user_id_1
              if (!partnerGuestId) {
                partnerUserId = userRoom.user_id_1 || userRoom.user_id_2
              }
            }

            console.log('🔍 Partner IDs:', { partnerUserId, partnerGuestId })

            // Fetch partner username
            if (partnerUserId) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', partnerUserId)
                .maybeSingle()

              if (profile) partnerUsername = profile.username
              console.log('🔍 Partner username from profile:', partnerUsername)
            } else if (partnerGuestId) {
              const { data: guestUser } = await supabase
                .from('guest_users')
                .select('username')
                .eq('id', partnerGuestId)
                .maybeSingle()

              if (guestUser) partnerUsername = guestUser.username
              console.log('🔍 Partner username from guest:', partnerUsername)
            }

            setActiveChatRoom({
              ...userRoom,
              partner_username: partnerUsername,
              partner_user_id: partnerUserId,
              partner_guest_id: partnerGuestId
            })
            console.log('✅ Set active chat room with partner:', partnerUsername)
          } else {
            console.log('❌ No active chat room found for this user')
            setActiveChatRoom(null)
          }
        } else {
          console.log('❌ No active chat rooms found at all')
          setActiveChatRoom(null)
        }
      } catch (error) {
        console.error('❌ Exception loading active chat:', error)
        setActiveChatRoom(null)
      }

      // Load friends
      const { data: friendsData, error: friendsError } = await supabase.rpc('get_friends', {
        p_user_id: userId,
        p_guest_id: guestId
      })

      if (friendsError) {
        console.error('❌ Error loading friends:', friendsError)
      } else {
        console.log('✅ Loaded friends:', friendsData)

        const friendsWithUnread = await Promise.all(
          (friendsData || []).map(async (friend: Friend) => {
            let query = supabase
              .from('unread_messages')
              .select('unread_count')
              .eq('chat_room_id', friend.friend_chat_room_id)

            if (userId) {
              query = query.eq('user_id', userId)
            } else if (guestId) {
              query = query.eq('guest_id', guestId)
            }

            const { data: unreadData } = await query.maybeSingle()

            return {
              ...friend,
              unread_count: unreadData?.unread_count || undefined
            }
          })
        )

        setFriends(friendsWithUnread)
      }

      // Load previous friends using database function
      console.log('🔍 Loading previous friends for:', { userId, guestId })

      const { data: previousFriendsData, error: previousFriendsError } = await supabase.rpc('get_previous_friends', {
        p_user_id: userId,
        p_guest_id: guestId
      })

      if (previousFriendsError) {
        console.error('❌ Error loading previous friends:', previousFriendsError)
      } else {
        console.log('✅ Loaded previous friends:', previousFriendsData)
        setPreviousFriends(previousFriendsData || [])
      }

      // Pending requests removed from sidebar

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

    // Subscribe to friendships - listen to ALL events (INSERT, UPDATE, DELETE)
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
          console.log('🔴 Friendship change detected:', payload.eventType, payload)
          // Reload friends list whenever friendships table changes
          loadFriendsAndRequests()
        }
      )
      .subscribe((status) => {
        console.log('🔴 Friendships channel status:', status)
      })

    // Subscribe to chat_rooms to detect when active chat closes or opens
    const chatRoomsChannel = supabase
      .channel('sidebar_chat_rooms')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_rooms'
        },
        (payload) => {
          console.log('🔴 Chat room change detected:', payload.eventType, payload)
          // Reload when chat rooms are created, updated, or deleted
          loadFriendsAndRequests()
        }
      )
      .subscribe((status) => {
        console.log('🔴 Chat rooms channel status:', status)
      })

    // Subscribe to unread_messages to detect unread count changes
    const unreadMessagesChannel = supabase
      .channel('sidebar_unread_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'unread_messages'
        },
        (payload) => {
          console.log('🔴 Unread messages change detected:', payload.eventType, payload)
          // Reload friends list to update unread counts
          loadFriendsAndRequests()
        }
      )
      .subscribe((status) => {
        console.log('🔴 Unread messages channel status:', status)
      })

    return () => {
      console.log('🔴 Cleaning up realtime subscriptions')
      friendshipsChannel.unsubscribe()
      chatRoomsChannel.unsubscribe()
      unreadMessagesChannel.unsubscribe()
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

      {/* ACTIVE CHAT ROOM SECTION */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <MessageCircle className={`h-4 w-4 ${activeChatRoom ? (activeChatRoom.is_active ? 'text-green-500' : 'text-red-500') : 'text-cyan-500'}`} />
          Active Chat Room
        </h4>
        {activeChatRoom ? (
          <div
            onClick={() => router.push(`/chat/${activeChatRoom.id}`)}
            className={`bg-gradient-to-r ${activeChatRoom.is_active ? 'from-green-50 to-emerald-50 border-green-300 hover:border-green-400' : 'from-red-50 to-rose-50 border-red-300 hover:border-red-400'} border-2 rounded-lg p-4 cursor-pointer transition-all shadow-sm`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 bg-gradient-to-br ${activeChatRoom.is_active ? getAvatarColor(activeChatRoom.partner_username || 'anonymous') + ' animate-pulse' : 'from-red-500 to-rose-500'} rounded-full flex items-center justify-center`}>
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{activeChatRoom.partner_username || 'Anonymous User'}</p>
                <p className="text-xs text-slate-600">{activeChatRoom.is_active ? 'Click to continue chatting' : 'Chat ended'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div
            onClick={() => {
              window.dispatchEvent(new CustomEvent('startNewChat'))
            }}
            className="bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-300 hover:border-cyan-400 rounded-lg p-4 cursor-pointer transition-all shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Connect to New Chat</p>
                <p className="text-xs text-slate-600">Start matching with someone</p>
              </div>
            </div>
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
                    <div className={`w-8 h-8 bg-gradient-to-br ${getAvatarColor(friend.friend_username)} rounded-full flex items-center justify-center relative`}>
                      <Users className="h-4 w-4 text-white" />
                      {friend.unread_count && friend.unread_count > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
                          {friend.unread_count > 9 ? '9+' : friend.unread_count}
                        </Badge>
                      )}
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

      {/* PREVIOUS FRIENDS SECTION */}
      <div className="mt-6">
        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-slate-400" />
          Previous Friends
          {previousFriends.length > 0 && (
            <Badge variant="outline" className="ml-auto text-slate-500">
              {previousFriends.length}
            </Badge>
          )}
        </h4>

        {loading ? (
          <div className="text-sm text-slate-500 text-center py-4">
            Loading...
          </div>
        ) : previousFriends.length > 0 ? (
          <div className="space-y-2">
            {previousFriends.map((previousFriend) => (
              <div
                key={previousFriend.friendship_id}
                onClick={() => router.push(`/chat/friend/${previousFriend.friend_chat_room_id}`)}
                className="bg-slate-50 border border-slate-200 rounded-lg p-3 hover:bg-slate-100 hover:border-slate-300 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 bg-gradient-to-br ${getAvatarColor(previousFriend.friend_username)} opacity-60 rounded-full flex items-center justify-center`}>
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {previousFriend.friend_username}
                      </p>
                      <p className="text-xs text-slate-500">
                        Unfriended {new Date(previousFriend.unfriended_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <MessageCircle className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
            <MessageCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              No previous friends
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Unfriended friends will appear here
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
