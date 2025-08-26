import { useEffect, useRef, useCallback } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { Check, CheckCheck, Reply } from 'lucide-react';
import MessageReactions from './MessageReactions';
import VoiceMessage from './VoiceMessage';
import FileMessage from './FileMessage';

const MessageList = ({ messages, currentUserId, onAddReaction, onRemoveReaction, onReplyToMessage, onMarkMessageAsRead }) => {
  const messagesEndRef = useRef(null);
  const messageRefs = useRef({});

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Intersection Observer to mark messages as read when they come into view - OPTIMIZED
  useEffect(() => {
    if (!onMarkMessageAsRead) return;

    // Track which messages have been marked as read to avoid duplicates
    const markedAsRead = new Set();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.dataset.messageId;

            // Skip if already marked as read
            if (markedAsRead.has(messageId)) return;

            const message = messages.find(msg => msg._id === messageId);

            // Only mark as read if it's not the current user's message and not already read
            if (message &&
                message.sender._id !== currentUserId &&
                message.status !== 'read') {
              markedAsRead.add(messageId);
              onMarkMessageAsRead(messageId);
            }
          }
        });
      },
      {
        threshold: 0.3, // Reduced threshold for faster read detection
        rootMargin: '0px'
      }
    );

    // Observe all message elements
    Object.values(messageRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      observer.disconnect();
    };
  }, [messages, currentUserId, onMarkMessageAsRead]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM dd, HH:mm');
    }
  };

  const formatDateSeparator = (timestamp) => {
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMMM dd, yyyy');
    }
  };

  const shouldShowDateSeparator = (currentMessage, previousMessage) => {
    if (!previousMessage) return true;
    
    const currentDate = new Date(currentMessage.createdAt);
    const previousDate = new Date(previousMessage.createdAt);
    
    return currentDate.toDateString() !== previousDate.toDateString();
  };

  const renderMessageStatus = (message) => {
    if (message.sender._id !== currentUserId) return null;

    const status = message.status || 'sent';

    return (
      <div className="flex items-center ml-2">
        {status === 'sent' && (
          <Check className="h-3 w-3 text-gray-400 transition-colors duration-200" />
        )}
        {status === 'delivered' && (
          <CheckCheck className="h-3 w-3 text-gray-400 transition-colors duration-200" />
        )}
        {status === 'read' && (
          <CheckCheck className="h-3 w-3 text-blue-500 transition-colors duration-200" />
        )}
      </div>
    );
  };

  const renderMessage = (message) => {
    const isOwnMessage = message.sender._id === currentUserId;

    return (
      <div
        key={message._id}
        ref={(el) => {
          if (el) messageRefs.current[message._id] = el;
        }}
        data-message-id={message._id}
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4 group`}
      >
        <div className="flex flex-col max-w-[280px] sm:max-w-xs lg:max-w-md">
          {/* Reply to message (if exists) */}
          {message.replyTo && (
            <div className={`mb-1 px-3 py-1 rounded-t-lg text-xs border-l-2 ${
              isOwnMessage
                ? 'bg-whatsapp-green-light border-whatsapp-green text-gray-700'
                : 'bg-gray-100 border-gray-400 text-gray-600'
            }`}>
              <div className="font-medium">{message.replyTo.sender.username}</div>
              <div className="truncate">{message.replyTo.content}</div>
            </div>
          )}

          <div
            className={`${['voice', 'image', 'video', 'audio', 'document', 'file'].includes(message.messageType) ? '' : 'px-3 py-2 sm:px-4 sm:py-2'} rounded-lg ${
              message.replyTo ? 'rounded-tl-none' : ''
            } ${
              ['voice', 'image', 'video', 'audio', 'document', 'file'].includes(message.messageType) ? '' : (
                isOwnMessage
                  ? 'bg-whatsapp-green text-white'
                  : 'bg-white border border-gray-200 text-gray-900'
              )
            }`}
          >
            {/* Sender name for group chats */}
            {!isOwnMessage && (
              <div className="text-xs font-medium text-whatsapp-green mb-1">
                {message.sender.username}
              </div>
            )}

            {/* Message content */}
            <div className="break-words">
              {message.messageType === 'text' ? (
                <p className="text-sm sm:text-base leading-relaxed">{message.content}</p>
              ) : message.messageType === 'voice' ? (
                <VoiceMessage message={message} isOwn={isOwnMessage} currentUserId={currentUserId} />
              ) : ['image', 'video', 'audio', 'document', 'file'].includes(message.messageType) ? (
                <FileMessage message={message} isOwn={isOwnMessage} />
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="text-sm">📎 {message.messageType}</span>
                </div>
              )}
            </div>

            {/* Message time and status - only for text messages */}
            {message.messageType === 'text' && (
              <div className={`flex items-center justify-end mt-1 space-x-1 ${
                isOwnMessage ? 'text-white/70' : 'text-gray-500'
              }`}>
                <span className="text-xs">
                  {formatMessageTime(message.createdAt)}
                </span>
                {renderMessageStatus(message)}
              </div>
            )}
          </div>

          {/* Message Actions (Reply button) */}
          <div className={`flex items-center mt-1 space-x-2 opacity-0 group-hover:opacity-100 transition-opacity ${
            isOwnMessage ? 'justify-end' : 'justify-start'
          }`}>
            <button
              onClick={() => onReplyToMessage && onReplyToMessage(message)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="Reply"
            >
              <Reply className="h-3 w-3 text-gray-500" />
            </button>
          </div>

          {/* Message Reactions */}
          <div className={`${isOwnMessage ? 'flex justify-end' : 'flex justify-start'}`}>
            <MessageReactions
              message={message}
              onAddReaction={onAddReaction}
              onRemoveReaction={onRemoveReaction}
            />
          </div>
        </div>
      </div>
    );
  };

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 p-4">
        <div className="text-center">
          <p className="text-sm">No messages yet</p>
          <p className="text-xs mt-1">Start the conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
      {messages.map((message, index) => {
        const previousMessage = index > 0 ? messages[index - 1] : null;
        const showDateSeparator = shouldShowDateSeparator(message, previousMessage);
        
        return (
          <div key={message._id}>
            {/* Date separator */}
            {showDateSeparator && (
              <div className="flex justify-center my-3 sm:my-4">
                <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                  {formatDateSeparator(message.createdAt)}
                </div>
              </div>
            )}
            
            {/* Message */}
            {renderMessage(message)}
          </div>
        );
      })}
      
      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
