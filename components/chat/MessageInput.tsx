'use client'

import { useState, KeyboardEvent, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader as Loader2 } from 'lucide-react'

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<void>
  disabled?: boolean
}

export default function MessageInput({ onSendMessage, disabled }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus()
    }
  }, [disabled])

  const handleSend = async () => {
    if (!message.trim() || disabled) return

    const messageToSend = message.trim()
    setMessage('')

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }, 0)

    setSending(true)
    try {
      await onSendMessage(messageToSend)
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
    }
  }

  return (
    <div className="border-t border-cyan-200 bg-white p-4">
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message... (Press Enter to send)"
          className="resize-none"
          rows={2}
          maxLength={2000}
          disabled={disabled}
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          className="bg-cyan-600 hover:bg-cyan-700"
          size="lg"
        >
          {sending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
      <p className="text-xs text-slate-500 mt-2">
        {message.length}/2000 characters
      </p>
    </div>
  )
}
