'use client'

import { useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { format } from 'date-fns'

interface Message {
  id: string
  content: string
  sender_id?: string
  guest_sender_id?: string
  created_at: string
  senderUsername?: string
}

interface MessageListProps {
  messages: Message[]
  currentUserId?: string
  currentGuestId?: string
}

export default function MessageList({ messages, currentUserId, currentGuestId }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const isOwnMessage = (message: Message) => {
    if (currentUserId && message.sender_id === currentUserId) return true
    if (currentGuestId && message.guest_sender_id === currentGuestId) return true
    return false
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500">
        <div className="text-center">
          <p className="text-lg mb-2">No messages yet</p>
          <p className="text-sm">Start the conversation!</p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
      <div className="space-y-4">
        {messages.map((message) => {
          const isOwn = isOwnMessage(message)

          return (
            <div
              key={message.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  isOwn
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-100 text-slate-800'
                }`}
              >
                {!isOwn && message.senderUsername && (
                  <p className="text-xs font-semibold mb-1 text-slate-600">
                    {message.senderUsername}
                  </p>
                )}
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.content}
                </p>
                <p
                  className={`text-xs mt-1 ${
                    isOwn ? 'text-cyan-100' : 'text-slate-500'
                  }`}
                >
                  {format(new Date(message.created_at), 'HH:mm')}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  )
}
