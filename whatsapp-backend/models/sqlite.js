import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SQLite database setup
let db;

async function initDatabase() {
  try {
    db = await open({
      filename: path.join(__dirname, '../../database.sqlite'),
      driver: sqlite3.Database
    });

    // Create tables
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        avatar TEXT DEFAULT '',
        status TEXT DEFAULT 'offline',
        lastSeen DATETIME DEFAULT CURRENT_TIMESTAMP,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        isGroupChat BOOLEAN DEFAULT 0,
        groupName TEXT,
        groupDescription TEXT,
        groupAdmin INTEGER,
        lastMessage INTEGER,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (groupAdmin) REFERENCES users(id),
        FOREIGN KEY (lastMessage) REFERENCES messages(id)
      );

      CREATE TABLE IF NOT EXISTS chat_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chatId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        FOREIGN KEY (chatId) REFERENCES chats(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(chatId, userId)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        senderId INTEGER NOT NULL,
        chatId INTEGER NOT NULL,
        content TEXT NOT NULL,
        messageType TEXT DEFAULT 'text',
        fileUrl TEXT DEFAULT '',
        edited BOOLEAN DEFAULT 0,
        editedAt DATETIME,
        deleted BOOLEAN DEFAULT 0,
        deletedAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (senderId) REFERENCES users(id),
        FOREIGN KEY (chatId) REFERENCES chats(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS message_reads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        messageId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        readAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (messageId) REFERENCES messages(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(messageId, userId)
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_messages_chatId ON messages(chatId);
      CREATE INDEX IF NOT EXISTS idx_messages_senderId ON messages(senderId);
      CREATE INDEX IF NOT EXISTS idx_chat_participants_chatId ON chat_participants(chatId);
      CREATE INDEX IF NOT EXISTS idx_chat_participants_userId ON chat_participants(userId);
    `);

    console.log('✅ SQLite database initialized successfully');
    return db;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// User functions
export const UserModel = {
  async create(userData) {
    const { username, email, password } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await db.run(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );
    
    return await this.findById(result.lastID);
  },

  async findByEmail(email) {
    return await db.get('SELECT * FROM users WHERE email = ?', [email]);
  },

  async findById(id) {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (user) {
      delete user.password;
    }
    return user;
  },

  async updateStatus(id, status) {
    await db.run(
      'UPDATE users SET status = ?, lastSeen = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );
    return await this.findById(id);
  },

  async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
};

// Chat functions
export const ChatModel = {
  async create(chatData) {
    const { isGroupChat, groupName, groupDescription, groupAdmin } = chatData;
    
    const result = await db.run(
      'INSERT INTO chats (isGroupChat, groupName, groupDescription, groupAdmin) VALUES (?, ?, ?, ?)',
      [isGroupChat, groupName, groupDescription, groupAdmin]
    );
    
    const chatId = result.lastID;
    
    // Add participants
    for (const userId of chatData.participants) {
      await db.run(
        'INSERT INTO chat_participants (chatId, userId) VALUES (?, ?)',
        [chatId, userId]
      );
    }
    
    return await this.findById(chatId);
  },

  async findById(id) {
    const chat = await db.get('SELECT * FROM chats WHERE id = ?', [id]);
    if (!chat) return null;
    
    // Get participants
    const participants = await db.all(`
      SELECT u.* FROM users u
      JOIN chat_participants cp ON u.id = cp.userId
      WHERE cp.chatId = ?
    `, [id]);
    
    chat.participants = participants;
    return chat;
  },

  async findByUserId(userId) {
    const chats = await db.all(`
      SELECT c.* FROM chats c
      JOIN chat_participants cp ON c.id = cp.chatId
      WHERE cp.userId = ?
      ORDER BY c.updatedAt DESC
    `, [userId]);
    
    // Get participants for each chat
    for (const chat of chats) {
      chat.participants = await db.all(`
        SELECT u.* FROM users u
        JOIN chat_participants cp ON u.id = cp.userId
        WHERE cp.chatId = ?
      `, [chat.id]);
      
      // Get last message
      const lastMessage = await db.get(`
        SELECT m.*, u.username as senderUsername 
        FROM messages m
        JOIN users u ON m.senderId = u.id
        WHERE m.chatId = ? AND m.deleted = 0
        ORDER BY m.createdAt DESC
        LIMIT 1
      `, [chat.id]);
      
      if (lastMessage) {
        chat.lastMessage = {
          _id: lastMessage.id.toString(),
          content: lastMessage.content,
          sender: {
            _id: lastMessage.senderId.toString(),
            username: lastMessage.senderUsername
          },
          createdAt: lastMessage.createdAt
        };
      }
    }
    
    return chats;
  },

  async findOneOnOneChat(user1Id, user2Id) {
    const chat = await db.get(`
      SELECT c.* FROM chats c
      WHERE c.isGroupChat = 0 AND c.id IN (
        SELECT cp.chatId FROM chat_participants cp
        WHERE cp.userId IN (?, ?)
        GROUP BY cp.chatId
        HAVING COUNT(DISTINCT cp.userId) = 2
      )
    `, [user1Id, user2Id]);
    
    return chat ? await this.findById(chat.id) : null;
  }
};

// Message functions
export const MessageModel = {
  async create(messageData) {
    const { senderId, chatId, content, messageType = 'text', fileUrl = '' } = messageData;
    
    const result = await db.run(
      'INSERT INTO messages (senderId, chatId, content, messageType, fileUrl) VALUES (?, ?, ?, ?, ?)',
      [senderId, chatId, content, messageType, fileUrl]
    );
    
    // Update chat's last message
    await db.run(
      'UPDATE chats SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [chatId]
    );
    
    return await this.findById(result.lastID);
  },

  async findById(id) {
    const message = await db.get('SELECT * FROM messages WHERE id = ? AND deleted = 0', [id]);
    if (!message) return null;
    
    // Get sender info
    const sender = await db.get('SELECT id, username, avatar FROM users WHERE id = ?', [message.senderId]);
    
    // Get read receipts
    const readBy = await db.all(`
      SELECT u.id, u.username, mr.readAt 
      FROM users u
      JOIN message_reads mr ON u.id = mr.userId
      WHERE mr.messageId = ?
    `, [id]);
    
    return {
      _id: message.id.toString(),
      sender: {
        _id: sender.id.toString(),
        username: sender.username,
        avatar: sender.avatar
      },
      content: message.content,
      chat: message.chatId.toString(),
      messageType: message.messageType,
      fileUrl: message.fileUrl,
      readBy: readBy.map(r => ({
        user: {
          _id: r.id.toString(),
          username: r.username
        },
        readAt: r.readAt
      })),
      edited: !!message.edited,
      editedAt: message.editedAt,
      createdAt: message.createdAt
    };
  },

  async findByChatId(chatId, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    
    const messages = await db.all(`
      SELECT m.*, u.username, u.avatar 
      FROM messages m
      JOIN users u ON m.senderId = u.id
      WHERE m.chatId = ? AND m.deleted = 0
      ORDER BY m.createdAt DESC
      LIMIT ? OFFSET ?
    `, [chatId, limit, offset]);
    
    const formattedMessages = [];
    for (const message of messages) {
      const readBy = await db.all(`
        SELECT u.id, u.username, mr.readAt 
        FROM users u
        JOIN message_reads mr ON u.id = mr.userId
        WHERE mr.messageId = ?
      `, [message.id]);
      
      formattedMessages.push({
        _id: message.id.toString(),
        sender: {
          _id: message.senderId.toString(),
          username: message.username,
          avatar: message.avatar
        },
        content: message.content,
        chat: message.chatId.toString(),
        messageType: message.messageType,
        fileUrl: message.fileUrl,
        readBy: readBy.map(r => ({
          user: {
            _id: r.id.toString(),
            username: r.username
          },
          readAt: r.readAt
        })),
        edited: !!message.edited,
        editedAt: message.editedAt,
        createdAt: message.createdAt
      });
    }
    
    return formattedMessages.reverse(); // Reverse to show oldest first
  },

  async markAsRead(messageId, userId) {
    await db.run(
      'INSERT OR IGNORE INTO message_reads (messageId, userId) VALUES (?, ?)',
      [messageId, userId]
    );
  },

  async markChatMessagesAsRead(chatId, userId) {
    const messages = await db.all(
      'SELECT id FROM messages WHERE chatId = ? AND senderId != ? AND deleted = 0',
      [chatId, userId]
    );
    
    for (const message of messages) {
      await this.markAsRead(message.id, userId);
    }
  }
};

// Initialize database
export { initDatabase };