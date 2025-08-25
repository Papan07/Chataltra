import { useState, useEffect } from 'react';
import { 
  Phone, 
  Video, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed,
  Clock,
  User
} from 'lucide-react';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { chatAPI } from '../services/api';

const CallHistory = ({ chatId, isVisible, onClose }) => {
  const [callHistory, setCallHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isVisible && chatId) {
      fetchCallHistory();
    }
  }, [isVisible, chatId]);

  const fetchCallHistory = async () => {
    try {
      setIsLoading(true);
      const response = await chatAPI.getCallHistory(chatId);
      setCallHistory(response.data.calls || []);
    } catch (error) {
      console.error('Error fetching call history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCallTime = (date) => {
    const callDate = new Date(date);
    
    if (isToday(callDate)) {
      return format(callDate, 'HH:mm');
    } else if (isYesterday(callDate)) {
      return `Yesterday ${format(callDate, 'HH:mm')}`;
    } else {
      return format(callDate, 'MMM dd, HH:mm');
    }
  };

  const formatCallDuration = (duration) => {
    if (!duration || duration === 0) return null;
    
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${seconds}s`;
    }
  };

  const getCallIcon = (call, currentUserId) => {
    const isCaller = call.caller._id === currentUserId;
    const isVideoCall = call.callType === 'video';
    
    if (call.status === 'missed') {
      return <PhoneMissed className="w-4 h-4 text-red-500" />;
    } else if (call.status === 'declined') {
      return <PhoneMissed className="w-4 h-4 text-red-500" />;
    } else if (isCaller) {
      return isVideoCall ? 
        <Video className="w-4 h-4 text-green-600" /> : 
        <PhoneOutgoing className="w-4 h-4 text-green-600" />;
    } else {
      return isVideoCall ? 
        <Video className="w-4 h-4 text-blue-600" /> : 
        <PhoneIncoming className="w-4 h-4 text-blue-600" />;
    }
  };

  const getCallStatusText = (call, currentUserId) => {
    const isCaller = call.caller._id === currentUserId;
    
    switch (call.status) {
      case 'missed':
        return isCaller ? 'Missed call' : 'Missed call';
      case 'declined':
        return isCaller ? 'Call declined' : 'Declined';
      case 'answered':
      case 'ended':
        const duration = formatCallDuration(call.duration);
        return duration ? `Call duration: ${duration}` : 'Call ended';
      case 'failed':
        return 'Call failed';
      default:
        return 'Call';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Call History</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-semibold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : callHistory.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No call history</p>
              <p className="text-sm text-gray-400 mt-1">
                Start a call to see your call history here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {callHistory.map((call) => {
                const otherUser = call.caller._id === call.currentUserId ? call.receiver : call.caller;
                
                return (
                  <div
                    key={call._id}
                    className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    {/* Call Icon */}
                    <div className="flex-shrink-0">
                      {getCallIcon(call, call.currentUserId)}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {otherUser?.username || 'Unknown User'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatCallTime(call.createdAt)}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-500">
                          {getCallStatusText(call, call.currentUserId)}
                        </p>
                        
                        {call.callType === 'video' && (
                          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                            Video
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallHistory;
