'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthModal from '@/components/AuthModal'
import ClaimAccountModal from '@/components/ClaimAccountModal'
import FilterModal, { FilterOptions } from '@/components/FilterModal'
import FriendsSidebar from '@/components/Sidebar/FriendsSidebar'
import UserDetailsSidebar from '@/components/Sidebar/UserDetailsSidebar'
import MatchingContent from '@/components/MainContent/MatchingContent'
import ActiveChatRoomIndicator from '@/components/ActiveChatRoomIndicator'
import FriendRequestNotifications from '@/components/FriendRequestNotifications'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ArrowLeft, Snowflake, MessageSquare, Menu, Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { MatchingService, MatchResult } from '@/lib/matching-service'
import { useToast } from '@/hooks/use-toast'
import IPService from '@/lib/ip-service'
import { FriendService } from '@/lib/friend-service'

export default function ChatNewPage() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [filters, setFilters] = useState<FilterOptions>({})
  const [hasFilters, setHasFilters] = useState(false)
  const [userIp, setUserIp] = useState<string | null>(null)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [showMobileFriendsSidebar, setShowMobileFriendsSidebar] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    validateSession()
    fetchUserIp()
  }, [])

  useEffect(() => {
    if (user) {
      loadPendingRequestsCount()
    }
  }, [user])

  const loadPendingRequestsCount = async () => {
    const requests = await FriendService.getPendingFriendRequests(
      user?.type === 'authenticated' ? user.id : undefined,
      user?.type === 'anonymous' ? user.id : undefined
    )
    setPendingRequestsCount(requests.length)
  }

  useEffect(() => {
    if (user) {
      checkForActiveChatRoom()
    }
  }, [user])

  useEffect(() => {
    if (!searching || !user) return

    const userId = user.type === 'authenticated' ? user.id : undefined
    const guestUserId = user.type === 'anonymous' ? user.id : undefined

    const handleBeforeUnload = () => {
      if (searching && (userId || guestUserId)) {
        MatchingService.leaveQueue(userId, guestUserId, true)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handleBeforeUnload)
    }
  }, [searching, user])

  const fetchUserIp = async () => {
    const ipService = IPService.getInstance()
    const ipDetails = await ipService.getIPDetails()
    if (ipDetails) {
      setUserIp(ipDetails.ip)
    }
  }

  const checkForActiveChatRoom = async () => {
    if (!user) return

    const userId = user.type === 'authenticated' ? user.id : undefined
    const guestUserId = user.type === 'anonymous' ? user.id : undefined

    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('id, room_type')
        .eq('is_active', true)
        .is('closed_at', null)
        .neq('room_type', 'friend')
        .or(
          userId
            ? `user_id_1.eq.${userId},user_id_2.eq.${userId}`
            : `guest_id_1.eq.${guestUserId},guest_id_2.eq.${guestUserId}`
        )
        .maybeSingle()

      if (!error && data) {
        router.push(`/chat/${data.id}`)
      }
    } catch (err) {
      console.error('Error checking active chat room:', err)
    }
  }

  const validateSession = async () => {
    setLoading(true)
    try {
      const existingSession = localStorage.getItem('frozChatSession')

      if (!existingSession) {
        setShowAuthModal(true)
        setLoading(false)
        return
      }

      const sessionData = JSON.parse(existingSession)

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

        setUser({ ...guestUser, type: 'anonymous' })
        setDisplayName(guestUser.username)

        const savedFilters = await MatchingService.getSavedFilters(undefined, guestUser.id)
        if (savedFilters) {
          setFilters(savedFilters)
          setHasFilters(Object.keys(savedFilters).length > 0)
        }
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
          setUser({ ...profile, user: authUser, type: 'authenticated' })
          setDisplayName(profile.username)

          const savedFilters = await MatchingService.getSavedFilters(profile.id, undefined)
          if (savedFilters) {
            setFilters(savedFilters)
            setHasFilters(Object.keys(savedFilters).length > 0)
          }
        } else {
          localStorage.removeItem('frozChatSession')
          setShowAuthModal(true)
        }
      }
    } catch (error) {
      console.error('Session validation error:', error)
      localStorage.removeItem('frozChatSession')
      setShowAuthModal(true)
    } finally {
      setLoading(false)
    }
  }

  const handleAuthSuccess = (userData: any) => {
    setUser(userData)
    setDisplayName(userData.username)
    setShowAuthModal(false)
  }

  const handleBackHome = () => {
    router.push('/')
  }

  const handleClaimAccount = () => {
    setShowClaimModal(true)
  }

  const handleClaimSuccess = (userData: any) => {
    setUser(userData)
    setDisplayName(userData.username)
    setShowClaimModal(false)
    validateSession()
  }

  const handleLogout = async () => {
    if (user?.type === 'authenticated') {
      await supabase.auth.signOut()
    }

    localStorage.removeItem('frozChatSession')
    setUser(null)
    router.push('/')
  }

  const handleApplyFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters)
    setHasFilters(Object.keys(newFilters).length > 0)

    if (user) {
      MatchingService.saveFiltersToProfile(
        user.type === 'authenticated' ? user.id : undefined,
        user.type === 'anonymous' ? user.id : undefined,
        newFilters
      )
    }

    toast({
      title: 'Filters Applied',
      description: 'Your matching preferences have been saved.',
    })
  }

  const handleStartMatching = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('id, room_type')
        .eq('is_active', true)
        .is('closed_at', null)
        .neq('room_type', 'friend')
        .or(
          user.type === 'authenticated'
            ? `user_id_1.eq.${user.id},user_id_2.eq.${user.id}`
            : `guest_id_1.eq.${user.id},guest_id_2.eq.${user.id}`
        )
        .maybeSingle()

      if (!error && data) {
        router.push(`/chat/${data.id}`)
        return
      }
    } catch (err) {
      console.error('Error checking active chat room:', err)
    }

    setSearching(true)

    const userId = user.type === 'authenticated' ? user.id : undefined
    const guestUserId = user.type === 'anonymous' ? user.id : undefined
    const matchFilters = hasFilters ? filters : undefined

    let matchSubscription: any = null
    let pollTimeout: NodeJS.Timeout | null = null

    try {
      toast({
        title: 'Connecting...',
        description: 'Setting up real-time matching...',
      })

      matchSubscription = MatchingService.subscribeToMatches(
        userId,
        guestUserId,
        async (match) => {
          if (match && match.id && match.chat_room_id) {
            if (pollTimeout) clearTimeout(pollTimeout)

            if (matchSubscription) {
              matchSubscription.unsubscribe()
            }
            router.push(`/chat/${match.chat_room_id}`)
          }
        }
      )

      const queueId = await MatchingService.enterQueue(
        userId,
        guestUserId,
        matchFilters,
        userIp || undefined
      )

      if (!queueId) {
        throw new Error('Failed to enter queue')
      }

      toast({
        title: 'Searching for match...',
        description: 'Looking for someone to chat with...',
      })

      const immediateMatch = await MatchingService.findMatch(userId, guestUserId)

      if (immediateMatch) {
        if (matchSubscription) {
          matchSubscription.unsubscribe()
        }

        let roomId: string | null | undefined = immediateMatch.chat_room_id

        if (!roomId) {
          roomId = await MatchingService.createChatRoom(
            userId,
            guestUserId,
            immediateMatch.type === 'authenticated' ? immediateMatch.user.id : undefined,
            immediateMatch.type === 'guest' ? immediateMatch.user.id : undefined
          )

          if (roomId && immediateMatch.match_id) {
            await MatchingService.updateMatchRoom(immediateMatch.match_id, roomId)
          }
        }

        if (roomId) {
          router.push(`/chat/${roomId}`)
          return
        }
      }

      pollTimeout = setTimeout(async () => {
        const stillInQueue = await MatchingService.checkQueuePosition(userId, guestUserId)

        if (stillInQueue && stillInQueue.in_queue) {
          toast({
            title: 'Still searching...',
            description: `${stillInQueue.total_waiting} users waiting. We'll notify you when matched!`,
          })
        }
      }, 10000)

    } catch (error) {
      console.error('Error during matching:', error)

      if (matchSubscription) {
        matchSubscription.unsubscribe()
      }

      if (pollTimeout) {
        clearTimeout(pollTimeout)
      }

      await MatchingService.leaveQueue(userId, guestUserId)

      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      })

      setSearching(false)
    }
  }

  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Snowflake className="h-16 w-16 text-cyan-600 mx-auto mb-4 animate-spin" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Validating your session...
          </h1>
          <p className="text-slate-600">
            Please wait while we prepare your frozen sanctuary
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Snowflake className="h-16 w-16 text-cyan-600 mx-auto mb-4 animate-spin" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Preparing your frozen sanctuary...
          </h1>
          <p className="text-slate-600">
            Setting up your anonymous chat experience
          </p>
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => router.push('/')}
          onSuccess={handleAuthSuccess}
        />
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-cyan-50 via-blue-50 to-slate-100 flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-200 bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBackHome} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Home</span>
          </Button>

          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-cyan-600" />
            <span className="text-xl font-bold text-slate-800">FrozChat</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pendingRequestsCount > 0 && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="relative lg:hidden">
                  <Bell className="h-5 w-5" />
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500">
                    {pendingRequestsCount}
                  </Badge>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0">
                <FriendRequestNotifications
                  userId={user?.type === 'authenticated' ? user.id : undefined}
                  guestId={user?.type === 'anonymous' ? user.id : undefined}
                  onRequestCountChange={(count) => setPendingRequestsCount(count)}
                />
              </SheetContent>
            </Sheet>
          )}

          <Sheet open={showMobileFriendsSidebar} onOpenChange={setShowMobileFriendsSidebar}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <div className="h-full">
                <FriendsSidebar
                  userId={user?.type === 'authenticated' ? user.id : undefined}
                  guestId={user?.type === 'anonymous' ? user.id : undefined}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        <div className="w-72 flex-shrink-0 hidden lg:block">
          <FriendsSidebar
            userId={user.type === 'authenticated' ? user.id : undefined}
            guestId={user.type === 'anonymous' ? user.id : undefined}
          />
        </div>

        <div className="flex-1 min-w-0">
          <MatchingContent
            searching={searching}
            hasFilters={hasFilters}
            filters={filters}
            onShowFilters={() => setShowFilterModal(true)}
            onStartMatching={handleStartMatching}
          />
        </div>

        <div className="w-80 flex-shrink-0 hidden xl:block">
          <UserDetailsSidebar
            user={user}
            displayName={displayName}
            onClaimAccount={user.type === 'anonymous' && !user.claimed_at ? handleClaimAccount : undefined}
            onLogout={user.type === 'authenticated' ? handleLogout : undefined}
          />
        </div>
      </div>

      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApplyFilters={handleApplyFilters}
        currentFilters={filters}
      />

      <ClaimAccountModal
        isOpen={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        onSuccess={handleClaimSuccess}
        guestData={user}
      />

      <ActiveChatRoomIndicator
        userId={user.type === 'authenticated' ? user.id : undefined}
        guestId={user.type === 'anonymous' ? user.id : undefined}
      />
    </div>
  )
}
