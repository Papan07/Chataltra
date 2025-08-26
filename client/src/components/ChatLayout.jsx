import { useState, useEffect } from 'react';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import UserProfile from './UserProfile';

const ChatLayout = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Show sidebar by default on mobile when no chat is selected
      if (mobile && !selectedChat) {
        setIsMobileMenuOpen(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [selectedChat]);

  // Auto-close mobile menu when chat is selected on mobile
  useEffect(() => {
    if (selectedChat && isMobile) {
      setIsMobileMenuOpen(false);
    }
  }, [selectedChat, isMobile]);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className={`
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 transition-transform duration-300 ease-in-out
        fixed md:relative z-30 w-full sm:w-80 md:w-80 lg:w-96 h-full bg-white border-r border-gray-200
        ${isMobile ? 'max-w-sm' : ''}
      `}>
        <ChatSidebar
          selectedChat={selectedChat}
          onSelectChat={setSelectedChat}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onShowProfile={() => setShowProfile(true)}
          isMobile={isMobile}
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
      <div className={`flex-1 flex flex-col min-w-0 ${isMobile && !selectedChat ? 'hidden' : ''}`}>
        <ChatWindow
          selectedChat={selectedChat}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          isMobile={isMobile}
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
