'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { chatApi, messageApi } from '@/lib/api/chat';
import { authApi } from '@/lib/api/auth';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import NewChatModal from './NewChatModal';
import { Button } from '@/components/ui/button';
import { LogOut, MessageSquarePlus, Users } from 'lucide-react';

export default function ChatInterface() {
  const { user, token, logout } = useAuthStore();
  const {
    chats,
    currentChat,
    messages,
    loading,
    error,
    setChats,
    setCurrentChat,
    setMessages,
    addMessage,
    setLoading,
    setError,
  } = useChatStore();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);

  useEffect(() => {
    if (!token) return;

    // Initialize socket connection
    const newSocket = io('http://localhost:5000', {
      auth: {
        token,
      },
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('new_message', (message) => {
      if (currentChat && message.chat === currentChat._id) {
        addMessage(message);
      }
    });

    newSocket.on('message_updated', (data) => {
      if (currentChat && data.chatId === currentChat._id) {
        // Handle message updates (edit, delete, read status)
      }
    });

    newSocket.on('user_status_changed', (data) => {
      // Update user status in chat list
      setChats(chats.map(chat => ({
        ...chat,
        participants: chat.participants.map(participant =>
          participant._id === data.userId
            ? { ...participant, status: data.status, lastSeen: data.lastSeen }
            : participant
        )
      })));
    });

    newSocket.on('error', (error) => {
      setError(error.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token, currentChat, addMessage, setChats, setError]);

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      setLoading(true);
      const response = await chatApi.getChats();
      setChats(response.chats);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      setLoading(true);
      const response = await messageApi.getMessages(chatId);
      setMessages(response.messages);

      // Join chat room
      if (socket) {
        socket.emit('join_chat', chatId);
      }

      // Mark messages as read
      await chatApi.markMessagesAsRead(chatId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChatSelect = (chat: any) => {
    setCurrentChat(chat);
    loadMessages(chat._id);

    // Leave previous chat room and join new one
    if (socket) {
      if (currentChat) {
        socket.emit('leave_chat', currentChat._id);
      }
      socket.emit('join_chat', chat._id);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!currentChat || !socket) return;

    try {
      const response = await messageApi.sendMessage(currentChat._id, {
        content,
        messageType: 'text',
      });

      // Message will be added via socket event
      socket.emit('send_message', {
        chatId: currentChat._id,
        content,
        messageType: 'text',
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateChat = async (userId: string) => {
    try {
      const response = await chatApi.createOneOnOneChat(userId);
      setChats([response.chat, ...chats]);
      setCurrentChat(response.chat);
      loadMessages(response.chat._id);
      setShowNewChatModal(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    if (socket) {
      socket.disconnect();
    }
    logout();
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="bg-green-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-700 rounded-full flex items-center justify-center">
                <span className="font-semibold">
                  {user?.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="font-semibold">{user?.username}</h2>
                <p className="text-xs text-green-100">
                  {user?.status === 'online' ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-white hover:bg-green-700"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewChatModal(true)}
              className="flex-1"
            >
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewGroupModal(true)}
              className="flex-1"
            >
              <Users className="h-4 w-4 mr-2" />
              New Group
            </Button>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          <ChatList
            chats={chats}
            currentChatId={currentChat?._id}
            onChatSelect={handleChatSelect}
            loading={loading}
          />
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {currentChat ? (
          <ChatWindow
            chat={currentChat}
            messages={messages}
            onSendMessage={handleSendMessage}
            currentUser={user!}
            socket={socket}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquarePlus className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">WhatsApp Clone</h3>
              <p className="text-gray-500">Select a chat to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onCreateChat={handleCreateChat}
      />

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg max-w-sm">
          <p>{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError('')}
            className="text-white hover:bg-red-600 mt-2"
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
