import express from 'express';
import { body, validationResult } from 'express-validator';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all chats for current user
router.get('/', authenticateToken, async (req, res) => {
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

// Create or get one-on-one chat
router.post('/one-on-one', authenticateToken, [
  body('userId').isMongoId().withMessage('Valid user ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

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

    res.status(201).json({ chat });
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create group chat
router.post('/group', authenticateToken, [
  body('groupName').trim().isLength({ min: 1, max: 50 }).withMessage('Group name required (max 50 chars)'),
  body('participants').isArray({ min: 2 }).withMessage('At least 2 participants required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { groupName, groupDescription, participants } = req.body;

    // Add current user to participants and set as admin
    const allParticipants = [...new Set([req.user._id, ...participants])];

    // Create group chat
    const chat = new Chat({
      participants: allParticipants,
      isGroupChat: true,
      groupName,
      groupDescription: groupDescription || '',
      groupAdmin: req.user._id
    });

    await chat.save();
    await chat.populate('participants', 'username avatar status lastSeen');
    await chat.populate('groupAdmin', 'username avatar');

    res.status(201).json({ chat });
  } catch (error) {
    console.error('Create group chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get chat by ID
router.get('/:chatId', authenticateToken, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user._id
    })
    .populate('participants', 'username avatar status lastSeen')
    .populate('groupAdmin', 'username avatar');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.json({ chat });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark messages as read
router.put('/:chatId/read', authenticateToken, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user._id
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Mark unread messages as read
    await Message.updateMany(
      {
        chat: chat._id,
        sender: { $ne: req.user._id },
        'readBy.user': { $ne: req.user._id }
      },
      {
        $push: {
          readBy: {
            user: req.user._id,
            readAt: new Date()
          }
        }
      }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark messages read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;