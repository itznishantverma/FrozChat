'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, MessageCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'

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
        setFriends(friendsData || [])
      }

      // Load previous friends (only unfriended)
      let previousFriendsQuery = supabase
        .from('friendships')
        .select('id, friend_chat_room_id, unfriended_at, status')
        .eq('status', 'unfriended')

      if (userId) {
        previousFriendsQuery = previousFriendsQuery.or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
      } else if (guestId) {
        previousFriendsQuery = previousFriendsQuery.or(`guest_id_1.eq.${guestId},guest_id_2.eq.${guestId}`)
      }

      const { data: previousFriendsData, error: previousFriendsError } = await previousFriendsQuery

      if (previousFriendsError) {
        console.error('❌ Error loading previous friends:', previousFriendsError)
      } else {
        console.log('✅ Loaded previous friends:', previousFriendsData)

        const previousFriendsWithNames = await Promise.all(
          (previousFriendsData || []).map(async (friendship) => {
            let friendUsername = 'Unknown'

            const { data: chatRoom } = await supabase
              .from('chat_rooms')
              .select('user_id_1, user_id_2, guest_id_1, guest_id_2')
              .eq('id', friendship.friend_chat_room_id)
              .maybeSingle()

            if (chatRoom) {
              const friendUserId = chatRoom.user_id_1 === userId ? chatRoom.user_id_2 : chatRoom.user_id_1
              const friendGuestId = chatRoom.guest_id_1 === guestId ? chatRoom.guest_id_2 : chatRoom.guest_id_1

              if (friendUserId) {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('username')
                  .eq('id', friendUserId)
                  .maybeSingle()

                if (profile) friendUsername = profile.username
              } else if (friendGuestId) {
                const { data: guestUser } = await supabase
                  .from('guest_users')
                  .select('username')
                  .eq('id', friendGuestId)
                  .maybeSingle()

                if (guestUser) friendUsername = guestUser.username
              }
            }

            return {
              friendship_id: friendship.id,
              friend_username: friendUsername,
              friend_chat_room_id: friendship.friend_chat_room_id,
              unfriended_at: friendship.unfriended_at,
              status: friendship.status
            }
          })
        )

        setPreviousFriends(previousFriendsWithNames)
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

    // Subscribe to chat_rooms to detect when active chat closes
    const chatRoomsChannel = supabase
      .channel('sidebar_chat_rooms')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_rooms'
        },
        (payload) => {
          console.log('🔴 Chat room update:', payload)
          loadFriendsAndRequests()
        }
      )
      .subscribe()

    return () => {
      friendshipsChannel.unsubscribe()
      chatRoomsChannel.unsubscribe()
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
      {activeChatRoom && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <MessageCircle className={`h-4 w-4 ${activeChatRoom.is_active ? 'text-green-500' : 'text-red-500'}`} />
            Active Chat Room
          </h4>
          <div
            onClick={() => router.push(`/chat/${activeChatRoom.id}`)}
            className={`bg-gradient-to-r ${activeChatRoom.is_active ? 'from-green-50 to-emerald-50 border-green-300 hover:border-green-400' : 'from-red-50 to-rose-50 border-red-300 hover:border-red-400'} border-2 rounded-lg p-4 cursor-pointer transition-all shadow-sm`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 bg-gradient-to-br ${activeChatRoom.is_active ? 'from-green-500 to-emerald-500 animate-pulse' : 'from-red-500 to-rose-500'} rounded-full flex items-center justify-center`}>
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{activeChatRoom.partner_username || 'Anonymous User'}</p>
                <p className="text-xs text-slate-600">{activeChatRoom.is_active ? 'Click to continue chatting' : 'Chat ended'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    <div className="w-8 h-8 bg-gradient-to-br from-slate-400 to-slate-500 rounded-full flex items-center justify-center">
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
