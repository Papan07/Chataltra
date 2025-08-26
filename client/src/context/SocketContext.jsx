import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const { user, token, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && token && user) {
      // Initialize socket connection
      const newSocket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://chataltra.onrender.com', {
        auth: {
          token: token
        },
        autoConnect: true
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('Connected to server');
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setIsConnected(false);
      });

      // Online users events
      newSocket.on('userOnline', (userId) => {
        setOnlineUsers(prev => [...new Set([...prev, userId])]);
      });

      newSocket.on('userOffline', (userId) => {
        setOnlineUsers(prev => prev.filter(id => id !== userId));
      });

      newSocket.on('onlineUsers', (users) => {
        setOnlineUsers(users);
      });

      // Handle user status updates
      newSocket.on('user_status_updated', (data) => {
        const { userId, isOnline } = data;

        setOnlineUsers(prev => {
          if (isOnline) {
            // Add user to online list if not already present
            return [...new Set([...prev, userId])];
          } else {
            // Remove user from online list
            return prev.filter(id => id !== userId);
          }
        });
      });

      setSocket(newSocket);

      // Cleanup on unmount
      return () => {
        newSocket.close();
        setSocket(null);
        setIsConnected(false);
        setOnlineUsers([]);
      };
    } else {
      // Clean up socket if user is not authenticated
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
        setOnlineUsers([]);
      }
    }
  }, [isAuthenticated, token, user]);

  // Socket utility functions
  const joinChat = (chatId) => {
    if (socket) {
      socket.emit('joinChat', chatId);
    }
  };

  const leaveChat = (chatId) => {
    if (socket) {
      socket.emit('leaveChat', chatId);
    }
  };

  const sendMessage = (messageData) => {
    if (socket) {
      socket.emit('sendMessage', messageData);
    }
  };

  const startTyping = (chatId) => {
    if (socket) {
      socket.emit('typing', { chatId, isTyping: true });
    }
  };

  const stopTyping = (chatId) => {
    if (socket) {
      socket.emit('typing', { chatId, isTyping: false });
    }
  };

  const value = {
    socket,
    isConnected,
    onlineUsers,
    joinChat,
    leaveChat,
    sendMessage,
    startTyping,
    stopTyping
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
