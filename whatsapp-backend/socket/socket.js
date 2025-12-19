import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication token required'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) return next(new Error('Invalid token'));

    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
};

export const initializeSocket = (io) => {
  const onlineUsers = new Map();

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.username} connected`);

    // Add to online users
    onlineUsers.set(socket.user._id.toString(), {
      socketId: socket.id,
      user: socket.user
    });

    // Update status to online
    socket.user.status = 'online';
    socket.user.lastSeen = new Date();
    User.updateOne(
      { _id: socket.user._id },
      { status: socket.user.status, lastSeen: socket.user.lastSeen }
    ).catch(console.error);

    // Broadcast user online
    socket.broadcast.emit('user_status_changed', {
      userId: socket.user._id,
      status: 'online',
      lastSeen: socket.user.lastSeen
    });

    // Join personal room
    socket.join(socket.user._id.toString());

    // Join/Leave chat rooms
    socket.on('join_chat', (chatId) => socket.join(chatId));
    socket.on('leave_chat', (chatId) => socket.leave(chatId));

    // Send message
    socket.on('send_message', async (data) => {
      try {
        const { chatId, content, messageType = 'text', fileUrl = '' } = data;

        const Message = (await import('../models/Message.js')).default;
        const Chat = (await import('../models/Chat.js')).default;

        const chat = await Chat.findOne({
          _id: chatId,
          participants: socket.user._id
        });

        if (!chat) {
          socket.emit('error', { message: 'Chat not found' });
          return;
        }

        const message = new Message({
          sender: socket.user._id,
          chat: chatId,
          content,
          messageType,
          fileUrl
        });

        await message.save();
        await message.populate('sender', 'username avatar');

        io.to(chatId).emit('new_message', message);

        // Notify participants not in room
        chat.participants.forEach(p => {
          if (
            p.toString() !== socket.user._id.toString() &&
            !io.sockets.adapter.rooms.get(chatId)?.has(p.toString())
          ) {
            io.to(p.toString()).emit('new_message_notification', {
              chatId,
              message,
              sender: socket.user
            });
          }
        });

      } catch (err) {
        console.error('Send message error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicators
    socket.on('typing_start', ({ chatId }) =>
      socket.to(chatId).emit('user_typing', {
        userId: socket.user._id,
        username: socket.user.username,
        chatId
      })
    );

    socket.on('typing_stop', ({ chatId }) =>
      socket.to(chatId).emit('user_stop_typing', {
        userId: socket.user._id,
        chatId
      })
    );

    // Mark messages read
    socket.on('mark_messages_read', async ({ chatId }) => {
      try {
        const Message = (await import('../models/Message.js')).default;

        await Message.updateMany(
          {
            chat: chatId,
            sender: { $ne: socket.user._id },
            'readBy.user': { $ne: socket.user._id }
          },
          {
            $push: {
              readBy: { user: socket.user._id, readAt: new Date() }
            }
          }
        );

        socket.to(chatId).emit('messages_read', {
          userId: socket.user._id,
          chatId
        });
      } catch (err) {
        console.error('Mark messages read error:', err);
      }
    });

    // Change status manually
    socket.on('change_status', async ({ status }) => {
      try {
        socket.user.status = status;
        socket.user.lastSeen = new Date();

        await User.updateOne(
          { _id: socket.user._id },
          { status: status, lastSeen: socket.user.lastSeen }
        );

        socket.broadcast.emit('user_status_changed', {
          userId: socket.user._id,
          status,
          lastSeen: socket.user.lastSeen
        });
      } catch (err) {
        console.error('Change status error:', err);
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User ${socket.user.username} disconnected`);
      onlineUsers.delete(socket.user._id.toString());

      socket.user.status = 'offline';
      socket.user.lastSeen = new Date();

      await User.updateOne(
        { _id: socket.user._id },
        { status: 'offline', lastSeen: socket.user.lastSeen }
      );

      socket.broadcast.emit('user_status_changed', {
        userId: socket.user._id,
        status: 'offline',
        lastSeen: socket.user.lastSeen
      });
    });

    // Send list of online users
    socket.on('get_online_users', () => {
      const users = Array.from(onlineUsers.values()).map(u => u.user);
      socket.emit('online_users', users);
    });
  });

  return io;
};
