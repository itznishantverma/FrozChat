'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthModal from '@/components/AuthModal'
import ClaimAccountModal from '@/components/ClaimAccountModal'
import FilterModal, { FilterOptions } from '@/components/FilterModal'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Snowflake, MessageSquare, Crown, LogOut, Filter, Play, Loader as Loader2, User, MapPin, Calendar, Menu, X as CloseIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { MatchingService, MatchResult } from '@/lib/matching-service'
import { useToast } from '@/hooks/use-toast'
import IPService from '@/lib/ip-service'
import FriendsSidebar from '@/components/FriendsSidebar'
import FriendRequestNotification from '@/components/FriendRequestNotification'

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
  const [showSidebar, setShowSidebar] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    validateSession()
    // Fetch IP in background, don't block UI
    fetchUserIp().catch(err => console.error('IP fetch failed:', err))
  }, [])

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
    try {
      const ipService = IPService.getInstance()
      const ipDetails = await Promise.race([
        ipService.getIPDetails(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))
      ])
      if (ipDetails) {
        setUserIp(ipDetails.ip)
      }
    } catch (error) {
      console.error('Failed to fetch IP:', error)
    }
  }

  const checkForActiveChatRoom = async () => {
    if (!user) return

    const userId = user.type === 'authenticated' ? user.id : undefined
    const guestUserId = user.type === 'anonymous' ? user.id : undefined

    console.log('🔍 Checking for active chat room...')
    const activeChatRoomId = await MatchingService.getActiveChatRoom(userId, guestUserId)

    if (activeChatRoomId) {
      console.log('✅ Active chat room found, redirecting:', activeChatRoomId)
      router.push(`/chat/${activeChatRoomId}`)
    } else {
      console.log('No active chat room found')
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
          .select('id, username, session_token, is_searching')
          .eq('session_token', sessionData.session_token || sessionData.sessionToken)
          .maybeSingle()

        if (error) {
          console.error('Error fetching guest user:', error)
          toast({
            title: 'Connection Error',
            description: 'Unable to load your session. Please try again.',
            variant: 'destructive',
          })
          setLoading(false)
          return
        }

        if (!guestUser) {
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

        if (authError) {
          console.error('Auth error:', authError)
          toast({
            title: 'Connection Error',
            description: 'Unable to verify authentication. Please try again.',
            variant: 'destructive',
          })
          setLoading(false)
          return
        }

        if (!authUser) {
          localStorage.removeItem('frozChatSession')
          setShowAuthModal(true)
          setLoading(false)
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, is_searching')
          .eq('id', authUser.id)
          .single()

        if (profileError) {
          console.error('Error fetching profile:', profileError)
          toast({
            title: 'Connection Error',
            description: 'Unable to load your profile. Please try again.',
            variant: 'destructive',
          })
          setLoading(false)
          return
        }

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
          setLoading(false)
          return
        }
      }
    } catch (error) {
      console.error('Session validation error:', error)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      })
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
    setShowAuthModal(true)
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

    console.log('🔍 Checking for active chat room before matching...')
    const activeChatRoomId = await MatchingService.getActiveChatRoom(
      user.type === 'authenticated' ? user.id : undefined,
      user.type === 'anonymous' ? user.id : undefined
    )

    if (activeChatRoomId) {
      console.log('✅ Active chat room exists, redirecting:', activeChatRoomId)
      router.push(`/chat/${activeChatRoomId}`)
      return
    }

    console.log('No active chat room, starting new search...')
    setSearching(true)

    const userId = user.type === 'authenticated' ? user.id : undefined
    const guestUserId = user.type === 'anonymous' ? user.id : undefined
    const matchFilters = hasFilters ? filters : undefined

    let matchSubscription: any = null
    let matchCheckInterval: NodeJS.Timeout | null = null
    let hasRedirected = false

    const redirectToChat = (chatRoomId: string) => {
      if (hasRedirected) return
      hasRedirected = true

      console.log('🚀 Redirecting to chat room:', chatRoomId)

      if (matchSubscription) matchSubscription.unsubscribe()
      if (matchCheckInterval) clearInterval(matchCheckInterval)

      setSearching(false)
      router.push(`/chat/${chatRoomId}`)
    }

    try {
      matchSubscription = MatchingService.subscribeToMatches(
        userId,
        guestUserId,
        (match) => {
          console.log('🎯 Match received via subscription:', match)
          if (match && match.chat_room_id) {
            redirectToChat(match.chat_room_id)
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

      const immediateMatch = await MatchingService.findMatch(userId, guestUserId)

      if (immediateMatch && immediateMatch.chat_room_id) {
        console.log('✅ Found immediate match:', immediateMatch)
        redirectToChat(immediateMatch.chat_room_id)
        return
      }

      console.log('No immediate match, polling every 500ms...')

      matchCheckInterval = setInterval(async () => {
        const activeMatch = await MatchingService.getActiveMatch(userId, guestUserId)

        if (activeMatch && activeMatch.chat_room_id) {
          console.log('✅ Found match via polling:', activeMatch)
          redirectToChat(activeMatch.chat_room_id)
        }
      }, 500)

    } catch (error) {
      console.error('Error during matching:', error)

      if (matchSubscription) matchSubscription.unsubscribe()
      if (matchCheckInterval) clearInterval(matchCheckInterval)

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
    <div className="h-screen overflow-hidden bg-gradient-to-br from-cyan-50 via-blue-50 to-slate-100 flex flex-col relative">
      <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-200 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSidebar(!showSidebar)}
            className="md:hidden"
          >
            {showSidebar ? <CloseIcon className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" onClick={handleBackHome} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Home
          </Button>

          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-cyan-600" />
            <span className="text-xl font-bold text-slate-800">FrozChat</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <FriendRequestNotification currentUser={user} />
          {user?.type === 'authenticated' && (
            <Button variant="ghost" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 flex p-6 overflow-hidden gap-6">
        {showSidebar && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}
        <div className={`${showSidebar ? 'fixed left-0 top-0 z-50' : 'hidden'} md:block md:relative md:z-auto`}>
          <FriendsSidebar currentUser={user} />
        </div>

        <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-5xl grid md:grid-cols-[320px_1fr] gap-6 h-full max-h-[calc(100vh-120px)]">
          <Card className="p-6 border-cyan-200 shadow-lg overflow-y-auto">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                <Snowflake className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-1">{displayName}</h2>
              <div className="inline-flex items-center gap-2 bg-cyan-100 text-cyan-800 px-3 py-1 rounded-full text-xs font-medium">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Online</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <User className="h-4 w-4 text-cyan-600" />
                <span className="font-medium">Type:</span>
                <span className="text-slate-800">{user.type === 'anonymous' ? 'Guest' : 'Member'}</span>
              </div>

              {user.gender && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <User className="h-4 w-4 text-cyan-600" />
                  <span className="font-medium">Gender:</span>
                  <span className="text-slate-800 capitalize">{user.gender}</span>
                </div>
              )}

              {user.age && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="h-4 w-4 text-cyan-600" />
                  <span className="font-medium">Age:</span>
                  <span className="text-slate-800">{user.age} years</span>
                </div>
              )}

              {user.country && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="h-4 w-4 text-cyan-600" />
                  <span className="font-medium">Location:</span>
                  <span className="text-slate-800">{user.country}</span>
                </div>
              )}
            </div>

            {user.type === 'anonymous' && !user.claimed_at && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-4 w-4 text-yellow-600" />
                  <h4 className="text-xs font-semibold text-yellow-800">Upgrade Account</h4>
                </div>
                <p className="text-xs text-yellow-700 mb-2">
                  Save your connections and preferences!
                </p>
                <Button
                  variant="outline"
                  onClick={handleClaimAccount}
                  className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                  size="sm"
                >
                  <Crown className="h-3 w-3 mr-1" />
                  Claim Now
                </Button>
              </div>
            )}

            {hasFilters && (
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <h4 className="text-xs font-semibold text-slate-700 mb-2">Active Filters</h4>
                <div className="space-y-1 text-xs text-slate-600">
                  {filters.gender && (
                    <div className="flex justify-between">
                      <span>Gender:</span>
                      <span className="font-medium text-slate-800 capitalize">{filters.gender}</span>
                    </div>
                  )}
                  {(filters.ageMin || filters.ageMax) && (
                    <div className="flex justify-between">
                      <span>Age:</span>
                      <span className="font-medium text-slate-800">{filters.ageMin}-{filters.ageMax}</span>
                    </div>
                  )}
                  {filters.country && (
                    <div className="flex justify-between">
                      <span>Country:</span>
                      <span className="font-medium text-slate-800">{filters.country}</span>
                    </div>
                  )}
                  {filters.interestTags && filters.interestTags.length > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="font-medium">Tags: </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {filters.interestTags.map(tag => (
                          <span key={tag} className="bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>

          <Card className="p-8 border-cyan-200 shadow-lg flex flex-col items-center justify-center">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-800 mb-3">
                Ready to Connect?
              </h1>
              <p className="text-slate-600 mb-6">
                Break the ice and start chatting with new people
              </p>
            </div>

            <div className="flex flex-col gap-4 w-full max-w-md">
              <Button
                onClick={() => setShowFilterModal(true)}
                size="lg"
                variant="outline"
                className="w-full h-14 text-lg border-2 border-cyan-300 hover:bg-cyan-50 hover:border-cyan-400 transition-all"
                disabled={searching}
              >
                <Filter className="h-5 w-5 mr-2" />
                {hasFilters ? 'Edit Filters' : 'Add Filters'}
                {hasFilters && (
                  <span className="ml-2 bg-cyan-600 text-white text-xs px-2 py-1 rounded-full">
                    Active
                  </span>
                )}
              </Button>

              <Button
                onClick={handleStartMatching}
                size="lg"
                className="w-full h-14 text-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-lg transition-all"
                disabled={searching}
              >
                {searching ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    Start Matching
                  </>
                )}
              </Button>
            </div>

            <p className="text-center text-sm text-slate-500 mt-8 max-w-md">
              {hasFilters
                ? 'We will match you with users meeting your criteria. If none are found, we will connect you with a random user.'
                : 'Click "Start Matching" to connect with a random user, or add filters for specific matches.'}
            </p>
          </Card>
        </div>
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
    </div>
  )
}
