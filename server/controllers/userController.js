const User = require('../models/User');

// Search users by username or email
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user._id;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const searchQuery = q.trim();
    
    // Search for users by username or email (case-insensitive)
    // Exclude the current user from results
    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [
        { username: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } }
      ]
    })
    .select('username email avatar isOnline lastSeen')
    .limit(20);

    res.json({ 
      users,
      query: searchQuery,
      count: users.length 
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ 
      message: 'Server error searching users',
      error: error.message 
    });
  }
};

// Get all users (for development/testing purposes)
const getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    
    // Get all users except the current user
    const users = await User.find({ _id: { $ne: currentUserId } })
      .select('username email avatar isOnline lastSeen')
      .sort({ username: 1 })
      .limit(50);

    res.json({ 
      users,
      count: users.length 
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ 
      message: 'Server error getting users',
      error: error.message 
    });
  }
};

module.exports = {
  searchUsers,
  getAllUsers
};
