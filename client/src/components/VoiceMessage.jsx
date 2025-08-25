import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Check, CheckCheck } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

const VoiceMessage = ({ message, isOwn, currentUserId }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(message.audioDuration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Set initial volume
    audio.volume = volume;
    audio.muted = isMuted;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      console.log('Audio duration loaded:', audio.duration);
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      } else if (message.audioDuration && message.audioDuration > 0) {
        // Fallback to stored duration
        setDuration(message.audioDuration);
        console.log('Using stored duration:', message.audioDuration);
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleError = (e) => {
      console.error('Audio element error event:', e);
      console.error('Audio error details:', {
        error: audio.error,
        networkState: audio.networkState,
        readyState: audio.readyState,
        src: audio.src?.substring(0, 100) + '...'
      });
      setIsPlaying(false);
    };
    const handleLoadStart = () => {
      console.log('Audio loading started');
      console.log('Audio src:', audio.src?.substring(0, 100) + '...');
    };
    const handleCanPlay = () => {
      console.log('Audio can play, duration:', audio.duration);
      console.log('Audio readyState:', audio.readyState);
    };
    const handleLoadedData = () => {
      console.log('Audio data loaded');
    };
    const handleLoadedMetadata = () => {
      console.log('Audio metadata loaded, duration:', audio.duration);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [message.audioData]);

  // Initialize duration from message data if available
  useEffect(() => {
    if (message.audioDuration && message.audioDuration > 0 && (!duration || !isFinite(duration))) {
      setDuration(message.audioDuration);
    }
  }, [message.audioDuration, duration]);

  // Volume control functions
  const toggleMute = () => {
    const audio = audioRef.current;
    if (audio) {
      const newMutedState = !isMuted;
      setIsMuted(newMutedState);
      audio.muted = newMutedState;
    }
  };

  const handleVolumeChange = (newVolume) => {
    const audio = audioRef.current;
    if (audio) {
      setVolume(newVolume);
      audio.volume = newVolume;
      if (newVolume === 0) {
        setIsMuted(true);
        audio.muted = true;
      } else if (isMuted) {
        setIsMuted(false);
        audio.muted = false;
      }
    }
  };

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) {
      console.error('Audio element not found');
      return;
    }

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        console.log('Audio paused');
      } else {
        console.log('Attempting to play audio...');
        console.log('Audio src:', audio.src?.substring(0, 100) + '...');
        console.log('Audio readyState:', audio.readyState);
        console.log('Audio networkState:', audio.networkState);
        console.log('Audio duration:', audio.duration);
        console.log('Audio error:', audio.error);

        // Check if audio source is valid
        if (!audio.src || audio.src === 'null' || audio.src === 'undefined') {
          throw new Error('Invalid audio source');
        }

        // Check if audio data is a valid data URL
        if (!message.audioData || !message.audioData.startsWith('data:audio/')) {
          throw new Error('Invalid audio data format');
        }

        await audio.play();
        setIsPlaying(true);
        console.log('Audio started playing');
      }
    } catch (error) {
      console.error('Audio playback error:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      setIsPlaying(false);

      // More specific error messages
      let errorMessage = 'Unable to play audio. ';
      if (error.name === 'NotSupportedError') {
        errorMessage += 'The audio format is not supported by your browser.';
      } else if (error.name === 'NotAllowedError') {
        errorMessage += 'Audio playback was blocked. Please interact with the page first.';
      } else if (error.message.includes('Invalid audio')) {
        errorMessage += 'The audio data is corrupted or invalid.';
      } else {
        errorMessage += `Error: ${error.message}`;
      }

      alert(errorMessage);
    }
  };

  const formatTime = (time) => {
    if (isNaN(time) || !isFinite(time) || time < 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Use stored duration from message if audio duration is not available or invalid
  // If no duration is available, estimate based on audio data size (rough estimate)
  const estimatedDuration = message.audioData ? Math.max(1, Math.floor(message.audioData.length / 10000)) : 1;
  const effectiveDuration = (duration > 0 && isFinite(duration)) ? duration : (message.audioDuration || estimatedDuration);
  const progressPercentage = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);

    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM dd, HH:mm');
    }
  };

  const renderMessageStatus = () => {
    if (!isOwn) return null;

    const status = message.status || 'sent';

    return (
      <div className="flex items-center ml-2">
        {status === 'sent' && (
          <Check className="h-3 w-3 text-white text-opacity-70" />
        )}
        {status === 'delivered' && (
          <CheckCheck className="h-3 w-3 text-white text-opacity-70" />
        )}
        {status === 'read' && (
          <CheckCheck className="h-3 w-3 text-blue-200" />
        )}
      </div>
    );
  };

  return (
    <div className={`flex items-center space-x-3 p-3 rounded-lg max-w-xs ${
      isOwn 
        ? 'bg-whatsapp-green text-white ml-auto' 
        : 'bg-white border border-gray-200'
    }`}>
      {/* Audio element */}
      <audio
        ref={audioRef}
        src={message.audioData}
        preload="auto"
        onLoadStart={() => console.log('Audio loading started')}
        onLoadedMetadata={(e) => {
          console.log('Audio metadata loaded, duration:', e.target.duration);
          if (e.target.duration && isFinite(e.target.duration)) {
            setDuration(e.target.duration);
          }
        }}
        onCanPlay={() => console.log('Audio can play')}
        onDurationChange={(e) => {
          console.log('Duration changed:', e.target.duration);
          if (e.target.duration && isFinite(e.target.duration)) {
            setDuration(e.target.duration);
          }
        }}
        onError={(e) => {
          console.error('Audio error:', e.target.error);
          setIsPlaying(false);
        }}
      />
      
      {/* Play/Pause button */}
      <button
        onClick={togglePlayPause}
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
          isOwn
            ? 'bg-white bg-opacity-20 hover:bg-opacity-30 text-white'
            : 'bg-whatsapp-green text-white hover:bg-whatsapp-green-dark'
        }`}
      >
        {isPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5 ml-0.5" />
        )}
      </button>

      {/* Waveform visualization (simplified as progress bar) */}
      <div className="flex-1 space-y-1">
        <div className={`h-1 rounded-full overflow-hidden ${
          isOwn ? 'bg-white bg-opacity-20' : 'bg-gray-200'
        }`}>
          <div
            className={`h-full transition-all duration-100 ${
              isOwn ? 'bg-white' : 'bg-whatsapp-green'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        {/* Time display */}
        <div className={`text-xs ${
          isOwn ? 'text-white text-opacity-80' : 'text-gray-500'
        }`}>
          {formatTime(currentTime)} / {formatTime(effectiveDuration)}
        </div>
      </div>

      {/* Volume control */}
      <button
        onClick={toggleMute}
        className={`flex-shrink-0 p-1 rounded transition-colors ${
          isOwn
            ? 'hover:bg-white hover:bg-opacity-20 text-white text-opacity-60 hover:text-opacity-80'
            : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
        }`}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </button>

      {/* Message time and status */}
      <div className={`flex items-center space-x-1 ${
        isOwn ? 'text-white text-opacity-70' : 'text-gray-500'
      }`}>
        <span className="text-xs">
          {formatMessageTime(message.createdAt)}
        </span>
        {renderMessageStatus()}
      </div>
    </div>
  );
};

export default VoiceMessage;
