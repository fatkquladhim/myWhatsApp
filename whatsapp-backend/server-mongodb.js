import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  avatar: { type: String, default: '' },
  status: { type: String, enum: ['online', 'offline', 'away'], default: 'offline' },
  lastSeen: { type: Date, default: Date.now }
}, { timestamps: true });

// Hash password before saving
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

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

// Chat Schema
const chatSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  isGroupChat: { type: Boolean, default: false },
  groupName: { type: String, trim: true },
  groupDescription: { type: String, trim: true },
  groupAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Chat = mongoose.model('Chat', chatSchema);

// Message Schema
const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true },
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  messageType: { type: String, enum: ['text', 'image', 'video', 'document', 'audio'], default: 'text' },
  fileUrl: { type: String, default: '' },
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],
  edited: { type: Boolean, default: false },
  editedAt: { type: Date },
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
}, { timestamps: true });

// Update chat's last message when a new message is created
messageSchema.post('save', async function() {
  try {
    await Chat.findByIdAndUpdate(this.chat, { lastMessage: this._id, updatedAt: new Date() });
  } catch (error) {
    console.error('Error updating chat last message:', error);
  }
});

const Message = mongoose.model('Message', messageSchema);

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
    const user = await User.findById(decoded.userId).select('-password');
    
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
    const user = new User({ username, email, password });
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
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

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update status to online
    user.status = 'online';
    user.lastSeen = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
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
  res.json({
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      avatar: req.user.avatar,
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
    await req.user.save();
    
    // Broadcast status change
    io.emit('user_status_changed', {
      userId: req.user._id,
      status,
      lastSeen: req.user.lastSeen
    });

    res.json({
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        avatar: req.user.avatar,
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
    const chats = await Chat.find({
      participants: req.user._id
    })
    .populate('participants', 'username avatar status lastSeen')
    .populate('lastMessage')
    .sort({ updatedAt: -1 });

    res.json({ chats });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/chat/one-on-one', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.body;

    // Check if user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      participants: { $all: [req.user._id, userId] },
      isGroupChat: false
    })
    .populate('participants', 'username avatar status lastSeen')
    .populate('lastMessage');

    if (chat) {
      return res.json({ chat });
    }

    // Create new chat
    chat = new Chat({
      participants: [req.user._id, userId],
      isGroupChat: false
    });

    await chat.save();
    await chat.populate('participants', 'username avatar status lastSeen');
    await chat.populate('lastMessage');

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
      participants: req.user._id
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const messages = await Message.find({ chat: req.params.chatId })
      .populate('sender', 'username avatar')
      .populate('readBy.user', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/message/:chatId', authenticateToken, async (req, res) => {
  try {
    const { content, messageType = 'text', fileUrl = '' } = req.body;

    // Check if user is participant in the chat
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user._id
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Create message
    const message = new Message({
      sender: req.user._id,
      content,
      chat: req.params.chatId,
      messageType,
      fileUrl
    });

    await message.save();
    await message.populate('sender', 'username avatar');

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
    const user = await User.findById(decoded.userId).select('-password');
    
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
  socket.user.status = 'online';
  socket.user.lastSeen = new Date();
  socket.user.save();

  // Join user to their personal room
  socket.join(socket.user._id.toString());

  // Broadcast user online status
  socket.broadcast.emit('user_status_changed', {
    userId: socket.user._id,
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

      // Check if user is participant in the chat
      const chat = await Chat.findOne({
        _id: chatId,
        participants: socket.user._id
      });

      if (!chat) {
        socket.emit('error', { message: 'Chat not found' });
        return;
      }

      // Create message
      const message = new Message({
        sender: socket.user._id,
        content,
        chat: chatId,
        messageType,
        fileUrl
      });

      await message.save();
      await message.populate('sender', 'username avatar');

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
      userId: socket.user._id,
      username: socket.user.username,
      chatId
    });
  });

  socket.on('typing_stop', (data) => {
    const { chatId } = data;
    socket.to(chatId).emit('user_stop_typing', {
      userId: socket.user._id,
      chatId
    });
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log(`User ${socket.user.username} disconnected`);

    // Update user status to offline
    socket.user.status = 'offline';
    socket.user.lastSeen = new Date();
    await socket.user.save();

    // Broadcast user offline status
    socket.broadcast.emit('user_status_changed', {
      userId: socket.user._id,
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
  console.log(`🗄️  Connected to MongoDB`);
});