import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const MessageReactions = ({ message, onAddReaction, onRemoveReaction }) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { user } = useAuth();

  const handleReactionClick = (emoji) => {
    const existingReaction = message.reactions?.find(
      r => r.emoji === emoji && r.users.includes(user.id)
    );

    if (existingReaction) {
      onRemoveReaction(message._id, emoji);
    } else {
      onAddReaction(message._id, emoji);
    }
    setShowEmojiPicker(false);
  };

  const getReactionCount = (emoji) => {
    const reaction = message.reactions?.find(r => r.emoji === emoji);
    return reaction ? reaction.users.length : 0;
  };

  const hasUserReacted = (emoji) => {
    const reaction = message.reactions?.find(r => r.emoji === emoji);
    return reaction ? reaction.users.includes(user.id) : false;
  };

  const getTopReactions = () => {
    if (!message.reactions) return [];
    
    return message.reactions
      .filter(r => r.users.length > 0)
      .sort((a, b) => b.users.length - a.users.length)
      .slice(0, 3);
  };

  const topReactions = getTopReactions();

  return (
    <div className="relative">
      {/* Existing Reactions */}
      {topReactions.length > 0 && (
        <div className="flex items-center space-x-1 mt-1">
          {topReactions.map((reaction) => (
            <button
              key={reaction.emoji}
              onClick={() => handleReactionClick(reaction.emoji)}
              className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs transition-colors ${
                hasUserReacted(reaction.emoji)
                  ? 'bg-whatsapp-green-light border border-whatsapp-green'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <span>{reaction.emoji}</span>
              <span className="text-xs">{reaction.users.length}</span>
            </button>
          ))}
          
          {/* Add Reaction Button */}
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xs transition-colors"
          >
            +
          </button>
        </div>
      )}

      {/* Add Reaction Button (when no reactions exist) */}
      {topReactions.length === 0 && (
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="mt-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          Add reaction
        </button>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10">
          <div className="flex space-x-1">
            {EMOJI_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReactionClick(emoji)}
                className={`w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center transition-colors ${
                  hasUserReacted(emoji) ? 'bg-whatsapp-green-light' : ''
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Click outside to close emoji picker */}
      {showEmojiPicker && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowEmojiPicker(false)}
        />
      )}
    </div>
  );
};

export default MessageReactions;
