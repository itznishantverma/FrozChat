import { supabase } from './supabase'

export interface FriendRequest {
  id: string
  sender_user_id?: string
  sender_guest_id?: string
  receiver_user_id?: string
  receiver_guest_id?: string
  chat_room_id: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  responded_at?: string
}

export interface Friend {
  friendship_id: string
  friend_user_id?: string
  friend_guest_id?: string
  friend_username: string
  friend_chat_room_id?: string
  status: string
  created_at: string
  accepted_at?: string
}

export class FriendService {
  static async sendFriendRequest(
    fromUserId?: string,
    fromGuestId?: string,
    toUserId?: string,
    toGuestId?: string,
    chatRoomId?: string
  ): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('send_friend_request_v2', {
        p_sender_user_id: fromUserId || null,
        p_sender_guest_id: fromGuestId || null,
        p_receiver_user_id: toUserId || null,
        p_receiver_guest_id: toGuestId || null,
        p_chat_room_id: chatRoomId || null
      })

      if (error) {
        console.error('Error sending friend request:', error)
        return { success: false, error: error.message }
      }

      if (data.success) {
        return { success: true, requestId: data.request_id }
      }

      return { success: false, error: data.error }
    } catch (error) {
      console.error('Error in sendFriendRequest:', error)
      return { success: false, error: 'Failed to send friend request' }
    }
  }

  static async acceptFriendRequest(
    requestId: string,
    userId?: string,
    guestId?: string
  ): Promise<{ success: boolean; chatRoomId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('accept_friend_request_v2', {
        p_request_id: requestId,
        p_receiver_user_id: userId || null,
        p_receiver_guest_id: guestId || null
      })

      if (error) {
        console.error('Error accepting friend request:', error)
        return { success: false, error: error.message }
      }

      if (data.success) {
        return { success: true, chatRoomId: data.chat_room_id }
      }

      return { success: false, error: data.error }
    } catch (error) {
      console.error('Error in acceptFriendRequest:', error)
      return { success: false, error: 'Failed to accept friend request' }
    }
  }

  static async rejectFriendRequest(
    requestId: string,
    userId?: string,
    guestId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('reject_friend_request_v2', {
        p_request_id: requestId,
        p_receiver_user_id: userId || null,
        p_receiver_guest_id: guestId || null
      })

      if (error) {
        console.error('Error rejecting friend request:', error)
        return { success: false, error: error.message }
      }

      if (data.success) {
        return { success: true }
      }

      return { success: false, error: data.error }
    } catch (error) {
      console.error('Error in rejectFriendRequest:', error)
      return { success: false, error: 'Failed to reject friend request' }
    }
  }

  static async unfriendUser(
    friendshipId: string,
    userId?: string,
    guestId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('unfriend_user', {
        p_friendship_id: friendshipId,
        p_user_id: userId || null,
        p_guest_id: guestId || null
      })

      if (error) {
        console.error('Error unfriending user:', error)
        return { success: false, error: error.message }
      }

      if (data.success) {
        return { success: true }
      }

      return { success: false, error: data.error }
    } catch (error) {
      console.error('Error in unfriendUser:', error)
      return { success: false, error: 'Failed to unfriend user' }
    }
  }

  static async blockUser(
    blockerUserId?: string,
    blockerGuestId?: string,
    blockedUserId?: string,
    blockedGuestId?: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('block_user', {
        p_blocker_user_id: blockerUserId || null,
        p_blocker_guest_id: blockerGuestId || null,
        p_blocked_user_id: blockedUserId || null,
        p_blocked_guest_id: blockedGuestId || null,
        p_reason: reason || null
      })

      if (error) {
        console.error('Error blocking user:', error)
        return { success: false, error: error.message }
      }

      if (data.success) {
        return { success: true }
      }

      return { success: false, error: data.error }
    } catch (error) {
      console.error('Error in blockUser:', error)
      return { success: false, error: 'Failed to block user' }
    }
  }

  static async reportUser(
    reporterUserId?: string,
    reporterGuestId?: string,
    reportedUserId?: string,
    reportedGuestId?: string,
    chatRoomId?: string,
    reason: string = 'other',
    description?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('report_user', {
        p_reporter_user_id: reporterUserId || null,
        p_reporter_guest_id: reporterGuestId || null,
        p_reported_user_id: reportedUserId || null,
        p_reported_guest_id: reportedGuestId || null,
        p_chat_room_id: chatRoomId || null,
        p_reason: reason,
        p_description: description || null
      })

      if (error) {
        console.error('Error reporting user:', error)
        return { success: false, error: error.message }
      }

      if (data.success) {
        return { success: true }
      }

      return { success: false, error: data.error }
    } catch (error) {
      console.error('Error in reportUser:', error)
      return { success: false, error: 'Failed to report user' }
    }
  }

  static async getFriends(
    userId?: string,
    guestId?: string
  ): Promise<Friend[]> {
    try {
      const { data, error } = await supabase.rpc('get_friends', {
        p_user_id: userId || null,
        p_guest_id: guestId || null
      })

      if (error) {
        console.error('Error getting friends:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getFriends:', error)
      return []
    }
  }

  static async getPendingFriendRequests(
    userId?: string,
    guestId?: string
  ): Promise<FriendRequest[]> {
    try {
      console.log('🔍 FriendService.getPendingFriendRequests:', { userId, guestId })

      let query = supabase
        .from('friend_requests')
        .select('*')
        .eq('status', 'pending')

      if (userId) {
        query = query.eq('receiver_user_id', userId)
      } else if (guestId) {
        query = query.eq('receiver_guest_id', guestId)
      } else {
        console.warn('⚠️ No userId or guestId provided')
        return []
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error getting pending friend requests:', error)
        return []
      }

      console.log('✅ getPendingFriendRequests result:', { count: data?.length, data })
      return data || []
    } catch (error) {
      console.error('❌ Exception in getPendingFriendRequests:', error)
      return []
    }
  }

  static async getPendingFriendRequestsCount(
    userId?: string,
    guestId?: string
  ): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_pending_friend_requests_count', {
        p_user_id: userId || null,
        p_guest_id: guestId || null
      })

      if (error) {
        console.error('Error getting pending friend requests count:', error)
        return 0
      }

      return data || 0
    } catch (error) {
      console.error('Error in getPendingFriendRequestsCount:', error)
      return 0
    }
  }

  static async getSentFriendRequests(
    userId?: string,
    guestId?: string
  ): Promise<FriendRequest[]> {
    try {
      const { data, error} = await supabase
        .from('friend_requests')
        .select('*')
        .eq('status', 'pending')
        .or(
          userId
            ? `sender_user_id.eq.${userId}`
            : `sender_guest_id.eq.${guestId}`
        )

      if (error) {
        console.error('Error getting sent friend requests:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getSentFriendRequests:', error)
      return []
    }
  }

  static async checkFriendshipStatus(
    user1Id?: string,
    guest1Id?: string,
    user2Id?: string,
    guest2Id?: string
  ): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('check_friend_request_status', {
        p_user_id_1: user1Id || null,
        p_guest_id_1: guest1Id || null,
        p_user_id_2: user2Id || null,
        p_guest_id_2: guest2Id || null
      })

      if (error) {
        console.error('Error checking friendship status:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in checkFriendshipStatus:', error)
      return null
    }
  }

  static subscribeToFriendRequests(
    userId?: string,
    guestId?: string,
    onRequest?: (request: FriendRequest) => void
  ) {
    const channel = supabase.channel(`friend-requests-${userId || guestId}`)

    if (userId) {
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'friend_requests',
            filter: `receiver_user_id=eq.${userId}`
          },
          (payload) => {
            if (onRequest) {
              onRequest(payload.new as FriendRequest)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'friend_requests',
            filter: `sender_user_id=eq.${userId}`
          },
          (payload) => {
            if (onRequest) {
              onRequest(payload.new as FriendRequest)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'friend_requests',
            filter: `receiver_user_id=eq.${userId}`
          },
          (payload) => {
            if (onRequest) {
              onRequest(payload.new as FriendRequest)
            }
          }
        )
    } else if (guestId) {
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'friend_requests',
            filter: `receiver_guest_id=eq.${guestId}`
          },
          (payload) => {
            if (onRequest) {
              onRequest(payload.new as FriendRequest)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'friend_requests',
            filter: `sender_guest_id=eq.${guestId}`
          },
          (payload) => {
            if (onRequest) {
              onRequest(payload.new as FriendRequest)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'friend_requests',
            filter: `receiver_guest_id=eq.${guestId}`
          },
          (payload) => {
            if (onRequest) {
              onRequest(payload.new as FriendRequest)
            }
          }
        )
    }

    channel.subscribe()

    return channel
  }
}
