'use client'

import { useState, KeyboardEvent, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, X } from 'lucide-react'

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
  disableSkip?: boolean
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
  onCancelEdit,
  disableSkip = false
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const skipButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus()
    }
  }, [disabled])

  useEffect(() => {
    const handleFocus = () => {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }, 300)
    }

    const input = inputRef.current
    if (input) {
      input.addEventListener('focus', handleFocus)
    }

    return () => {
      if (input) {
        input.removeEventListener('focus', handleFocus)
      }
    }
  }, [])

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
        if (inputRef.current) {
          inputRef.current.focus()
          const length = inputRef.current.value.length
          inputRef.current.setSelectionRange(length, length)
        }
      }, 0)
    }
  }, [replyingTo])

  const handleSend = async () => {
    if (!message.trim() || disabled) return

    const messageToSend = message.trim()
    const replyToId = replyingTo?.id
    const editMessageId = editingMessage?.id

    setMessage('')

    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }

    if (editingMessage && onCancelEdit) {
      onCancelEdit()
    } else if (replyingTo && onCancelReply) {
      onCancelReply()
    }

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 0)

    setSending(true)
    try {
      if (editMessageId && onEditMessage) {
        await onEditMessage(editMessageId, messageToSend)
      } else {
        await onSendMessage(messageToSend, replyToId)
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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
    <div className="border-t border-cyan-200 bg-white relative w-full">
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
        <div className="flex gap-2 items-start">
          {!disableSkip && (
            <Button
              ref={skipButtonRef}
              data-skip-button
              onClick={handleSkipButtonClick}
              disabled={disabled}
              variant={skipConfirmMode ? "destructive" : "outline"}
              className={skipConfirmMode
                ? "bg-red-600 hover:bg-red-700 text-white h-9 px-4 font-medium flex-shrink-0"
                : "border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-400 h-9 px-4 flex-shrink-0"
              }
              title={skipConfirmMode ? "Click again to confirm skip" : "Skip and find new chat partner"}
            >
              {skipConfirmMode ? "Confirm?" : "Skip"}
            </Button>
          )}
          <Textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={
              editingMessage
                ? "Edit your message... (Press Enter to save, Shift+Enter for new line, ESC to cancel)"
                : "Type your message... (Press Enter to send, Shift+Enter for new line, ESC to cancel)"
            }
            className="flex-1 min-h-[36px] max-h-[120px] resize-none py-2"
            maxLength={2000}
            disabled={disabled}
            rows={1}
            style={{
              height: 'auto'
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              const newHeight = Math.min(target.scrollHeight, 120)
              target.style.height = newHeight + 'px'
              target.style.overflowY = target.scrollHeight > 120 ? 'auto' : 'hidden'
            }}
            onFocus={() => {
              setTimeout(() => {
                if (inputRef.current) {
                  inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
                }
              }, 100)
            }}
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || disabled || sending}
            className="bg-cyan-600 hover:bg-cyan-700 h-9 px-4 flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-slate-500 mt-1.5">
          {message.length}/2000 characters
        </p>
      </div>
    </div>
  )
}
