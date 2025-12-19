'use client';

import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Send, MoreVertical, Search, Paperclip, Smile, Phone, Video } from 'lucide-react';
import { Chat, Message } from '@/lib/api/chat';
import { Socket } from 'socket.io-client';

interface ChatWindowProps {
  chat: Chat;
  messages: Message[];
  onSendMessage: (content: string) => void;
  currentUser: any;
  socket: Socket | null;
}

export default function ChatWindow({ chat, messages, onSendMessage, currentUser, socket }: ChatWindowProps) {
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim()) {
      onSendMessage(messageInput.trim());
      setMessageInput('');
      stopTyping();
    }
  };

  const startTyping = () => {
    if (!isTyping && socket) {
      setIsTyping(true);
      socket.emit('typing_start', { chatId: chat._id });
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  };

  const stopTyping = () => {
    if (isTyping && socket) {
      setIsTyping(false);
      socket.emit('typing_stop', { chatId: chat._id });
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const getChatName = () => {
    if (chat.isGroupChat) {
      return chat.groupName || 'Unnamed Group';
    }
    
    const otherParticipant = chat.participants.find(p => p._id !== currentUser.id);
    return otherParticipant?.username || 'Unknown User';
  };

  const getChatAvatar = () => {
    if (chat.isGroupChat) {
      return null;
    }
    
    const otherParticipant = chat.participants.find(p => p._id !== currentUser.id);
    return otherParticipant?.avatar;
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const getStatusText = (status: string, lastSeen: string) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'away':
        return 'Away';
      default:
        return `Last seen ${formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}`;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={getChatAvatar() || ""} alt={getChatName()} />
                <AvatarFallback>
                  {getChatName().charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              {/* Status indicator for one-on-one chats */}
              {!chat.isGroupChat && (
                <div className="absolute -bottom-1 -right-1">
                  {(() => {
                    const otherParticipant = chat.participants.find(p => p._id !== currentUser.id);
                    const status = otherParticipant?.status || 'offline';
                    return (
                      <div className={`h-3 w-3 rounded-full border-2 border-white ${getStatusColor(status)}`} />
                    );
                  })()}
                </div>
              )}
            </div>
            
            <div>
              <h2 className="font-semibold text-gray-900">{getChatName()}</h2>
              <p className="text-sm text-gray-500">
                {chat.isGroupChat ? (
                  `${chat.participants.length} participants`
                ) : (
                  (() => {
                    const otherParticipant = chat.participants.find(p => p._id !== currentUser.id);
                    return getStatusText(
                      otherParticipant?.status || 'offline',
                      otherParticipant?.lastSeen || new Date().toISOString()
                    );
                  })()
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm">
              <Phone className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm">
              <Video className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4 bg-gray-50">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No messages in this chat yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message._id}
                className={`flex ${message.sender._id === currentUser.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender._id === currentUser.id
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  {chat.isGroupChat && message.sender._id !== currentUser.id && (
                    <p className="text-xs font-semibold mb-1 opacity-75">
                      {message.sender.username}
                    </p>
                  )}
                  <p className="text-sm">{message.content}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className={`text-xs ${
                      message.sender._id === currentUser.id ? 'text-green-100' : 'text-gray-500'
                    }`}>
                      {formatMessageTime(message.createdAt)}
                    </p>
                    {message.edited && (
                      <span className="text-xs opacity-75 ml-2">edited</span>
                    )}
                    {message.sender._id === currentUser.id && (
                      <div className="ml-2">
                        {/* Message status indicator would go here */}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <Button type="button" variant="ghost" size="sm">
            <Paperclip className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              value={messageInput}
              onChange={(e) => {
                setMessageInput(e.target.value);
                if (e.target.value.trim()) {
                  startTyping();
                } else {
                  stopTyping();
                }
              }}
              onBlur={stopTyping}
              placeholder="Type a message..."
              className="pr-10"
            />
            <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 transform -translate-y-1/2">
              <Smile className="h-5 w-5" />
            </Button>
          </div>
          
          <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700">
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}