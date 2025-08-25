const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'document', 'file', 'voice', 'system'],
    default: 'text'
  },
  fileUrl: {
    type: String,
    default: ''
  },
  fileName: {
    type: String,
    default: ''
  },
  fileSize: {
    type: Number,
    default: 0
  },
  fileMimeType: {
    type: String,
    default: ''
  },
  fileExtension: {
    type: String,
    default: ''
  },
  audioData: {
    type: String,
    default: ''
  },
  audioDuration: {
    type: Number,
    default: 0
  },
  audioMimeType: {
    type: String,
    default: ''
  },
  deliveredTo: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    deliveredAt: {
      type: Date,
      default: Date.now
    }
  }],
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  editedAt: {
    type: Date
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }
}, {
  timestamps: true
});

// Optimized indexes for better query performance
messageSchema.index({ chat: 1, createdAt: -1 }); // For fetching chat messages
messageSchema.index({ sender: 1, chat: 1 }); // For sender-specific queries
messageSchema.index({ 'readBy.user': 1 }); // For read status queries
messageSchema.index({ 'deliveredTo.user': 1 }); // For delivery status queries
messageSchema.index({ _id: 1, sender: 1 }); // For read status optimization

// Populate sender and reply message by default
messageSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'sender',
    select: 'username avatar'
  }).populate({
    path: 'replyTo',
    select: 'content sender createdAt',
    populate: {
      path: 'sender',
      select: 'username'
    }
  });
  next();
});

// Method to mark message as delivered to a user
messageSchema.methods.markAsDelivered = async function(userId) {
  const alreadyDelivered = this.deliveredTo.find(delivery => delivery.user.toString() === userId.toString());

  if (!alreadyDelivered) {
    return await this.constructor.findByIdAndUpdate(
      this._id,
      {
        $addToSet: {
          deliveredTo: {
            user: userId,
            deliveredAt: new Date()
          }
        }
      },
      { new: true }
    );
  }

  return this;
};

// Method to mark message as read by a user - OPTIMIZED VERSION
messageSchema.methods.markAsRead = async function(userId) {
  // Use atomic update operation for better performance
  const updateData = {
    $addToSet: {
      readBy: {
        user: userId,
        readAt: new Date()
      },
      deliveredTo: {
        user: userId,
        deliveredAt: new Date()
      }
    }
  };

  // Use updateOne for better performance (no need to return the document)
  await this.constructor.updateOne({ _id: this._id }, updateData);

  // Update the current instance for immediate use
  const alreadyRead = this.readBy.find(read => read.user.toString() === userId.toString());
  if (!alreadyRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
  }

  const alreadyDelivered = this.deliveredTo.find(delivery => delivery.user.toString() === userId.toString());
  if (!alreadyDelivered) {
    this.deliveredTo.push({
      user: userId,
      deliveredAt: new Date()
    });
  }

  return this;
};

// Method to check if message is delivered to a user
messageSchema.methods.isDeliveredTo = function(userId) {
  return this.deliveredTo.some(delivery => {
    // Handle both populated and unpopulated user references
    let deliveryUserId;
    if (delivery.user._id) {
      // User is populated
      deliveryUserId = delivery.user._id.toString();
    } else if (typeof delivery.user === 'object' && delivery.user.toString) {
      // User is an ObjectId
      deliveryUserId = delivery.user.toString();
    } else {
      // User is already a string
      deliveryUserId = delivery.user;
    }
    return deliveryUserId === userId.toString();
  });
};

// Method to check if message is read by a user
messageSchema.methods.isReadBy = function(userId) {
  return this.readBy.some((read) => {
    // Handle both populated and unpopulated user references
    let readUserId;
    if (read.user._id) {
      // User is populated
      readUserId = read.user._id.toString();
    } else if (typeof read.user === 'object' && read.user.toString) {
      // User is an ObjectId
      readUserId = read.user.toString();
    } else {
      // User is already a string
      readUserId = read.user;
    }

    return readUserId === userId.toString();
  });
};

// Method to get message status for a specific user
messageSchema.methods.getStatusForUser = function(userId, senderId) {
  // Don't show status for sender's own messages
  if (userId.toString() === senderId.toString()) {
    return 'sent';
  }

  const isRead = this.isReadBy(userId);
  const isDelivered = this.isDeliveredTo(userId);

  if (isRead) {
    return 'read';
  } else if (isDelivered) {
    return 'delivered';
  } else {
    return 'sent';
  }
};

// Method to get overall message status (for individual chats)
messageSchema.methods.getOverallStatus = function(chatUsers, senderId) {
  // Ensure senderId is an ObjectId string, not a populated object
  const senderIdString = senderId._id ? senderId._id.toString() : senderId.toString();

  const otherUsers = chatUsers.filter(userId => userId.toString() !== senderIdString);

  if (otherUsers.length === 0) {
    return 'sent';
  }

  // For individual chats (1 other user)
  if (otherUsers.length === 1) {
    return this.getStatusForUser(otherUsers[0], senderIdString);
  }

  // For group chats, show read if all have read, delivered if all have received, otherwise sent
  const allRead = otherUsers.every(userId => this.isReadBy(userId));
  const allDelivered = otherUsers.every(userId => this.isDeliveredTo(userId));

  if (allRead) {
    return 'read';
  } else if (allDelivered) {
    return 'delivered';
  } else {
    return 'sent';
  }
};

module.exports = mongoose.model('Message', messageSchema);
