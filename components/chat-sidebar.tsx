"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Snowflake, 
  Search, 
  UserPlus, 
  Settings, 
  MoreVertical, 
  ArrowLeft, 
  X, 
  Circle,
  Globe
} from 'lucide-react';

interface Friend {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'away';
  avatar: string;
  lastSeen?: string;
  country?: string;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  showBackButton?: boolean;
  backUrl?: string;
}

export function ChatSidebar({ isOpen, onClose, showBackButton = true, backUrl = '/' }: ChatSidebarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  // Mock friends data - replace with real data
  const friends: Friend[] = [
    { id: '1', name: 'Alex M.', status: 'online', avatar: 'AM', country: 'USA' },
    { id: '2', name: 'Sarah K.', status: 'online', avatar: 'SK', country: 'Canada' },
    { id: '3', name: 'Mike R.', status: 'away', avatar: 'MR', country: 'UK' },
    { id: '4', name: 'Emma L.', status: 'offline', avatar: 'EL', country: 'Australia', lastSeen: '2 hours ago' },
    { id: '5', name: 'David P.', status: 'online', avatar: 'DP', country: 'Germany' },
    { id: '6', name: 'Lisa W.', status: 'away', avatar: 'LW', country: 'France' },
    { id: '7', name: 'Tom H.', status: 'offline', avatar: 'TH', country: 'Japan', lastSeen: '1 day ago' },
    { id: '8', name: 'Anna S.', status: 'online', avatar: 'AS', country: 'Spain' },
    { id: '9', name: 'John D.', status: 'away', avatar: 'JD', country: 'Italy' },
    { id: '10', name: 'Maria G.', status: 'online', avatar: 'MG', country: 'Brazil' },
    { id: '11', name: 'Chris B.', status: 'offline', avatar: 'CB', country: 'Mexico', lastSeen: '3 hours ago' },
    { id: '12', name: 'Nina P.', status: 'online', avatar: 'NP', country: 'Russia' },
    { id: '13', name: 'Lucas M.', status: 'away', avatar: 'LM', country: 'Argentina' },
    { id: '14', name: 'Sophie T.', status: 'online', avatar: 'ST', country: 'Netherlands' },
    { id: '15', name: 'Ryan K.', status: 'offline', avatar: 'RK', country: 'Sweden', lastSeen: '5 hours ago' },
  ];

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = () => {
    localStorage.removeItem("frozchat_user");
    localStorage.removeItem("frozchat_auth_type");
    localStorage.removeItem("frozchat_session_id");
    localStorage.removeItem("frozchat_user_data");
    router.push('/');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (friend: Friend) => {
    if (friend.status === 'offline' && friend.lastSeen) {
      return friend.lastSeen;
    }
    return friend.status;
  };

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        w-80 bg-white/95 backdrop-blur-md shadow-lg border-r border-gray-200 flex flex-col
        fixed lg:relative inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Snowflake className="h-6 w-6 text-[#3bb7ff]" />
              <span className="text-lg font-bold text-[#0a192f]">FrozChat</span>
            </div>
            <div className="flex items-center space-x-1">
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(backUrl)}
                  className="text-gray-600 hover:text-[#3bb7ff]"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-600 hover:text-[#3bb7ff] lg:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Search Friends */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-gray-200 focus:border-[#3bb7ff]"
            />
          </div>
        </div>

        {/* Friends List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent max-h-[calc(100vh-200px)]">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Friends ({friends.filter(f => f.status === 'online').length} online)
              </h3>
              <Button variant="ghost" size="sm" className="text-[#3bb7ff] hover:bg-[#3bb7ff]/10">
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              {filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors duration-200 group"
                >
                  <div className="relative">
                    <div className="w-10 h-10 bg-[#3bb7ff] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {friend.avatar}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${getStatusColor(friend.status)} rounded-full border-2 border-white`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{friend.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{getStatusText(friend)}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-400">{friend.country}</span>
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="w-full border-gray-300 text-gray-600 hover:border-[#3bb7ff] hover:text-[#3bb7ff]"
          >
            Leave Chat
          </Button>
        </div>
      </div>
    </>
  );
}