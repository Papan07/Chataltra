import { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const VoiceMessageTest = ({ chatId }) => {
  const [testResult, setTestResult] = useState('');
  const { socket } = useSocket();
  const { user } = useAuth();

  const sendTestVoiceMessage = () => {
    if (!socket || !chatId) {
      setTestResult('❌ No socket connection or chat ID');
      return;
    }

    // Create a test audio data URL (minimal WAV file)
    const testAudioData = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';

    const voiceMessageData = {
      content: 'Test voice message (2s)',
      chatId: chatId,
      messageType: 'voice',
      audioData: testAudioData,
      audioDuration: 2,
      audioMimeType: 'audio/wav'
    };

    console.log('🧪 Sending test voice message:', voiceMessageData);
    setTestResult('📤 Sending test voice message...');

    // Listen for response
    const handleNewMessage = (message) => {
      if (message.messageType === 'voice' && message.sender._id === user.id) {
        console.log('✅ Received voice message back:', message);
        setTestResult(`✅ Voice message sent successfully! 
          - Message ID: ${message._id}
          - Audio Data Length: ${message.audioData?.length || 0}
          - Duration: ${message.audioDuration}s
          - MIME Type: ${message.audioMimeType}`);
        socket.off('newMessage', handleNewMessage);
      }
    };

    const handleError = (error) => {
      console.error('❌ Socket error:', error);
      setTestResult(`❌ Error: ${error.message}`);
      socket.off('error', handleError);
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('error', handleError);

    // Send the message
    socket.emit('sendMessage', voiceMessageData);

    // Cleanup after 10 seconds
    setTimeout(() => {
      socket.off('newMessage', handleNewMessage);
      socket.off('error', handleError);
      if (testResult === '📤 Sending test voice message...') {
        setTestResult('⏰ Test timed out - no response received');
      }
    }, 10000);
  };

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
      <h3 className="font-semibold text-yellow-800 mb-2">Voice Message Test</h3>
      <button
        onClick={sendTestVoiceMessage}
        className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 mb-2"
      >
        Send Test Voice Message
      </button>
      {testResult && (
        <div className="mt-2 p-2 bg-white rounded border text-sm whitespace-pre-line">
          {testResult}
        </div>
      )}
    </div>
  );
};

export default VoiceMessageTest;
