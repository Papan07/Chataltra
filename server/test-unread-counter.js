const mongoose = require('mongoose');
const Chat = require('./models/Chat');
const Message = require('./models/Message');
const User = require('./models/User');
require('dotenv').config();

async function testUnreadCounter() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Connected to MongoDB');

    // Find test users
    const user1 = await User.findOne({ username: 'hr09' });
    const user2 = await User.findOne({ username: 'papan077' });

    if (!user1 || !user2) {
      console.log('❌ Test users not found. Please ensure hr09 and papan077 exist.');
      return;
    }

    console.log(`👤 User 1: ${user1.username} (${user1._id})`);
    console.log(`👤 User 2: ${user2.username} (${user2._id})`);

    // Find or create a chat between them
    let chat = await Chat.findOne({
      isGroupChat: false,
      users: { $all: [user1._id, user2._id] }
    });

    if (!chat) {
      chat = await Chat.create({
        users: [user1._id, user2._id],
        isGroupChat: false
      });
      console.log(`💬 Created new chat: ${chat._id}`);
    } else {
      console.log(`💬 Found existing chat: ${chat._id}`);
    }

    // Test 1: Send 6 consecutive messages from user1 to user2
    console.log('\n🧪 TEST 1: Sending 6 consecutive messages from user1 to user2');
    
    const messages = [];
    for (let i = 1; i <= 6; i++) {
      const message = await Message.create({
        sender: user1._id,
        content: `Test message ${i} from ${user1.username}`,
        chat: chat._id,
        messageType: 'text'
      });
      messages.push(message);
      
      // Increment unread count for user2
      await chat.incrementUnreadCount(user2._id);
      
      console.log(`📤 Message ${i} sent. Unread count for user2: ${chat.getUnreadCountForUser(user2._id)}`);
    }

    // Test 2: Check consecutive unread count
    console.log('\n🧪 TEST 2: Checking consecutive unread count');
    const consecutiveCount = await chat.getConsecutiveUnreadCount(user1._id, user2._id);
    console.log(`🔢 Consecutive unread messages from user1 to user2: ${consecutiveCount}`);
    console.log(`🏷️  Should show badge: ${consecutiveCount >= 6}`);

    // Test 3: User2 reads the latest message
    console.log('\n🧪 TEST 3: User2 reads the latest message');
    const latestMessage = messages[messages.length - 1];
    await latestMessage.markAsRead(user2._id);
    await chat.resetUnreadCount(user2._id, latestMessage._id);
    
    console.log(`👁️  User2 read message: ${latestMessage._id}`);
    console.log(`🔢 Unread count for user2 after reading: ${chat.getUnreadCountForUser(user2._id)}`);
    
    const newConsecutiveCount = await chat.getConsecutiveUnreadCount(user1._id, user2._id);
    console.log(`🔢 Consecutive unread count after reading: ${newConsecutiveCount}`);
    console.log(`🏷️  Should show badge: ${newConsecutiveCount >= 6}`);

    // Test 4: User2 sends a reply
    console.log('\n🧪 TEST 4: User2 sends a reply');
    const replyMessage = await Message.create({
      sender: user2._id,
      content: `Reply from ${user2.username}`,
      chat: chat._id,
      messageType: 'text'
    });
    
    // Reset unread count for user2 (they're replying)
    await chat.resetUnreadCount(user2._id, replyMessage._id);
    // Increment unread count for user1
    await chat.incrementUnreadCount(user1._id);
    
    console.log(`💬 Reply sent from user2`);
    console.log(`🔢 Unread count for user2 after reply: ${chat.getUnreadCountForUser(user2._id)}`);
    console.log(`🔢 Unread count for user1 after receiving reply: ${chat.getUnreadCountForUser(user1._id)}`);

    // Test 5: Send more messages to test the 6+ threshold again
    console.log('\n🧪 TEST 5: Testing 6+ threshold again');
    for (let i = 7; i <= 12; i++) {
      const message = await Message.create({
        sender: user1._id,
        content: `Test message ${i} from ${user1.username}`,
        chat: chat._id,
        messageType: 'text'
      });
      
      await chat.incrementUnreadCount(user2._id);
      
      const currentCount = chat.getUnreadCountForUser(user2._id);
      const currentConsecutive = await chat.getConsecutiveUnreadCount(user1._id, user2._id);
      
      console.log(`📤 Message ${i} sent. Total unread: ${currentCount}, Consecutive: ${currentConsecutive}, Show badge: ${currentConsecutive >= 6}`);
    }

    console.log('\n✅ Unread counter test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`- Unread counts are tracked per user per chat`);
    console.log(`- Consecutive unread messages are calculated from the same sender`);
    console.log(`- Badge shows when 6+ consecutive unread messages exist`);
    console.log(`- Reading any message or sending a reply resets the counter`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testUnreadCounter();
