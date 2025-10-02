'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { X, Plus } from 'lucide-react'

export interface FilterOptions {
  gender?: string
  ageMin?: number
  ageMax?: number
  country?: string
  interestTags?: string[]
}

interface FilterModalProps {
  isOpen: boolean
  onClose: () => void
  onApplyFilters: (filters: FilterOptions) => void
  currentFilters?: FilterOptions
}

const COMMON_INTERESTS = [
  'Sports', 'Music', 'Gaming', 'Movies', 'Travel', 'Reading',
  'Cooking', 'Art', 'Photography', 'Technology', 'Fitness',
  'Fashion', 'Anime', 'Dancing', 'Writing', 'Nature'
]

const COMMON_COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia',
  'Germany', 'France', 'Spain', 'Italy', 'Japan', 'India',
  'Brazil', 'Mexico', 'South Korea', 'Netherlands', 'Sweden'
]

export default function FilterModal({ isOpen, onClose, onApplyFilters, currentFilters }: FilterModalProps) {
  const [gender, setGender] = useState<string>(currentFilters?.gender || '')
  const [ageRange, setAgeRange] = useState<number[]>([
    currentFilters?.ageMin || 18,
    currentFilters?.ageMax || 65
  ])
  const [country, setCountry] = useState<string>(currentFilters?.country || '')
  const [interestTags, setInterestTags] = useState<string[]>(currentFilters?.interestTags || [])
  const [customTag, setCustomTag] = useState('')

  useEffect(() => {
    if (isOpen) {
      setGender(currentFilters?.gender || '')
      setAgeRange([
        currentFilters?.ageMin || 18,
        currentFilters?.ageMax || 65
      ])
      setCountry(currentFilters?.country || '')
      setInterestTags(currentFilters?.interestTags || [])
      setCustomTag('')
    }
  }, [isOpen, currentFilters])

  const handleAddInterest = (interest: string) => {
    if (!interestTags.includes(interest) && interestTags.length < 10) {
      setInterestTags([...interestTags, interest])
    }
  }

  const handleAddCustomTag = () => {
    if (customTag.trim() && !interestTags.includes(customTag.trim()) && interestTags.length < 10) {
      setInterestTags([...interestTags, customTag.trim()])
      setCustomTag('')
    }
  }

  const handleRemoveInterest = (interest: string) => {
    setInterestTags(interestTags.filter(tag => tag !== interest))
  }

  const handleApply = () => {
    const filters: FilterOptions = {}

    if (gender && gender !== 'any') {
      filters.gender = gender
    }

    filters.ageMin = ageRange[0]
    filters.ageMax = ageRange[1]

    if (country && country !== 'any') {
      filters.country = country
    }

    if (interestTags.length > 0) {
      filters.interestTags = interestTags
    }

    onApplyFilters(filters)
    onClose()
  }

  const handleClearAll = () => {
    setGender('')
    setAgeRange([18, 65])
    setCountry('')
    setInterestTags([])
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-cyan-800">
            Filter Your Match
          </DialogTitle>
          <p className="text-sm text-slate-600">
            Customize your search preferences to find the perfect chat partner
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="gender" className="text-base font-semibold">
              Gender
            </Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger id="gender">
                <SelectValue placeholder="Any gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Gender</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="non-binary">Non-Binary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Age Range</Label>
              <span className="text-sm font-medium text-cyan-700">
                {ageRange[0]} - {ageRange[1]} years
              </span>
            </div>
            <Slider
              value={ageRange}
              onValueChange={setAgeRange}
              min={13}
              max={120}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>13</span>
              <span>120</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country" className="text-base font-semibold">
              Country
            </Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger id="country">
                <SelectValue placeholder="Any country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Country</SelectItem>
                {COMMON_COUNTRIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Interest Tags ({interestTags.length}/10)
            </Label>

            {interestTags.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                {interestTags.map(tag => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-cyan-600 text-white hover:bg-cyan-700 px-3 py-1"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveInterest(tag)}
                      className="ml-2 hover:text-red-200"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm text-slate-600">Popular Interests:</p>
              <div className="flex flex-wrap gap-2">
                {COMMON_INTERESTS.map(interest => (
                  <Badge
                    key={interest}
                    variant="outline"
                    className={`cursor-pointer transition-colors ${
                      interestTags.includes(interest)
                        ? 'bg-cyan-100 border-cyan-400 text-cyan-800'
                        : 'hover:bg-slate-100'
                    }`}
                    onClick={() => handleAddInterest(interest)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Add custom interest..."
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddCustomTag()
                  }
                }}
                maxLength={20}
              />
              <Button
                type="button"
                onClick={handleAddCustomTag}
                disabled={!customTag.trim() || interestTags.length >= 10}
                variant="outline"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {interestTags.length >= 10 && (
              <p className="text-xs text-amber-600">
                Maximum 10 interest tags reached
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClearAll}>
            Clear All
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply} className="bg-cyan-600 hover:bg-cyan-700">
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
