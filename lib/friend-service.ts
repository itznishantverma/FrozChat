import { supabase } from './supabase'

export interface FriendRequest {
  request_id: string
  requester_user_id?: string
  requester_guest_id?: string
  requester_username: string
  requester_avatar_url?: string
  requester_gender?: string
  requester_age?: number
  requester_country?: string
  message?: string
  chat_room_id?: string
  created_at: string
}

export interface Friend {
  friendship_id: string
  friend_user_id?: string
  friend_guest_id?: string
  friend_username: string
  friend_avatar_url?: string
  friend_gender?: string
  friend_age?: number
  friend_country?: string
  chat_room_id?: string
  last_message_at?: string
  created_at: string
}

export class FriendService {
  static async sendFriendRequest(
    requesterUserId?: string,
    requesterGuestId?: string,
    recipientUserId?: string,
    recipientGuestId?: string,
    message?: string,
    chatRoomId?: string
  ): Promise<{ success: boolean; error?: string; request_id?: string }> {
    try {
      const { data, error } = await supabase.rpc('send_friend_request', {
        p_requester_user_id: requesterUserId || null,
        p_requester_guest_id: requesterGuestId || null,
        p_recipient_user_id: recipientUserId || null,
        p_recipient_guest_id: recipientGuestId || null,
        p_message: message || null,
        p_chat_room_id: chatRoomId || null
      })

      if (error) {
        console.error('Error sending friend request:', error)
        return { success: false, error: error.message }
      }

      if (data && data.error) {
        return { success: false, error: data.error }
      }

      return {
        success: true,
        request_id: data?.request_id
      }
    } catch (err) {
      console.error('Exception in sendFriendRequest:', err)
      return { success: false, error: 'Failed to send friend request' }
    }
  }

  static async respondToFriendRequest(
    requestId: string,
    response: 'accepted' | 'rejected',
    responderUserId?: string,
    responderGuestId?: string
  ): Promise<{ success: boolean; error?: string; friendship_id?: string; chat_room_id?: string }> {
    try {
      const { data, error } = await supabase.rpc('respond_to_friend_request', {
        p_request_id: requestId,
        p_response: response,
        p_responder_user_id: responderUserId || null,
        p_responder_guest_id: responderGuestId || null
      })

      if (error) {
        console.error('Error responding to friend request:', error)
        return { success: false, error: error.message }
      }

      if (data && data.error) {
        return { success: false, error: data.error }
      }

      return {
        success: true,
        friendship_id: data?.friendship_id,
        chat_room_id: data?.chat_room_id
      }
    } catch (err) {
      console.error('Exception in respondToFriendRequest:', err)
      return { success: false, error: 'Failed to respond to friend request' }
    }
  }

  static async getUserFriends(
    userId?: string,
    guestId?: string
  ): Promise<Friend[]> {
    try {
      const { data, error } = await supabase.rpc('get_user_friends', {
        p_user_id: userId || null,
        p_guest_id: guestId || null
      })

      if (error) {
        console.error('Error getting user friends:', error)
        return []
      }

      return data || []
    } catch (err) {
      console.error('Exception in getUserFriends:', err)
      return []
    }
  }

  static async getPendingFriendRequests(
    userId?: string,
    guestId?: string
  ): Promise<FriendRequest[]> {
    try {
      const { data, error } = await supabase.rpc('get_pending_friend_requests', {
        p_user_id: userId || null,
        p_guest_id: guestId || null
      })

      if (error) {
        console.error('Error getting pending friend requests:', error)
        return []
      }

      return data || []
    } catch (err) {
      console.error('Exception in getPendingFriendRequests:', err)
      return []
    }
  }

  static async checkFriendshipExists(
    user1Id?: string,
    guest1Id?: string,
    user2Id?: string,
    guest2Id?: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('check_friendship_exists', {
        p_user1_id: user1Id || null,
        p_guest1_id: guest1Id || null,
        p_user2_id: user2Id || null,
        p_guest2_id: guest2Id || null
      })

      if (error) {
        console.error('Error checking friendship:', error)
        return false
      }

      return data || false
    } catch (err) {
      console.error('Exception in checkFriendshipExists:', err)
      return false
    }
  }

  static subscribeToPendingRequests(
    userId?: string,
    guestId?: string,
    onNewRequest?: (request: any) => void
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
            filter: `recipient_user_id=eq.${userId}`
          },
          (payload) => {
            if (onNewRequest) {
              onNewRequest(payload.new)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'friend_requests',
            filter: `recipient_user_id=eq.${userId}`
          },
          (payload) => {
            if (onNewRequest) {
              onNewRequest(payload.new)
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
            filter: `recipient_guest_id=eq.${guestId}`
          },
          (payload) => {
            if (onNewRequest) {
              onNewRequest(payload.new)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'friend_requests',
            filter: `recipient_guest_id=eq.${guestId}`
          },
          (payload) => {
            if (onNewRequest) {
              onNewRequest(payload.new)
            }
          }
        )
    }

    channel.subscribe()
    return channel
  }

  static subscribeToFriendships(
    userId?: string,
    guestId?: string,
    onNewFriend?: (friendship: any) => void
  ) {
    const channel = supabase.channel(`friendships-${userId || guestId}`)

    if (userId) {
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'friendships',
            filter: `user1_id=eq.${userId}`
          },
          (payload) => {
            if (onNewFriend) {
              onNewFriend(payload.new)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'friendships',
            filter: `user2_id=eq.${userId}`
          },
          (payload) => {
            if (onNewFriend) {
              onNewFriend(payload.new)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'friendships',
            filter: `user1_id=eq.${userId}`
          },
          (payload) => {
            if (onNewFriend) {
              onNewFriend(payload.new)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'friendships',
            filter: `user2_id=eq.${userId}`
          },
          (payload) => {
            if (onNewFriend) {
              onNewFriend(payload.new)
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
            table: 'friendships',
            filter: `guest1_id=eq.${guestId}`
          },
          (payload) => {
            if (onNewFriend) {
              onNewFriend(payload.new)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'friendships',
            filter: `guest2_id=eq.${guestId}`
          },
          (payload) => {
            if (onNewFriend) {
              onNewFriend(payload.new)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'friendships',
            filter: `guest1_id=eq.${guestId}`
          },
          (payload) => {
            if (onNewFriend) {
              onNewFriend(payload.new)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'friendships',
            filter: `guest2_id=eq.${guestId}`
          },
          (payload) => {
            if (onNewFriend) {
              onNewFriend(payload.new)
            }
          }
        )
    }

    channel.subscribe()
    return channel
  }

  static async unfriendUser(
    friendshipId: string,
    unfrienderUserId?: string,
    unfrienderGuestId?: string
  ): Promise<{ success: boolean; error?: string; chat_room_id?: string }> {
    try {
      const { data, error } = await supabase.rpc('unfriend_user', {
        p_friendship_id: friendshipId,
        p_unfriender_user_id: unfrienderUserId || null,
        p_unfriender_guest_id: unfrienderGuestId || null
      })

      if (error) {
        console.error('Error unfriending user:', error)
        return { success: false, error: error.message }
      }

      if (data && data.error) {
        return { success: false, error: data.error }
      }

      return {
        success: true,
        chat_room_id: data?.chat_room_id
      }
    } catch (err) {
      console.error('Exception in unfriendUser:', err)
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

      if (data && data.error) {
        return { success: false, error: data.error }
      }

      return { success: true }
    } catch (err) {
      console.error('Exception in blockUser:', err)
      return { success: false, error: 'Failed to block user' }
    }
  }

  static async reportUser(
    reporterUserId?: string,
    reporterGuestId?: string,
    reportedUserId?: string,
    reportedGuestId?: string,
    category: 'harassment' | 'spam' | 'inappropriate' | 'other' = 'other',
    reason?: string,
    chatRoomId?: string
  ): Promise<{ success: boolean; error?: string; report_id?: string }> {
    try {
      const { data, error } = await supabase.rpc('report_user', {
        p_reporter_user_id: reporterUserId || null,
        p_reporter_guest_id: reporterGuestId || null,
        p_reported_user_id: reportedUserId || null,
        p_reported_guest_id: reportedGuestId || null,
        p_category: category,
        p_reason: reason || null,
        p_chat_room_id: chatRoomId || null
      })

      if (error) {
        console.error('Error reporting user:', error)
        return { success: false, error: error.message }
      }

      if (data && data.error) {
        return { success: false, error: data.error }
      }

      return {
        success: true,
        report_id: data?.report_id
      }
    } catch (err) {
      console.error('Exception in reportUser:', err)
      return { success: false, error: 'Failed to report user' }
    }
  }

  static async checkIfBlocked(
    user1Id?: string,
    guest1Id?: string,
    user2Id?: string,
    guest2Id?: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('check_if_blocked', {
        p_user1_id: user1Id || null,
        p_guest1_id: guest1Id || null,
        p_user2_id: user2Id || null,
        p_guest2_id: guest2Id || null
      })

      if (error) {
        console.error('Error checking block status:', error)
        return false
      }

      return data || false
    } catch (err) {
      console.error('Exception in checkIfBlocked:', err)
      return false
    }
  }

  static async getFriendshipId(
    userId?: string,
    guestId?: string,
    partnerUserId?: string,
    partnerGuestId?: string
  ): Promise<string | null> {
    try {
      let query = supabase
        .from('friendships')
        .select('id')
        .eq('status', 'active')

      if (userId && partnerUserId) {
        query = query.or(`and(user1_id.eq.${userId},user2_id.eq.${partnerUserId}),and(user2_id.eq.${userId},user1_id.eq.${partnerUserId})`)
      } else if (userId && partnerGuestId) {
        query = query.or(`and(user1_id.eq.${userId},guest2_id.eq.${partnerGuestId}),and(user2_id.eq.${userId},guest1_id.eq.${partnerGuestId})`)
      } else if (guestId && partnerUserId) {
        query = query.or(`and(guest1_id.eq.${guestId},user2_id.eq.${partnerUserId}),and(guest2_id.eq.${guestId},user1_id.eq.${partnerUserId})`)
      } else if (guestId && partnerGuestId) {
        query = query.or(`and(guest1_id.eq.${guestId},guest2_id.eq.${partnerGuestId}),and(guest2_id.eq.${guestId},guest1_id.eq.${partnerGuestId})`)
      } else {
        return null
      }

      const { data, error } = await query.maybeSingle()

      if (error) {
        console.error('Error getting friendship ID:', error)
        return null
      }

      return data?.id || null
    } catch (err) {
      console.error('Exception in getFriendshipId:', err)
      return null
    }
  }
}
