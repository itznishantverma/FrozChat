'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { User, MessageSquare, Users, Loader as Loader2, Check, X, Bell } from 'lucide-react'
import { FriendService, Friend, FriendRequest } from '@/lib/friend-service'
import { useRouter } from 'next/navigation'

interface FriendsSidebarProps {
  userId?: string
  guestId?: string
}

export default function FriendsSidebar({ userId, guestId }: FriendsSidebarProps) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [showPendingRequests, setShowPendingRequests] = useState(false)
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
      router.push(`/chat/friend/${chatRoomId}`)
    }
  }

  if (loading) {
    return (
      <Card className="h-full flex items-center justify-center border-cyan-200 bg-white shadow-lg">
        <Loader2 className="h-8 w-8 text-cyan-600 animate-spin" />
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col border-cyan-200 bg-white shadow-lg overflow-hidden">
      <div className="p-4 border-b border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Users className="h-5 w-5 text-cyan-600" />
            Friends
          </h2>
          {friends.length > 0 && (
            <Badge variant="secondary" className="bg-cyan-100 text-cyan-800">
              {friends.length}
            </Badge>
          )}
        </div>

        {pendingRequests.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPendingRequests(!showPendingRequests)}
            className="w-full justify-between text-yellow-700 hover:text-yellow-800 hover:bg-yellow-50"
          >
            <span className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Pending Requests
            </span>
            <Badge className="bg-yellow-500 text-white">
              {pendingRequests.length}
            </Badge>
          </Button>
        )}
      </div>

      {showPendingRequests && pendingRequests.length > 0 && (
        <div className="p-3 bg-yellow-50 border-b border-yellow-200">
          <ScrollArea className="max-h-64">
            <div className="space-y-2">
              {pendingRequests.map((request) => (
                <div
                  key={request.request_id}
                  className="bg-white rounded-lg p-3 border border-yellow-200 shadow-sm"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {request.requester_username}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {request.message && (
                    <p className="text-xs text-slate-600 mb-2 line-clamp-2 italic">
                      "{request.message}"
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleRespondToRequest(request.request_id, 'accepted')}
                      disabled={respondingTo === request.request_id}
                      className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-700"
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
                      className="flex-1 h-7 text-xs border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      <ScrollArea className="flex-1 p-3">
        {friends.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Users className="h-16 w-16 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-600 mb-1">No friends yet</p>
            <p className="text-xs text-slate-500 max-w-[200px]">
              Start chatting and send friend requests to build your network!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map((friend) => (
              <div
                key={friend.friendship_id}
                className="group bg-slate-50 rounded-lg p-3 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 transition-all duration-200 border border-slate-200 hover:border-cyan-300 cursor-pointer"
                onClick={() => handleChatWithFriend(friend.chat_room_id)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {friend.friend_username}
                      </p>
                      <MessageSquare className="h-4 w-4 text-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                    {friend.friend_country && (
                      <p className="text-xs text-slate-500 truncate">
                        {friend.friend_country}
                      </p>
                    )}
                    {friend.last_message_at && (
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(friend.last_message_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  )
}
