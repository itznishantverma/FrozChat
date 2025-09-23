"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getChatMessages, sendMessage } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { 
  Globe, 
  Phone,
  Video,
  Settings,
  Flag,
  Snowflake,
  Circle,
  Menu
} from 'lucide-react';
import { ChatUI } from './chat-ui';
import { ChatSidebar } from '@/components/chat-sidebar';
import { generateGuestName, getAvatarFromName } from '@/lib/utils';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface UserData {
  id: string;
  type: 'permanent' | 'guest';
  email?: string;
  session_id?: string;
  gender?: string;
  age?: string;
  country?: string;
}

interface Message {
  id: string;
  chat_room_id: string;
  sender_id: string;
  sender_type: 'guest' | 'permanent';
  message: string;
  message_type: 'text' | 'image' | 'file';
  ip_address: string;
  ip_details: any;
  created_at: string;
}

interface ChatRoom {
  id: string;
  user1_id: string;
  user1_type: 'guest' | 'permanent';
  user2_id: string;
  user2_type: 'guest' | 'permanent';
  status: 'active' | 'ended';
  created_at: string;
  ended_at?: string;
}

export default function ChatRoomPage() {
  const router = useRouter();
  const params = useParams();
  const chatId = params.id as string;
  
  const [userData, setUserData] = useState<UserData | null>(null);
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [otherUserDisplayName, setOtherUserDisplayName] = useState('Anonymous User');

  useEffect(() => {
    const initializeChatRoom = async () => {
      // Get user data from localStorage
      const userDataStr = localStorage.getItem("frozchat_user_data");
      if (!userDataStr) {
        router.push('/chat');
        return;
      }

      const user = JSON.parse(userDataStr);
      setUserData(user);

      // Fetch chat room details
      const { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('id', chatId)
        .eq('status', 'active')
        .single();

      if (roomError || !room) {
        console.error('Chat room not found:', roomError);
        router.push('/chat/new');
        return;
      }

      setChatRoom(room);

      // Determine other user
      const isUser1 = room.user1_id === user.id;
      const otherUserId = isUser1 ? room.user2_id : room.user1_id;
      const otherUserType = isUser1 ? room.user2_type : room.user1_type;

      // Fetch other user details
      const tableName = otherUserType === 'guest' ? 'guest_users' : 'permanent_users';
      const { data: otherUserData } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', otherUserId)
        .single();

      setOtherUser(otherUserData);

      // Generate display name for other user
      let displayName = 'Anonymous User';
      if (otherUserData) {
        if (otherUserData.email) {
          displayName = otherUserData.email.split('@')[0];
        } else {
          // Generate a random name for guest users
          displayName = generateGuestName();
        }
      }
      setOtherUserDisplayName(displayName);

      // Load initial messages with SSR
      const { data: messages, error: messagesError } = await getChatMessages(chatId);
      if (messages && !messagesError) {
        console.log('Initial messages loaded:', messages.length);
        setInitialMessages(messages);
      } else {
        console.error('Error loading initial messages:', messagesError);
        setInitialMessages([]);
      }

      setIsLoading(false);
    };

    if (chatId) {
      initializeChatRoom();
    }
  }, [chatId, router]);

  const handleEndChat = async () => {
    if (confirm('Are you sure you want to end this chat?')) {
      await supabase
        .from('chat_rooms')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', chatId);
      
      router.push('/chat/new');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#3bb7ff]/10 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Snowflake className="h-12 w-12 text-[#3bb7ff] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading chat room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3bb7ff]/10 via-white to-blue-50 flex relative">
      {/* Sidebar Component */}
      <ChatSidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        backUrl="/chat/new"
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col lg:ml-0">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen(true)}
              className="text-gray-600 hover:text-[#3bb7ff] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-[#3bb7ff] rounded-full flex items-center justify-center text-white font-semibold">
                  {getAvatarFromName(otherUserDisplayName)}
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
              </div>
              
              <div>
                <h1 className="text-lg font-semibold text-[#0a192f]">
                  {otherUserDisplayName}
                </h1>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                  <span>Online</span>
                  {otherUser?.country && (
                    <>
                      <span>•</span>
                      <Globe className="h-3 w-3" />
                      <span>{otherUser.country}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-[#3bb7ff]">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-[#3bb7ff]">
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-[#3bb7ff]">
              <Settings className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleEndChat}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              End Chat
            </Button>
          </div>
        </div>
      </header>

      {/* Chat UI Component */}
      <ChatUI 
        chatId={chatId}
        userData={userData}
        initialMessages={initialMessages}
        otherUserName={otherUserDisplayName}
      />

      {/* Safety Notice */}
      <div className="bg-amber-50 border-t border-amber-200 p-3">
        <div className="flex items-center justify-center space-x-2 text-amber-700">
          <Flag className="h-4 w-4" />
          <span className="text-sm">
            Keep conversations respectful. Report inappropriate behavior.
          </span>
        </div>
      </div>
      </div>
    </div>
  );
}