'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Filter, Play, Loader as Loader2, User, MapPin, Calendar, Crown } from 'lucide-react'
import { MatchingService } from '@/lib/matching-service'
import { useToast } from '@/hooks/use-toast'
import FilterModal, { FilterOptions } from '@/components/FilterModal'
import ClaimAccountModal from '@/components/ClaimAccountModal'
import IPService from '@/lib/ip-service'

interface MatchingInterfaceProps {
  currentUser: any
  onUserUpdate?: (userData: any) => void
}

export default function MatchingInterface({ currentUser, onUserUpdate }: MatchingInterfaceProps) {
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [searching, setSearching] = useState(false)
  const [filters, setFilters] = useState<FilterOptions>({})
  const [hasFilters, setHasFilters] = useState(false)
  const [userIp, setUserIp] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (currentUser) {
      loadFilters()
      fetchUserIp().catch(err => console.error('IP fetch failed:', err))
    }
  }, [currentUser])

  useEffect(() => {
    if (!searching || !currentUser) return

    const userId = currentUser.type === 'authenticated' ? currentUser.id : undefined
    const guestUserId = currentUser.type === 'anonymous' ? currentUser.id : undefined

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
  }, [searching, currentUser])

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

  const loadFilters = async () => {
    if (!currentUser) return

    const userId = currentUser.type === 'authenticated' ? currentUser.id : undefined
    const guestId = currentUser.type === 'anonymous' ? currentUser.id : undefined

    const savedFilters = await MatchingService.getSavedFilters(userId, guestId)
    if (savedFilters) {
      setFilters(savedFilters)
      setHasFilters(Object.keys(savedFilters).length > 0)
    }
  }

  const handleApplyFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters)
    setHasFilters(Object.keys(newFilters).length > 0)

    if (currentUser) {
      MatchingService.saveFiltersToProfile(
        currentUser.type === 'authenticated' ? currentUser.id : undefined,
        currentUser.type === 'anonymous' ? currentUser.id : undefined,
        newFilters
      )
    }

    toast({
      title: 'Filters Applied',
      description: 'Your matching preferences have been saved.',
    })
  }

  const handleClaimAccount = () => {
    setShowClaimModal(true)
  }

  const handleClaimSuccess = (userData: any) => {
    setShowClaimModal(false)
    if (onUserUpdate) {
      onUserUpdate(userData)
    }
  }

  const handleStartMatching = async () => {
    if (!currentUser) return

    console.log('🔍 Starting new match search...')
    setSearching(true)

    const userId = currentUser.type === 'authenticated' ? currentUser.id : undefined
    const guestUserId = currentUser.type === 'anonymous' ? currentUser.id : undefined
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

  if (!currentUser) return null

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="w-full max-w-5xl mx-auto grid md:grid-cols-[320px_1fr] gap-6">
          <Card className="p-6 border-cyan-200 shadow-lg h-fit">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                <User className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-1">{currentUser.username}</h2>
              <div className="inline-flex items-center gap-2 bg-cyan-100 text-cyan-800 px-3 py-1 rounded-full text-xs font-medium">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Online</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <User className="h-4 w-4 text-cyan-600" />
                <span className="font-medium">Type:</span>
                <span className="text-slate-800">{currentUser.type === 'anonymous' ? 'Guest' : 'Member'}</span>
              </div>

              {currentUser.gender && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <User className="h-4 w-4 text-cyan-600" />
                  <span className="font-medium">Gender:</span>
                  <span className="text-slate-800 capitalize">{currentUser.gender}</span>
                </div>
              )}

              {currentUser.age && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="h-4 w-4 text-cyan-600" />
                  <span className="font-medium">Age:</span>
                  <span className="text-slate-800">{currentUser.age} years</span>
                </div>
              )}

              {currentUser.country && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="h-4 w-4 text-cyan-600" />
                  <span className="font-medium">Location:</span>
                  <span className="text-slate-800">{currentUser.country}</span>
                </div>
              )}
            </div>

            {currentUser.type === 'anonymous' && !currentUser.claimed_at && (
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
        guestData={currentUser}
      />
    </div>
  )
}
