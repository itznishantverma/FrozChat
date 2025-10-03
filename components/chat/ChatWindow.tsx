'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Snowflake, User, CircleAlert as AlertCircle } from 'lucide-react'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import { supabase } from '@/lib/supabase'
import { MatchingService } from '@/lib/matching-service'
import { useRouter } from 'next/navigation'

interface Message {
  id: string
  content: string
  chat_room_id?: string
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
  const [roomClosed, setRoomClosed] = useState(false)
  const [closedByMe, setClosedByMe] = useState(false)
  const [searching, setSearching] = useState(false)
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)
  const [escPressCount, setEscPressCount] = useState(0)
  const router = useRouter()
  const roomChannelRef = useRef<any>(null)
  const matchCheckInterval = useRef<any>(null)
  const escTimeoutRef = useRef<any>(null)

  useEffect(() => {
    checkRoomStatus()
    loadMessages()
    setupRealtimeSubscription()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()

        if (roomClosed && searching) {
          return
        }

        if (roomClosed && !searching) {
          handleStartNewChat()
          return
        }

        if (!showSkipConfirm) {
          setShowSkipConfirm(true)

          if (escTimeoutRef.current) {
            clearTimeout(escTimeoutRef.current)
          }

          escTimeoutRef.current = setTimeout(() => {
            setShowSkipConfirm(false)
          }, 3000)
        } else {
          if (escTimeoutRef.current) {
            clearTimeout(escTimeoutRef.current)
          }
          setShowSkipConfirm(false)
          handleLeaveChat()
        }
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (showSkipConfirm && e.target instanceof Element) {
        const skipButton = document.querySelector('[data-skip-button]')
        if (skipButton && !skipButton.contains(e.target)) {
          setShowSkipConfirm(false)
          if (escTimeoutRef.current) {
            clearTimeout(escTimeoutRef.current)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('click', handleClickOutside)

    return () => {
      console.log('Cleaning up subscriptions')
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('click', handleClickOutside)
      if (roomChannelRef.current) {
        supabase.removeChannel(roomChannelRef.current)
      }
      if (matchCheckInterval.current) {
        clearInterval(matchCheckInterval.current)
      }
      if (escTimeoutRef.current) {
        clearTimeout(escTimeoutRef.current)
      }
    }
  }, [roomId, showSkipConfirm, roomClosed, searching])

  const checkRoomStatus = async () => {
    try {
      const { data: room, error } = await supabase
        .from('chat_rooms')
        .select('closed_at, closed_by')
        .eq('id', roomId)
        .maybeSingle()

      if (error) {
        console.error('Error checking room status:', error)
        return
      }

      if (room && room.closed_at) {
        console.log('Room is already closed:', room)
        setRoomClosed(true)

        const closedByIdentifier = room.closed_by || ''
        const currentUserIdentifier = currentUser.type === 'authenticated'
          ? `user:${currentUser.id}`
          : `guest:${currentUser.id}`

        setClosedByMe(closedByIdentifier === currentUserIdentifier)
      }
    } catch (err) {
      console.error('Error in checkRoomStatus:', err)
    }
  }

  const setupRealtimeSubscription = () => {
    if (roomChannelRef.current) {
      console.log('Removing existing channel before creating new one')
      supabase.removeChannel(roomChannelRef.current)
      roomChannelRef.current = null
    }

    console.log('Setting up realtime subscription for room:', roomId)

    const channel = supabase
      .channel(`room:${roomId}:${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('New message received via realtime:', payload)
          const newMessage = payload.new as Message
          setMessages((prev) => {
            const exists = prev.some(msg => msg.id === newMessage.id)
            if (exists) {
              console.log('Message already exists, skipping')
              return prev
            }
            console.log('Adding new message to list')
            return [...prev, newMessage]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_rooms',
          filter: `id=eq.${roomId}`
        },
        (payload) => {
          console.log('Room updated via realtime:', payload)
          const updatedRoom = payload.new as any
          if (updatedRoom && updatedRoom.closed_at) {
            console.log('Room closed via realtime update')
            setRoomClosed(true)

            const closedByIdentifier = updatedRoom.closed_by || ''
            const currentUserIdentifier = currentUser.type === 'authenticated'
              ? `user:${currentUser.id}`
              : `guest:${currentUser.id}`

            setClosedByMe(closedByIdentifier === currentUserIdentifier)
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to realtime updates')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Realtime subscription error')
        } else if (status === 'TIMED_OUT') {
          console.error('Realtime subscription timed out')
        }
      })

    roomChannelRef.current = channel
  }

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
    if (roomClosed) {
      throw new Error('Cannot send message to closed room')
    }

    const tempId = `temp-${Date.now()}`
    const optimisticMessage: Message = {
      id: tempId,
      content,
      chat_room_id: roomId,
      sender_id: currentUser.type === 'authenticated' ? currentUser.id : undefined,
      guest_sender_id: currentUser.type === 'anonymous' ? currentUser.id : undefined,
      created_at: new Date().toISOString(),
      senderUsername: currentUser.username
    }

    setMessages(prev => [...prev, optimisticMessage])

    try {
      const { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .select('closed_at, is_active')
        .eq('id', roomId)
        .maybeSingle()

      if (roomError) {
        console.error('Error checking room status:', roomError)
        setMessages(prev => prev.filter(msg => msg.id !== tempId))
        throw new Error('Failed to verify room status')
      }

      if (!room || room.closed_at || !room.is_active) {
        console.log('Room is closed, cannot send message')
        setRoomClosed(true)
        setMessages(prev => prev.filter(msg => msg.id !== tempId))
        throw new Error('This chat room has been closed')
      }

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

      const { data: insertedMessage, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single()

      if (error) {
        setMessages(prev => prev.filter(msg => msg.id !== tempId))
        if (error.message.includes('violates row-level security policy')) {
          setRoomClosed(true)
          throw new Error('This chat room has been closed')
        }
        throw error
      }

      setMessages(prev => prev.map(msg =>
        msg.id === tempId ? { ...insertedMessage } : msg
      ))
    } catch (err) {
      console.error('Error sending message:', err)
      throw err
    }
  }

  const handleLeaveChat = async () => {
    setClosedByMe(true)
    setRoomClosed(true)

    try {
      await MatchingService.closeChatRoom(
        roomId,
        currentUser.type === 'authenticated' ? currentUser.id : undefined,
        currentUser.type === 'anonymous' ? currentUser.id : undefined
      )
    } catch (err) {
      console.error('Error closing room:', err)
    }
  }

  const handleStartNewChat = async () => {
    setSearching(true)

    const userId = currentUser.type === 'authenticated' ? currentUser.id : undefined
    const guestUserId = currentUser.type === 'anonymous' ? currentUser.id : undefined
    let matchSubscription: any = null

    try {
      console.log('Starting new chat search...')

      matchSubscription = MatchingService.subscribeToMatches(
        userId,
        guestUserId,
        async (match) => {
          console.log('Match found via subscription:', match)
          if (match && match.id && match.chat_room_id) {
            if (matchCheckInterval.current) {
              clearInterval(matchCheckInterval.current)
            }
            if (matchSubscription) {
              matchSubscription.unsubscribe()
            }
            router.push(`/chat/${match.chat_room_id}`)
          }
        }
      )

      const queueId = await MatchingService.enterQueue(userId, guestUserId, {}, undefined)
      console.log('Entered queue:', queueId)

      if (!queueId) {
        throw new Error('Failed to enter queue')
      }

      const immediateMatch = await MatchingService.findMatch(userId, guestUserId)
      console.log('Immediate match result:', immediateMatch)

      if (immediateMatch) {
        if (matchSubscription) {
          matchSubscription.unsubscribe()
        }

        let roomId: string | null | undefined = immediateMatch.chat_room_id

        if (!roomId) {
          roomId = await MatchingService.createChatRoom(
            userId,
            guestUserId,
            immediateMatch.type === 'authenticated' ? immediateMatch.user.id : undefined,
            immediateMatch.type === 'guest' ? immediateMatch.user.id : undefined
          )

          if (roomId && immediateMatch.match_id) {
            await MatchingService.updateMatchRoom(immediateMatch.match_id, roomId)
          }
        }

        if (roomId) {
          router.push(`/chat/${roomId}`)
          return
        }
      }

      matchCheckInterval.current = setInterval(async () => {
        const stillInQueue = await MatchingService.checkQueuePosition(userId, guestUserId)
        console.log('Queue position check:', stillInQueue)
      }, 5000)

      setTimeout(() => {
        if (matchCheckInterval.current) {
          clearInterval(matchCheckInterval.current)
          matchCheckInterval.current = null
        }
        if (matchSubscription) {
          matchSubscription.unsubscribe()
        }
        if (searching) {
          console.log('Timeout: redirecting to search page')
          router.push('/chat/new')
        }
      }, 30000)

    } catch (err) {
      console.error('Error starting new chat:', err)

      if (matchCheckInterval.current) {
        clearInterval(matchCheckInterval.current)
      }
      if (matchSubscription) {
        matchSubscription.unsubscribe()
      }

      await MatchingService.leaveQueue(userId, guestUserId)

      setSearching(false)
      router.push('/chat/new')
    }
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">
                {partnerUser?.display_name || partnerUser?.username || 'Anonymous User'}
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
        {!roomClosed && (
          <MessageInput
            onSendMessage={handleSendMessage}
            onSkip={handleLeaveChat}
            skipConfirmMode={showSkipConfirm}
            onSkipClick={() => setShowSkipConfirm(true)}
          />
        )}
        {roomClosed && (
          <div className="p-6 bg-gradient-to-r from-red-50 to-orange-50 border-t-2 border-red-300">
            <div className="max-w-2xl mx-auto text-center space-y-4">
              {!searching ? (
                <>
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-2">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <p className="text-lg font-semibold text-red-800">
                    {closedByMe ? 'You have left the chat' : 'Your partner has left the chat'}
                  </p>
                  <p className="text-sm text-red-600">
                    This chat room has been closed and is no longer accessible.
                  </p>
                  <Button
                    onClick={handleStartNewChat}
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold px-8 py-3 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
                  >
                    Start New Chat
                  </Button>
                </>
              ) : (
                <>
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-100 rounded-full mb-2">
                    <Snowflake className="h-8 w-8 text-cyan-600 animate-spin" />
                  </div>
                  <p className="text-lg font-semibold text-cyan-800">
                    Finding you a new chat partner...
                  </p>
                  <p className="text-sm text-cyan-600">
                    This may take a few moments. Please wait.
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
