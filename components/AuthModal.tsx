'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { UserCheck, Mail, Lock, Calendar, Users, Snowflake } from 'lucide-react'
import IPService, { type IPDetails, type DeviceInfo } from '@/lib/ip-service'
import UsernameGenerator from '@/lib/username-generator'
import { supabase } from '@/lib/supabase'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (userData: any) => void
}

type AuthMode = 'choose' | 'anonymous' | 'login' | 'signup' | 'claim'

const AuthModal = ({ isOpen, onClose, onSuccess }: AuthModalProps) => {
  const [mode, setMode] = useState<AuthMode>('choose')
  const [loading, setLoading] = useState(false)
  const [ipDetails, setIpDetails] = useState<IPDetails | null>(null)
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    gender: '',
    age: '',
  })

  useEffect(() => {
    if (isOpen) {
      const ipService = IPService.getInstance()

      // Get device info immediately
      const device = ipService.getDeviceInfo()
      setDeviceInfo(device)

      // Get IP details
      ipService.getIPDetails().then(setIpDetails)
    }
  }, [isOpen])

  const handleAnonymousJoin = async () => {
    setLoading(true)
    try {
      const ipService = IPService.getInstance()
      const usernameGen = UsernameGenerator.getInstance()
      const sessionToken = ipService.generateSessionToken()

      // Generate unique username
      const username = await usernameGen.generateUniqueUsername(async (username) => {
        const { data } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', username)
          .maybeSingle()

        if (data) return true

        const { data: guestData } = await supabase
          .from('guest_users')
          .select('username')
          .eq('username', username)
          .maybeSingle()

        return !!guestData
      })

      // Convert IP to proper format
      let lastIp = null
      if (ipDetails?.ip) {
        lastIp = ipDetails.ip
      }

      // Create guest user record in Supabase
      const { data: guestUser, error } = await supabase
        .from('guest_users')
        .insert({
          session_token: sessionToken,
          username: username,
          display_name: username,
          gender: formData.gender,
          age: parseInt(formData.age),
          country: ipDetails?.country || null,
          ip_details: ipDetails || {},
          device_info: deviceInfo || {},
          is_online: true,
          last_seen_at: new Date().toISOString()
        })
        .select()
        .single()

      // Update IP tracking separately using the helper function
      if (!error && guestUser && lastIp) {
        await supabase.rpc('update_guest_user_info', {
          p_guest_user_id: guestUser.id,
          p_ip_address: lastIp,
          p_ip_details: ipDetails || {},
          p_device_info: deviceInfo || {}
        })
      }

      if (error) {
        console.error('Failed to create guest user:', error)
        throw error
      }

      const guestData = {
        ...guestUser,
        sessionToken,
        type: 'anonymous'
      }

      // Store session info locally for quick access
      localStorage.setItem('frozChatSession', JSON.stringify(guestData))

      onSuccess(guestData)
      onClose()
    } catch (error) {
      console.error('Anonymous join failed:', error)
      alert('Failed to join anonymously. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      })

      if (error) {
        console.error('Login failed:', error)
        alert('Login failed: ' + error.message)
        return
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user?.id)
        .single()

      // Update session tracking info on login
      await supabase.rpc('update_user_session_info', {
        p_user_id: data.user?.id,
        p_ip_address: ipDetails?.ip || null,
        p_ip_details: ipDetails || {},
        p_device_info: deviceInfo || {}
      })

      const userData = {
        ...profile,
        user: data.user,
        type: 'authenticated'
      }

      localStorage.setItem('frozChatSession', JSON.stringify(userData))

      onSuccess(userData)
      onClose()
    } catch (error) {
      console.error('Login failed:', error)
      alert('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async () => {
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      // Sign up with Supabase Auth (with email confirmation disabled)
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: undefined, // No email confirmation
        }
      })

      if (error) {
        console.error('Signup failed:', error)
        alert('Signup failed: ' + error.message)
        return
      }

      if (!data.user) {
        alert('Signup failed. Please try again.')
        return
      }

      // Use the safe profile update function that waits for trigger
      const { data: updatedProfile, error: updateError } = await supabase.rpc(
        'update_profile_after_signup',
        {
          p_user_id: data.user.id,
          p_gender: formData.gender,
          p_age: parseInt(formData.age),
          p_country: ipDetails?.country || null,
          p_bio: null,
          p_ip_address: ipDetails?.ip || null,
          p_ip_details: ipDetails || {},
          p_device_info: deviceInfo || {},
          p_session_data: {}
        }
      )

      if (updateError) {
        console.error('Failed to update profile:', updateError)
        // Continue anyway, we can update later
      }

      // Get the full profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      const userData = {
        ...profile,
        user: data.user,
        type: 'authenticated'
      }

      localStorage.setItem('frozChatSession', JSON.stringify(userData))

      onSuccess(userData)
      onClose()
    } catch (error) {
      console.error('Signup failed:', error)
      alert('Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      gender: '',
      age: '',
    })
  }

  const renderChooseMode = () => (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="text-2xl text-center flex items-center justify-center gap-2">
          <Snowflake className="h-6 w-6 text-cyan-600" />
          Welcome to FrozChat
        </DialogTitle>
      </DialogHeader>

      <div className="text-center text-gray-600 mb-6">
        Choose how you'd like to start chatting in our frozen sanctuary
      </div>

      <div className="grid gap-4">
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow border-cyan-200 hover:border-cyan-300"
          onClick={() => setMode('anonymous')}
        >
          <CardContent className="p-6 text-center">
            <UserCheck className="h-8 w-8 text-cyan-600 mx-auto mb-3" />
            <h3 className="font-semibold text-lg mb-2">Join Anonymously</h3>
            <p className="text-sm text-gray-600">
              Start chatting instantly without creating an account.
              You can claim your session later.
            </p>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow border-slate-200 hover:border-slate-300"
            onClick={() => setMode('login')}
          >
            <CardContent className="p-6 text-center">
              <Mail className="h-8 w-8 text-slate-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Login</h3>
              <p className="text-sm text-gray-600">
                Access your existing account
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow border-slate-200 hover:border-slate-300"
            onClick={() => setMode('signup')}
          >
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-slate-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Sign Up</h3>
              <p className="text-sm text-gray-600">
                Create a new account
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )

  const renderAnonymousForm = () => (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-cyan-600" />
          Join Anonymously
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Gender
          </label>
          <Select value={formData.gender} onValueChange={(value) =>
            setFormData(prev => ({ ...prev, gender: value }))
          }>
            <SelectTrigger>
              <SelectValue placeholder="Select your gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="non-binary">Non-binary</SelectItem>
              <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Age
          </label>
          <Input
            type="number"
            placeholder="Enter your age"
            value={formData.age}
            onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
            min="13"
            max="120"
          />
        </div>

        {ipDetails && (
          <div className="bg-cyan-50 p-3 rounded-lg">
            <p className="text-sm text-cyan-700">
              📍 Detected location: {ipDetails.city}, {ipDetails.country}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setMode('choose')}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            onClick={handleAnonymousJoin}
            disabled={loading || !formData.gender || !formData.age}
            className="flex-1"
          >
            {loading ? 'Joining...' : 'Join Anonymously'}
          </Button>
        </div>
      </div>
    </div>
  )

  const renderLoginForm = () => (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-slate-600" />
          Login to FrozChat
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
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
            Password
          </label>
          <Input
            type="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
          />
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setMode('choose')}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            onClick={handleLogin}
            disabled={loading || !formData.email || !formData.password}
            className="flex-1"
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </div>
      </div>
    </div>
  )

  const renderSignupForm = () => (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-slate-600" />
          Create Account
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
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
            Password
          </label>
          <Input
            type="password"
            placeholder="Create a strong password"
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gender
            </label>
            <Select value={formData.gender} onValueChange={(value) =>
              setFormData(prev => ({ ...prev, gender: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="non-binary">Non-binary</SelectItem>
                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Age
            </label>
            <Input
              type="number"
              placeholder="Age"
              value={formData.age}
              onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
              min="13"
              max="120"
            />
          </div>
        </div>

        {ipDetails && (
          <div className="bg-slate-50 p-3 rounded-lg">
            <p className="text-sm text-slate-700">
              📍 Your location: {ipDetails.city}, {ipDetails.country}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setMode('choose')}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            onClick={handleSignup}
            disabled={loading || !formData.email || !formData.password || !formData.gender || !formData.age}
            className="flex-1"
          >
            {loading ? 'Creating...' : 'Sign Up'}
          </Button>
        </div>
      </div>
    </div>
  )

  const handleClose = () => {
    resetForm()
    setMode('choose')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {mode === 'choose' && renderChooseMode()}
        {mode === 'anonymous' && renderAnonymousForm()}
        {mode === 'login' && renderLoginForm()}
        {mode === 'signup' && renderSignupForm()}
      </DialogContent>
    </Dialog>
  )
}

export default AuthModal