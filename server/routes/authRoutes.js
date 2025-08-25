const express = require('express');
const { 
  registerUser, 
  loginUser, 
  getProfile, 
  updateProfile, 
  logoutUser 
} = require('../controllers/authController');
const { authMiddleware } = require('../utils/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.post('/logout', authMiddleware, logoutUser);

module.exports = router;
