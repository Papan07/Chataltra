import { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  User,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { useCall } from '../context/CallContext';

const ActiveCallWindow = () => {
  const {
    callState,
    currentCall,
    localStream,
    remoteStream,
    isAudioEnabled,
    isVideoEnabled,
    callDuration,
    endCall,
    toggleAudio,
    toggleVideo,
    CALL_STATES
  } = useCall();

  const [isMinimized, setIsMinimized] = useState(false);
  const [formattedDuration, setFormattedDuration] = useState('00:00');
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Format call duration
  useEffect(() => {
    const minutes = Math.floor(callDuration / 60);
    const seconds = callDuration % 60;
    setFormattedDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
  }, [callDuration]);

  // Set up video streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Don't render if no active call
  if (callState === CALL_STATES.IDLE || !currentCall) {
    return null;
  }

  const isVideoCall = currentCall.callType === 'video';
  const isConnected = callState === CALL_STATES.CONNECTED;

  const handleEndCall = () => {
    endCall();
  };

  const handleToggleAudio = () => {
    toggleAudio();
  };

  const handleToggleVideo = () => {
    if (isVideoCall) {
      toggleVideo();
    }
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-gray-900 text-white rounded-lg p-4 shadow-xl min-w-[200px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium">
                {isConnected ? formattedDuration : 'Connecting...'}
              </span>
            </div>
            <button
              onClick={handleMinimize}
              className="text-gray-400 hover:text-white"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">
              {currentCall.receiverId ? 'Calling...' : 'In call'}
            </span>
            <button
              onClick={handleEndCall}
              className="bg-red-500 hover:bg-red-600 rounded-full p-2"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-3 ${
            isConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
          }`}></div>
          <div>
            <h2 className="text-white font-medium">
              {currentCall.receiverId ? 'Calling...' : 'In call'}
            </h2>
            <p className="text-gray-400 text-sm">
              {isConnected ? `Connected • ${formattedDuration}` : 'Connecting...'}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleMinimize}
          className="text-gray-400 hover:text-white p-2"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative">
        {isVideoCall ? (
          <>
            {/* Remote Video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover bg-gray-800"
            />
            
            {/* Local Video (Picture-in-Picture) */}
            <div className="absolute top-4 right-4 w-32 h-24 bg-gray-700 rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>

            {/* No video placeholder */}
            {!remoteStream && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <div className="text-center text-white">
                  <User className="w-24 h-24 mx-auto mb-4 text-gray-600" />
                  <p className="text-lg">Waiting for video...</p>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Audio Call UI */
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-900 to-purple-900">
            <div className="text-center text-white">
              <div className="w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <User className="w-16 h-16" />
              </div>
              <h3 className="text-2xl font-medium mb-2">
                {currentCall.receiverId ? 'Calling...' : 'Voice Call'}
              </h3>
              <p className="text-blue-200">
                {isConnected ? `Connected • ${formattedDuration}` : 'Connecting...'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Call Controls */}
      <div className="bg-gray-800 p-6">
        <div className="flex items-center justify-center space-x-6">
          {/* Audio Toggle */}
          <button
            onClick={handleToggleAudio}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isAudioEnabled
                ? 'bg-gray-600 hover:bg-gray-700 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
            title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          >
            {isAudioEnabled ? (
              <Mic className="w-6 h-6" />
            ) : (
              <MicOff className="w-6 h-6" />
            )}
          </button>

          {/* End Call */}
          <button
            onClick={handleEndCall}
            className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors shadow-lg"
            title="End call"
          >
            <PhoneOff className="w-8 h-8" />
          </button>

          {/* Video Toggle (only for video calls) */}
          {isVideoCall && (
            <button
              onClick={handleToggleVideo}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                isVideoEnabled
                  ? 'bg-gray-600 hover:bg-gray-700 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
              title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {isVideoEnabled ? (
                <Video className="w-6 h-6" />
              ) : (
                <VideoOff className="w-6 h-6" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActiveCallWindow;
