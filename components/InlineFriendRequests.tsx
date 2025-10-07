'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { User, Check, X, Loader as Loader2, UserPlus } from 'lucide-react'
import { FriendService } from '@/lib/friend-service'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface InlineFriendRequestsProps {
  requests: any[]
  userId?: string
  guestId?: string
  onUpdate?: () => void
}

export default function InlineFriendRequests({
  requests,
  userId,
  guestId,
  onUpdate
}: InlineFriendRequestsProps) {
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  const handleRespondToRequest = async (
    requestId: string,
    response: 'accepted' | 'rejected',
    requesterUsername: string
  ) => {
    setRespondingTo(requestId)
    try {
      const result = await FriendService.respondToFriendRequest(
        requestId,
        response,
        userId,
        guestId
      )

      if (result.success) {
        toast({
          title: response === 'accepted' ? 'Friend request accepted!' : 'Friend request declined',
          description: response === 'accepted'
            ? `You are now friends with ${requesterUsername}`
            : `You declined ${requesterUsername}'s friend request`,
        })

        if (response === 'accepted' && result.chat_room_id) {
          // Redirect to the friend chat room
          setTimeout(() => {
            router.push(`/chat/${result.chat_room_id}`)
          }, 1000)
        }

        if (onUpdate) {
          onUpdate()
        }
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to respond to friend request',
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error('Error responding to friend request:', err)
      toast({
        title: 'Error',
        description: 'Failed to respond to friend request',
        variant: 'destructive',
      })
    } finally {
      setRespondingTo(null)
    }
  }

  if (requests.length === 0) {
    return (
      <div className="p-8 text-center">
        <UserPlus className="h-12 w-12 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-600">No pending requests</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white p-4">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          <h3 className="font-semibold">Friend Requests</h3>
          <Badge className="ml-auto bg-white text-cyan-600">
            {requests.length}
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {requests.map((request) => (
          <div
            key={request.request_id}
            className="border-b border-slate-200 p-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {request.requester_username}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(request.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                {request.message && (
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                    {request.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleRespondToRequest(request.request_id, 'accepted', request.requester_username)}
                disabled={respondingTo === request.request_id}
                className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700"
              >
                {respondingTo === request.request_id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Accept
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRespondToRequest(request.request_id, 'rejected', request.requester_username)}
                disabled={respondingTo === request.request_id}
                className="flex-1 h-8 text-xs border-red-300 text-red-600 hover:bg-red-50"
              >
                <X className="h-3 w-3 mr-1" />
                Decline
              </Button>
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  )
}
