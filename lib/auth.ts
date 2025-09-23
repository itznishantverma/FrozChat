import { supabase } from './supabase';
import bcrypt from 'bcryptjs';

// Generate session ID
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get client IP and details
export async function getClientIPDetails(ip?: string): Promise<any> {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return {
      ip: data.ip,
      country: data.country_name,
      region: data.region,
      city: data.city,
      isp: data.org,
      timezone: data.timezone,
      latitude: data.latitude,
      longitude: data.longitude,
    };
  } catch (error) {
    console.error('Failed to fetch IP details:', error);
    return {
      ip: ip || 'unknown',
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
      isp: 'Unknown',
      timezone: 'Unknown',
    };
  }
}

// Create or get guest user
export async function createOrGetGuestUser(
  sessionId: string,
  userData?: {
    gender: string;
    age: number;
    country: string;
  }
) {
  try {
    // Check if guest user already exists
    const { data: existingUser } = await supabase
      .from('guest_users')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (existingUser) {
      return { data: existingUser, error: null };
    }

    // Create new guest user if userData provided
    if (userData) {
      const ipDetails = await getClientIPDetails();
      
      const { data, error } = await supabase
        .from('guest_users')
        .insert({
          session_id: sessionId,
          gender: userData.gender,
          age: userData.age,
          country: userData.country,
          ip_address: ipDetails.ip,
          ip_details: ipDetails,
        })
        .select()
        .single();

      return { data, error };
    }

    return { data: null, error: 'No user data provided' };
  } catch (error) {
    return { data: null, error };
  }
}

// Register permanent user
export async function registerPermanentUser(
  email: string,
  password: string,
  profileData: any = {}
) {
  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const { data, error } = await supabase
      .from('permanent_users')
      .insert({
        email,
        password_hash: hashedPassword,
        profile_data: profileData,
      })
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

// Login permanent user
export async function loginPermanentUser(email: string, password: string) {
  try {
    const { data: user, error } = await supabase
      .from('permanent_users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return { data: null, error: 'User not found' };
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return { data: null, error: 'Invalid password' };
    }

    return { data: user, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Join waiting room
export async function joinWaitingRoom(
  userId: string,
  userType: 'guest' | 'permanent',
  preferences: any = {}
) {
  try {
    // Remove any existing entry first
    await supabase
      .from('waiting_room')
      .delete()
      .eq('user_id', userId);

    // Add to waiting room
    const { data, error } = await supabase
      .from('waiting_room')
      .insert({
        user_id: userId,
        user_type: userType,
        preferences,
      })
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

// Check for matches and create chat room
export async function findMatch(userId: string) {
  try {
    // Call the matching function
    const { error } = await supabase.rpc('match_users_in_waiting_room');
    
    if (error) {
      return { data: null, error };
    }

    // Check if user has been matched (removed from waiting room)
    const { data: waitingUser } = await supabase
      .from('waiting_room')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!waitingUser) {
      // User was matched, find their chat room
      const { data: chatRoom } = await supabase
        .from('chat_rooms')
        .select('*')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return { data: chatRoom, error: null };
    }

    return { data: null, error: 'No match found yet' };
  } catch (error) {
    return { data: null, error };
  }
}

// End chat room
export async function endChatRoom(chatRoomId: string, userId: string) {
  try {
    const { error } = await supabase
      .from('chat_rooms')
      .update({ 
        status: 'ended', 
        ended_at: new Date().toISOString() 
      })
      .eq('id', chatRoomId)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    return { error };
  } catch (error) {
    return { error };
  }
}

// Check if chat room is still active
export async function checkChatRoomStatus(chatRoomId: string) {
  try {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('status')
      .eq('id', chatRoomId)
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

// Send message
export async function sendMessage(
  chatRoomId: string,
  senderId: string,
  senderType: 'guest' | 'permanent',
  message: string,
  messageType: 'text' | 'image' | 'file' = 'text'
) {
  try {
    // Check if chat room is still active before sending message
    const { data: roomStatus } = await checkChatRoomStatus(chatRoomId);
    
    if (roomStatus?.status === 'ended') {
      return { 
        data: null, 
        error: 'Chat room has been ended. You cannot send messages.' 
      };
    }
    
    const ipDetails = await getClientIPDetails();
    
    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_room_id: chatRoomId,
        sender_id: senderId,
        sender_type: senderType,
        message,
        message_type: messageType,
        ip_address: ipDetails.ip,
        ip_details: ipDetails,
      })
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

// Get messages for chat room
export async function getChatMessages(chatRoomId: string) {
  try {
    console.log('Fetching messages for chat room:', chatRoomId);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_room_id', chatRoomId)
      .order('created_at', { ascending: true });

    console.log('Messages fetched:', data?.length || 0, 'messages');
    if (error) console.error('Error fetching messages:', error);

    return { data, error };
  } catch (error) {
    console.error('Exception in getChatMessages:', error);
    return { data: null, error };
  }
}

// Claim guest account
export async function claimGuestAccount(
  guestUserId: string,
  permanentUserId: string
) {
  try {
    const { data, error } = await supabase
      .from('guest_users')
      .update({
        claimed_by: permanentUserId,
        can_claim: false,
      })
      .eq('id', guestUserId)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}