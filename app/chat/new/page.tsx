"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { joinWaitingRoom, findMatch } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Snowflake, MessageCircle, Users, Globe, User, Settings, Circle, Menu, Loader2 } from 'lucide-react';
import { ChatSidebar } from '@/components/chat-sidebar';

interface UserData {
  id: string;
  type: 'permanent' | 'guest';
  email?: string;
  session_id?: string;
  gender?: string;
  age?: string;
  country?: string;
}

export default function ChatNewPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const hasUser = localStorage.getItem("frozchat_user");
      
      if (!hasUser) {
        router.push('/chat');
        return;
      }

      const userDataStr = localStorage.getItem("frozchat_user_data");
      if (userDataStr) {
        try {
          const data = JSON.parse(userDataStr);
          setUserData(data);
        } catch (error) {
          console.error('Failed to parse user data:', error);
        }
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleFindRandomChat = async () => {
    if (!userData) return;
    
    setIsSearching(true);
    
    try {
      // Join waiting room
      const { error: joinError } = await joinWaitingRoom(
        userData.id,
        userData.type,
        { gender: userData.gender, age: userData.age }
      );
      
      if (joinError) {
        console.error('Failed to join waiting room:', joinError);
        alert('Failed to start searching. Please try again.');
        setIsSearching(false);
        return;
      }
      
      // Poll for matches every 2 seconds
      const matchInterval = setInterval(async () => {
        const { data: chatRoom, error } = await findMatch(userData.id);
        
        if (chatRoom) {
          clearInterval(matchInterval);
          setIsSearching(false);
          // Redirect to chat room
          router.push(`/chat/room/${chatRoom.id}`);
        } else if (error && error !== 'No match found yet') {
          console.error('Match finding error:', error);
          clearInterval(matchInterval);
          setIsSearching(false);
          alert('Error finding match. Please try again.');
        }
      }, 2000);
      
      // Stop searching after 30 seconds
      setTimeout(() => {
        clearInterval(matchInterval);
        if (isSearching) {
          setIsSearching(false);
          alert('No match found. Please try again later.');
        }
      }, 30000);
      
    } catch (error) {
      console.error('Search error:', error);
      setIsSearching(false);
      alert('Failed to start searching. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#3bb7ff]/10 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Snowflake className="h-12 w-12 text-[#3bb7ff] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading chat room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3bb7ff]/10 via-white to-blue-50 flex relative">
      {/* Sidebar Component */}
      <ChatSidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        backUrl="/"
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Top Header */}
        <header className="bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarOpen(true)}
                className="text-gray-600 hover:text-[#3bb7ff] lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#0a192f]">Welcome to FrozChat</h1>
                <p className="text-sm sm:text-base text-gray-600">You are now connected and ready to chat!</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                <span className="hidden sm:inline">Online</span>
              </div>
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-[#3bb7ff]">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Chat Area */}
        <div className="flex-1 p-4 sm:p-6 flex flex-col justify-center">
          <div className="max-w-6xl mx-auto w-full">
            <div className="grid lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Profile Card */}
              <Card className="border-[#3bb7ff]/20 bg-white/80 backdrop-blur-sm lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-[#0a192f]">
                    <User className="h-5 w-5" />
                    <span>Your Profile</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full" />
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className="font-medium text-green-600">Connected</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 bg-[#3bb7ff] rounded-full" />
                    <span className="text-sm text-gray-600">Type:</span>
                    <span className="font-medium capitalize">
                      {userData?.type === 'guest' ? 'Anonymous' : 'Registered'}
                    </span>
                  </div>

                  {userData?.gender && (
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-[#3bb7ff] rounded-full" />
                      <span className="text-sm text-gray-600">Gender:</span>
                      <span className="font-medium capitalize">{userData.gender}</span>
                    </div>
                  )}

                  {userData?.age && (
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-[#3bb7ff] rounded-full" />
                      <span className="text-sm text-gray-600">Age:</span>
                      <span className="font-medium">{userData.age}</span>
                    </div>
                  )}

                  {userData?.country && (
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4 text-[#3bb7ff]" />
                      <span className="text-sm text-gray-600">Country:</span>
                      <span className="font-medium">{userData.country}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <div className="lg:col-span-3 space-y-4">
                <Card className="border-[#3bb7ff]/20 bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="text-center mb-6">
                      <div className="flex items-center justify-center space-x-4 mb-4">
                        <MessageCircle className="h-12 w-12 text-[#3bb7ff]" />
                        <div className="text-left">
                          <h3 className="text-xl font-bold text-[#0a192f] mb-1">Ready to Chat</h3>
                          <p className="text-gray-600">Find someone new to talk to</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <Button 
                        onClick={handleFindRandomChat}
                        disabled={isSearching}
                        className="bg-[#3bb7ff] hover:bg-[#2da5e8] text-white h-14 px-8 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {isSearching ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Searching for match...
                          </>
                        ) : (
                          <>
                            <Users className="h-5 w-5 mr-2" />
                            Find Random Chat
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="mt-4 p-4 bg-gradient-to-r from-[#3bb7ff]/10 to-blue-100 rounded-lg">
                      <p className="text-xs sm:text-sm text-gray-700 text-center">
                        {isSearching ? (
                          <>🔍 <strong>Searching...</strong> We're finding the perfect chat partner for you!</>
                        ) : (
                          <>🎉 <strong>Ready to connect!</strong> Click the button above to find someone new to chat with.</>
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}