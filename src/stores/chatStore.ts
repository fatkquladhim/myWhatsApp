import { create } from 'zustand';

interface Chat {
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

interface Message {
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

interface ChatState {
  chats: Chat[];
  currentChat: Chat | null;
  messages: Message[];
  loading: boolean;
  error: string | null;
  
  setChats: (chats: Chat[]) => void;
  setCurrentChat: (chat: Chat | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearChatData: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  currentChat: null,
  messages: [],
  loading: false,
  error: null,
  
  setChats: (chats) => set({ chats }),
  
  setCurrentChat: (chat) => {
    set({ currentChat: chat, messages: [] });
  },
  
  setMessages: (messages) => set({ messages }),
  
  addMessage: (message) => {
    const { messages } = get();
    set({ messages: [...messages, message] });
  },
  
  updateMessage: (messageId, updates) => {
    const { messages } = get();
    set({
      messages: messages.map(msg => 
        msg._id === messageId ? { ...msg, ...updates } : msg
      )
    });
  },
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
  
  clearChatData: () => set({
    chats: [],
    currentChat: null,
    messages: [],
    loading: false,
    error: null
  }),
}));