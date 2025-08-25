const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  chatName: {
    type: String,
    trim: true
  },
  isGroupChat: {
    type: Boolean,
    default: false
  },
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  latestMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  groupAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  groupDescription: {
    type: String,
    trim: true,
    maxlength: [200, 'Group description cannot exceed 200 characters']
  },
  groupAvatar: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for better query performance
chatSchema.index({ users: 1 });
chatSchema.index({ updatedAt: -1 });

// Virtual for message count
chatSchema.virtual('messageCount', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'chat',
  count: true
});

// Populate users and latest message by default
chatSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'users',
    select: 'username email avatar isOnline lastSeen'
  }).populate({
    path: 'latestMessage',
    populate: {
      path: 'sender',
      select: 'username avatar'
    }
  }).populate({
    path: 'groupAdmin',
    select: 'username email avatar'
  });
  next();
});

module.exports = mongoose.model('Chat', chatSchema);
