'use client'

import { useState, KeyboardEvent, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader as Loader2, X } from 'lucide-react'

interface ReplyingTo {
  id: string
  content: string
  senderUsername?: string
}

interface EditingMessage {
  id: string
  content: string
}

interface MessageInputProps {
  onSendMessage: (content: string, replyToId?: string) => Promise<void>
  onEditMessage?: (messageId: string, newContent: string) => Promise<void>
  onSkip: () => void
  disabled?: boolean
  skipConfirmMode: boolean
  onSkipClick: () => void
  replyingTo?: ReplyingTo | null
  editingMessage?: EditingMessage | null
  onCancelReply?: () => void
  onCancelEdit?: () => void
}

export default function MessageInput({
  onSendMessage,
  onEditMessage,
  onSkip,
  disabled,
  skipConfirmMode,
  onSkipClick,
  replyingTo,
  editingMessage,
  onCancelReply,
  onCancelEdit
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [showSentIndicator, setShowSentIndicator] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const skipButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus()
    }
  }, [disabled])

  useEffect(() => {
    if (editingMessage) {
      setMessage(editingMessage.content)
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          const length = inputRef.current.value.length
          inputRef.current.setSelectionRange(length, length)
        }
      }, 0)
    } else {
      setMessage('')
    }
  }, [editingMessage])

  useEffect(() => {
    if (replyingTo) {
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 0)
    }
  }, [replyingTo])

  const handleSend = async () => {
    if (!message.trim() || disabled) return

    const messageToSend = message.trim()
    setMessage('')

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 0)

    setSending(true)
    try {
      if (editingMessage && onEditMessage) {
        await onEditMessage(editingMessage.id, messageToSend)
        if (onCancelEdit) {
          onCancelEdit()
        }
      } else {
        await onSendMessage(messageToSend, replyingTo?.id)
        setShowSentIndicator(true)
        setTimeout(() => setShowSentIndicator(false), 1500)
        if (onCancelReply) {
          onCancelReply()
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    } else if (e.key === 'Escape') {
      if (editingMessage && onCancelEdit) {
        onCancelEdit()
        setMessage('')
      } else if (replyingTo && onCancelReply) {
        onCancelReply()
      }
    }
  }

  const handleSkipButtonClick = () => {
    if (skipConfirmMode) {
      onSkip()
    } else {
      onSkipClick()
    }
  }

  return (
    <div className="border-t border-cyan-200 bg-white relative">
      {showSentIndicator && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mb-2 bg-green-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg animate-fade-in-out">
          Message sent
        </div>
      )}
      {(replyingTo || editingMessage) && (
        <div className="px-3 pt-2 pb-1 bg-slate-50 border-b border-slate-200">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-cyan-700 mb-0.5">
                {editingMessage ? 'Editing message' : `Replying to ${replyingTo?.senderUsername || 'Someone'}`}
              </p>
              <p className="text-xs text-slate-600 truncate">
                {editingMessage ? editingMessage.content : replyingTo?.content}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 flex-shrink-0"
              onClick={editingMessage ? onCancelEdit : onCancelReply}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="p-3">
        <div className="flex gap-2 items-center">
          <Button
            ref={skipButtonRef}
            data-skip-button
            onClick={handleSkipButtonClick}
            disabled={disabled}
            variant={skipConfirmMode ? "destructive" : "outline"}
            className={skipConfirmMode
              ? "bg-red-600 hover:bg-red-700 text-white h-9 px-4 font-medium"
              : "border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-400 h-9 px-4"
            }
            title={skipConfirmMode ? "Click again to confirm skip" : "Skip and find new chat partner"}
          >
            {skipConfirmMode ? "Confirm?" : "Skip"}
          </Button>
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              editingMessage
                ? "Edit your message... (Press Enter to save, ESC to cancel)"
                : "Type your message... (Press Enter to send, ESC to cancel)"
            }
            className="flex-1 h-9"
            maxLength={2000}
            disabled={disabled}
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || disabled}
            className="bg-cyan-600 hover:bg-cyan-700 h-9 px-4"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-slate-500 mt-1.5">
          {message.length}/2000 characters
        </p>
      </div>
    </div>
  )
}
