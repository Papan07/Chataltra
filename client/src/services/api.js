import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (userData) => api.put('/auth/profile', userData),
};

// Chat API calls
export const chatAPI = {
  getChats: () => api.get('/chat'),
  accessChat: (userId) => api.post('/chat', { userId }),
  createGroupChat: (chatData) => api.post('/chat/group', chatData),
  addToGroup: (chatId, userId) => api.put('/chat/group/add', { chatId, userId }),
  removeFromGroup: (chatId, userId) => api.put('/chat/group/remove', { chatId, userId }),
  getMessages: (chatId, page = 1, limit = 50) =>
    api.get(`/chat/${chatId}/messages?page=${page}&limit=${limit}`),
  sendMessage: (messageData) => api.post('/chat/message', messageData),
  uploadFile: (formData, onUploadProgress) => api.post('/chat/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress
  }),
  getCallHistory: (chatId) => api.get(`/chat/${chatId}/calls`),
};

// User API calls
export const userAPI = {
  searchUsers: (query) => api.get(`/users/search?q=${query}`),
  getAllUsers: () => api.get('/users'),
};

export default api;
