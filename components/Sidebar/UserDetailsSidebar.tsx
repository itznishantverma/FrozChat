'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { User, MapPin, Calendar, Crown, LogOut } from 'lucide-react'

interface UserDetailsSidebarProps {
  user: any
  displayName: string
  onClaimAccount?: () => void
  onLogout?: () => void
}

export default function UserDetailsSidebar({
  user,
  displayName,
  onClaimAccount,
  onLogout
}: UserDetailsSidebarProps) {
  return (
    <Card className="h-full flex flex-col border-cyan-200 bg-white shadow-lg overflow-hidden">
      <div className="p-6 border-b border-cyan-200 bg-gradient-to-br from-cyan-50 via-blue-50 to-slate-50">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <User className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2 truncate">
            {displayName}
          </h2>
          <Badge variant="secondary" className="bg-cyan-100 text-cyan-800">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
            Online
          </Badge>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Profile Info
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <User className="h-4 w-4 text-cyan-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500">Account Type</p>
                <p className="text-sm font-medium text-slate-800">
                  {user.type === 'anonymous' ? 'Guest User' : 'Member'}
                </p>
              </div>
            </div>

            {user.gender && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <User className="h-4 w-4 text-cyan-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">Gender</p>
                  <p className="text-sm font-medium text-slate-800 capitalize">
                    {user.gender}
                  </p>
                </div>
              </div>
            )}

            {user.age && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Calendar className="h-4 w-4 text-cyan-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">Age</p>
                  <p className="text-sm font-medium text-slate-800">
                    {user.age} years
                  </p>
                </div>
              </div>
            )}

            {user.country && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <MapPin className="h-4 w-4 text-cyan-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">Location</p>
                  <p className="text-sm font-medium text-slate-800">
                    {user.country}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {user.type === 'anonymous' && !user.claimed_at && onClaimAccount && (
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0">
                <Crown className="h-5 w-5 text-yellow-900" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-yellow-900 mb-1">
                  Upgrade Your Account
                </h4>
                <p className="text-xs text-yellow-800">
                  Save your connections, preferences, and chat history forever!
                </p>
              </div>
            </div>
            <Button
              onClick={onClaimAccount}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold shadow-md"
              size="sm"
            >
              <Crown className="h-4 w-4 mr-2" />
              Claim Account Now
            </Button>
          </div>
        )}
      </div>

      {user.type === 'authenticated' && onLogout && (
        <div className="p-4 border-t border-slate-200">
          <Button
            variant="outline"
            onClick={onLogout}
            className="w-full border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      )}
    </Card>
  )
}
