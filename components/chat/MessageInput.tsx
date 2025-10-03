'use client'

import { useState, KeyboardEvent, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader as Loader2 } from 'lucide-react'

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<void>
  onSkip: () => void
  disabled?: boolean
  skipConfirmMode: boolean
  onSkipClick: () => void
}

export default function MessageInput({ onSendMessage, onSkip, disabled, skipConfirmMode, onSkipClick }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const skipButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus()
    }
  }, [disabled])

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
      await onSendMessage(messageToSend)
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
    <div className="border-t border-cyan-200 bg-white p-3">
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
          placeholder="Type your message... (Press Enter to send, ESC to skip)"
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
  )
}
