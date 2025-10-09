'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Crown, Mail, Lock, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ClaimAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (userData: any) => void
  guestData: any
}

const ClaimAccountModal = ({ isOpen, onClose, onSuccess, guestData }: ClaimAccountModalProps) => {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  })

  const handleClaimAccount = async () => {
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: undefined,
        }
      })

      if (authError) {
        console.error('Auth signup failed:', authError)
        alert('Failed to create account: ' + authError.message)
        setLoading(false)
        return
      }

      if (!authData.user) {
        alert('Failed to create account. Please try again.')
        setLoading(false)
        return
      }

      await new Promise(resolve => setTimeout(resolve, 1000))

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle()

      if (profileError) {
        console.error('Failed to fetch profile:', profileError)
      }

      const { data: updatedProfile } = await supabase
        .from('profiles')
        .update({
          gender: guestData.gender,
          age: guestData.age,
          country: guestData.country
        })
        .eq('id', authData.user.id)
        .select()
        .single()

      const sessionToken = guestData.session_token || guestData.sessionToken
      if (sessionToken) {
        await supabase
          .from('guest_users')
          .update({
            claimed_at: new Date().toISOString(),
            claimed_by: authData.user.id
          })
          .eq('session_token', sessionToken)
      }

      const userData = {
        ...(updatedProfile || profile),
        user: authData.user,
        email: formData.email,
        type: 'authenticated',
        claimed: true,
        username: (updatedProfile || profile)?.username || 'User'
      }

      localStorage.setItem('frozChatSession', JSON.stringify(userData))

      setStep(2)
      setTimeout(() => {
        onSuccess(userData)
        onClose()
      }, 2000)
    } catch (error) {
      console.error('Account claiming failed:', error)
      alert('Failed to claim account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderStep1 = () => (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-center">
          <Crown className="h-5 w-5 text-yellow-600" />
          Claim Your Anonymous Session
        </DialogTitle>
      </DialogHeader>

      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <h3 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Why Claim Your Account?
          </h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Keep your chat history forever</li>
            <li>• Add friends and reconnect later</li>
            <li>• Sync across multiple devices</li>
            <li>• Enhanced privacy controls</li>
            <li>• Priority matching with active users</li>
          </ul>
        </CardContent>
      </Card>

      <div className="bg-cyan-50 rounded-lg p-4">
        <h4 className="font-semibold text-cyan-800 mb-2">Your Current Session:</h4>
        <div className="text-sm text-cyan-700 space-y-1">
          <p><strong>Username:</strong> {guestData?.username || 'Anonymous'}</p>
          <p><strong>Profile:</strong> {guestData?.gender}, Age {guestData?.age}</p>
          <p><strong>Location:</strong> {guestData?.country}</p>
          <p><strong>Session ID:</strong> {(guestData?.sessionToken || guestData?.session_token)?.slice(0, 8)}...</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <Input
            type="email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Create Password
          </label>
          <Input
            type="password"
            placeholder="Choose a strong password"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Password
          </label>
          <Input
            type="password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
          />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Maybe Later
          </Button>
          <Button
            onClick={handleClaimAccount}
            disabled={loading || !formData.email || !formData.password || !formData.confirmPassword}
            className="flex-1"
          >
            {loading ? 'Claiming...' : 'Claim Account'}
          </Button>
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="h-10 w-10 text-green-600" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900">Account Claimed Successfully!</h2>

      <p className="text-gray-600">
        Your anonymous session has been converted to a permanent account.
        You can now access all premium features of FrozChat.
      </p>

      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <h3 className="font-semibold text-green-800 mb-2">What's Next?</h3>
          <div className="text-sm text-green-700 space-y-1">
            <p>✓ Your chat history is now saved</p>
            <p>✓ You can customize your profile</p>
            <p>✓ Friend system is now available</p>
            <p>✓ Cross-device sync enabled</p>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-gray-500">
        Redirecting you back to chat...
      </p>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
      </DialogContent>
    </Dialog>
  )
}

export default ClaimAccountModal