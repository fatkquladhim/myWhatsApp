import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

// Check if we should use MongoDB or in-memory
const USE_MONGODB = process.env.USE_MONGODB === 'true';

let User, Chat, Message;
let mongoose = null;

if (USE_MONGODB) {
  try {
    mongoose = await import('mongoose');
    
    // MongoDB Connection with retry logic
    const connectDB = async () => {
      try {
        const conn = await mongoose.default.connect(process.env.MONGODB_URI, {
          serverSelectionTimeoutMS: 10000,
          socketTimeoutMS: 45000,
          family: 4
        });
        console.log('✅ Connected to MongoDB');
        console.log(`📊 Database: ${conn.connection.name}`);
        return conn;
      } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        console.log('🔄 Falling back to in-memory storage...');
        return null;
      }
    };

    const conn = await connectDB();
    
    if (conn) {
      // User Schema
      const userSchema = new mongoose.default.Schema({
        username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
        email: { type: String, required: true, unique: true, trim: true, lowercase: true },
        password: { type: String, required: true, minlength: 6 },
        avatar: { type: String, default: '' },
        status: { type: String, enum: ['online', 'offline', 'away'], default: 'offline' },
        lastSeen: { type: Date, default: Date.now }
      }, { timestamps: true });

      userSchema.pre('save', async function(next) {
        if (!this.isModified('password')) return next();
        try {
          const salt = await bcrypt.genSalt(10);
          this.password = await bcrypt.hash(this.password, salt);
          next();
        } catch (error) {
          next(error);
        }
      });

      userSchema.methods.comparePassword = async function(candidatePassword) {
        return await bcrypt.compare(candidatePassword, this.password);
      };

      User = mongoose.default.model('User', userSchema);

      // Chat Schema
      const chatSchema = new mongoose.default.Schema({
        participants: [{ type: mongoose.default.Schema.Types.ObjectId, ref: 'User', required: true }],
        isGroupChat: { type: Boolean, default: false },
        groupName: { type: String, trim: true },
        groupDescription: { type: String, trim: true },
        groupAdmin: { type: mongoose.default.Schema.Types.ObjectId, ref: 'User' },
        lastMessage: { type: mongoose.default.Schema.Types.ObjectId, ref: 'Message' },
        updatedAt: { type: Date, default: Date.now }
      }, { timestamps: true });

      Chat = mongoose.default.model('Chat', chatSchema);

      // Message Schema
      const messageSchema = new mongoose.default.Schema({
        sender: { type: mongoose.default.Schema.Types.ObjectId, ref: 'User', required: true },
        content: { type: String, required: true, trim: true },
        chat: { type: mongoose.default.Schema.Types.ObjectId, ref: 'Chat', required: true },
        messageType: { type: String, enum: ['text', 'image', 'video', 'document', 'audio'], default: 'text' },
        fileUrl: { type: String, default: '' },
        readBy: [{
          user: { type: mongoose.default.Schema.Types.ObjectId, ref: 'User' },
          readAt: { type: Date, default: Date.now }
        }],
        edited: { type: Boolean, default: false },
        editedAt: { type: Date },
        deleted: { type: Boolean, default: false },
        deletedAt: { type: Date }
      }, { timestamps: true });

      Message = mongoose.default.model('Message', messageSchema);
    }
  } catch (error) {
    console.log('❌ Could not load mongoose, using in-memory storage');
  }
}

// In-memory storage fallback
if (!User) {
  console.log('📦 Using in-memory storage');
  
  const users = new Map();
  const chats = new Map();
  const messages = new Map();
  let userIdCounter = 1;
  let chatIdCounter = 1;
  let messageIdCounter = 1;

  User = {
    async findOne(query) {
      if (query.email) {
        for (const user of users.values()) {
          if (user.email === query.email) return user;
        }
      }
      if (query.username) {
        for (const user of users.values()) {
          if (user.username === query.username) return user;
        }
      }
      if (query._id) {
        return users.get(query._id);
      }
      return null;
    },
    
    async findById(id) {
      const user = users.get(id);
      if (user) {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }
      return null;
    },
    
    async create(userData) {
      const id = userIdCounter++;
      // Hash password for in-memory storage too
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = { ...userData, _id: id, id, password: hashedPassword };
      users.set(id, user);
      return user;
    },
    
    async save(user) {
      users.set(user._id, user);
      return user;
    }
  };

  Chat = {
    async findOne(query) {
      if (query._id) {
        return chats.get(query._id);
      }
      if (query.participants && query.isGroupChat === false) {
        for (const chat of chats.values()) {
          if (!chat.isGroupChat && 
              query.participants.every(p => chat.participants.includes(p))) {
            return chat;
          }
        }
      }
      return null;
    },
    
    async find(query) {
      const result = [];
      for (const chat of chats.values()) {
        if (query.participants) {
          if (chat.participants.some(p => query.participants.includes(p))) {
            result.push(chat);
          }
        }
      }
      return result;
    },
    
    async create(chatData) {
      const id = chatIdCounter++;
      const chat = { ...chatData, _id: id, id };
      chats.set(id, chat);
      return chat;
    },
    
    async save(chat) {
      chats.set(chat._id, chat);
      return chat;
    },
    
    async populate(chat, path, select) {
      if (path === 'participants') {
        chat.participants = chat.participants.map(pid => {
          const user = users.get(pid);
          return {
            _id: user._id,
            username: user.username,
            avatar: user.avatar,
            status: user.status,
            lastSeen: user.lastSeen
          };
        });
      }
      if (path === 'lastMessage' && chat.lastMessage) {
        const msg = messages.get(chat.lastMessage);
        if (msg) {
          const sender = users.get(msg.senderId);
          chat.lastMessage = {
            _id: msg._id,
            content: msg.content,
            sender: {
              _id: sender._id,
              username: sender.username
            },
            createdAt: msg.createdAt
          };
        }
      }
      return chat;
    }
  };

  Message = {
    async create(messageData) {
      const id = messageIdCounter++;
      const message = { ...messageData, _id: id, id };
      
      if (!messages.has(message.chatId)) {
        messages.set(message.chatId, []);
      }
      messages.get(message.chatId).push(message);
      
      // Update chat
      const chat = chats.get(message.chatId);
      if (chat) {
        chat.lastMessage = id;
        chat.updatedAt = new Date();
      }
      
      return message;
    },
    
    async find(query) {
      const chatMessages = messages.get(query.chat) || [];
      return chatMessages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    
    async populate(message, path, select) {
      if (path === 'sender') {
        const sender = users.get(message.senderId);
        message.sender = {
          _id: sender._id,
          username: sender.username,
          avatar: sender.avatar
        };
      }
      return message;
    }
  };
}

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://21.0.10.211:3000"],
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://21.0.10.211:3000"],
  credentials: true
}));
app.use(express.json());

// Helper functions
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = user;
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
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = await User.create({
        username, 
        email, 
        password, 
        status: 'online', 
        lastSeen: new Date()
      });
  
    // Generate JWT token
    const token = generateToken(user._id || user.id);

    res.status(201).json({
      token,
      user: {
        id: user._id || user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || '',
        status: user.status
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

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    let isMatch;
    if (user.password && typeof user.password === 'string') {
      if (user.comparePassword) {
        isMatch = await user.comparePassword(password);
      } else {
        isMatch = await bcrypt.compare(password, user.password);
      }
    } else {
      isMatch = user.password === password;
    }

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // ✅ SAFE UPDATE (no save())
    await User.updateOne(
      { _id: user._id },
      {
        status: 'online',
        lastSeen: new Date()
      }
    );

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || '',
        status: 'online'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user._id || req.user.id,
      username: req.user.username,
      email: req.user.email,
      avatar: req.user.avatar || '',
      status: req.user.status,
      lastSeen: req.user.lastSeen
    }
  });
});

app.put('/api/auth/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    req.user.status = status;
    req.user.lastSeen = new Date();
    await User.save(req.user);
    
    // Broadcast status change
    io.emit('user_status_changed', {
      userId: req.user._id || req.user.id,
      status,
      lastSeen: req.user.lastSeen
    });

    res.json({
      user: {
        id: req.user._id || req.user.id,
        username: req.user.username,
        email: req.user.email,
        avatar: req.user.avatar || '',
        status: req.user.status,
        lastSeen: req.user.lastSeen
      }
    });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Chat Routes
app.get('/api/chat', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const chats = await Chat.find({
      participants: userId
    });

    // Populate participants and last message for each chat
    const populatedChats = [];
    for (const chat of chats) {
      await Chat.populate(chat, 'participants');
      await Chat.populate(chat, 'lastMessage');
      populatedChats.push(chat);
    }

    res.json({ chats: populatedChats });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/chat/one-on-one', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user._id || req.user.id;

    // Check if user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      participants: [currentUserId, userId],
      isGroupChat: false
    });

    if (chat) {
      await Chat.populate(chat, 'participants');
      return res.json({ chat });
    }

    // Create new chat
    chat = await Chat.create({
      participants: [currentUserId, userId],
      isGroupChat: false,
      updatedAt: new Date()
    });

    await Chat.populate(chat, 'participants');
    res.status(201).json({ chat });
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Message Routes
app.get('/api/message/:chatId', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    // Check if user is participant in the chat
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user._id || req.user.id
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const messages = await Message.find({ chat: req.params.chatId });
    
    // Populate sender for each message
    const populatedMessages = [];
    for (const message of messages) {
      await Message.populate(message, 'sender');
      populatedMessages.push(message);
    }

    // Reverse to show oldest first and paginate
    const reversedMessages = populatedMessages.reverse();
    const paginatedMessages = reversedMessages.slice(skip, skip + parseInt(limit));

    res.json({ messages: paginatedMessages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/message/:chatId', authenticateToken, async (req, res) => {
  try {
    const { content, messageType = 'text', fileUrl = '' } = req.body;
    const senderId = req.user._id || req.user.id;

    // Check if user is participant in the chat
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: senderId
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Create message
    const message = await Message.create({
      sender: senderId,
      content,
      chat: req.params.chatId,
      messageType,
      fileUrl,
      createdAt: new Date()
    });

    await Message.populate(message, 'sender');

    // Broadcast to all participants
    io.to(req.params.chatId).emit('new_message', message);

    res.status(201).json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Socket.IO
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
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

  // Update user status to online
    User.findByIdAndUpdate(socket.user._id, {
    status: socket.user.status,
    lastSeen: socket.user.lastSeen
  });


  // Join user to their personal room
  socket.join((socket.user._id || socket.user.id).toString());

  // Broadcast user online status
  socket.broadcast.emit('user_status_changed', {
    userId: socket.user._id || socket.user.id,
    status: 'online',
    lastSeen: new Date()
  });

  // Handle joining chat rooms
  socket.on('join_chat', (chatId) => {
    socket.join(chatId);
    console.log(`User ${socket.user.username} joined chat ${chatId}`);
  });

  // Handle sending messages
  socket.on('send_message', async (data) => {
    try {
      const { chatId, content, messageType = 'text', fileUrl = '' } = data;
      const senderId = socket.user._id || socket.user.id;

      // Check if user is participant in the chat
      const chat = await Chat.findOne({
        _id: chatId,
        participants: senderId
      });

      if (!chat) {
        socket.emit('error', { message: 'Chat not found' });
        return;
      }

      // Create message
      const message = await Message.create({
        sender: senderId,
        content,
        chat: chatId,
        messageType,
        fileUrl,
        createdAt: new Date()
      });

      await Message.populate(message, 'sender');

      // Broadcast message to all participants in the chat
      io.to(chatId).emit('new_message', message);

    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicators
  socket.on('typing_start', (data) => {
    const { chatId } = data;
    socket.to(chatId).emit('user_typing', {
      userId: socket.user._id || socket.user.id,
      username: socket.user.username,
      chatId
    });
  });

  socket.on('typing_stop', (data) => {
    const { chatId } = data;
    socket.to(chatId).emit('user_stop_typing', {
      userId: socket.user._id || socket.user.id,
      chatId
    });
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log(`User ${socket.user.username} disconnected`);

    // Update user status to offline
    await User.findByIdAndUpdate(socket.user._id, {
      status: 'offline',
      lastSeen: new Date()
    });
    
    // Broadcast user offline status
    socket.broadcast.emit('user_status_changed', {
      userId: socket.user._id || socket.user.id,
      status: 'offline',
      lastSeen: new Date()
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 WhatsApp Clone Backend running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready for real-time messaging`);
  console.log(`🌐 API available at http://localhost:${PORT}/api`);
  console.log(`🗄️  Database: ${USE_MONGODB ? 'MongoDB' : 'In-Memory Storage'}`);
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET?.substring(0, 10)}...`);
});