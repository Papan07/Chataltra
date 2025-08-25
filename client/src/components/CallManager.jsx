import { useCall } from '../context/CallContext';
import IncomingCallModal from './IncomingCallModal';
import ActiveCallWindow from './ActiveCallWindow';
import CallNotification from './CallNotification';
import CallErrorBoundary from './CallErrorBoundary';

const CallManager = () => {
  const { callState, CALL_STATES } = useCall();

  return (
    <CallErrorBoundary>
      {/* Incoming Call Modal */}
      {callState === CALL_STATES.RINGING && <IncomingCallModal />}

      {/* Active Call Window */}
      {(callState === CALL_STATES.CONNECTING || callState === CALL_STATES.CONNECTED) && (
        <ActiveCallWindow />
      )}

      {/* Call Notification */}
      {(callState === CALL_STATES.INITIATING || callState === CALL_STATES.CONNECTING) && (
        <CallNotification />
      )}
    </CallErrorBoundary>
  );
};

export default CallManager;
