const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const Call = require('../models/Call');

// Simple in-memory cache for chat data to improve performance
const chatCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper function to get cached chat data
const getCachedChat = async (chatId) => {
  const cacheKey = chatId.toString();
  const cached = chatCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Fetch from database if not cached or expired
  const chat = await Chat.findById(chatId).select('users isGroupChat');
  if (chat) {
    chatCache.set(cacheKey, {
      data: chat,
      timestamp: Date.now()
    });
  }

  return chat;
};

const chatSocket = (io) => {
  // Periodic cleanup of stale online users (every 5 minutes)
  setInterval(async () => {
    try {
      console.log('Running periodic online users cleanup...');

      // Get all users marked as online in database
      const onlineUsersInDB = await User.find({ isOnline: true }, '_id username socketId');

      // Get all currently connected socket IDs
      const connectedSocketIds = Array.from(io.sockets.sockets.keys());

      // Find users who are marked online but don't have active socket connections
      const staleUsers = onlineUsersInDB.filter(user =>
        user.socketId && !connectedSocketIds.includes(user.socketId)
      );

      if (staleUsers.length > 0) {
        console.log(`Found ${staleUsers.length} stale online users, marking them offline:`,
          staleUsers.map(u => u.username));

        // Mark stale users as offline
        await User.updateMany(
          { _id: { $in: staleUsers.map(u => u._id) } },
          {
            isOnline: false,
            lastSeen: new Date(),
            socketId: ''
          }
        );

        // Broadcast offline status for each stale user
        staleUsers.forEach(user => {
          io.emit('user_status_updated', {
            userId: user._id.toString(),
            isOnline: false,
            lastSeen: new Date()
          });
        });
      }
    } catch (error) {
      console.error('Error in periodic cleanup:', error);
    }
  }, 5 * 60 * 1000); // Run every 5 minutes

  // Middleware for socket authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User ${socket.user.username} connected with socket ID: ${socket.id}`);

    // Check if user already has an active socket connection
    const existingUserSockets = Array.from(io.sockets.sockets.values())
      .filter(s => s.userId && s.userId.toString() === socket.userId.toString() && s.id !== socket.id);

    // Disconnect any existing connections for this user (prevent multiple connections)
    existingUserSockets.forEach(existingSocket => {
      console.log(`Disconnecting existing socket ${existingSocket.id} for user ${socket.user.username}`);
      existingSocket.disconnect(true);
    });

    // Update user's socket ID and online status
    await User.findByIdAndUpdate(socket.userId, {
      socketId: socket.id,
      isOnline: true,
      lastSeen: new Date()
    });



    // Join user to their personal room
    socket.join(socket.userId);

    // Send current online users to the newly connected user and broadcast to all
    try {
      const onlineUsers = await User.find({ isOnline: true }, '_id username');
      const onlineUserIds = onlineUsers.map(user => user._id.toString());

      // Send to the newly connected user
      socket.emit('onlineUsers', onlineUserIds);

      // Also broadcast the user's online status to all other users
      socket.broadcast.emit('user_status_updated', {
        userId: socket.userId.toString(),
        isOnline: true,
        lastSeen: new Date()
      });

      console.log(`User ${socket.user.username} is now online. Total online users: ${onlineUsers.length}`);
    } catch (error) {
      console.error('Error fetching online users:', error);
    }

    // Join user to all their chat rooms and mark undelivered messages as delivered
    try {
      const userChats = await Chat.find({
        users: { $elemMatch: { $eq: socket.userId } }
      });

      userChats.forEach(chat => {
        socket.join(chat._id.toString());
      });

      // Mark undelivered messages as delivered when user comes online
      const undeliveredMessages = await Message.find({
        chat: { $in: userChats.map(chat => chat._id) },
        sender: { $ne: socket.userId },
        'deliveredTo.user': { $ne: socket.userId }
      });

      for (const message of undeliveredMessages) {
        try {
          await message.markAsDelivered(socket.userId);

          // Notify sender about delivery
          const sender = await User.findById(message.sender).select('socketId');
          if (sender && sender.socketId) {
            io.to(sender.socketId).emit('message_delivered', {
              messageId: message._id,
              deliveredTo: [socket.userId],
              deliveredAt: new Date()
            });
          }
        } catch (error) {
          console.error('Error marking message as delivered on user connect:', error);
        }
      }
    } catch (error) {
      console.error('Error joining chat rooms:', error);
    }

    // Handle joining a specific chat room
    socket.on('joinChat', (chatId) => {
      socket.join(chatId);
      socket.currentChatId = chatId; // Track current chat for fast read status
      console.log(`User ${socket.user.username} joined chat: ${chatId}`);
    });

    // Handle leaving a chat room
    socket.on('leaveChat', (chatId) => {
      socket.leave(chatId);
      if (socket.currentChatId === chatId) {
        socket.currentChatId = null; // Clear current chat
      }
      console.log(`User ${socket.user.username} left chat: ${chatId}`);
    });

    // Handle sending a message
    socket.on('sendMessage', async (data) => {
      try {
        const {
          content,
          chatId,
          messageType = 'text',
          replyTo,
          audioData,
          audioDuration,
          audioMimeType,
          fileUrl,
          fileName,
          fileSize,
          fileMimeType,
          fileExtension
        } = data;



        if (!content || !chatId) {
          socket.emit('error', { message: 'Content and chat ID are required' });
          return;
        }

        // Verify user is part of the chat
        const chat = await Chat.findById(chatId).populate('users', 'username email avatar isOnline lastSeen');
        const isUserInChat = chat && chat.users.some(userId => {
          const userIdStr = userId._id ? userId._id.toString() : userId.toString();
          return userIdStr === socket.userId.toString();
        });
        if (!chat || !isUserInChat) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Create message
        const messageData = {
          sender: socket.userId,
          content,
          chat: chatId,
          messageType,
          ...(replyTo && { replyTo }),
          ...(messageType === 'voice' && {
            audioData,
            audioDuration,
            audioMimeType
          }),
          ...(['image', 'video', 'audio', 'document', 'file'].includes(messageType) && {
            fileUrl,
            fileName,
            fileSize,
            fileMimeType,
            fileExtension
          })
        };



        let message = await Message.create(messageData);
        message = await Message.findById(message._id)
          .populate('sender', 'username email avatar')
          .populate('replyTo');

        // Update chat's latest message
        await Chat.findByIdAndUpdate(chatId, { 
          latestMessage: message._id,
          updatedAt: new Date()
        });

        // Mark message as delivered to all online users in the chat
        const chatWithUsers = await Chat.findById(chatId).populate('users', 'socketId isOnline');
        const onlineUsers = chatWithUsers.users.filter(user =>
          user.isOnline &&
          user._id.toString() !== socket.userId.toString() &&
          user.socketId
        );

        // Mark as delivered for online users
        for (const user of onlineUsers) {
          try {
            await message.markAsDelivered(user._id);
          } catch (error) {
            console.error('Error marking message as delivered:', error);
          }
        }

        // Emit message to all users in the chat
        io.to(chatId).emit('newMessage', message);

        // Calculate and emit initial status to sender
        const chatUserIds = chatWithUsers.users.map(user => user._id);
        const initialStatus = message.getOverallStatus(chatUserIds, message.sender);

        socket.emit('message_status_updated', {
          messageId: message._id,
          status: initialStatus,
          deliveredTo: onlineUsers.map(u => u._id),
          deliveredAt: new Date()
        });

        // Also emit delivery status for backward compatibility
        if (onlineUsers.length > 0) {
          socket.emit('message_delivered', {
            messageId: message._id,
            deliveredTo: onlineUsers.map(u => u._id),
            deliveredAt: new Date()
          });
        }

        // Emit chat update to all users in the chat
        const updatedChat = await Chat.findById(chatId);
        io.to(chatId).emit('chatUpdated', updatedChat);

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing', async (data) => {
      try {
        const { chatId, isTyping } = data;

        // Verify user is part of the chat
        const chat = await Chat.findById(chatId);
        const isUserInChat = chat && chat.users.some(userId => {
          const userIdStr = userId._id ? userId._id.toString() : userId.toString();
          return userIdStr === socket.userId.toString();
        });

        if (!isUserInChat) {
          return;
        }

        // Emit typing status to other users in the chat (not to sender)
        socket.to(chatId).emit('typing', {
          userId: socket.userId,
          username: socket.user.username,
          chatId,
          isTyping
        });
      } catch (error) {
        console.error('Typing indicator error:', error);
      }
    });

    // Handle message read status - ULTRA-FAST VERSION
    socket.on('mark_message_read', async (data) => {
      try {
        const { messageId } = data;

        // IMMEDIATE RESPONSE: Emit read status first, then update database
        // This provides instant visual feedback to users
        const readStatusUpdate = {
          messageId,
          status: 'read',
          readBy: socket.userId,
          readAt: new Date()
        };

        // Emit immediately to all users in the current chat room
        // The socket is already in the chat room from join_chat
        socket.to(socket.currentChatId).emit('message_status_updated', readStatusUpdate);
        socket.emit('message_status_updated', readStatusUpdate);

        // BACKGROUND UPDATE: Update database asynchronously without blocking
        setImmediate(async () => {
          try {
            // Quick check to avoid duplicate reads
            const existingRead = await Message.findOne({
              _id: messageId,
              'readBy.user': socket.userId
            }).select('_id').lean();

            if (existingRead) {
              return; // Already marked as read
            }

            // Update database in background
            await Message.updateOne(
              {
                _id: messageId,
                sender: { $ne: socket.userId } // Don't mark own messages as read
              },
              {
                $addToSet: {
                  readBy: {
                    user: socket.userId,
                    readAt: new Date()
                  },
                  deliveredTo: {
                    user: socket.userId,
                    deliveredAt: new Date()
                  }
                }
              }
            );
          } catch (error) {
            console.error('Background read update error:', error);
          }
        });

      } catch (error) {
        console.error('Mark message read error:', error);
      }
    });

    // Handle user going online/offline
    socket.on('user_status_change', async (data) => {
      try {
        const { isOnline } = data;
        await User.findByIdAndUpdate(socket.userId, {
          isOnline,
          lastSeen: new Date()
        });

        // Broadcast status change to all connected users
        socket.broadcast.emit('user_status_updated', {
          userId: socket.userId.toString(),
          isOnline,
          lastSeen: new Date()
        });
      } catch (error) {
        console.error('User status change error:', error);
      }
    });

    // ============ CALL SIGNALING EVENTS ============

    // Handle call initiation
    socket.on('initiate_call', async (data) => {
      try {
        const { receiverId, chatId, callType } = data;

        // Verify the chat exists and user has access
        const chat = await getCachedChat(chatId);
        if (!chat) {
          socket.emit('call_error', { message: 'Chat not found' });
          return;
        }

        // Check if users are in the chat using MongoDB ObjectId comparison
        const mongoose = require('mongoose');
        const currentUserObjectId = new mongoose.Types.ObjectId(socket.userId);
        const targetUserObjectId = new mongoose.Types.ObjectId(receiverId);

        const isCurrentUserInChat = chat.users.some(userId => userId.equals(currentUserObjectId));
        const isTargetUserInChat = chat.users.some(userId => userId.equals(targetUserObjectId));

        console.log('Call access check:', {
          chatId,
          currentUser: socket.userId,
          targetUser: receiverId,
          isCurrentUserInChat,
          isTargetUserInChat,
          chatUsersCount: chat.users.length
        });

        if (!isCurrentUserInChat || !isTargetUserInChat) {
          console.log('Call access denied - user not in chat');
          socket.emit('call_error', { message: 'Invalid chat or access denied' });
          return;
        }

        // Check if receiver is online
        const receiver = await User.findById(receiverId);
        if (!receiver || !receiver.isOnline || !receiver.socketId) {
          socket.emit('call_error', { message: 'User is not available for calls' });
          return;
        }

        // Create call record
        const call = await Call.create({
          caller: socket.userId,
          receiver: receiverId,
          chat: chatId,
          callType,
          status: 'initiated'
        });

        // Emit call offer to receiver
        io.to(receiver.socketId).emit('incoming_call', {
          callId: call._id,
          caller: {
            id: socket.userId,
            username: socket.user.username,
            avatar: socket.user.avatar
          },
          chatId,
          callType
        });

        // Confirm call initiation to caller
        socket.emit('call_initiated', {
          callId: call._id,
          receiverId,
          callType
        });

        // Set timeout for unanswered calls (30 seconds)
        setTimeout(async () => {
          try {
            const currentCall = await Call.findById(call._id);
            if (currentCall && currentCall.status === 'initiated') {
              await currentCall.updateStatus('missed', { endReason: 'timeout' });

              // Notify both users
              io.to(socket.id).emit('call_ended', {
                callId: call._id,
                endReason: 'timeout'
              });

              if (receiver.socketId) {
                io.to(receiver.socketId).emit('call_ended', {
                  callId: call._id,
                  endReason: 'timeout'
                });
              }
            }
          } catch (error) {
            console.error('Call timeout error:', error);
          }
        }, 30000); // 30 seconds

        console.log(`Call initiated: ${socket.user.username} -> ${receiver.username} (${callType})`);
      } catch (error) {
        console.error('Call initiation error:', error);
        socket.emit('call_error', { message: 'Failed to initiate call' });
      }
    });

    // Handle call answer
    socket.on('answer_call', async (data) => {
      try {
        const { callId } = data;

        const call = await Call.findById(callId).populate('caller receiver');
        if (!call || call.receiver._id.toString() !== socket.userId) {
          socket.emit('call_error', { message: 'Invalid call or access denied' });
          return;
        }

        // Update call status
        await call.updateStatus('answered');

        // Notify caller that call was answered
        const caller = await User.findById(call.caller._id);
        if (caller && caller.socketId) {
          io.to(caller.socketId).emit('call_answered', {
            callId: call._id,
            answeredBy: {
              id: socket.userId,
              username: socket.user.username,
              avatar: socket.user.avatar
            }
          });
        }

        console.log(`Call answered: ${call.caller.username} <-> ${call.receiver.username}`);
      } catch (error) {
        console.error('Call answer error:', error);
        socket.emit('call_error', { message: 'Failed to answer call' });
      }
    });

    // Handle call decline
    socket.on('decline_call', async (data) => {
      try {
        const { callId } = data;

        const call = await Call.findById(callId).populate('caller receiver');
        if (!call || call.receiver._id.toString() !== socket.userId) {
          socket.emit('call_error', { message: 'Invalid call or access denied' });
          return;
        }

        // Update call status
        await call.updateStatus('declined', { endReason: 'declined' });

        // Notify caller that call was declined
        const caller = await User.findById(call.caller._id);
        if (caller && caller.socketId) {
          io.to(caller.socketId).emit('call_declined', {
            callId: call._id,
            declinedBy: {
              id: socket.userId,
              username: socket.user.username,
              avatar: socket.user.avatar
            }
          });
        }

        console.log(`Call declined: ${call.caller.username} -> ${call.receiver.username}`);
      } catch (error) {
        console.error('Call decline error:', error);
        socket.emit('call_error', { message: 'Failed to decline call' });
      }
    });

    // Handle call end
    socket.on('end_call', async (data) => {
      try {
        const { callId, endReason = 'caller_ended' } = data;

        const call = await Call.findById(callId).populate('caller receiver');
        if (!call || (call.caller._id.toString() !== socket.userId && call.receiver._id.toString() !== socket.userId)) {
          socket.emit('call_error', { message: 'Invalid call or access denied' });
          return;
        }

        // Update call status
        await call.updateStatus('ended', { endReason });

        // Notify the other participant
        const otherUserId = call.caller._id.toString() === socket.userId ? call.receiver._id : call.caller._id;
        const otherUser = await User.findById(otherUserId);

        if (otherUser && otherUser.socketId) {
          io.to(otherUser.socketId).emit('call_ended', {
            callId: call._id,
            endedBy: {
              id: socket.userId,
              username: socket.user.username,
              avatar: socket.user.avatar
            },
            endReason
          });
        }

        console.log(`Call ended: ${call.caller.username} <-> ${call.receiver.username} (${endReason})`);
      } catch (error) {
        console.error('Call end error:', error);
        socket.emit('call_error', { message: 'Failed to end call' });
      }
    });

    // ============ WEBRTC SIGNALING EVENTS ============

    // Handle WebRTC offer
    socket.on('webrtc_offer', async (data) => {
      try {
        const { callId, offer, targetUserId } = data;

        // Verify call exists and user has access
        const call = await Call.findById(callId);
        if (!call || (call.caller.toString() !== socket.userId && call.receiver.toString() !== socket.userId)) {
          socket.emit('call_error', { message: 'Invalid call or access denied' });
          return;
        }

        // Forward offer to target user
        const targetUser = await User.findById(targetUserId);
        if (targetUser && targetUser.socketId) {
          io.to(targetUser.socketId).emit('webrtc_offer', {
            callId,
            offer,
            fromUserId: socket.userId
          });
        }

        console.log(`WebRTC offer sent: ${socket.userId} -> ${targetUserId}`);
      } catch (error) {
        console.error('WebRTC offer error:', error);
        socket.emit('call_error', { message: 'Failed to send offer' });
      }
    });

    // Handle WebRTC answer
    socket.on('webrtc_answer', async (data) => {
      try {
        const { callId, answer, targetUserId } = data;

        // Verify call exists and user has access
        const call = await Call.findById(callId);
        if (!call || (call.caller.toString() !== socket.userId && call.receiver.toString() !== socket.userId)) {
          socket.emit('call_error', { message: 'Invalid call or access denied' });
          return;
        }

        // Forward answer to target user
        const targetUser = await User.findById(targetUserId);
        if (targetUser && targetUser.socketId) {
          io.to(targetUser.socketId).emit('webrtc_answer', {
            callId,
            answer,
            fromUserId: socket.userId
          });
        }

        console.log(`WebRTC answer sent: ${socket.userId} -> ${targetUserId}`);
      } catch (error) {
        console.error('WebRTC answer error:', error);
        socket.emit('call_error', { message: 'Failed to send answer' });
      }
    });

    // Handle ICE candidates
    socket.on('webrtc_ice_candidate', async (data) => {
      try {
        const { callId, candidate, targetUserId } = data;

        // Verify call exists and user has access
        const call = await Call.findById(callId);
        if (!call || (call.caller.toString() !== socket.userId && call.receiver.toString() !== socket.userId)) {
          return; // Silently ignore invalid ICE candidates
        }

        // Forward ICE candidate to target user
        const targetUser = await User.findById(targetUserId);
        if (targetUser && targetUser.socketId) {
          io.to(targetUser.socketId).emit('webrtc_ice_candidate', {
            callId,
            candidate,
            fromUserId: socket.userId
          });
        }

        console.log(`ICE candidate sent: ${socket.userId} -> ${targetUserId}`);
      } catch (error) {
        console.error('ICE candidate error:', error);
        // Don't emit error for ICE candidates as they can be frequent
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User ${socket.user.username} disconnected from socket ${socket.id}`);

      try {
        // Check if this user has other active socket connections
        const userSockets = Array.from(io.sockets.sockets.values())
          .filter(s => s.userId && s.userId.toString() === socket.userId.toString() && s.id !== socket.id);

        // Only mark user as offline if this is their last connection
        if (userSockets.length === 0) {
          console.log(`User ${socket.user.username} has no more active connections, marking offline`);

          // End any active calls for this user
          const activeCalls = await Call.find({
            $or: [{ caller: socket.userId }, { receiver: socket.userId }],
            status: { $in: ['initiated', 'ringing', 'answered'] }
          }).populate('caller receiver');

          for (const call of activeCalls) {
            await call.updateStatus('ended', { endReason: 'connection_failed' });

            // Notify the other participant
            const otherUserId = call.caller._id.toString() === socket.userId ? call.receiver._id : call.caller._id;
            const otherUser = await User.findById(otherUserId);

            if (otherUser && otherUser.socketId) {
              io.to(otherUser.socketId).emit('call_ended', {
                callId: call._id,
                endedBy: {
                  id: socket.userId,
                  username: socket.user.username,
                  avatar: socket.user.avatar
                },
                endReason: 'connection_failed'
              });
            }
          }

          // Update user's offline status
          await User.findByIdAndUpdate(socket.userId, {
            isOnline: false,
            lastSeen: new Date(),
            socketId: ''
          });

          // Broadcast offline status to all connected users
          socket.broadcast.emit('user_status_updated', {
            userId: socket.userId.toString(),
            isOnline: false,
            lastSeen: new Date()
          });
        } else {
          console.log(`User ${socket.user.username} still has ${userSockets.length} active connections`);
        }
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    });
  });
};

module.exports = chatSocket;
