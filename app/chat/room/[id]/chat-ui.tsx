"use client";

import { useState, useEffect, useRef } from 'react';
import { sendMessage } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Clock, MessageCircle, Snowflake, Search } from 'lucide-react';
import { getChatMessages, checkChatRoomStatus } from '@/lib/auth';
import { getAvatarFromName, generateGuestName } from '@/lib/utils';
import { useRouter } from 'next/navigation';

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

interface UserData {
  id: string;
  type: 'permanent' | 'guest';
  email?: string;
  session_id?: string;
  gender?: string;
  age?: string;
  country?: string;
}

interface ChatUIProps {
  chatId: string;
  userData: UserData | null;
  initialMessages: Message[];
  otherUserName: string;
}

export function ChatUI({ chatId, userData, initialMessages, otherUserName }: ChatUIProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isChatEnded, setIsChatEnded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageCountRef = useRef(initialMessages.length);
  const router = useRouter();
  const [userDisplayName] = useState(() => {
    if (userData?.type === 'permanent' && userData.email) {
      return userData.email.split('@')[0];
    }
    return generateGuestName();
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-focus message input on mount and after sending messages
  useEffect(() => {
    if (!isChatEnded && messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [isChatEnded, messages.length]);

  // Update messages when initialMessages change
  useEffect(() => {
    setMessages(initialMessages);
    lastMessageCountRef.current = initialMessages.length;
  }, [initialMessages]);

  // Polling mechanism for real-time updates
  useEffect(() => {
    if (!chatId) return;

    const pollMessages = async () => {
      try {
        // Check chat room status first
        const { data: statusData } = await checkChatRoomStatus(chatId);
        if (statusData?.status === 'ended') {
          setIsChatEnded(true);
          return;
        }

        const { data: latestMessages, error } = await getChatMessages(chatId);
        
        if (latestMessages && !error) {
          // Only update if we have new messages
          if (latestMessages.length > lastMessageCountRef.current) {
            console.log(`New messages detected: ${latestMessages.length - lastMessageCountRef.current} new messages`);
            setMessages(latestMessages);
            lastMessageCountRef.current = latestMessages.length;
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Start polling immediately
    pollMessages();
    
    // Poll every 1000ms (1 second) for real-time feel
    pollingIntervalRef.current = setInterval(pollMessages, 1000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [chatId]);

  // Real-time message subscription
  useEffect(() => {
    if (!chatId) return;

    console.log('Setting up real-time subscription for chat room:', chatId);

    const channel = supabase
      .channel(`messages-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${chatId}`,
        },
        (payload) => {
          console.log('New message received via realtime:', payload.new);
          const newMessage = payload.new as Message;
          
          setMessages(prev => {
            // Check if message already exists to prevent duplicates
            const exists = prev.some(msg => msg.id === newMessage.id);
            if (exists) {
              console.log('Message already exists, skipping duplicate');
              return prev;
            }
            console.log('Adding new message to state');
            const updated = [...prev, newMessage];
            lastMessageCountRef.current = updated.length;
            return updated;
          });
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userData || isSending) return;

    setIsSending(true);
    const messageText = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX
    
    console.log('Sending message:', messageText);
    const { data, error } = await sendMessage(
      chatId,
      userData.id,
      userData.type,
      messageText
    );

    if (error) {
      console.error('Failed to send message:', error);
      
      // Check if chat has ended
      if (error.toString().includes('Chat room has been ended')) {
        setIsChatEnded(true);
      } else {
        alert('Failed to send message. Please try again.');
      }
      setNewMessage(messageText); // Restore message on error
    } else {
      console.log('Message sent successfully:', data);
      // Force a quick poll to get the new message immediately
      setTimeout(async () => {
        const { data: latestMessages } = await getChatMessages(chatId);
        if (latestMessages) {
          setMessages(latestMessages);
          lastMessageCountRef.current = latestMessages.length;
        }
      }, 200);
    }
    
    setIsSending(false);
  };

  const handleFindNewChat = () => {
    router.push('/chat/new');
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.sender_id === userData?.id;
            
            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className="w-8 h-8 bg-[#3bb7ff] rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                    {isOwnMessage ? getAvatarFromName(userDisplayName) : getAvatarFromName(otherUserName)}
                  </div>
                  
                  {/* Message Bubble */}
                  <div
                    className={`px-4 py-2 rounded-2xl ${
                      isOwnMessage
                        ? 'bg-[#3bb7ff] text-white rounded-br-sm'
                        : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
                    }`}
                  >
                    <p className="text-sm">{message.message}</p>
                    <div className={`flex items-center justify-end mt-1 space-x-1 ${
                    isOwnMessage ? 'text-blue-100' : 'text-gray-400'
                  }`}>
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">{formatTime(message.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input or Find New Chat Button */}
      {isChatEnded ? (
        <div className="border-t border-gray-200 bg-white/95 backdrop-blur-md p-4">
          <div className="text-center">
            <p className="text-gray-500 mb-4">This chat has ended</p>
            <Button
              onClick={handleFindNewChat}
              className="bg-[#3bb7ff] hover:bg-[#2da5e8] text-white rounded-full px-6"
            >
              <Search className="h-4 w-4 mr-2" />
              Find New Chat
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-t border-gray-200 bg-white/95 backdrop-blur-md p-4">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
            <div className="flex-1">
              <Input
                ref={messageInputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="border-gray-200 focus:border-[#3bb7ff] rounded-full"
                disabled={isSending}
              />
            </div>
            <Button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              className="bg-[#3bb7ff] hover:bg-[#2da5e8] text-white rounded-full px-6"
            >
              {isSending ? (
                <Snowflake className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}