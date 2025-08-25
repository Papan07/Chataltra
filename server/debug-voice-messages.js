require('dotenv').config();
const mongoose = require('mongoose');
const Message = require('./models/Message');
const User = require('./models/User');

async function debugVoiceMessages() {
  try {
    console.log('🔍 Debugging Voice Messages');
    console.log('==========================');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Connected to MongoDB');
    
    // Find voice messages
    const voiceMessages = await Message.find({ messageType: 'voice' })
      .populate('sender', 'username')
      .sort({ createdAt: -1 })
      .limit(5);
    
    console.log(`📱 Found ${voiceMessages.length} voice messages`);
    
    voiceMessages.forEach((message, index) => {
      console.log(`\n📝 Voice Message ${index + 1}:`);
      console.log(`   ID: ${message._id}`);
      console.log(`   Sender: ${message.sender.username}`);
      console.log(`   Content: ${message.content}`);
      console.log(`   Duration: ${message.audioDuration}s`);
      console.log(`   MIME Type: ${message.audioMimeType}`);
      console.log(`   Audio Data Length: ${message.audioData?.length || 0} characters`);
      
      if (message.audioData) {
        const dataPrefix = message.audioData.substring(0, 50);
        console.log(`   Audio Data Prefix: ${dataPrefix}...`);
        
        // Check if it's a valid data URL
        if (message.audioData.startsWith('data:')) {
          const [header, data] = message.audioData.split(',');
          console.log(`   Data URL Header: ${header}`);
          console.log(`   Base64 Data Length: ${data?.length || 0} characters`);
          
          // Try to validate base64
          try {
            const buffer = Buffer.from(data, 'base64');
            console.log(`   Decoded Buffer Size: ${buffer.length} bytes`);
            
            // Check for common audio file signatures
            const signature = buffer.slice(0, 4).toString('hex');
            console.log(`   File Signature: ${signature}`);
            
            // Common audio signatures
            const audioSignatures = {
              '52494646': 'WAV/RIFF',
              '4f676753': 'OGG',
              '664c6143': 'FLAC',
              '49443303': 'MP3 (ID3v2.3)',
              '49443304': 'MP3 (ID3v2.4)',
              'fffb': 'MP3 (MPEG-1 Layer 3)',
              'fff3': 'MP3 (MPEG-2 Layer 3)',
              'fff2': 'MP3 (MPEG-2.5 Layer 3)'
            };
            
            let detectedFormat = 'Unknown';
            for (const [sig, format] of Object.entries(audioSignatures)) {
              if (signature.startsWith(sig.toLowerCase())) {
                detectedFormat = format;
                break;
              }
            }
            console.log(`   Detected Format: ${detectedFormat}`);
            
          } catch (error) {
            console.log(`   ❌ Invalid Base64 data: ${error.message}`);
          }
        } else {
          console.log(`   ❌ Not a valid data URL`);
        }
      } else {
        console.log(`   ❌ No audio data found`);
      }
    });
    
    // Test creating a simple voice message
    console.log('\n🧪 Testing Voice Message Creation');
    console.log('=================================');
    
    // Create a minimal test audio data URL (1 second of silence in WAV format)
    const testAudioData = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
    
    console.log('📝 Test Audio Data:');
    console.log(`   Length: ${testAudioData.length} characters`);
    console.log(`   Prefix: ${testAudioData.substring(0, 50)}...`);
    
    // Validate the test data
    try {
      const [header, data] = testAudioData.split(',');
      const buffer = Buffer.from(data, 'base64');
      console.log(`   ✅ Valid base64, decoded size: ${buffer.length} bytes`);
    } catch (error) {
      console.log(`   ❌ Invalid test data: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

debugVoiceMessages();
