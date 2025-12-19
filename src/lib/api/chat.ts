import { apiClient } from './client';

export interface Chat {
  _id: string;
  participants: Array<{
    _id: string;
    username: string;
    avatar: string;
    status: string;
    lastSeen: string;
  }>;
  isGroupChat: boolean;
  groupName?: string;
  groupDescription?: string;
  groupAdmin?: {
    _id: string;
    username: string;
    avatar: string;
  };
  lastMessage?: {
    _id: string;
    content: string;
    sender: {
      _id: string;
      username: string;
    };
    createdAt: string;
  };
  updatedAt: string;
}

export interface Message {
  _id: string;
  sender: {
    _id: string;
    username: string;
    avatar: string;
  };
  content: string;
  chat: string;
  messageType: 'text' | 'image' | 'video' | 'document' | 'audio';
  fileUrl?: string;
  readBy: Array<{
    user: {
      _id: string;
      username: string;
    };
    readAt: string;
  }>;
  edited: boolean;
  editedAt?: string;
  createdAt: string;
}

export const chatApi = {
  getChats: async (): Promise<{ chats: Chat[] }> => {
    return apiClient.get('/chat');
  },

  getChatById: async (chatId: string): Promise<{ chat: Chat }> => {
    return apiClient.get(`/chat/${chatId}`);
  },

  createOneOnOneChat: async (userId: string): Promise<{ chat: Chat }> => {
    return apiClient.post('/chat/one-on-one', { userId });
  },

  createGroupChat: async (data: {
    groupName: string;
    groupDescription?: string;
    participants: string[];
  }): Promise<{ chat: Chat }> => {
    return apiClient.post('/chat/group', data);
  },

  markMessagesAsRead: async (chatId: string): Promise<{ message: string }> => {
    return apiClient.put(`/chat/${chatId}/read`);
  },
};

export const messageApi = {
  getMessages: async (
    chatId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ messages: Message[] }> => {
    return apiClient.get(`/message/${chatId}?page=${page}&limit=${limit}`);
  },

  sendMessage: async (
    chatId: string,
    data: {
      content: string;
      messageType?: 'text' | 'image' | 'video' | 'document' | 'audio';
      fileUrl?: string;
    }
  ): Promise<{ message: Message }> => {
    return apiClient.post(`/message/${chatId}`, data);
  },

  editMessage: async (
    messageId: string,
    content: string
  ): Promise<{ message: Message }> => {
    return apiClient.put(`/message/${messageId}`, { content });
  },

  deleteMessage: async (messageId: string): Promise<{ message: string }> => {
    return apiClient.delete(`/message/${messageId}`);
  },
};