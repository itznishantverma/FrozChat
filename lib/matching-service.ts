import { supabase } from './supabase'

export interface MatchFilters {
  gender?: string
  ageMin?: number
  ageMax?: number
  country?: string
  interestTags?: string[]
}

export interface MatchResult {
  type: 'authenticated' | 'guest'
  user: any
  match_id?: string
  chat_room_id?: string
}

export class MatchingService {
  static async enterQueue(
    userId?: string,
    guestUserId?: string,
    preferences?: MatchFilters,
    connectionIp?: string
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('enter_waiting_queue', {
        p_user_id: userId || null,
        p_guest_user_id: guestUserId || null,
        p_preferences: preferences || {},
        p_connection_ip: connectionIp || null
      })

      if (error) {
        console.error('Error entering queue:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in enterQueue:', error)
      return null
    }
  }

  static async findMatch(
    userId?: string,
    guestUserId?: string
  ): Promise<MatchResult | null> {
    try {
      const { data, error } = await supabase.rpc('find_and_match_users', {
        p_user_id: userId || null,
        p_guest_user_id: guestUserId || null
      })

      if (error) {
        console.error('Error finding match:', error)
        return null
      }

      if (!data) {
        return null
      }

      if (data.error) {
        console.error('Match error:', data.error)
        return null
      }

      return {
        type: data.type,
        user: data.user,
        match_id: data.match_id,
        chat_room_id: data.chat_room_id
      }
    } catch (error) {
      console.error('Error in findMatch:', error)
      return null
    }
  }

  static async checkForMatch(
    userId?: string,
    guestUserId?: string
  ): Promise<MatchResult | null> {
    try {
      const { data, error } = await supabase.rpc('check_for_match', {
        p_user_id: userId || null,
        p_guest_user_id: guestUserId || null
      })

      if (error) {
        console.error('Error checking for match:', error)
        return null
      }

      if (!data) {
        return null
      }

      return {
        type: data.type,
        user: data.user,
        match_id: data.match_id,
        chat_room_id: data.chat_room_id
      }
    } catch (error) {
      console.error('Error in checkForMatch:', error)
      return null
    }
  }

  static async updateMatchRoom(
    matchId: string,
    roomId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('update_match_room', {
        p_match_id: matchId,
        p_room_id: roomId
      })

      if (error) {
        console.error('Error updating match room:', error)
        return false
      }

      return data || false
    } catch (error) {
      console.error('Error in updateMatchRoom:', error)
      return false
    }
  }

  static async leaveQueue(
    userId?: string,
    guestUserId?: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('leave_waiting_queue', {
        p_user_id: userId || null,
        p_guest_user_id: guestUserId || null
      })

      if (error) {
        console.error('Error leaving queue:', error)
        return false
      }

      return data || false
    } catch (error) {
      console.error('Error in leaveQueue:', error)
      return false
    }
  }

  static async checkQueuePosition(
    userId?: string,
    guestUserId?: string
  ): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('check_queue_position', {
        p_user_id: userId || null,
        p_guest_user_id: guestUserId || null
      })

      if (error) {
        console.error('Error checking queue position:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in checkQueuePosition:', error)
      return null
    }
  }

  static async updateSearchStatus(
    userId?: string,
    guestUserId?: string,
    isSearching: boolean = false
  ): Promise<void> {
    try {
      if (userId) {
        await supabase
          .from('profiles')
          .update({ is_searching: isSearching })
          .eq('id', userId)
      } else if (guestUserId) {
        await supabase
          .from('guest_users')
          .update({ is_searching: isSearching })
          .eq('id', guestUserId)
      }
    } catch (error) {
      console.error('Error updating search status:', error)
    }
  }

  static async saveFiltersToProfile(
    userId?: string,
    guestUserId?: string,
    filters?: MatchFilters
  ): Promise<void> {
    try {
      const updateData = {
        looking_for_gender: filters?.gender || null,
        looking_for_age_min: filters?.ageMin || null,
        looking_for_age_max: filters?.ageMax || null,
        looking_for_country: filters?.country || null,
        looking_for_tags: filters?.interestTags || []
      }

      if (userId) {
        await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', userId)
      } else if (guestUserId) {
        await supabase
          .from('guest_users')
          .update(updateData)
          .eq('id', guestUserId)
      }
    } catch (error) {
      console.error('Error saving filters:', error)
    }
  }

  static async getSavedFilters(
    userId?: string,
    guestUserId?: string
  ): Promise<MatchFilters | null> {
    try {
      if (userId) {
        const { data, error } = await supabase
          .from('profiles')
          .select('looking_for_gender, looking_for_age_min, looking_for_age_max, looking_for_country, looking_for_tags')
          .eq('id', userId)
          .maybeSingle()

        if (error || !data) return null

        return {
          gender: data.looking_for_gender || undefined,
          ageMin: data.looking_for_age_min || undefined,
          ageMax: data.looking_for_age_max || undefined,
          country: data.looking_for_country || undefined,
          interestTags: data.looking_for_tags || []
        }
      } else if (guestUserId) {
        const { data, error } = await supabase
          .from('guest_users')
          .select('looking_for_gender, looking_for_age_min, looking_for_age_max, looking_for_country, looking_for_tags')
          .eq('id', guestUserId)
          .maybeSingle()

        if (error || !data) return null

        return {
          gender: data.looking_for_gender || undefined,
          ageMin: data.looking_for_age_min || undefined,
          ageMax: data.looking_for_age_max || undefined,
          country: data.looking_for_country || undefined,
          interestTags: data.looking_for_tags || []
        }
      }

      return null
    } catch (error) {
      console.error('Error getting saved filters:', error)
      return null
    }
  }

  static async createChatRoom(
    user1Id?: string,
    guest1Id?: string,
    user2Id?: string,
    guest2Id?: string
  ): Promise<string | null> {
    try {
      const roomName = `Chat ${Date.now()}`

      const createdBy = user1Id || user2Id || null

      const { data, error } = await supabase
        .from('chat_rooms')
        .insert([{
          name: roomName,
          room_type: 'anonymous',
          is_active: true,
          max_participants: 2,
          created_by: createdBy,
          user_id_1: user1Id || null,
          user_id_2: user2Id || null,
          guest_id_1: guest1Id || null,
          guest_id_2: guest2Id || null
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating chat room:', error)
        return null
      }

      return data.id
    } catch (error) {
      console.error('Error in createChatRoom:', error)
      return null
    }
  }

  static async getActiveMatch(
    userId?: string,
    guestUserId?: string
  ): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('get_active_match', {
        p_user_id: userId || null,
        p_guest_user_id: guestUserId || null
      })

      if (error) {
        console.error('Error getting active match:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in getActiveMatch:', error)
      return null
    }
  }

  static async closeChatRoom(
    roomId: string,
    userId?: string,
    guestUserId?: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('close_chat_room', {
        p_room_id: roomId,
        p_closed_by_user_id: userId || null,
        p_closed_by_guest_id: guestUserId || null
      })

      if (error) {
        console.error('Error closing chat room:', error)
        return false
      }

      return data || false
    } catch (error) {
      console.error('Error in closeChatRoom:', error)
      return false
    }
  }

  static subscribeToMatches(
    userId?: string,
    guestUserId?: string,
    onMatch?: (match: any) => void
  ) {
    const channel = supabase.channel(`matches-${userId || guestUserId}`)

    if (userId) {
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'matches',
            filter: `user1_id=eq.${userId}`
          },
          (payload) => {
            if (onMatch) {
              onMatch(payload.new)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'matches',
            filter: `user2_id=eq.${userId}`
          },
          (payload) => {
            if (onMatch) {
              onMatch(payload.new)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'matches',
            filter: `user1_id=eq.${userId}`
          },
          (payload) => {
            if (onMatch) {
              onMatch(payload.new)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'matches',
            filter: `user2_id=eq.${userId}`
          },
          (payload) => {
            if (onMatch) {
              onMatch(payload.new)
            }
          }
        )
    } else if (guestUserId) {
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'matches',
            filter: `guest1_id=eq.${guestUserId}`
          },
          (payload) => {
            if (onMatch) {
              onMatch(payload.new)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'matches',
            filter: `guest2_id=eq.${guestUserId}`
          },
          (payload) => {
            if (onMatch) {
              onMatch(payload.new)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'matches',
            filter: `guest1_id=eq.${guestUserId}`
          },
          (payload) => {
            if (onMatch) {
              onMatch(payload.new)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'matches',
            filter: `guest2_id=eq.${guestUserId}`
          },
          (payload) => {
            if (onMatch) {
              onMatch(payload.new)
            }
          }
        )
    }

    channel.subscribe()

    return channel
  }
}
