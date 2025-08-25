import { useState, useRef, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { Send, Paperclip, Smile, X, Reply, Mic, MicOff, Upload } from 'lucide-react';
import CustomEmojiPicker from './EmojiPicker';
import { chatAPI } from '../services/api';

const MessageInput = ({ onSendMessage, chatId, replyToMessage, onCancelReply }) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isAudioSupported, setIsAudioSupported] = useState(true);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const recordingTimeRef = useRef(0); // Store recording time in ref to avoid closure issues
  const fileInputRef = useRef(null);
  const { startTyping, stopTyping } = useSocket();

  // Check browser compatibility for audio recording
  useEffect(() => {
    const checkAudioSupport = () => {
      const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      const hasMediaRecorder = !!(window.MediaRecorder);
      const isSupported = hasGetUserMedia && hasMediaRecorder;

      console.log('Audio support check:', {
        hasGetUserMedia,
        hasMediaRecorder,
        isSupported
      });

      setIsAudioSupported(isSupported);

      if (!isSupported) {
        console.warn('Audio recording not supported in this browser');
      }
    };

    checkAudioSupport();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!message.trim()) return;

    onSendMessage({
      content: message.trim(),
      messageType: 'text'
    });

    setMessage('');

    // Stop typing indicator
    if (isTyping && chatId) {
      setIsTyping(false);
      stopTyping(chatId);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e) => {
    const newMessage = e.target.value;
    setMessage(newMessage);

    // Handle typing indicators
    if (chatId && newMessage.trim().length > 0) {
      if (!isTyping) {
        setIsTyping(true);
        startTyping(chatId);
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        stopTyping(chatId);
      }, 3000);
    } else if (isTyping) {
      setIsTyping(false);
      stopTyping(chatId);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }

    // Auto-resize textarea
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  // Cleanup timeouts and intervals on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      alert('File size must be less than 50MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chatId', chatId);

      const response = await chatAPI.uploadFile(formData, (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percentCompleted);
      });

      // Send the file message via socket
      if (response.data.message) {
        onSendMessage({
          content: response.data.message.content,
          messageType: response.data.message.messageType,
          fileUrl: response.data.message.fileUrl,
          fileName: response.data.message.fileName,
          fileSize: response.data.message.fileSize,
          fileMimeType: response.data.message.fileMimeType,
          fileExtension: response.data.message.fileExtension
        });
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('File upload error:', error);
      let errorMessage = 'Failed to upload file';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      alert(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEmojiClick = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  const handleEmojiSelect = (emojiData) => {
    const emoji = emojiData.emoji;
    const textarea = textareaRef.current;

    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMessage = message.slice(0, start) + emoji + message.slice(end);

      setMessage(newMessage);

      // Set cursor position after the emoji
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setMessage(prev => prev + emoji);
    }

    setShowEmojiPicker(false);
  };

  const startVoiceRecording = async () => {
    try {
      console.log('Requesting microphone access...');

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not supported in this browser');
      }

      // Request microphone access with specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log('Microphone access granted, stream:', stream);
      streamRef.current = stream;

      // Clear previous audio chunks
      audioChunksRef.current = [];

      // Check MediaRecorder support and get supported MIME type
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      }

      console.log('Using MIME type:', mimeType);

      // Create MediaRecorder with supported MIME type
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('Recording stopped, chunks:', audioChunksRef.current.length);
        console.log('Final recording time from ref:', recordingTimeRef.current);
        console.log('Final recording time from state:', recordingTime);

        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          console.log('Created audio blob:', audioBlob.size, 'bytes');

          // Use the ref value which should be more reliable
          // Ensure minimum 1 second duration
          const finalDuration = Math.max(recordingTimeRef.current, 1);
          console.log('Final duration to save:', finalDuration);
          handleVoiceMessageSend(audioBlob, mimeType, finalDuration);
        } else {
          console.error('No audio data recorded');
          alert('No audio was recorded. Please try again.');
        }

        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            track.stop();
            console.log('Stopped track:', track.kind);
          });
          streamRef.current = null;
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        alert('Recording error: ' + event.error.message);
        setIsRecording(false);
      };

      mediaRecorder.onstart = () => {
        console.log('Recording started');
      };

      // Start recording with timeslice for regular data events
      mediaRecorder.start(1000); // Request data every second
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimeRef.current = 0;

      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(recordingTimeRef.current);
      }, 1000);

      console.log('MediaRecorder started, state:', mediaRecorder.state);

    } catch (error) {
      console.error('Error accessing microphone:', error);

      let errorMessage = 'Unable to access microphone. ';
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow microphone access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage += 'Your browser does not support audio recording.';
      } else {
        errorMessage += error.message;
      }

      alert(errorMessage);
      setIsRecording(false);
    }
  };

  const stopVoiceRecording = () => {
    console.log('Stopping recording...');
    console.log('Current recording time:', recordingTime);

    if (mediaRecorderRef.current && isRecording) {
      const recorder = mediaRecorderRef.current;

      if (recorder.state === 'recording') {
        recorder.stop();
        console.log('MediaRecorder stop called, state:', recorder.state);
      }

      setIsRecording(false);

      // Stop the timer but don't reset recordingTime yet - it will be used in onstop
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const handleVoiceMessageSend = (audioBlob, mimeType, duration = recordingTime) => {
    console.log('Sending voice message, blob size:', audioBlob.size, 'bytes');
    console.log('Voice message duration:', duration, 'seconds');

    if (audioBlob.size === 0) {
      console.error('Audio blob is empty');
      alert('Recording failed - no audio data captured');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Audio = reader.result;
      console.log('Audio converted to base64, length:', base64Audio.length);

      onSendMessage({
        content: `Voice message (${duration}s)`,
        messageType: 'voice',
        audioData: base64Audio,
        audioDuration: duration,
        audioMimeType: mimeType
      });

      // Reset recording time after sending
      setRecordingTime(0);
      recordingTimeRef.current = 0;
    };

    reader.onerror = (error) => {
      console.error('Error reading audio blob:', error);
      alert('Failed to process audio recording');
    };

    reader.readAsDataURL(audioBlob);
  };

  const handleVoiceButtonClick = () => {
    console.log('Voice button clicked, isRecording:', isRecording, 'isAudioSupported:', isAudioSupported);

    if (!isAudioSupported) {
      alert('Audio recording is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.');
      return;
    }

    if (isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  return (
    <div className="p-4">
      {/* Reply Preview */}
      {replyToMessage && (
        <div className="mb-3 p-3 bg-gray-50 border-l-4 border-whatsapp-green rounded-r-md">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <Reply className="h-3 w-3 text-whatsapp-green" />
                <span className="text-xs font-medium text-whatsapp-green">
                  Replying to {replyToMessage.sender.username}
                </span>
              </div>
              <p className="text-sm text-gray-600 truncate">
                {replyToMessage.content}
              </p>
            </div>
            <button
              onClick={onCancelReply}
              className="ml-2 p-1 hover:bg-gray-200 rounded-full"
            >
              <X className="h-3 w-3 text-gray-500" />
            </button>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.json,.xml"
      />

      {/* Upload progress indicator */}
      {isUploading && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-blue-700">Uploading file...</span>
            <span className="text-sm text-blue-700">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        {/* File upload button */}
        <button
          type="button"
          onClick={handleFileUpload}
          disabled={isUploading}
          className={`flex-shrink-0 p-2 rounded-full transition-colors ${
            isUploading
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-500 hover:text-whatsapp-green hover:bg-gray-100'
          }`}
        >
          {isUploading ? (
            <Upload className="h-5 w-5 animate-pulse" />
          ) : (
            <Paperclip className="h-5 w-5" />
          )}
        </button>

        {/* Message input container */}
        <div className="flex-1 relative">
          <div className="flex items-end bg-gray-100 rounded-lg border border-gray-200 focus-within:border-whatsapp-green">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 bg-transparent border-0 resize-none focus:outline-none max-h-32 min-h-[44px]"
              rows={1}
            />
            
            {/* Emoji button */}
            <button
              ref={emojiButtonRef}
              type="button"
              onClick={handleEmojiClick}
              className={`flex-shrink-0 p-2 transition-colors ${
                showEmojiPicker
                  ? 'text-whatsapp-green bg-whatsapp-green-light'
                  : 'text-gray-500 hover:text-whatsapp-green'
              }`}
            >
              <Smile className="h-5 w-5" />
            </button>
          </div>

          {/* Emoji Picker */}
          <CustomEmojiPicker
            isOpen={showEmojiPicker}
            onEmojiClick={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
            anchorRef={emojiButtonRef}
          />
        </div>

        {/* Voice recording button */}
        <button
          type="button"
          onClick={handleVoiceButtonClick}
          disabled={!isAudioSupported}
          title={!isAudioSupported ? 'Audio recording not supported in this browser' : (isRecording ? 'Stop recording' : 'Start voice recording')}
          className={`flex-shrink-0 p-3 rounded-full transition-all ${
            !isAudioSupported
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
              : isRecording
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-gray-200 text-gray-500 hover:bg-whatsapp-green hover:text-white'
          }`}
        >
          {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>

        {/* Send button */}
        <button
          type="submit"
          disabled={!message.trim()}
          className={`flex-shrink-0 p-3 rounded-full transition-all ${
            message.trim()
              ? 'bg-whatsapp-green text-white hover:bg-whatsapp-green-dark'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Send className="h-5 w-5" />
        </button>
      </form>

      {/* Recording indicator */}
      {isRecording && (
        <div className="mt-2 flex items-center space-x-2 text-sm text-red-500">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span>Recording... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
        </div>
      )}

      {/* Typing indicator placeholder */}
      {isTyping && !isRecording && (
        <div className="mt-2 text-xs text-gray-500">
          {/* This could show "User is typing..." when implemented with Socket.IO */}
        </div>
      )}
    </div>
  );
};

export default MessageInput;
