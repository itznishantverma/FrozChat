'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { User, Check, X, Loader as Loader2, UserPlus } from 'lucide-react'
import { FriendService, FriendRequest } from '@/lib/friend-service'
import { useToast } from '@/hooks/use-toast'

interface FriendRequestNotificationsProps {
  userId?: string
  guestId?: string
  className?: string
  onRequestCountChange?: (count: number) => void
}

export default function FriendRequestNotifications({
  userId,
  guestId,
  className = '',
  onRequestCountChange
}: FriendRequestNotificationsProps) {
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([])
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadPendingRequests()

    const requestsSubscription = FriendService.subscribeToPendingRequests(
      userId,
      guestId,
      () => {
        loadPendingRequests()
      }
    )

    return () => {
      if (requestsSubscription) {
        requestsSubscription.unsubscribe()
      }
    }
  }, [userId, guestId])

  useEffect(() => {
    if (onRequestCountChange) {
      onRequestCountChange(pendingRequests.length)
    }
  }, [pendingRequests.length, onRequestCountChange])

  const loadPendingRequests = async () => {
    const requestsData = await FriendService.getPendingFriendRequests(userId, guestId)
    setPendingRequests(requestsData)
  }

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
        await loadPendingRequests()

        toast({
          title: response === 'accepted' ? 'Friend request accepted!' : 'Friend request declined',
          description: response === 'accepted'
            ? `You are now friends with ${requesterUsername}`
            : `You declined ${requesterUsername}'s friend request`,
        })
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

  if (pendingRequests.length === 0) {
    return null
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="relative bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:shadow-xl"
        >
          <UserPlus className="h-6 w-6" />
          <Badge className="absolute -top-2 -right-2 bg-red-500 text-white border-2 border-white">
            {pendingRequests.length}
          </Badge>
        </button>
      ) : (
        <Card className="w-80 max-h-96 overflow-hidden shadow-xl border-cyan-200">
          <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              <h3 className="font-semibold">Friend Requests</h3>
              <Badge className="bg-white text-cyan-600">
                {pendingRequests.length}
              </Badge>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {pendingRequests.map((request) => (
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
          </div>
        </Card>
      )}
    </div>
  )
}
