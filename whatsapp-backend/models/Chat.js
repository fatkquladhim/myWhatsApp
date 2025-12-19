import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  isGroupChat: {
    type: Boolean,
    default: false
  },
  groupName: {
    type: String,
    trim: true
  },
  groupDescription: {
    type: String,
    trim: true
  },
  groupAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  unreadCounts: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    count: {
      type: Number,
      default: 0
    }
  }]
}, {
  timestamps: true
});

// Ensure participants array has at least 2 users for non-group chats
chatSchema.pre('save', function(next) {
  if (!this.isGroupChat && this.participants.length !== 2) {
    return next(new Error('Non-group chats must have exactly 2 participants'));
  }
  if (this.isGroupChat && this.participants.length < 2) {
    return next(new Error('Group chats must have at least 2 participants'));
  }
  next();
});

export default mongoose.model('Chat', chatSchema);