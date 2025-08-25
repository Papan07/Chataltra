const Call = require('../models/Call');
const Chat = require('../models/Chat');

// Get call history for a specific chat
const getCallHistory = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const { limit = 50, page = 1 } = req.query;

    // Verify user has access to this chat
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.users.includes(userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get call history
    const calls = await Call.find({ chat: chatId })
      .populate('caller', 'username avatar')
      .populate('receiver', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Add current user context to each call
    const callsWithContext = calls.map(call => ({
      ...call.toObject(),
      currentUserId: userId
    }));

    res.json({
      success: true,
      calls: callsWithContext,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await Call.countDocuments({ chat: chatId })
      }
    });
  } catch (error) {
    console.error('Get call history error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching call history',
      error: error.message 
    });
  }
};

// Get user's overall call statistics
const getCallStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await Call.getUserCallStats(userId);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get call stats error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching call statistics',
      error: error.message 
    });
  }
};

// Get recent calls across all chats
const getRecentCalls = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20 } = req.query;

    const calls = await Call.find({
      $or: [{ caller: userId }, { receiver: userId }]
    })
      .populate('caller', 'username avatar')
      .populate('receiver', 'username avatar')
      .populate('chat', 'chatName isGroupChat')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Add current user context to each call
    const callsWithContext = calls.map(call => ({
      ...call.toObject(),
      currentUserId: userId
    }));

    res.json({
      success: true,
      calls: callsWithContext
    });
  } catch (error) {
    console.error('Get recent calls error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching recent calls',
      error: error.message 
    });
  }
};

module.exports = {
  getCallHistory,
  getCallStats,
  getRecentCalls
};
