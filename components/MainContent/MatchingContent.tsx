'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Filter, Play, Loader as Loader2 } from 'lucide-react'
import { FilterOptions } from '@/components/FilterModal'
import { Badge } from '@/components/ui/badge'

interface MatchingContentProps {
  searching: boolean
  hasFilters: boolean
  filters: FilterOptions
  onShowFilters: () => void
  onStartMatching: () => void
}

export default function MatchingContent({
  searching,
  hasFilters,
  filters,
  onShowFilters,
  onStartMatching
}: MatchingContentProps) {
  return (
    <Card className="h-full flex flex-col items-center justify-center p-8 border-cyan-200 bg-white shadow-lg">
      <div className="text-center mb-8 max-w-xl">
        <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
          <Play className="h-12 w-12 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-slate-800 mb-4">
          Ready to Connect?
        </h1>
        <p className="text-lg text-slate-600">
          Break the ice and start chatting with new people around the world
        </p>
      </div>

      {hasFilters && (
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-4 mb-6 w-full max-w-md border border-cyan-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-700">Active Filters</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowFilters}
              className="h-7 text-xs"
            >
              Edit
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.gender && (
              <Badge variant="secondary" className="bg-cyan-100 text-cyan-800">
                Gender: {filters.gender}
              </Badge>
            )}
            {(filters.ageMin || filters.ageMax) && (
              <Badge variant="secondary" className="bg-cyan-100 text-cyan-800">
                Age: {filters.ageMin}-{filters.ageMax}
              </Badge>
            )}
            {filters.country && (
              <Badge variant="secondary" className="bg-cyan-100 text-cyan-800">
                {filters.country}
              </Badge>
            )}
            {filters.interestTags && filters.interestTags.length > 0 && (
              filters.interestTags.map(tag => (
                <Badge key={tag} variant="secondary" className="bg-cyan-100 text-cyan-800">
                  {tag}
                </Badge>
              ))
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 w-full max-w-md">
        <Button
          onClick={onShowFilters}
          size="lg"
          variant="outline"
          className="w-full h-14 text-lg border-2 border-cyan-300 hover:bg-cyan-50 hover:border-cyan-400 transition-all"
          disabled={searching}
        >
          <Filter className="h-5 w-5 mr-2" />
          {hasFilters ? 'Edit Filters' : 'Add Filters'}
          {hasFilters && (
            <Badge className="ml-2 bg-cyan-600 text-white">
              Active
            </Badge>
          )}
        </Button>

        <Button
          onClick={onStartMatching}
          size="lg"
          className="w-full h-16 text-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-xl hover:shadow-2xl transition-all duration-200 font-bold"
          disabled={searching}
        >
          {searching ? (
            <>
              <Loader2 className="h-6 w-6 mr-3 animate-spin" />
              Searching for Match...
            </>
          ) : (
            <>
              <Play className="h-6 w-6 mr-3" />
              Start Matching
            </>
          )}
        </Button>
      </div>

      <div className="mt-8 max-w-md">
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <p className="text-sm text-slate-600 text-center leading-relaxed">
            {hasFilters
              ? 'We will match you with users meeting your criteria. If none are found, we will connect you with a random user.'
              : 'Click "Start Matching" to connect with a random user, or add filters for specific matches.'}
          </p>
        </div>
      </div>

      {searching && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <div className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      )}
    </Card>
  )
}
