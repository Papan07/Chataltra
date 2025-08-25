import { useState } from 'react';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import UserProfile from './UserProfile';

const ChatLayout = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 transition-transform duration-300 ease-in-out
        fixed md:relative z-30 w-80 h-full bg-white border-r border-gray-200
      `}>
        <ChatSidebar
          selectedChat={selectedChat}
          onSelectChat={setSelectedChat}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onShowProfile={() => setShowProfile(true)}
        />
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <ChatWindow
          selectedChat={selectedChat}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
      </div>

      {/* User Profile Modal */}
      {showProfile && (
        <UserProfile
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
};

export default ChatLayout;
