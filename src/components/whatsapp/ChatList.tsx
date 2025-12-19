'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Chat } from '@/lib/api/chat';
import { Users } from 'lucide-react';

interface ChatListProps {
  chats: Chat[];
  currentChatId?: string;
  onChatSelect: (chat: Chat) => void;
  loading: boolean;
}

export default function ChatList({ chats, currentChatId, onChatSelect, loading }: ChatListProps) {
  const getChatName = (chat: Chat) => {
    if (chat.isGroupChat) {
      return chat.groupName || 'Unnamed Group';
    }
    
    // For one-on-one chats, show the other user's name
    const otherParticipant = chat.participants.find(p => p._id !== getCurrentUserId());
    return otherParticipant?.username || 'Unknown User';
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.isGroupChat) {
      return null; // Use default avatar for groups
    }
    
    const otherParticipant = chat.participants.find(p => p._id !== getCurrentUserId());
    return otherParticipant?.avatar;
  };

  const getLastMessage = (chat: Chat) => {
    if (!chat.lastMessage) return 'No messages yet';
    
    const maxLength = 50;
    const message = chat.lastMessage.content;
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getCurrentUserId = () => {
    // This should come from auth store, but for now we'll use a simple approach
    if (typeof window !== 'undefined') {
      const authData = localStorage.getItem('whatsapp-auth');
      if (authData) {
        const state = JSON.parse(authData).state;
        return state.user?.id;
      }
    }
    return null;
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {chats.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <p>No chats yet</p>
          <p className="text-sm">Start a new conversation to see it here</p>
        </div>
      ) : (
        chats.map((chat) => (
          <Card
            key={chat._id}
            className={`border-0 rounded-none cursor-pointer transition-colors hover:bg-gray-50 ${
              currentChatId === chat._id ? 'bg-green-50 border-l-4 border-l-green-600' : ''
            }`}
            onClick={() => onChatSelect(chat)}
          >
            <div className="p-4 flex items-center space-x-3">
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={getChatAvatar(chat)} alt={getChatName(chat)} />
                  <AvatarFallback>
                    {getChatName(chat).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                {/* Status indicator for one-on-one chats */}
                {!chat.isGroupChat && (
                  <div className="absolute -bottom-1 -right-1">
                    {(() => {
                      const otherParticipant = chat.participants.find(p => p._id !== getCurrentUserId());
                      const status = otherParticipant?.status || 'offline';
                      return (
                        <div className={`h-3 w-3 rounded-full border-2 border-white ${getStatusColor(status)}`} />
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {getChatName(chat)}
                  </h3>
                  {chat.updatedAt && (
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true })}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 truncate">
                    {chat.lastMessage && (
                      <span className="text-gray-500">
                        {chat.lastMessage.sender.username}: {getLastMessage(chat)}
                      </span>
                    )}
                    {!chat.lastMessage && 'No messages yet'}
                  </p>
                  
                  {chat.isGroupChat && (
                    <Badge variant="secondary" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      {chat.participants.length}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}