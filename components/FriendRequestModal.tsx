'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { User, Loader as Loader2 } from 'lucide-react'

interface FriendRequestModalProps {
  isOpen: boolean
  onClose: () => void
  onSend: (message?: string) => Promise<void>
  partnerUsername: string
}

export default function FriendRequestModal({
  isOpen,
  onClose,
  onSend,
  partnerUsername
}: FriendRequestModalProps) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    setLoading(true)
    try {
      await onSend(message || undefined)
      setMessage('')
      onClose()
    } catch (err) {
      console.error('Error sending friend request:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-cyan-600" />
            Send Friend Request
          </DialogTitle>
          <DialogDescription>
            Send a friend request to <span className="font-semibold text-slate-800">{partnerUsername}</span> to stay connected
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-medium text-slate-700">
              Add a message (optional)
            </label>
            <Textarea
              id="message"
              placeholder="Hey! I'd love to stay in touch..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-slate-500">
              {message.length}/500 characters
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={loading}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
