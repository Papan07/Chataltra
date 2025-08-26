import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useCall } from '../context/CallContext';
import { chatAPI } from '../services/api';
import { 
  Menu, 
  Phone, 
  Video, 
  MoreVertical, 
  Send, 
  Paperclip, 
  Smile,
  Users,
  MessageCircle
} from 'lucide-react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import CallHistory from './CallHistory';

const ChatWindow = ({ selectedChat, onToggleMobileMenu, isMobile }) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const { user } = useAuth();
  const { socket, joinChat, leaveChat, sendMessage: socketSendMessage, onlineUsers } = useSocket();
  const { initiateCall } = useCall();

  useEffect(() => {
    if (selectedChat) {
      fetchMessages();

      // Join the chat room for real-time updates
      if (socket) {
        joinChat(selectedChat._id);
      }
    }

    // Leave previous chat room when switching chats
    return () => {
      if (selectedChat && socket) {
        leaveChat(selectedChat._id);
      }
    };
  }, [selectedChat, socket, joinChat, leaveChat]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Listen for new messages
    const handleNewMessage = (message) => {
      if (selectedChat && message.chat === selectedChat._id) {
        setMessages(prev => {
          // Check if this is replacing an optimistic message from the same sender
          const optimisticIndex = prev.findIndex(msg =>
            msg.isOptimistic &&
            msg.sender._id === message.sender._id &&
            msg.content === message.content &&
            Math.abs(new Date(msg.createdAt) - new Date(message.createdAt)) < 5000 // Within 5 seconds
          );

          if (optimisticIndex !== -1) {
            // Replace optimistic message with real message
            const newMessages = [...prev];
            newMessages[optimisticIndex] = { ...message, status: 'sent' };
            return newMessages;
          } else {
            // Add new message (from other users)
            return [...prev, message];
          }
        });
      }
    };

    // Listen for typing indicators
    const handleTyping = ({ userId, username, chatId, isTyping }) => {
      if (userId === user.id) return; // Don't show own typing
      if (selectedChat && chatId !== selectedChat._id) return; // Only show for current chat

      setTypingUsers(prev => {
        if (isTyping) {
          return [...prev.filter(u => u.userId !== userId), { userId, username }];
        } else {
          return prev.filter(u => u.userId !== userId);
        }
      });
    };

    // Listen for message delivery status
    const handleMessageDelivered = ({ messageId, deliveredTo, deliveredAt }) => {
      setMessages(prev =>
        prev.map(msg =>
          msg._id === messageId
            ? { ...msg, status: 'delivered', deliveredAt }
            : msg
        )
      );
    };

    // Listen for message status updates (read/delivered) - OPTIMIZED
    const handleMessageStatusUpdated = ({ messageId, status, readBy, readAt }) => {
      setMessages(prev => {
        // Find the message index for efficient update
        const messageIndex = prev.findIndex(msg => msg._id === messageId);
        if (messageIndex === -1) return prev;

        // Only update if status actually changed
        const currentMessage = prev[messageIndex];
        if (currentMessage.status === status) return prev;

        // Create new array with updated message
        const newMessages = [...prev];
        newMessages[messageIndex] = {
          ...currentMessage,
          status,
          readAt: readAt || currentMessage.readAt
        };
        return newMessages;
      });
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('typing', handleTyping);
    socket.on('message_delivered', handleMessageDelivered);
    socket.on('message_status_updated', handleMessageStatusUpdated);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('typing', handleTyping);
      socket.off('message_delivered', handleMessageDelivered);
      socket.off('message_status_updated', handleMessageStatusUpdated);
    };
  }, [socket, selectedChat, user.id]);

  const fetchMessages = async () => {
    if (!selectedChat) return;
    
    try {
      setIsLoading(true);
      const response = await chatAPI.getMessages(selectedChat._id);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (messageData) => {
    if (!selectedChat) return;

    // Create optimistic message for instant UI feedback
    const optimisticMessage = {
      _id: `temp_${Date.now()}_${Math.random()}`, // Temporary ID
      content: messageData.content,
      sender: {
        _id: user.id,
        username: user.username,
        avatar: user.avatar || ''
      },
      chat: selectedChat._id,
      messageType: messageData.messageType || 'text',
      createdAt: new Date().toISOString(),
      status: 'sent', // Start with 'sent' status
      isOptimistic: true, // Flag to identify optimistic messages
      replyTo: replyToMessage,
      ...(messageData.audioData && { audioData: messageData.audioData }),
      ...(messageData.audioDuration && { audioDuration: messageData.audioDuration }),
      ...(messageData.audioMimeType && { audioMimeType: messageData.audioMimeType })
    };

    // Immediately add to UI for instant feedback
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const messagePayload = {
        ...messageData,
        chatId: selectedChat._id,
        ...(replyToMessage && { replyTo: replyToMessage._id })
      };

      // Send via Socket.IO for real-time delivery
      if (socket) {
        socketSendMessage(messagePayload);
      } else {
        // Fallback to HTTP API if socket is not available
        const response = await chatAPI.sendMessage(messagePayload);

        // Replace optimistic message with real message
        setMessages(prev =>
          prev.map(msg =>
            msg._id === optimisticMessage._id
              ? response.data.message
              : msg
          )
        );
      }

      // Clear reply after sending
      setReplyToMessage(null);
    } catch (error) {
      console.error('Error sending message:', error);

      // Remove optimistic message on error
      setMessages(prev =>
        prev.filter(msg => msg._id !== optimisticMessage._id)
      );
    }
  };

  // Mark message as read when it comes into view
  const markMessageAsRead = useCallback((messageId) => {
    const message = messages.find(msg => msg._id === messageId);
    if (message && message.sender._id !== user.id && socket) {
      socket.emit('mark_message_read', { messageId });
    }
  }, [messages, user.id, socket]);

  const handleAddReaction = async (messageId, emoji) => {
    try {
      // TODO: Implement reaction API call
      console.log('Add reaction:', messageId, emoji);

      // For now, update locally (this should be handled via Socket.IO)
      setMessages(prev =>
        prev.map(msg => {
          if (msg._id === messageId) {
            const reactions = msg.reactions || [];
            const existingReaction = reactions.find(r => r.emoji === emoji);

            if (existingReaction) {
              // Add user to existing reaction
              if (!existingReaction.users.includes(user.id)) {
                existingReaction.users.push(user.id);
              }
            } else {
              // Create new reaction
              reactions.push({
                emoji,
                users: [user.id]
              });
            }

            return { ...msg, reactions };
          }
          return msg;
        })
      );
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleRemoveReaction = async (messageId, emoji) => {
    try {
      // TODO: Implement remove reaction API call
      console.log('Remove reaction:', messageId, emoji);

      // For now, update locally (this should be handled via Socket.IO)
      setMessages(prev =>
        prev.map(msg => {
          if (msg._id === messageId) {
            const reactions = msg.reactions || [];
            const updatedReactions = reactions.map(r => {
              if (r.emoji === emoji) {
                return {
                  ...r,
                  users: r.users.filter(userId => userId !== user.id)
                };
              }
              return r;
            }).filter(r => r.users.length > 0);

            return { ...msg, reactions: updatedReactions };
          }
          return msg;
        })
      );
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  };

  const handleReplyToMessage = (message) => {
    setReplyToMessage(message);
  };

  const handleCancelReply = () => {
    setReplyToMessage(null);
  };

  // Handle audio call initiation
  const handleAudioCall = async () => {
    if (!selectedChat || selectedChat.isGroupChat) {
      alert('Audio calls are only available for individual chats');
      return;
    }

    const otherUser = selectedChat.users.find(u => u._id !== user.id);
    if (!otherUser) {
      alert('Unable to find the other user');
      return;
    }

    // Check if user is online
    const isUserOnline = onlineUsers.includes(otherUser._id);


    if (!isUserOnline) {
      alert('User is currently offline and cannot receive calls');
      return;
    }

    try {
      await initiateCall(otherUser._id, selectedChat._id, 'audio');
    } catch (error) {
      console.error('Error initiating audio call:', error);
      alert('Failed to initiate call. Please try again.');
    }
  };

  // Handle video call initiation
  const handleVideoCall = async () => {
    if (!selectedChat || selectedChat.isGroupChat) {
      alert('Video calls are only available for individual chats');
      return;
    }

    const otherUser = selectedChat.users.find(u => u._id !== user.id);
    if (!otherUser) {
      alert('Unable to find the other user');
      return;
    }

    // Check if user is online
    const isUserOnline = onlineUsers.includes(otherUser._id);


    if (!isUserOnline) {
      alert('User is currently offline and cannot receive calls');
      return;
    }

    try {
      await initiateCall(otherUser._id, selectedChat._id, 'video');
    } catch (error) {
      console.error('Error initiating video call:', error);
      alert('Failed to initiate call. Please try again.');
    }
  };

  const getChatDisplayName = () => {
    if (!selectedChat) return '';
    
    if (selectedChat.isGroupChat) {
      return selectedChat.chatName;
    }
    const otherUser = selectedChat.users.find(u => u._id !== user.id);
    return otherUser?.username || 'Unknown User';
  };

  const getChatAvatar = () => {
    if (!selectedChat) return '';
    
    if (selectedChat.isGroupChat) {
      return selectedChat.groupAvatar || '';
    }
    const otherUser = selectedChat.users.find(u => u._id !== user.id);
    return otherUser?.avatar || '';
  };

  const getOnlineStatus = () => {
    if (!selectedChat || selectedChat.isGroupChat) return null;

    const otherUser = selectedChat.users.find(u => u._id !== user.id);
    const isUserOnline = otherUser && onlineUsers.includes(otherUser._id);
    return isUserOnline ? 'Online' : 'Last seen recently';
  };

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <MessageCircle className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
            Welcome to Chataltra
          </h3>
          <p className="text-sm sm:text-base text-gray-600">
            {isMobile ? 'Tap the menu to select a chat' : 'Select a chat to start messaging'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-1 hover:bg-gray-100 rounded flex-shrink-0"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {getChatAvatar() ? (
              <img
                src={getChatAvatar()}
                alt={getChatDisplayName()}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-whatsapp-green rounded-full flex items-center justify-center">
                {selectedChat.isGroupChat ? (
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                ) : (
                  <span className="text-white font-semibold text-xs sm:text-sm">
                    {getChatDisplayName().charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            )}
            
            {/* Online indicator */}
            {!selectedChat.isGroupChat && (() => {
              const otherUser = selectedChat.users.find(u => u._id !== user.id);
              const isUserOnline = otherUser && onlineUsers.includes(otherUser._id);
              return isUserOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              );
            })()}
          </div>

          {/* Chat Info */}
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
              {getChatDisplayName()}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 truncate">
              {selectedChat.isGroupChat 
                ? `${selectedChat.users.length} members`
                : getOnlineStatus()
              }
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
          <button
            onClick={handleAudioCall}
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Start audio call"
            disabled={selectedChat?.isGroupChat}
          >
            <Phone className={`h-4 w-4 sm:h-5 sm:w-5 ${selectedChat?.isGroupChat ? 'text-gray-400' : 'text-gray-600 hover:text-green-600'}`} />
          </button>
          <button
            onClick={handleVideoCall}
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Start video call"
            disabled={selectedChat?.isGroupChat}
          >
            <Video className={`h-4 w-4 sm:h-5 sm:w-5 ${selectedChat?.isGroupChat ? 'text-gray-400' : 'text-gray-600 hover:text-blue-600'}`} />
          </button>
          {!isMobile && (
            <button
              onClick={() => setShowCallHistory(true)}
              className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full"
              title="Call history"
            >
              <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <MessageList
              messages={messages}
              currentUserId={user.id}
              onAddReaction={handleAddReaction}
              onRemoveReaction={handleRemoveReaction}
              onReplyToMessage={handleReplyToMessage}
              onMarkMessageAsRead={markMessageAsRead}
            />

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-500">
                {typingUsers.length === 1
                  ? `${typingUsers[0].username} is typing...`
                  : `${typingUsers.map(u => u.username).join(', ')} are typing...`
                }
              </div>
            )}
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 bg-white">
        <MessageInput
          onSendMessage={handleSendMessage}
          chatId={selectedChat?._id}
          replyToMessage={replyToMessage}
          onCancelReply={handleCancelReply}
        />
      </div>

      {/* Call History Modal */}
      <CallHistory
        chatId={selectedChat?._id}
        isVisible={showCallHistory}
        onClose={() => setShowCallHistory(false)}
      />
    </div>
  );
};

export default ChatWindow;
