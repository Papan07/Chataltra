import { useState, useEffect } from 'react';
import { Phone, PhoneOff, Video, User } from 'lucide-react';
import { useCall } from '../context/CallContext';

const IncomingCallModal = () => {
  const { incomingCall, answerCall, declineCall, CALL_STATES, callState } = useCall();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(callState === CALL_STATES.RINGING && !!incomingCall);
  }, [callState, incomingCall, CALL_STATES.RINGING]);

  if (!isVisible || !incomingCall) {
    return null;
  }

  const { caller, callType } = incomingCall;

  const handleAnswer = async () => {
    try {
      await answerCall();
    } catch (error) {
      console.error('Error answering call:', error);
    }
  };

  const handleDecline = () => {
    declineCall();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4 text-center">
        {/* Caller Avatar */}
        <div className="mb-6">
          {caller.avatar ? (
            <img
              src={caller.avatar}
              alt={caller.username}
              className="w-24 h-24 rounded-full mx-auto object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full mx-auto bg-gray-300 flex items-center justify-center">
              <User className="w-12 h-12 text-gray-600" />
            </div>
          )}
        </div>

        {/* Call Info */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            {caller.username}
          </h2>
          <p className="text-gray-600 flex items-center justify-center">
            {callType === 'video' ? (
              <>
                <Video className="w-5 h-5 mr-2" />
                Incoming video call
              </>
            ) : (
              <>
                <Phone className="w-5 h-5 mr-2" />
                Incoming voice call
              </>
            )}
          </p>
        </div>

        {/* Call Actions */}
        <div className="flex justify-center space-x-8">
          {/* Decline Button */}
          <button
            onClick={handleDecline}
            className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors duration-200 shadow-lg"
            title="Decline call"
          >
            <PhoneOff className="w-8 h-8" />
          </button>

          {/* Answer Button */}
          <button
            onClick={handleAnswer}
            className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white transition-colors duration-200 shadow-lg"
            title="Answer call"
          >
            {callType === 'video' ? (
              <Video className="w-8 h-8" />
            ) : (
              <Phone className="w-8 h-8" />
            )}
          </button>
        </div>

        {/* Ringing Animation */}
        <div className="mt-6">
          <div className="flex justify-center">
            <div className="animate-pulse">
              <div className="w-3 h-3 bg-blue-500 rounded-full mx-1 inline-block"></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full mx-1 inline-block animation-delay-200"></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full mx-1 inline-block animation-delay-400"></div>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">Ringing...</p>
        </div>
      </div>

      <style jsx>{`
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        .animation-delay-400 {
          animation-delay: 0.4s;
        }
      `}</style>
    </div>
  );
};

export default IncomingCallModal;
