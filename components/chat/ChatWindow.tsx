'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Snowflake, User, CircleAlert as AlertCircle } from 'lucide-react'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Message {
  id: string
  content: string
  sender_id?: string
  guest_sender_id?: string
  created_at: string
  senderUsername?: string
}

interface ChatWindowProps {
  roomId: string
  currentUser: any
  partnerUser: any
}

export default function ChatWindow({ roomId, currentUser, partnerUser }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadMessages()

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('New message received:', payload)
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      console.log('Unsubscribing from channel')
      supabase.removeChannel(channel)
    }
  }, [roomId])

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_room_id', roomId)
        .order('created_at', { ascending: true })

      if (error) throw error

      setMessages(data || [])
    } catch (err) {
      console.error('Error loading messages:', err)
      setError('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (content: string) => {
    try {
      const messageData: any = {
        chat_room_id: roomId,
        content,
        message_type: 'text'
      }

      if (currentUser.type === 'authenticated') {
        messageData.sender_id = currentUser.id
      } else {
        messageData.guest_sender_id = currentUser.id
      }

      const { error } = await supabase
        .from('messages')
        .insert([messageData])

      if (error) throw error
    } catch (err) {
      console.error('Error sending message:', err)
      throw err
    }
  }

  const handleLeaveChat = () => {
    router.push('/chat/new')
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 via-blue-50 to-slate-100">
        <Snowflake className="h-16 w-16 text-cyan-600 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 via-blue-50 to-slate-100 p-4">
        <Card className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Error</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <Button onClick={handleLeaveChat}>Return to Home</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-cyan-50 via-blue-50 to-slate-100 flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-200 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={handleLeaveChat}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Leave Chat
          </Button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">
                {partnerUser?.username || 'Anonymous User'}
              </h2>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-slate-600">Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <MessageList
          messages={messages}
          currentUserId={currentUser.type === 'authenticated' ? currentUser.id : undefined}
          currentGuestId={currentUser.type === 'anonymous' ? currentUser.id : undefined}
        />
        <MessageInput onSendMessage={handleSendMessage} />
      </div>
    </div>
  )
}
