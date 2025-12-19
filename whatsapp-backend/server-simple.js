import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://21.0.10.211:3000"],
  credentials: true
}));
app.use(express.json());

// In-memory storage (untuk demo sederhana)
const users = new Map();
const chats = new Map();
const messages = new Map();
let userIdCounter = 1;
let chatIdCounter = 1;
let messageIdCounter = 1;

// Helper functions
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'demo-secret-key', { expiresIn: '7d' });
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'demo-secret-key');
    const user = users.get(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = { ...user, id: user.id };
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    for (const user of users.values()) {
      if (user.email === email || user.username === username) {
        return res.status(400).json({ message: 'User already exists' });
      }
    }

    // Create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: userIdCounter++,
      username,
      email,
      password: hashedPassword,
      avatar: '',
      status: 'online',
      lastSeen: new Date().toISOString()
    };

    users.set(newUser.id, newUser);

    const token = generateToken(newUser.id);
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        avatar: newUser.avatar,
        status: newUser.status
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    let user = null;
    for (const u of users.values()) {
      if (u.email === email) {
        user = u;
        break;
      }
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update status to online
    user.status = 'online';
    user.lastSeen = new Date().toISOString();

    const token = generateToken(user.id);
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const { password: _, ...userWithoutPassword } = req.user;
  res.json({ user: userWithoutPassword });
});

app.put('/api/auth/status', authenticateToken, (req, res) => {
  const { status } = req.body;
  const user = users.get(req.user.id);
  
  if (user) {
    user.status = status;
    user.lastSeen = new Date().toISOString();
    
    // Broadcast status change
    io.emit('user_status_changed', {
      userId: user.id,
      status,
      lastSeen: user.lastSeen
    });
  }
  
  const { password: _, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword });
});

// Chat Routes
app.get('/api/chat', authenticateToken, (req, res) => {
  const userChats = [];
  
  for (const chat of chats.values()) {
    if (chat.participants.includes(req.user.id)) {
      // Get participants info
      const participantsInfo = chat.participants.map(pid => {
        const participant = users.get(pid);
        return {
          _id: participant.id.toString(),
          username: participant.username,
          avatar: participant.avatar,
          status: participant.status,
          lastSeen: participant.lastSeen
        };
      });

      // Get last message
      const chatMessages = messages.get(chat.id) || [];
      const lastMessage = chatMessages[chatMessages.length - 1];

      userChats.push({
        _id: chat.id.toString(),
        participants: participantsInfo,
        isGroupChat: chat.isGroupChat,
        groupName: chat.groupName,
        groupDescription: chat.groupDescription,
        lastMessage: lastMessage ? {
          _id: lastMessage.id.toString(),
          content: lastMessage.content,
          sender: {
            _id: lastMessage.senderId.toString(),
            username: users.get(lastMessage.senderId)?.username || 'Unknown'
          },
          createdAt: lastMessage.createdAt
        } : null,
        updatedAt: chat.updatedAt
      });
    }
  }

  res.json({ chats: userChats });
});

app.post('/api/chat/one-on-one', authenticateToken, (req, res) => {
  const { userId } = req.body;
  const currentUserId = req.user.id;

  // Check if chat already exists
  for (const chat of chats.values()) {
    if (!chat.isGroupChat && 
        chat.participants.includes(currentUserId) && 
        chat.participants.includes(userId)) {
      // Return existing chat
      const participantsInfo = chat.participants.map(pid => {
        const participant = users.get(pid);
        return {
          _id: participant.id.toString(),
          username: participant.username,
          avatar: participant.avatar,
          status: participant.status,
          lastSeen: participant.lastSeen
        };
      });

      return res.json({
        chat: {
          _id: chat.id.toString(),
          participants: participantsInfo,
          isGroupChat: chat.isGroupChat,
          updatedAt: chat.updatedAt
        }
      });
    }
  }

  // Create new chat
  const newChat = {
    id: chatIdCounter++,
    participants: [currentUserId, userId],
    isGroupChat: false,
    updatedAt: new Date().toISOString()
  };

  chats.set(newChat.id, newChat);

  const participantsInfo = newChat.participants.map(pid => {
    const participant = users.get(pid);
    return {
      _id: participant.id.toString(),
      username: participant.username,
      avatar: participant.avatar,
      status: participant.status,
      lastSeen: participant.lastSeen
    };
  });

  res.status(201).json({
    chat: {
      _id: newChat.id.toString(),
      participants: participantsInfo,
      isGroupChat: newChat.isGroupChat,
      updatedAt: newChat.updatedAt
    }
  });
});

// Message Routes
app.get('/api/message/:chatId', authenticateToken, (req, res) => {
  const chatId = parseInt(req.params.chatId);
  const chat = chats.get(chatId);
  
  if (!chat || !chat.participants.includes(req.user.id)) {
    return res.status(404).json({ message: 'Chat not found' });
  }

  const chatMessages = messages.get(chatId) || [];
  const formattedMessages = chatMessages.map(msg => {
    const sender = users.get(msg.senderId);
    return {
      _id: msg.id.toString(),
      sender: {
        _id: sender.id.toString(),
        username: sender.username,
        avatar: sender.avatar
      },
      content: msg.content,
      chat: msg.chatId.toString(),
      messageType: msg.messageType,
      readBy: [],
      edited: msg.edited || false,
      createdAt: msg.createdAt
    };
  });

  res.json({ messages: formattedMessages });
});

app.post('/api/message/:chatId', authenticateToken, (req, res) => {
  const chatId = parseInt(req.params.chatId);
  const { content, messageType = 'text' } = req.body;
  
  const chat = chats.get(chatId);
  if (!chat || !chat.participants.includes(req.user.id)) {
    return res.status(404).json({ message: 'Chat not found' });
  }

  const newMessage = {
    id: messageIdCounter++,
    senderId: req.user.id,
    chatId,
    content,
    messageType,
    createdAt: new Date().toISOString()
  };

  if (!messages.has(chatId)) {
    messages.set(chatId, []);
  }
  messages.get(chatId).push(newMessage);

  // Update chat timestamp
  chat.updatedAt = newMessage.createdAt;

  const sender = users.get(newMessage.senderId);
  const formattedMessage = {
    _id: newMessage.id.toString(),
    sender: {
      _id: sender.id.toString(),
      username: sender.username,
      avatar: sender.avatar
    },
    content: newMessage.content,
    chat: newMessage.chatId.toString(),
    messageType: newMessage.messageType,
    readBy: [],
    edited: false,
    createdAt: newMessage.createdAt
  };

  // Broadcast to all participants
  io.to(chatId.toString()).emit('new_message', formattedMessage);

  res.status(201).json({ message: formattedMessage });
});

// Socket.IO
const onlineUsers = new Map();

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'demo-secret-key');
    const user = users.get(decoded.userId);
    
    if (!user) {
      return next(new Error('Invalid token'));
    }

    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  console.log(`User ${socket.user.username} connected`);

  // Add user to online users
  onlineUsers.set(socket.user.id, {
    socketId: socket.id,
    user: socket.user
  });

  // Update user status to online
  const user = users.get(socket.user.id);
  if (user) {
    user.status = 'online';
    user.lastSeen = new Date().toISOString();
  }

  // Join user to their personal room
  socket.join(socket.user.id.toString());

  // Handle joining chat rooms
  socket.on('join_chat', (chatId) => {
    socket.join(chatId);
    console.log(`User ${socket.user.username} joined chat ${chatId}`);
  });

  // Handle sending messages
  socket.on('send_message', (data) => {
    const { chatId, content, messageType = 'text' } = data;
    
    // Create message
    const newMessage = {
      id: messageIdCounter++,
      senderId: socket.user.id,
      chatId: parseInt(chatId),
      content,
      messageType,
      createdAt: new Date().toISOString()
    };

    if (!messages.has(parseInt(chatId))) {
      messages.set(parseInt(chatId), []);
    }
    messages.get(parseInt(chatId)).push(newMessage);

    // Update chat timestamp
    const chat = chats.get(parseInt(chatId));
    if (chat) {
      chat.updatedAt = newMessage.createdAt;
    }

    const sender = users.get(newMessage.senderId);
    const formattedMessage = {
      _id: newMessage.id.toString(),
      sender: {
        _id: sender.id.toString(),
        username: sender.username,
        avatar: sender.avatar
      },
      content: newMessage.content,
      chat: newMessage.chatId.toString(),
      messageType: newMessage.messageType,
      readBy: [],
      edited: false,
      createdAt: newMessage.createdAt
    };

    // Broadcast to all participants
    io.to(chatId).emit('new_message', formattedMessage);
  });

  // Handle typing indicators
  socket.on('typing_start', (data) => {
    const { chatId } = data;
    socket.to(chatId).emit('user_typing', {
      userId: socket.user.id,
      username: socket.user.username,
      chatId
    });
  });

  socket.on('typing_stop', (data) => {
    const { chatId } = data;
    socket.to(chatId).emit('user_stop_typing', {
      userId: socket.user.id,
      chatId
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User ${socket.user.username} disconnected`);

    // Remove user from online users
    onlineUsers.delete(socket.user.id);

    // Update user status to offline
    const user = users.get(socket.user.id);
    if (user) {
      user.status = 'offline';
      user.lastSeen = new Date().toISOString();
    }

    // Broadcast user offline status
    socket.broadcast.emit('user_status_changed', {
      userId: socket.user.id,
      status: 'offline',
      lastSeen: new Date().toISOString()
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 WhatsApp Clone Backend running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready for real-time messaging`);
  console.log(`🌐 API available at http://localhost:${PORT}/api`);
});