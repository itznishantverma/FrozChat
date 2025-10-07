'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { User, MessageSquare, Users, Loader as Loader2, Check, X } from 'lucide-react'
import { FriendService, Friend, FriendRequest } from '@/lib/friend-service'
import { useRouter } from 'next/navigation'

interface FriendsListProps {
  userId?: string
  guestId?: string
}

export default function FriendsList({ userId, guestId }: FriendsListProps) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadFriends()
    loadPendingRequests()

    const friendsSubscription = FriendService.subscribeToFriendships(
      userId,
      guestId,
      () => {
        loadFriends()
      }
    )

    const requestsSubscription = FriendService.subscribeToPendingRequests(
      userId,
      guestId,
      () => {
        loadPendingRequests()
      }
    )

    return () => {
      if (friendsSubscription) {
        friendsSubscription.unsubscribe()
      }
      if (requestsSubscription) {
        requestsSubscription.unsubscribe()
      }
    }
  }, [userId, guestId])

  const loadFriends = async () => {
    const friendsData = await FriendService.getUserFriends(userId, guestId)
    setFriends(friendsData)
    setLoading(false)
  }

  const loadPendingRequests = async () => {
    const requestsData = await FriendService.getPendingFriendRequests(userId, guestId)
    setPendingRequests(requestsData)
  }

  const handleRespondToRequest = async (requestId: string, response: 'accepted' | 'rejected') => {
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
        if (response === 'accepted') {
          await loadFriends()
        }
      }
    } catch (err) {
      console.error('Error responding to friend request:', err)
    } finally {
      setRespondingTo(null)
    }
  }

  const handleChatWithFriend = (chatRoomId?: string) => {
    if (chatRoomId) {
      router.push(`/chat/${chatRoomId}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 text-cyan-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {pendingRequests.length > 0 && (
        <Card className="p-4 border-yellow-200 bg-yellow-50">
          <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-yellow-600" />
            Pending Requests
            <Badge variant="secondary" className="ml-auto">
              {pendingRequests.length}
            </Badge>
          </h3>
          <ScrollArea className="max-h-48">
            <div className="space-y-2">
              {pendingRequests.map((request) => (
                <div
                  key={request.request_id}
                  className="bg-white rounded-lg p-3 border border-yellow-200"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {request.requester_username}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  {request.message && (
                    <p className="text-xs text-slate-600 mb-2 line-clamp-2">
                      {request.message}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleRespondToRequest(request.request_id, 'accepted')}
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
                      onClick={() => handleRespondToRequest(request.request_id, 'rejected')}
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
          </ScrollArea>
        </Card>
      )}

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-cyan-600" />
          My Friends
          {friends.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {friends.length}
            </Badge>
          )}
        </h3>

        {friends.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-600 mb-1">No friends yet</p>
            <p className="text-xs text-slate-500">
              Start chatting and send friend requests!
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-400px)] pr-4">
            <div className="space-y-2">
              {friends.map((friend) => (
                <div
                  key={friend.friendship_id}
                  className="bg-slate-50 rounded-lg p-3 hover:bg-slate-100 transition-colors border border-slate-200"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {friend.friend_username}
                        </p>
                        {friend.friend_country && (
                          <p className="text-xs text-slate-500">
                            {friend.friend_country}
                          </p>
                        )}
                        {friend.last_message_at && (
                          <p className="text-xs text-slate-400">
                            Last message: {new Date(friend.last_message_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleChatWithFriend(friend.chat_room_id)}
                      className="h-8 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 flex-shrink-0"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Chat
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
  )
}
