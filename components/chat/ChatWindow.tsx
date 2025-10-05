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
  is_edited?: boolean
  edited_at?: string
  reply_to_id?: string
  replied_message?: {
    id: string
    content: string
    senderUsername?: string
  }
  status?: 'sending' | 'sent'
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
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(null)
  const [justSentMessageIds, setJustSentMessageIds] = useState<Set<string>>(new Set())
  const router = useRouter()
  const roomChannelRef = useRef<any>(null)
  const matchCheckInterval = useRef<any>(null)
  const escTimeoutRef = useRef<any>(null)
  const roomStatusCheckInterval = useRef<any>(null)
  const lastMessageCheckRef = useRef<string | null>(null)
  const messagePollingInterval = useRef<any>(null)

  useEffect(() => {
    checkRoomStatus()
    loadMessages()
    setupRealtimeSubscription()

    // Fallback: Poll for room status every 10 seconds
    // This ensures we detect closure even if realtime fails
    roomStatusCheckInterval.current = setInterval(() => {
      if (!roomClosed) {
        checkRoomStatus()
      }
    }, 10000)

    // Fallback: Poll for new messages every 5 seconds
    // This ensures we get messages even if realtime fails
    messagePollingInterval.current = setInterval(() => {
      if (!roomClosed) {
        checkForNewMessages()
      }
    }, 5000)

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
      if (roomStatusCheckInterval.current) {
        clearInterval(roomStatusCheckInterval.current)
      }
      if (messagePollingInterval.current) {
        clearInterval(messagePollingInterval.current)
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
      console.log('[Realtime] Removing existing channel before creating new one')
      supabase.removeChannel(roomChannelRef.current)
      roomChannelRef.current = null
    }

    console.log('[Realtime] Setting up realtime subscription for room:', roomId)

    const channelName = `room:${roomId}`
    console.log('[Realtime] Channel name:', channelName)

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: '' },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${roomId}`
        },
        async (payload) => {
          console.log('[Realtime] New message INSERT event received:', payload)
          const newMessage = payload.new as Message

          if (!newMessage || !newMessage.id) {
            console.warn('[Realtime] Invalid message payload:', newMessage)
            return
          }

          const enrichedMessage = await enrichMessageWithReply(newMessage)

          setMessages((prev) => {
            const exists = prev.some(msg => msg.id === enrichedMessage.id)
            if (exists) {
              console.log('[Realtime] Message already exists, skipping:', enrichedMessage.id)
              return prev
            }
            console.log('[Realtime] Adding new message to list:', enrichedMessage.id)
            return [...prev, enrichedMessage]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${roomId}`
        },
        async (payload) => {
          console.log('[Realtime] Message UPDATE event received:', payload)
          const updatedMessage = payload.new as Message

          if (!updatedMessage || !updatedMessage.id) {
            console.warn('[Realtime] Invalid message update payload:', updatedMessage)
            return
          }

          const enrichedMessage = await enrichMessageWithReply(updatedMessage)

          setMessages((prev) =>
            prev.map(msg =>
              msg.id === enrichedMessage.id ? enrichedMessage : msg
            )
          )
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
          console.log('[Realtime] Room UPDATE event received:', payload)
          const updatedRoom = payload.new as any
          const oldRoom = payload.old as any

          console.log('[Realtime] Room update details:', {
            closed_at: updatedRoom?.closed_at,
            closed_by: updatedRoom?.closed_by,
            is_active: updatedRoom?.is_active,
            old_closed_at: oldRoom?.closed_at
          })

          if (updatedRoom && updatedRoom.closed_at && !oldRoom?.closed_at) {
            console.log('[Realtime] Room was just closed, updating UI')
            setRoomClosed(true)

            const closedByIdentifier = updatedRoom.closed_by || ''
            const currentUserIdentifier = currentUser.type === 'authenticated'
              ? `user:${currentUser.id}`
              : `guest:${currentUser.id}`

            const wasClosedByMe = closedByIdentifier === currentUserIdentifier
            console.log('[Realtime] Closed by:', {
              closedBy: closedByIdentifier,
              currentUser: currentUserIdentifier,
              wasClosedByMe
            })

            setClosedByMe(wasClosedByMe)
          }
        }
      )
      .subscribe((status, err) => {
        console.log('[Realtime] Subscription status:', status)
        if (err) {
          console.error('[Realtime] Subscription error:', err)
        }
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] ✓ Successfully subscribed to room updates')
          console.log('[Realtime] Active channels:', supabase.getChannels().length)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] ✗ Subscription error - attempting reconnect')
          // Auto-reconnect after 2 seconds
          setTimeout(() => {
            if (!roomClosed) {
              console.log('[Realtime] Attempting to reconnect...')
              setupRealtimeSubscription()
            }
          }, 2000)
        } else if (status === 'TIMED_OUT') {
          console.error('[Realtime] ✗ Subscription timed out - attempting reconnect')
          setTimeout(() => {
            if (!roomClosed) {
              console.log('[Realtime] Attempting to reconnect...')
              setupRealtimeSubscription()
            }
          }, 2000)
        } else if (status === 'CLOSED') {
          console.log('[Realtime] Channel closed')
        }
      })

    roomChannelRef.current = channel
  }

  const enrichMessageWithReply = async (msg: any) => {
    if (msg.reply_to_id) {
      const { data: repliedMsg } = await supabase
        .from('messages')
        .select('id, content, sender_id, guest_sender_id')
        .eq('id', msg.reply_to_id)
        .maybeSingle()

      if (repliedMsg) {
        let username = 'Someone'
        if (repliedMsg.sender_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', repliedMsg.sender_id)
            .maybeSingle()
          username = profile?.username || 'Someone'
        } else if (repliedMsg.guest_sender_id) {
          const { data: guest } = await supabase
            .from('guest_users')
            .select('username')
            .eq('id', repliedMsg.guest_sender_id)
            .maybeSingle()
          username = guest?.username || 'Someone'
        }

        return {
          ...msg,
          replied_message: {
            id: repliedMsg.id,
            content: repliedMsg.content,
            senderUsername: username
          }
        }
      }
    }
    return msg
  }

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_room_id', roomId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const messages = data || []

      const enrichedMessages = await Promise.all(
        messages.map(msg => enrichMessageWithReply(msg))
      )

      setMessages(enrichedMessages)

      if (enrichedMessages.length > 0) {
        lastMessageCheckRef.current = enrichedMessages[enrichedMessages.length - 1].id
      }
    } catch (err) {
      console.error('Error loading messages:', err)
      setError('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const checkForNewMessages = async () => {
    try {
      // Get latest message ID from current state
      const currentLastMessageId = lastMessageCheckRef.current

      // Query for messages newer than the last one we have
      let query = supabase
        .from('messages')
        .select('*')
        .eq('chat_room_id', roomId)
        .order('created_at', { ascending: true })

      if (currentLastMessageId) {
        query = query.gt('created_at', new Date(
          messages.find(m => m.id === currentLastMessageId)?.created_at || 0
        ).toISOString())
      }

      const { data, error } = await query.limit(50)

      if (error) {
        console.error('[Polling] Error checking for new messages:', error)
        return
      }

      if (data && data.length > 0) {
        console.log('[Polling] Found', data.length, 'new messages')
        setMessages(prev => {
          const newMessages = data.filter(newMsg =>
            !prev.some(existingMsg => existingMsg.id === newMsg.id)
          )
          if (newMessages.length > 0) {
            lastMessageCheckRef.current = newMessages[newMessages.length - 1].id
            return [...prev, ...newMessages]
          }
          return prev
        })
      }
    } catch (err) {
      console.error('[Polling] Error in checkForNewMessages:', err)
    }
  }

  const handleSendMessage = async (content: string, replyToId?: string) => {
    if (roomClosed) {
      throw new Error('Cannot send message to closed room')
    }

    const tempId = `temp-${Date.now()}-${Math.random()}`
    const optimisticMessage: Message = {
      id: tempId,
      content,
      chat_room_id: roomId,
      sender_id: currentUser.type === 'authenticated' ? currentUser.id : undefined,
      guest_sender_id: currentUser.type === 'anonymous' ? currentUser.id : undefined,
      created_at: new Date().toISOString(),
      senderUsername: currentUser.username,
      reply_to_id: replyToId,
      status: 'sending'
    }

    if (replyToId) {
      const repliedMsg = messages.find(m => m.id === replyToId)
      if (repliedMsg) {
        optimisticMessage.replied_message = {
          id: repliedMsg.id,
          content: repliedMsg.content,
          senderUsername: repliedMsg.senderUsername || 'Someone'
        }
      }
    }

    console.log('[Message] Sending message:', { tempId, content: content.substring(0, 20) })
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
        message_type: 'text',
        reply_to_id: replyToId || null
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
        console.error('[Message] Insert error:', error)
        setMessages(prev => prev.filter(msg => msg.id !== tempId))
        if (error.message.includes('violates row-level security policy')) {
          setRoomClosed(true)
          throw new Error('This chat room has been closed')
        }
        throw error
      }

      console.log('[Message] Message sent successfully:', insertedMessage.id)

      const enrichedInsertedMessage = await enrichMessageWithReply(insertedMessage)
      enrichedInsertedMessage.status = 'sent'

      setJustSentMessageIds(prev => {
        const newSet = new Set(prev)
        newSet.add(enrichedInsertedMessage.id)
        return newSet
      })

      setTimeout(() => {
        setJustSentMessageIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(enrichedInsertedMessage.id)
          return newSet
        })
      }, 3000)

      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== tempId)
        const exists = filtered.some(msg => msg.id === enrichedInsertedMessage.id)
        if (exists) {
          console.log('[Message] Message already received via realtime')
          return filtered
        }
        console.log('[Message] Adding confirmed message')
        return [...filtered, enrichedInsertedMessage]
      })
    } catch (err) {
      console.error('[Message] Error sending message:', err)
      throw err
    }
  }

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      const messageToEdit = messages.find(m => m.id === messageId)
      if (!messageToEdit) {
        throw new Error('Message not found')
      }

      const isOwner = currentUser.type === 'authenticated'
        ? messageToEdit.sender_id === currentUser.id
        : messageToEdit.guest_sender_id === currentUser.id

      if (!isOwner) {
        throw new Error('You can only edit your own messages')
      }

      const { error } = await supabase
        .from('messages')
        .update({
          content: newContent,
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId)

      if (error) {
        console.error('[Edit] Database error:', error)
        throw error
      }

      console.log('[Edit] Message updated successfully')

      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, content: newContent, is_edited: true, edited_at: new Date().toISOString() }
            : msg
        )
      )
    } catch (err) {
      console.error('Error editing message:', err)
      throw err
    }
  }

  const handleReportMessage = async (messageId: string, reason: string) => {
    try {
      const sessionId = currentUser.type === 'authenticated'
        ? `user:${currentUser.id}`
        : `guest:${currentUser.id}`

      const { error } = await supabase
        .from('message_reports')
        .insert({
          message_id: messageId,
          reported_by_session_id: sessionId,
          reason
        })

      if (error) {
        if (error.message.includes('duplicate key')) {
          console.log('Already reported this message')
          return
        }
        throw error
      }

      console.log('Message reported successfully')
    } catch (err) {
      console.error('Error reporting message:', err)
      throw err
    }
  }

  const handleReply = (message: Message) => {
    setReplyingTo(message)
    setEditingMessage(null)
  }

  const handleEdit = (message: Message) => {
    setEditingMessage({ id: message.id, content: message.content })
    setReplyingTo(null)
  }

  const handleCancelReply = () => {
    setReplyingTo(null)
  }

  const handleCancelEdit = () => {
    setEditingMessage(null)
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
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-cyan-50 via-blue-50 to-slate-100 flex flex-col" style={{ height: '100dvh' }}>
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-cyan-200 bg-white backdrop-blur-sm shadow-sm z-20">
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

      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <MessageList
          messages={messages}
          currentUserId={currentUser.type === 'authenticated' ? currentUser.id : undefined}
          currentGuestId={currentUser.type === 'anonymous' ? currentUser.id : undefined}
          onReply={handleReply}
          onEdit={handleEdit}
          onReport={handleReportMessage}
          justSentMessageIds={justSentMessageIds}
        />
        {!roomClosed && (
          <MessageInput
            onSendMessage={handleSendMessage}
            onEditMessage={handleEditMessage}
            onSkip={handleLeaveChat}
            skipConfirmMode={showSkipConfirm}
            onSkipClick={() => setShowSkipConfirm(true)}
            replyingTo={replyingTo ? {
              id: replyingTo.id,
              content: replyingTo.content,
              senderUsername: replyingTo.senderUsername
            } : null}
            editingMessage={editingMessage}
            onCancelReply={handleCancelReply}
            onCancelEdit={handleCancelEdit}
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
