import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI, chatAPI } from '../services/api';
import { X, Search, User, Users, Plus } from 'lucide-react';

const NewChatModal = ({ isOpen, onClose, onChatCreated }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const searchUsers = async () => {
    try {
      setIsSearching(true);
      const response = await userAPI.searchUsers(searchQuery);
      setSearchResults(response.data.users || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUserSelect = (selectedUser) => {
    // Prevent users from selecting themselves
    if (selectedUser._id === user.id) {
      alert('You cannot start a chat with yourself');
      return;
    }

    if (isGroupChat) {
      // For group chats, allow multiple selections
      if (selectedUsers.find(u => u._id === selectedUser._id)) {
        setSelectedUsers(selectedUsers.filter(u => u._id !== selectedUser._id));
      } else {
        setSelectedUsers([...selectedUsers, selectedUser]);
      }
    } else {
      // For individual chats, create chat immediately
      createIndividualChat(selectedUser);
    }
  };

  const createIndividualChat = async (otherUser) => {
    try {
      setIsCreating(true);
      const response = await chatAPI.accessChat(otherUser._id);

      // Call the callback to add chat to the list and select it
      if (onChatCreated && response.data.chat) {
        onChatCreated(response.data.chat);
      }

      // Close the modal
      handleClose();
    } catch (error) {
      console.error('Error creating chat:', error);
      alert('Failed to create chat: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsCreating(false);
    }
  };

  const createGroupChat = async () => {
    if (selectedUsers.length < 2) {
      alert('Please select at least 2 users for a group chat');
      return;
    }

    if (!groupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    try {
      setIsCreating(true);
      const response = await chatAPI.createGroupChat({
        users: selectedUsers.map(u => u._id),
        chatName: groupName.trim(),
        groupDescription: ''
      });
      onChatCreated(response.data.groupChat);
      handleClose();
    } catch (error) {
      console.error('Error creating group chat:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUsers([]);
    setIsGroupChat(false);
    setGroupName('');
    setIsCreating(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isGroupChat ? 'Create Group Chat' : 'Start New Chat'}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Chat Type Toggle */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setIsGroupChat(false);
                setSelectedUsers([]);
                setGroupName('');
              }}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                !isGroupChat
                  ? 'bg-whatsapp-green text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <User className="h-4 w-4" />
              <span>Individual</span>
            </button>
            <button
              onClick={() => setIsGroupChat(true)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                isGroupChat
                  ? 'bg-whatsapp-green text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Group</span>
            </button>
          </div>
        </div>

        {/* Group Name Input (only for group chats) */}
        {isGroupChat && (
          <div className="p-4 border-b border-gray-200">
            <input
              type="text"
              placeholder="Enter group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-whatsapp-green focus:border-whatsapp-green"
            />
          </div>
        )}

        {/* Search Input */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-whatsapp-green"
            />
          </div>
        </div>

        {/* Selected Users (for group chats) */}
        {isGroupChat && selectedUsers.length > 0 && (
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((selectedUser) => (
                <div
                  key={selectedUser._id}
                  className="flex items-center space-x-2 bg-whatsapp-green-light px-3 py-1 rounded-full"
                >
                  <span className="text-sm">{selectedUser.username}</span>
                  <button
                    onClick={() => handleUserSelect(selectedUser)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto">
          {isSearching ? (
            <div className="flex items-center justify-center h-32">
              <div className="spinner"></div>
            </div>
          ) : searchResults.length === 0 && searchQuery.trim().length > 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {searchResults.map((searchUser) => (
                <button
                  key={searchUser._id}
                  onClick={() => handleUserSelect(searchUser)}
                  disabled={isCreating}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors flex items-center space-x-3 ${
                    isGroupChat && selectedUsers.find(u => u._id === searchUser._id)
                      ? 'bg-whatsapp-green-light'
                      : ''
                  } ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-whatsapp-green rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {searchUser.username.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* User Info */}
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      {searchUser.username}
                    </h3>
                    <p className="text-sm text-gray-600">{searchUser.email}</p>
                  </div>

                  {/* Selection indicator for group chats */}
                  {isGroupChat && selectedUsers.find(u => u._id === searchUser._id) && (
                    <div className="w-5 h-5 bg-whatsapp-green rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Create Group Button (only for group chats) */}
        {isGroupChat && (
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={createGroupChat}
              disabled={selectedUsers.length < 2 || !groupName.trim() || isCreating}
              className="w-full flex items-center justify-center space-x-2 bg-whatsapp-green text-white py-2 px-4 rounded-lg hover:bg-whatsapp-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <div className="spinner"></div>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Create Group ({selectedUsers.length} members)</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewChatModal;
