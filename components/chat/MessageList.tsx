'use client'

import { useEffect, useRef, useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { format } from 'date-fns'
import { Reply, CreditCard as Edit, Flag, MoveVertical as MoreVertical, Check, Loader as Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Message {
  id: string
  content: string
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

interface MessageListProps {
  messages: Message[]
  currentUserId?: string
  currentGuestId?: string
  onReply?: (message: Message) => void
  onEdit?: (message: Message) => void
  onReport?: (messageId: string, reason: string) => void
  justSentMessageIds?: Set<string>
}

export default function MessageList({
  messages,
  currentUserId,
  currentGuestId,
  onReply,
  onEdit,
  onReport,
  justSentMessageIds
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [swipingMessageId, setSwipingMessageId] = useState<string | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [longPressMessageId, setLongPressMessageId] = useState<string | null>(null)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const [longPressMenuOpen, setLongPressMenuOpen] = useState(false)

  const minSwipeDistance = 50
  const longPressDuration = 500

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const isOwnMessage = (message: Message) => {
    if (currentUserId && message.sender_id === currentUserId) return true
    if (currentGuestId && message.guest_sender_id === currentGuestId) return true
    return false
  }

  const onTouchStart = (e: React.TouchEvent, message: Message) => {
    const touch = e.touches[0]
    setTouchEnd(null)
    setTouchStart({ x: touch.clientX, y: touch.clientY, time: Date.now() })
    setSwipingMessageId(message.id)
    setSwipeOffset(0)

    const timer = setTimeout(() => {
      setLongPressMessageId(message.id)
      setLongPressMenuOpen(true)
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }, longPressDuration)
    setLongPressTimer(timer)
  }

  const onTouchMove = (e: React.TouchEvent, message: Message) => {
    const touch = e.touches[0]
    setTouchEnd(touch.clientX)

    if (touchStart) {
      const distance = touch.clientX - touchStart.x
      const absDistance = Math.abs(distance)

      if (absDistance > 10 && longPressTimer) {
        clearTimeout(longPressTimer)
        setLongPressTimer(null)
      }

      const isOwn = isOwnMessage(message)

      if (isOwn) {
        if (distance < 0) {
          setSwipeOffset(Math.max(distance, -80))
        }
      } else {
        if (distance > 0) {
          setSwipeOffset(Math.min(distance, 80))
        }
      }
    }
  }

  const onTouchEnd = (message: Message) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }

    if (!touchStart) {
      setTouchStart(null)
      setTouchEnd(null)
      setSwipingMessageId(null)
      setSwipeOffset(0)
      return
    }

    if (touchEnd !== null) {
      const distance = touchStart.x - touchEnd
      const absDistance = Math.abs(distance)
      const isOwn = isOwnMessage(message)

      const shouldTriggerReply = isOwn
        ? distance > minSwipeDistance
        : distance < -minSwipeDistance

      if (shouldTriggerReply && absDistance >= minSwipeDistance) {
        if (onReply) {
          onReply(message)
        }
      }
    }

    setTouchStart(null)
    setTouchEnd(null)
    setSwipingMessageId(null)
    setSwipeOffset(0)
  }

  const handleLongPressMenuAction = (action: 'reply' | 'edit' | 'report', message: Message) => {
    setLongPressMenuOpen(false)
    setLongPressMessageId(null)

    if (action === 'reply' && onReply) {
      onReply(message)
    } else if (action === 'edit' && onEdit) {
      onEdit(message)
    } else if (action === 'report') {
      setReportingMessageId(message.id)
      setReportReason('')
    }
  }

  const handleReportClick = (messageId: string) => {
    setReportingMessageId(messageId)
    setReportReason('')
  }

  const handleReportSubmit = () => {
    if (reportingMessageId && reportReason.trim() && onReport) {
      onReport(reportingMessageId, reportReason.trim())
      setReportingMessageId(null)
      setReportReason('')
    }
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

  const longPressMessage = messages.find(m => m.id === longPressMessageId)

  return (
    <>
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="flex flex-col space-y-4 min-h-full justify-end">
          {messages.map((message) => {
            const isOwn = isOwnMessage(message)

            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group relative select-none`}
                onTouchStart={(e) => onTouchStart(e, message)}
                onTouchMove={(e) => onTouchMove(e, message)}
                onTouchEnd={() => onTouchEnd(message)}
                style={{
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none',
                  userSelect: 'none'
                }}
              >
                <div
                  className="flex items-start gap-2 max-w-[85%] transition-transform duration-75"
                  style={{
                    transform: swipingMessageId === message.id ? `translateX(${swipeOffset}px)` : 'translateX(0)',
                  }}
                >
                  {swipingMessageId === message.id && Math.abs(swipeOffset) > 20 && (
                    <div className={`absolute ${isOwn ? 'right-0 translate-x-full pl-2' : 'left-0 -translate-x-full pr-2'} flex items-center h-full`}>
                      <Reply className="h-5 w-5 text-cyan-500" />
                    </div>
                  )}
                  {isOwn && (
                    <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => onReply && onReply(message)}
                      >
                        <Reply className="h-4 w-4 text-slate-500" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                          >
                            <MoreVertical className="h-4 w-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onReply && onReply(message)}>
                            <Reply className="h-4 w-4 mr-2" />
                            Reply
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit && onEdit(message)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleReportClick(message.id)}
                            className="text-red-600"
                          >
                            <Flag className="h-4 w-4 mr-2" />
                            Report
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}

                  <div
                    className={`rounded-lg px-4 py-2 max-w-full ${
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

                    {message.replied_message && (
                      <div className={`mb-2 pl-2 border-l-2 ${isOwn ? 'border-cyan-300' : 'border-slate-400'}`}>
                        <p className={`text-xs ${isOwn ? 'text-cyan-200' : 'text-slate-500'}`}>
                          {message.replied_message.senderUsername || 'Someone'}
                        </p>
                        <p className={`text-xs ${isOwn ? 'text-cyan-100' : 'text-slate-600'} break-words`}>
                          {message.replied_message.content}
                        </p>
                      </div>
                    )}

                    <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">
                      {message.content}
                    </p>

                    <div className="flex items-center gap-2 mt-1">
                      <p
                        className={`text-xs ${
                          isOwn ? 'text-cyan-100' : 'text-slate-500'
                        }`}
                      >
                        {format(new Date(message.created_at), 'HH:mm')}
                      </p>
                      {message.is_edited && (
                        <span
                          className={`text-xs italic ${
                            isOwn ? 'text-cyan-200' : 'text-slate-400'
                          }`}
                        >
                          (edited)
                        </span>
                      )}
                      {isOwn && (
                        <span className="ml-1">
                          {message.status === 'sending' ? (
                            <Loader2 className="h-3 w-3 text-cyan-200 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3 text-cyan-200" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {!isOwn && (
                    <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => onReply && onReply(message)}
                      >
                        <Reply className="h-4 w-4 text-slate-500" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                          >
                            <MoreVertical className="h-4 w-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => onReply && onReply(message)}>
                            <Reply className="h-4 w-4 mr-2" />
                            Reply
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleReportClick(message.id)}
                            className="text-red-600"
                          >
                            <Flag className="h-4 w-4 mr-2" />
                            Report
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {longPressMenuOpen && longPressMessage && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-50 flex items-end"
          onClick={() => {
            setLongPressMenuOpen(false)
            setLongPressMessageId(null)
          }}
        >
          <div
            className="bg-white w-full rounded-t-2xl p-4 space-y-2 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-4"></div>
            <button
              className="w-full flex items-center gap-3 p-4 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => handleLongPressMenuAction('reply', longPressMessage)}
            >
              <Reply className="h-5 w-5 text-cyan-600" />
              <span className="text-sm font-medium">Reply</span>
            </button>
            {isOwnMessage(longPressMessage) && (
              <button
                className="w-full flex items-center gap-3 p-4 hover:bg-slate-100 rounded-lg transition-colors"
                onClick={() => handleLongPressMenuAction('edit', longPressMessage)}
              >
                <Edit className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium">Edit</span>
              </button>
            )}
            <button
              className="w-full flex items-center gap-3 p-4 hover:bg-red-50 rounded-lg transition-colors text-red-600"
              onClick={() => handleLongPressMenuAction('report', longPressMessage)}
            >
              <Flag className="h-5 w-5" />
              <span className="text-sm font-medium">Report</span>
            </button>
          </div>
        </div>
      )}

      <AlertDialog open={!!reportingMessageId} onOpenChange={() => setReportingMessageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report Message</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for reporting this message.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <textarea
            className="w-full min-h-[100px] p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="Reason for reporting..."
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            maxLength={500}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReportSubmit}
              disabled={!reportReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              Submit Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
