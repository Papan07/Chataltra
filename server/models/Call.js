const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  callType: {
    type: String,
    enum: ['audio', 'video'],
    required: true
  },
  status: {
    type: String,
    enum: ['initiated', 'ringing', 'answered', 'declined', 'missed', 'ended', 'failed'],
    default: 'initiated'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number, // Duration in seconds
    default: 0
  },
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  answeredAt: {
    type: Date
  },
  endedAt: {
    type: Date
  },
  endReason: {
    type: String,
    enum: ['caller_ended', 'receiver_ended', 'timeout', 'connection_failed', 'declined'],
    default: null
  },
  quality: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor'],
    default: null
  },
  metadata: {
    userAgent: String,
    networkType: String,
    deviceType: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
callSchema.index({ caller: 1, createdAt: -1 });
callSchema.index({ receiver: 1, createdAt: -1 });
callSchema.index({ chat: 1, createdAt: -1 });
callSchema.index({ status: 1 });
callSchema.index({ callType: 1 });

// Virtual for call duration calculation
callSchema.virtual('callDuration').get(function() {
  if (this.answeredAt && this.endedAt) {
    return Math.floor((this.endedAt - this.answeredAt) / 1000);
  }
  return 0;
});

// Method to update call status
callSchema.methods.updateStatus = function(status, additionalData = {}) {
  this.status = status;
  
  switch (status) {
    case 'answered':
      this.answeredAt = new Date();
      break;
    case 'ended':
    case 'declined':
    case 'missed':
    case 'failed':
      this.endedAt = new Date();
      if (this.answeredAt) {
        this.duration = Math.floor((this.endedAt - this.answeredAt) / 1000);
      }
      if (additionalData.endReason) {
        this.endReason = additionalData.endReason;
      }
      break;
  }
  
  return this.save();
};

// Static method to get call history for a chat
callSchema.statics.getCallHistory = function(chatId, limit = 50) {
  return this.find({ chat: chatId })
    .populate('caller', 'username avatar')
    .populate('receiver', 'username avatar')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get user's call statistics
callSchema.statics.getUserCallStats = function(userId) {
  return this.aggregate([
    {
      $match: {
        $or: [{ caller: userId }, { receiver: userId }],
        status: { $in: ['answered', 'ended'] }
      }
    },
    {
      $group: {
        _id: '$callType',
        totalCalls: { $sum: 1 },
        totalDuration: { $sum: '$duration' },
        avgDuration: { $avg: '$duration' }
      }
    }
  ]);
};

module.exports = mongoose.model('Call', callSchema);
