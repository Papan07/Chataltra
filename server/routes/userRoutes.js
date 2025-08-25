const express = require('express');
const { 
  searchUsers, 
  getAllUsers 
} = require('../controllers/userController');
const { authMiddleware } = require('../utils/authMiddleware');

const router = express.Router();

// All user routes require authentication
router.use(authMiddleware);

// User routes
router.get('/search', searchUsers);
router.get('/', getAllUsers);

module.exports = router;
