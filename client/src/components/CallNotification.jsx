import { useEffect, useState } from 'react';
import { Phone, Video, PhoneOff } from 'lucide-react';
import { useCall } from '../context/CallContext';

const CallNotification = () => {
  const { callState, currentCall, endCall, CALL_STATES } = useCall();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(
      callState === CALL_STATES.INITIATING || 
      callState === CALL_STATES.CONNECTING
    );
  }, [callState, CALL_STATES]);

  if (!isVisible || !currentCall) {
    return null;
  }

  const isVideoCall = currentCall.callType === 'video';
  const isConnecting = callState === CALL_STATES.CONNECTING;

  const handleEndCall = () => {
    endCall();
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[280px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0 mr-3">
              {isVideoCall ? (
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Video className="w-5 h-5 text-blue-600" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {isConnecting ? 'Connecting...' : 'Calling...'}
              </p>
              <p className="text-xs text-gray-500">
                {isVideoCall ? 'Video call' : 'Voice call'}
              </p>
            </div>
          </div>

          <button
            onClick={handleEndCall}
            className="ml-3 w-8 h-8 bg-red-100 hover:bg-red-200 rounded-full flex items-center justify-center text-red-600 transition-colors"
            title="End call"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>

        {/* Progress indicator */}
        <div className="mt-3">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallNotification;
