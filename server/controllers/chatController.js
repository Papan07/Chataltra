const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const path = require('path');

// Get all chats for a user
const getChats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const chats = await Chat.find({
      users: { $elemMatch: { $eq: userId } }
    })
    .populate('users', 'username email avatar isOnline lastSeen')
    .populate('latestMessage')
    .sort({ updatedAt: -1 });

    res.json({ chats });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ 
      message: 'Server error getting chats',
      error: error.message 
    });
  }
};

// Create or access one-on-one chat
const accessChat = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user._id;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      isGroupChat: false,
      users: { $all: [currentUserId, userId] }
    }).populate('users', 'username email avatar isOnline lastSeen')
     .populate('latestMessage');

    if (chat) {
      return res.json({ chat });
    }

    // Create new chat
    const chatData = {
      chatName: 'sender',
      isGroupChat: false,
      users: [currentUserId, userId]
    };

    chat = await Chat.create(chatData);
    chat = await Chat.findById(chat._id)
      .populate('users', 'username email avatar isOnline lastSeen')
      .populate('latestMessage');

    res.status(201).json({ chat });
  } catch (error) {
    console.error('Access chat error:', error);
    res.status(500).json({ 
      message: 'Server error accessing chat',
      error: error.message 
    });
  }
};

// Create group chat
const createGroupChat = async (req, res) => {
  try {
    const { users, chatName, groupDescription } = req.body;
    const currentUserId = req.user._id;

    if (!users || !Array.isArray(users) || users.length < 2) {
      return res.status(400).json({ 
        message: 'At least 2 users are required for a group chat' 
      });
    }

    if (!chatName) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    // Add current user to the group
    const allUsers = [...users, currentUserId];

    const groupChat = await Chat.create({
      chatName,
      users: allUsers,
      isGroupChat: true,
      groupAdmin: currentUserId,
      groupDescription: groupDescription || ''
    });

    const fullGroupChat = await Chat.findById(groupChat._id);

    res.status(201).json({ chat: fullGroupChat });
  } catch (error) {
    console.error('Create group chat error:', error);
    res.status(500).json({ 
      message: 'Server error creating group chat',
      error: error.message 
    });
  }
};

// Add user to group
const addToGroup = async (req, res) => {
  try {
    const { chatId, userId } = req.body;
    const currentUserId = req.user._id;

    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (!chat.isGroupChat) {
      return res.status(400).json({ message: 'This is not a group chat' });
    }

    if (chat.groupAdmin.toString() !== currentUserId.toString()) {
      return res.status(403).json({ message: 'Only group admin can add users' });
    }

    if (chat.users.includes(userId)) {
      return res.status(400).json({ message: 'User is already in the group' });
    }

    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { $push: { users: userId } },
      { new: true }
    );

    res.json({ chat: updatedChat });
  } catch (error) {
    console.error('Add to group error:', error);
    res.status(500).json({ 
      message: 'Server error adding user to group',
      error: error.message 
    });
  }
};

// Remove user from group
const removeFromGroup = async (req, res) => {
  try {
    const { chatId, userId } = req.body;
    const currentUserId = req.user._id;

    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (!chat.isGroupChat) {
      return res.status(400).json({ message: 'This is not a group chat' });
    }

    // Allow users to remove themselves or admin to remove others
    if (chat.groupAdmin.toString() !== currentUserId.toString() && 
        userId !== currentUserId.toString()) {
      return res.status(403).json({ 
        message: 'Only group admin can remove other users' 
      });
    }

    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { $pull: { users: userId } },
      { new: true }
    );

    res.json({ chat: updatedChat });
  } catch (error) {
    console.error('Remove from group error:', error);
    res.status(500).json({ 
      message: 'Server error removing user from group',
      error: error.message 
    });
  }
};

// Get messages for a chat
const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is part of the chat
    const isUserInChat = chat.users.some(userId => {
      const userIdStr = userId._id ? userId._id.toString() : userId.toString();
      return userIdStr === req.user._id.toString();
    });
    if (!isUserInChat) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'username email avatar')
      .populate('replyTo')
      .populate('readBy.user', 'username')
      .populate('deliveredTo.user', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Add status to each message
    const messagesWithStatus = messages.reverse().map(message => {
      const chatUserIds = chat.users.map(user => user._id ? user._id : user);
      const status = message.getOverallStatus(chatUserIds, message.sender._id);

      return {
        ...message.toObject(),
        status
      };
    });

    res.json({ messages: messagesWithStatus });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ 
      message: 'Server error getting messages',
      error: error.message 
    });
  }
};

// Send message
const sendMessage = async (req, res) => {
  try {
    const { content, chatId, messageType = 'text', replyTo } = req.body;
    const senderId = req.user._id;

    if (!content || !chatId) {
      return res.status(400).json({ message: 'Content and chat ID are required' });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is part of the chat
    const isUserInChat = chat.users.some(userId => {
      const userIdStr = userId._id ? userId._id.toString() : userId.toString();
      return userIdStr === senderId.toString();
    });

    if (!isUserInChat) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messageData = {
      sender: senderId,
      content,
      chat: chatId,
      messageType,
      ...(replyTo && { replyTo })
    };

    let message = await Message.create(messageData);
    message = await Message.findById(message._id);

    // Update chat's latest message
    await Chat.findByIdAndUpdate(chatId, { 
      latestMessage: message._id,
      updatedAt: new Date()
    });

    res.status(201).json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ 
      message: 'Server error sending message',
      error: error.message 
    });
  }
};

// Upload file
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { chatId } = req.body;
    if (!chatId) {
      return res.status(400).json({ message: 'Chat ID is required' });
    }

    // Verify user is part of the chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const isUserInChat = chat.users.some(userId => {
      const userIdStr = userId._id ? userId._id.toString() : userId.toString();
      return userIdStr === req.user._id.toString();
    });

    if (!isUserInChat) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Determine message type based on file MIME type
    let messageType = 'file';
    if (req.file.mimetype.startsWith('image/')) {
      messageType = 'image';
    } else if (req.file.mimetype.startsWith('video/')) {
      messageType = 'video';
    } else if (req.file.mimetype.startsWith('audio/')) {
      messageType = 'audio';
    } else if (req.file.mimetype.includes('pdf') ||
               req.file.mimetype.includes('document') ||
               req.file.mimetype.includes('text') ||
               req.file.mimetype.includes('spreadsheet') ||
               req.file.mimetype.includes('presentation')) {
      messageType = 'document';
    }

    // Create file URL (relative path from uploads directory)
    const fileUrl = `/uploads/${path.basename(path.dirname(req.file.path))}/${req.file.filename}`;

    // Create message with file data
    const messageData = {
      sender: req.user._id,
      content: req.file.originalname, // Use original filename as content
      chat: chatId,
      messageType,
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileMimeType: req.file.mimetype,
      fileExtension: path.extname(req.file.originalname)
    };

    let message = await Message.create(messageData);
    message = await Message.findById(message._id)
      .populate('sender', 'username email avatar');

    // Update chat's latest message
    await Chat.findByIdAndUpdate(chatId, {
      latestMessage: message._id,
      updatedAt: new Date()
    });

    res.status(201).json({
      message,
      fileInfo: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: fileUrl
      }
    });
  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({
      message: 'Server error uploading file',
      error: error.message
    });
  }
};

module.exports = {
  getChats,
  accessChat,
  createGroupChat,
  addToGroup,
  removeFromGroup,
  getMessages,
  sendMessage,
  uploadFile
};
