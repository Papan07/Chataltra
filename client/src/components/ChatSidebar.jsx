import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { chatAPI } from '../services/api';
import { 
  Search, 
  Plus, 
  MoreVertical, 
  MessageCircle, 
  Users,
  Settings,
  LogOut,
  Menu
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import NewChatModal from './NewChatModal';

const ChatSidebar = ({ selectedChat, onSelectChat, onToggleMobileMenu, onShowProfile, isMobile }) => {
  const [chats, setChats] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const { user, logout } = useAuth();
  const { socket, onlineUsers } = useSocket();

  useEffect(() => {
    fetchChats();
  }, []);

  // Socket event listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      // Update the chat list with the new message
      setChats(prevChats =>
        prevChats.map(chat =>
          chat._id === message.chat
            ? { ...chat, latestMessage: message, updatedAt: new Date() }
            : chat
        ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      );
    };

    const handleChatUpdated = (updatedChat) => {
      setChats(prevChats => {
        const existingChatIndex = prevChats.findIndex(chat => chat._id === updatedChat._id);
        if (existingChatIndex !== -1) {
          const newChats = [...prevChats];
          newChats[existingChatIndex] = updatedChat;
          return newChats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        } else {
          return [updatedChat, ...prevChats];
        }
      });
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('chatUpdated', handleChatUpdated);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('chatUpdated', handleChatUpdated);
    };
  }, [socket]);

  const fetchChats = async () => {
    try {
      setIsLoading(true);
      const response = await chatAPI.getChats();
      setChats(response.data.chats || []);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    
    const chatName = chat.isGroupChat 
      ? chat.chatName 
      : chat.users.find(u => u._id !== user.id)?.username || '';
    
    return chatName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getChatDisplayName = (chat) => {
    if (chat.isGroupChat) {
      return chat.chatName;
    }
    const otherUser = chat.users.find(u => u._id !== user.id);
    return otherUser?.username || 'Unknown User';
  };

  const getChatAvatar = (chat) => {
    if (chat.isGroupChat) {
      return chat.groupAvatar || '';
    }
    const otherUser = chat.users.find(u => u._id !== user.id);
    return otherUser?.avatar || '';
  };

  const getLastMessagePreview = (chat) => {
    if (!chat.latestMessage) return 'No messages yet';
    
    const message = chat.latestMessage;
    const isOwnMessage = message.sender._id === user.id;
    const prefix = isOwnMessage ? 'You: ' : '';
    
    if (message.messageType === 'text') {
      return `${prefix}${message.content}`;
    } else {
      return `${prefix}📎 ${message.messageType}`;
    }
  };

  const getLastMessageTime = (chat) => {
    if (!chat.latestMessage) return '';
    
    try {
      return formatDistanceToNow(new Date(chat.latestMessage.createdAt), { addSuffix: true });
    } catch (error) {
      return '';
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleNewChatCreated = (newChat) => {
    // Add the new chat to the list and select it
    setChats(prevChats => [newChat, ...prevChats]);
    onSelectChat(newChat);
    setShowNewChatModal(false);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-1 hover:bg-gray-100 rounded"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Chats</h1>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                <button
                  onClick={() => {
                    onShowProfile();
                    setShowMenu(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Settings className="h-4 w-4 mr-3" />
                  Profile Settings
                </button>
                <button
                  onClick={() => {
                    handleLogout();
                    setShowMenu(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={isMobile ? "Search..." : "Search chats..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-whatsapp-green text-sm sm:text-base"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="spinner"></div>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <MessageCircle className="h-8 w-8 mb-2" />
            <p className="text-sm">No chats found</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredChats.map((chat) => (
              <button
                key={chat._id}
                onClick={() => onSelectChat(chat)}
                className={`w-full p-3 sm:p-4 text-left hover:bg-gray-50 transition-colors ${
                  selectedChat?._id === chat._id ? 'bg-whatsapp-green-light' : ''
                }`}
              >
                <div className="flex items-center space-x-2 sm:space-x-3">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {getChatAvatar(chat) ? (
                      <img
                        src={getChatAvatar(chat)}
                        alt={getChatDisplayName(chat)}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-whatsapp-green rounded-full flex items-center justify-center">
                        {chat.isGroupChat ? (
                          <Users className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                        ) : (
                          <span className="text-white font-semibold text-sm sm:text-base">
                            {getChatDisplayName(chat).charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Online indicator for individual chats */}
                    {!chat.isGroupChat && (() => {
                      const otherUser = chat.users.find(u => u._id !== user.id);
                      const isUserOnline = otherUser && onlineUsers.includes(otherUser._id);
                      return isUserOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      );
                    })()}
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 truncate text-sm sm:text-base">
                        {getChatDisplayName(chat)}
                      </h3>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {getLastMessageTime(chat)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">
                      {getLastMessagePreview(chat)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New Chat Button */}
      <div className="p-3 sm:p-4 border-t border-gray-200">
        <button
          onClick={() => setShowNewChatModal(true)}
          className="w-full flex items-center justify-center space-x-2 bg-whatsapp-green text-white py-2.5 sm:py-3 px-4 rounded-lg hover:bg-whatsapp-green-dark transition-colors text-sm sm:text-base"
        >
          <Plus className="h-4 w-4" />
          <span>{isMobile ? 'New' : 'New Chat'}</span>
        </button>
      </div>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onChatCreated={handleNewChatCreated}
      />
    </div>
  );
};

export default ChatSidebar;
