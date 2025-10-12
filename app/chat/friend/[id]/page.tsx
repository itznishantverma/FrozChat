'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ChatWindow from '@/components/chat/ChatWindow'
import AuthModal from '@/components/AuthModal'
import { supabase } from '@/lib/supabase'
import { Snowflake, MoreVertical, UserPlus, Flag, Ban } from 'lucide-react'
import FriendsSidebar from '@/components/FriendsSidebar'
import FriendRequestNotification from '@/components/FriendRequestNotification'
import { FriendService } from '@/lib/friend-service'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function FriendChatPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string

  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [partnerUser, setPartnerUser] = useState<any>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roomClosed, setRoomClosed] = useState(false)
  const [friendshipStatus, setFriendshipStatus] = useState<any>(null)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [reportReason, setReportReason] = useState('other')
  const [reportDescription, setReportDescription] = useState('')
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    validateAndLoadChat()
  }, [roomId])

  const validateAndLoadChat = async () => {
    try {
      const existingSession = localStorage.getItem('frozChatSession')

      if (!existingSession) {
        setShowAuthModal(true)
        setLoading(false)
        return
      }

      const sessionData = JSON.parse(existingSession)

      let user: any = null

      if (sessionData.type === 'anonymous') {
        const { data: guestUser, error } = await supabase
          .from('guest_users')
          .select('*')
          .eq('session_token', sessionData.session_token || sessionData.sessionToken)
          .maybeSingle()

        if (error || !guestUser) {
          localStorage.removeItem('frozChatSession')
          setShowAuthModal(true)
          setLoading(false)
          return
        }

        user = { ...guestUser, type: 'anonymous' }
      } else {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !authUser) {
          localStorage.removeItem('frozChatSession')
          setShowAuthModal(true)
          setLoading(false)
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (profile) {
          user = { ...profile, user: authUser, type: 'authenticated' }
        } else {
          localStorage.removeItem('frozChatSession')
          setShowAuthModal(true)
          setLoading(false)
          return
        }
      }

      setCurrentUser(user)

      // Reset unread count for this room
      const userId = user.type === 'authenticated' ? user.id : null
      const guestId = user.type === 'anonymous' ? user.id : null

      try {
        await supabase.rpc('reset_unread_count', {
          p_chat_room_id: roomId,
          p_user_id: userId,
          p_guest_id: guestId
        })
        console.log('✅ Unread count reset for room:', roomId)
      } catch (error) {
        console.error('❌ Error resetting unread count:', error)
      }

      const { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('id', roomId)
        .eq('room_type', 'friend')
        .maybeSingle()

      console.log('🔍 Friend room lookup:', { room, roomError, roomId })

      if (roomError) {
        console.error('❌ Room error:', roomError)
        setError('Error loading friend chat room')
        setLoading(false)
        return
      }

      if (!room) {
        console.error('❌ Room not found')
        setError('Friend chat room not found. This may be due to database permissions.')
        setLoading(false)
        return
      }

      // Check if this is a friendship-related room
      const { data: friendship } = await supabase
        .from('friendships')
        .select('status, unfriended_at')
        .eq('friend_chat_room_id', roomId)
        .maybeSingle()

      console.log('🔍 Friendship status:', friendship)

      const isTemporaryClosed = room.is_temporary_closure && room.closed_at
      const isUnfriended = friendship?.status === 'unfriended'

      // Allow viewing if:
      // 1. Room is active (not closed)
      // 2. Room is temporarily closed (can be reopened)
      // 3. Room belongs to unfriended friends (read-only history)
      if (room.closed_at && !isTemporaryClosed && !isUnfriended) {
        setError('This friend chat has been permanently closed')
        setLoading(false)
        return
      }

      // Mark as closed if temporarily closed OR unfriended
      if (isTemporaryClosed || isUnfriended) {
        setRoomClosed(true)
      }

      let partner: any = null
      const isUserAuth = user.type === 'authenticated'
      const currentUserId = isUserAuth ? user.id : null
      const currentGuestId = !isUserAuth ? user.id : null

      const isParticipant = (
        (currentUserId && (room.user_id_1 === currentUserId || room.user_id_2 === currentUserId)) ||
        (currentGuestId && (room.guest_id_1 === currentGuestId || room.guest_id_2 === currentGuestId))
      )

      if (!isParticipant) {
        setError('You are not authorized to access this friend chat')
        setTimeout(() => {
          router.push('/chat/new')
        }, 2000)
        setLoading(false)
        return
      }

      if (room.user_id_1 && room.user_id_1 !== currentUserId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', room.user_id_1)
          .maybeSingle()

        partner = profile ? {
          username: profile.username,
          display_name: profile.display_name || profile.username
        } : null
      } else if (room.user_id_2 && room.user_id_2 !== currentUserId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', room.user_id_2)
          .maybeSingle()

        partner = profile ? {
          username: profile.username,
          display_name: profile.display_name || profile.username
        } : null
      } else if (room.guest_id_1 && room.guest_id_1 !== currentGuestId) {
        const { data: guestProfile } = await supabase
          .from('guest_users')
          .select('*')
          .eq('id', room.guest_id_1)
          .maybeSingle()

        partner = guestProfile ? {
          username: guestProfile.username,
          display_name: guestProfile.display_name || guestProfile.username
        } : null
      } else if (room.guest_id_2 && room.guest_id_2 !== currentGuestId) {
        const { data: guestProfile } = await supabase
          .from('guest_users')
          .select('*')
          .eq('id', room.guest_id_2)
          .maybeSingle()

        partner = guestProfile ? {
          username: guestProfile.username,
          display_name: guestProfile.display_name || guestProfile.username
        } : null
      }

      setPartnerUser(partner || { username: 'Friend', display_name: 'Friend' })
      await checkFriendshipStatus()
      setLoading(false)
    } catch (err) {
      console.error('Error loading friend chat:', err)
      setError('Failed to load friend chat')
      setLoading(false)
    }
  }

  const handleAuthSuccess = () => {
    setShowAuthModal(false)
    validateAndLoadChat()
  }

  const checkFriendshipStatus = async () => {
    if (!currentUser) return

    const currentUserId = currentUser.type === 'authenticated' ? currentUser.id : undefined
    const currentGuestId = currentUser.type === 'anonymous' ? currentUser.id : undefined

    const { data: room } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('id', roomId)
      .maybeSingle()

    if (!room) return

    let partnerUserId: string | undefined
    let partnerGuestId: string | undefined

    if (room.user_id_1 && room.user_id_1 !== currentUserId) {
      partnerUserId = room.user_id_1
    } else if (room.user_id_2 && room.user_id_2 !== currentUserId) {
      partnerUserId = room.user_id_2
    } else if (room.guest_id_1 && room.guest_id_1 !== currentGuestId) {
      partnerGuestId = room.guest_id_1
    } else if (room.guest_id_2 && room.guest_id_2 !== currentGuestId) {
      partnerGuestId = room.guest_id_2
    }

    const friendship = await FriendService.checkFriendshipStatus(
      currentUserId,
      currentGuestId,
      partnerUserId,
      partnerGuestId
    )

    console.log('🔍 Friendship status result:', friendship)
    setFriendshipStatus(friendship)
  }

  const handleSendFriendRequest = async () => {
    if (!currentUser) return

    if (friendshipStatus?.type === 'friendship' && friendshipStatus?.status === 'accepted') {
      toast({
        title: 'Already friends',
        description: 'You are already friends with this user.',
      })
      return
    }

    if (friendshipStatus?.type === 'request' && friendshipStatus?.status === 'pending') {
      toast({
        title: 'Request already sent',
        description: 'Friend request is already pending.',
      })
      return
    }

    const currentUserId = currentUser.type === 'authenticated' ? currentUser.id : undefined
    const currentGuestId = currentUser.type === 'anonymous' ? currentUser.id : undefined

    const { data: room } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('id', roomId)
      .maybeSingle()

    if (!room) return

    let partnerUserId: string | undefined
    let partnerGuestId: string | undefined

    if (room.user_id_1 && room.user_id_1 !== currentUserId) {
      partnerUserId = room.user_id_1
    } else if (room.user_id_2 && room.user_id_2 !== currentUserId) {
      partnerUserId = room.user_id_2
    } else if (room.guest_id_1 && room.guest_id_1 !== currentGuestId) {
      partnerGuestId = room.guest_id_1
    } else if (room.guest_id_2 && room.guest_id_2 !== currentGuestId) {
      partnerGuestId = room.guest_id_2
    }

    const result = await FriendService.sendFriendRequest(
      currentUserId,
      currentGuestId,
      partnerUserId,
      partnerGuestId,
      roomId
    )

    if (result.success) {
      toast({
        title: 'Friend request sent',
        description: 'Your friend request has been sent successfully.',
      })
      await checkFriendshipStatus()
      setShowMenu(false)
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to send friend request',
        variant: 'destructive',
      })
    }
  }

  const handleReportUser = async () => {
    if (!reportReason || isSubmittingReport) return

    setIsSubmittingReport(true)

    const currentUserId = currentUser.type === 'authenticated' ? currentUser.id : undefined
    const currentGuestId = currentUser.type === 'anonymous' ? currentUser.id : undefined

    const { data: room } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('id', roomId)
      .maybeSingle()

    if (!room) {
      setIsSubmittingReport(false)
      return
    }

    let partnerUserId: string | undefined
    let partnerGuestId: string | undefined

    if (room.user_id_1 && room.user_id_1 !== currentUserId) {
      partnerUserId = room.user_id_1
    } else if (room.user_id_2 && room.user_id_2 !== currentUserId) {
      partnerUserId = room.user_id_2
    } else if (room.guest_id_1 && room.guest_id_1 !== currentGuestId) {
      partnerGuestId = room.guest_id_1
    } else if (room.guest_id_2 && room.guest_id_2 !== currentGuestId) {
      partnerGuestId = room.guest_id_2
    }

    const result = await FriendService.reportUser(
      currentUserId,
      currentGuestId,
      partnerUserId,
      partnerGuestId,
      roomId,
      reportReason,
      reportDescription
    )

    setIsSubmittingReport(false)

    if (result.success) {
      toast({
        title: 'User reported',
        description: 'Thank you for your report. We will review it shortly.',
      })
      setShowReportDialog(false)
      setReportReason('other')
      setReportDescription('')
      setShowMenu(false)
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to report user',
        variant: 'destructive',
      })
    }
  }

  const handleUnfriend = async () => {
    if (!friendshipStatus || friendshipStatus.type !== 'friendship') {
      toast({
        title: 'Error',
        description: 'You are not friends with this user.',
        variant: 'destructive',
      })
      return
    }

    const confirmed = window.confirm(
      'Are you sure you want to unfriend this user? The chat room will be temporarily closed, but you can still read past messages.'
    )

    if (!confirmed) return

    const currentUserId = currentUser.type === 'authenticated' ? currentUser.id : undefined
    const currentGuestId = currentUser.type === 'anonymous' ? currentUser.id : undefined

    const result = await FriendService.unfriendUser(
      friendshipStatus.friendship_id,
      currentUserId,
      currentGuestId
    )

    if (result.success) {
      toast({
        title: 'Unfriended',
        description: 'You are no longer friends. The chat room is temporarily closed.',
      })

      setTimeout(() => {
        router.push('/chat/new')
      }, 1500)
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to unfriend user',
        variant: 'destructive',
      })
    }
  }

  const handleBlockUser = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to block this user? This will remove any friendships and prevent future matches.'
    )

    if (!confirmed) return

    const currentUserId = currentUser.type === 'authenticated' ? currentUser.id : undefined
    const currentGuestId = currentUser.type === 'anonymous' ? currentUser.id : undefined

    const { data: room } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('id', roomId)
      .maybeSingle()

    if (!room) return

    let partnerUserId: string | undefined
    let partnerGuestId: string | undefined

    if (room.user_id_1 && room.user_id_1 !== currentUserId) {
      partnerUserId = room.user_id_1
    } else if (room.user_id_2 && room.user_id_2 !== currentUserId) {
      partnerUserId = room.user_id_2
    } else if (room.guest_id_1 && room.guest_id_1 !== currentGuestId) {
      partnerGuestId = room.guest_id_1
    } else if (room.guest_id_2 && room.guest_id_2 !== currentGuestId) {
      partnerGuestId = room.guest_id_2
    }

    const result = await FriendService.blockUser(
      currentUserId,
      currentGuestId,
      partnerUserId,
      partnerGuestId,
      'Blocked from friend chat'
    )

    if (result.success) {
      toast({
        title: 'User blocked',
        description: 'You will not be matched with this user again.',
      })

      setTimeout(() => {
        router.push('/chat/new')
      }, 1500)
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to block user',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Snowflake className="h-16 w-16 text-cyan-600 mx-auto mb-4 animate-spin" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Loading friend chat...
          </h1>
          <p className="text-slate-600">
            Please wait while we connect you
          </p>
        </div>
      </div>
    )
  }

  if (showAuthModal || !currentUser) {
    return (
      <div className="h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
        <AuthModal
          isOpen={true}
          onClose={() => router.push('/')}
          onSuccess={handleAuthSuccess}
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            {error}
          </h1>
          <button
            onClick={() => router.push('/chat/new')}
            className="text-cyan-600 hover:underline"
          >
            Return to chat
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <ChatWindow
        roomId={roomId}
        currentUser={currentUser}
        partnerUser={partnerUser}
        isFriendChat={true}
        isTemporarilyClosed={roomClosed}
        customNavbarActions={
          <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!roomClosed ? (
                <DropdownMenuItem onClick={handleUnfriend} className="text-orange-600">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Unfriend
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleSendFriendRequest}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Friend
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => { setShowReportDialog(true); setShowMenu(false); }}>
                <Flag className="h-4 w-4 mr-2" />
                Report User
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleBlockUser} className="text-red-600">
                <Ban className="h-4 w-4 mr-2" />
                Block User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
        showMenuWhenClosed={true}
      />

      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report User</DialogTitle>
            <DialogDescription>
              Please select a reason for reporting this user. Your report will be reviewed by our team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger id="reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spam">Spam</SelectItem>
                  <SelectItem value="harassment">Harassment</SelectItem>
                  <SelectItem value="inappropriate_content">Inappropriate Content</SelectItem>
                  <SelectItem value="fake_profile">Fake Profile</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Additional Details (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Provide more details about your report..."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReportUser}
              disabled={isSubmittingReport}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
