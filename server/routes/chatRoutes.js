const express = require('express');
const {
  getChats,
  accessChat,
  createGroupChat,
  addToGroup,
  removeFromGroup,
  getMessages,
  sendMessage,
  uploadFile
} = require('../controllers/chatController');
const {
  getCallHistory,
  getCallStats,
  getRecentCalls
} = require('../controllers/callController');
const { authMiddleware } = require('../utils/authMiddleware');
const { upload, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// All chat routes require authentication
router.use(authMiddleware);

// Chat routes
router.get('/', getChats);
router.post('/', accessChat);
router.post('/group', createGroupChat);
router.put('/group/add', addToGroup);
router.put('/group/remove', removeFromGroup);

// Message routes
router.get('/:chatId/messages', getMessages);
router.post('/message', sendMessage);

// File upload route
router.post('/upload', upload.single('file'), handleUploadError, uploadFile);

// Call routes
router.get('/:chatId/calls', getCallHistory);
router.get('/calls/recent', getRecentCalls);
router.get('/calls/stats', getCallStats);

module.exports = router;
