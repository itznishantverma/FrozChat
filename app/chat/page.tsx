"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createOrGetGuestUser, registerPermanentUser, loginPermanentUser, generateSessionId, getClientIPDetails } from '@/lib/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Snowflake, Zap, User, Mail, Lock, Globe } from 'lucide-react';

interface CountryData {
  country_name: string;
  country_code: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('anonymous');
  const [country, setCountry] = useState<CountryData | null>(null);
  
  // Form states
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ 
    email: '', 
    gender: '', 
    age: '', 
    password: '', 
    confirmPassword: '' 
  });
  const [anonymousForm, setAnonymousForm] = useState({ gender: '', age: '' });

  useEffect(() => {
    const checkFirstTime = async () => {
      const isFirstTime = !localStorage.getItem("frozchat_user");
      
      if (isFirstTime) {
        // Fetch IP details for anonymous option
        const ipDetails = await getClientIPDetails();
        setCountry({ 
          country_name: ipDetails.country || 'Unknown', 
          country_code: ipDetails.country || 'XX' 
        });
        
        setShowModal(true);
      } else {
        // Redirect to chat room
        router.push('/chat/new');
      }
      
      setIsLoading(false);
    };

    checkFirstTime();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (loginForm.email && loginForm.password) {
      try {
        const { data: user, error } = await loginPermanentUser(loginForm.email, loginForm.password);
        
        if (error || !user) {
          alert('Login failed: ' + (error || 'Invalid credentials'));
          setIsSubmitting(false);
          return;
        }

        localStorage.setItem("frozchat_user", "true");
        localStorage.setItem("frozchat_auth_type", "login");
        localStorage.setItem("frozchat_user_data", JSON.stringify({
          id: user.id,
          email: user.email,
          type: 'permanent'
        }));
        
        router.push('/chat/new');
      } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
        setIsSubmitting(false);
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (signupForm.email && signupForm.password && signupForm.confirmPassword && 
        signupForm.gender && signupForm.age && signupForm.password === signupForm.confirmPassword) {
      try {
        const { data: user, error } = await registerPermanentUser(
          signupForm.email, 
          signupForm.password,
          {
            gender: signupForm.gender,
            age: parseInt(signupForm.age)
          }
        );
        
        if (error || !user) {
          alert('Signup failed: ' + (error || 'Registration failed'));
          setIsSubmitting(false);
          return;
        }

        localStorage.setItem("frozchat_user", "true");
        localStorage.setItem("frozchat_auth_type", "signup");
        localStorage.setItem("frozchat_user_data", JSON.stringify({
          id: user.id,
          email: user.email,
          gender: signupForm.gender,
          age: signupForm.age,
          type: 'permanent'
        }));
        
        router.push('/chat/new');
      } catch (error) {
        console.error('Signup error:', error);
        alert('Signup failed. Please try again.');
        setIsSubmitting(false);
      }
    } else {
      alert('Please fill all fields correctly and ensure passwords match.');
      setIsSubmitting(false);
    }
  };

  const handleAnonymous = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (anonymousForm.gender && anonymousForm.age) {
      try {
        const sessionId = generateSessionId();
        
        const { data: guestUser, error } = await createOrGetGuestUser(sessionId, {
          gender: anonymousForm.gender,
          age: parseInt(anonymousForm.age),
          country: country?.country_name || 'Unknown'
        });
        
        if (error || !guestUser) {
          alert('Failed to create guest account: ' + (error || 'Unknown error'));
          setIsSubmitting(false);
          return;
        }

        localStorage.setItem("frozchat_user", "true");
        localStorage.setItem("frozchat_auth_type", "anonymous");
        localStorage.setItem("frozchat_session_id", sessionId);
        localStorage.setItem("frozchat_user_data", JSON.stringify({
          id: guestUser.id,
          session_id: sessionId,
          gender: guestUser.gender,
          age: guestUser.age,
          country: guestUser.country,
          type: 'guest'
        }));
        
        router.push('/chat/new');
      } catch (error) {
        console.error('Anonymous signup error:', error);
        alert('Failed to create anonymous account. Please try again.');
        setIsSubmitting(false);
      }
    } else {
      alert('Please fill all required fields.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#3bb7ff]/10 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Snowflake className="h-12 w-12 text-[#3bb7ff] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3bb7ff]/10 via-white to-blue-50">
      <Dialog open={showModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl bg-white/95 backdrop-blur-md">
          <DialogHeader className="text-center pb-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Snowflake className="h-8 w-8 text-[#3bb7ff]" />
              <DialogTitle className="text-2xl font-bold text-[#0a192f]">Welcome to FrozChat</DialogTitle>
            </div>
            <p className="text-gray-600">Choose how you'd like to join the conversation</p>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-100">
              <TabsTrigger value="login" className="data-[state=active]:bg-white">Login</TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-white">Signup</TabsTrigger>
              <TabsTrigger value="anonymous" className="data-[state=active]:bg-[#3bb7ff] data-[state=active]:text-white relative">
                Anonymous
                <Zap className="h-3 w-3 ml-1" />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="Enter your email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                    required
                    className="border-gray-200 focus:border-[#3bb7ff]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="flex items-center space-x-2">
                    <Lock className="h-4 w-4" />
                    <span>Password</span>
                  </Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                    required
                    className="border-gray-200 focus:border-[#3bb7ff]"
                  />
                </div>
                <Button type="submit" className="w-full bg-[#3bb7ff] hover:bg-[#2da5e8] text-white">
                  {isSubmitting ? 'Logging in...' : 'Login & Start Chatting'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({...signupForm, email: e.target.value})}
                    required
                    className="border-gray-200 focus:border-[#3bb7ff]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-gender">Gender</Label>
                    <Select value={signupForm.gender} onValueChange={(value) => setSignupForm({...signupForm, gender: value})}>
                      <SelectTrigger className="border-gray-200 focus:border-[#3bb7ff]">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-age">Age</Label>
                    <Input
                      id="signup-age"
                      type="number"
                      placeholder="Age"
                      min="13"
                      max="100"
                      value={signupForm.age}
                      onChange={(e) => setSignupForm({...signupForm, age: e.target.value})}
                      required
                      className="border-gray-200 focus:border-[#3bb7ff]"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="flex items-center space-x-2">
                    <Lock className="h-4 w-4" />
                    <span>Password</span>
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create password"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({...signupForm, password: e.target.value})}
                    required
                    className="border-gray-200 focus:border-[#3bb7ff]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="Confirm password"
                    value={signupForm.confirmPassword}
                    onChange={(e) => setSignupForm({...signupForm, confirmPassword: e.target.value})}
                    required
                    className="border-gray-200 focus:border-[#3bb7ff]"
                  />
                </div>
                <Button type="submit" className="w-full bg-[#3bb7ff] hover:bg-[#2da5e8] text-white">
                  {isSubmitting ? 'Creating Account...' : 'Create Account & Start Chatting'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="anonymous" className="mt-6">
              <Card className="border-[#3bb7ff]/20 bg-[#3bb7ff]/5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-[#3bb7ff]">
                    <Zap className="h-5 w-5" />
                    <span>Quick Start - No Registration</span>
                  </CardTitle>
                  <CardDescription>
                    Jump in instantly and start chatting anonymously
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAnonymous} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="anon-gender" className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span>Gender</span>
                        </Label>
                        <Select value={anonymousForm.gender} onValueChange={(value) => setAnonymousForm({...anonymousForm, gender: value})}>
                          <SelectTrigger className="border-gray-200 focus:border-[#3bb7ff]">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="anon-age">Age</Label>
                        <Input
                          id="anon-age"
                          type="number"
                          placeholder="Age"
                          min="13"
                          max="100"
                          value={anonymousForm.age}
                          onChange={(e) => setAnonymousForm({...anonymousForm, age: e.target.value})}
                          required
                          className="border-gray-200 focus:border-[#3bb7ff]"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center space-x-2">
                        <Globe className="h-4 w-4" />
                        <span>Country (Auto-detected)</span>
                      </Label>
                      <Input
                        value={country?.country_name || 'Detecting...'}
                        disabled
                        className="bg-gray-50 border-gray-200"
                      />
                    </div>
                    <Button type="submit" className="w-full bg-[#3bb7ff] hover:bg-[#2da5e8] text-white">
                      <Zap className="h-4 w-4 mr-2" />
                      {isSubmitting ? 'Creating Account...' : 'Start Chatting Anonymously'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}