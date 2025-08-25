import { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import webrtcService from '../services/webrtcService';

const CallContext = createContext();

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};

// Call states
const CALL_STATES = {
  IDLE: 'idle',
  INITIATING: 'initiating',
  RINGING: 'ringing',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ENDING: 'ending'
};

// Action types
const CALL_ACTIONS = {
  INITIATE_CALL: 'INITIATE_CALL',
  INCOMING_CALL: 'INCOMING_CALL',
  CALL_ANSWERED: 'CALL_ANSWERED',
  CALL_CONNECTED: 'CALL_CONNECTED',
  CALL_ENDED: 'CALL_ENDED',
  CALL_ERROR: 'CALL_ERROR',
  TOGGLE_AUDIO: 'TOGGLE_AUDIO',
  TOGGLE_VIDEO: 'TOGGLE_VIDEO',
  SET_LOCAL_STREAM: 'SET_LOCAL_STREAM',
  SET_REMOTE_STREAM: 'SET_REMOTE_STREAM',
  RESET_CALL: 'RESET_CALL'
};

// Initial state
const initialState = {
  callState: CALL_STATES.IDLE,
  currentCall: null,
  incomingCall: null,
  localStream: null,
  remoteStream: null,
  isAudioEnabled: true,
  isVideoEnabled: true,
  isLocalVideoEnabled: true,
  isRemoteVideoEnabled: true,
  callDuration: 0,
  error: null
};

// Reducer
const callReducer = (state, action) => {
  switch (action.type) {
    case CALL_ACTIONS.INITIATE_CALL:
      return {
        ...state,
        callState: CALL_STATES.INITIATING,
        currentCall: action.payload,
        error: null
      };

    case CALL_ACTIONS.INCOMING_CALL:
      return {
        ...state,
        callState: CALL_STATES.RINGING,
        incomingCall: action.payload,
        error: null
      };

    case CALL_ACTIONS.CALL_ANSWERED:
      return {
        ...state,
        callState: CALL_STATES.CONNECTING,
        currentCall: state.incomingCall || state.currentCall,
        incomingCall: null,
        error: null
      };

    case CALL_ACTIONS.CALL_CONNECTED:
      return {
        ...state,
        callState: CALL_STATES.CONNECTED,
        error: null
      };

    case CALL_ACTIONS.CALL_ENDED:
      return {
        ...initialState,
        callState: CALL_STATES.IDLE
      };

    case CALL_ACTIONS.CALL_ERROR:
      return {
        ...state,
        error: action.payload,
        callState: state.callState === CALL_STATES.IDLE ? CALL_STATES.IDLE : CALL_STATES.ENDING
      };

    case CALL_ACTIONS.TOGGLE_AUDIO:
      return {
        ...state,
        isAudioEnabled: action.payload
      };

    case CALL_ACTIONS.TOGGLE_VIDEO:
      return {
        ...state,
        isVideoEnabled: action.payload
      };

    case CALL_ACTIONS.SET_LOCAL_STREAM:
      return {
        ...state,
        localStream: action.payload
      };

    case CALL_ACTIONS.SET_REMOTE_STREAM:
      return {
        ...state,
        remoteStream: action.payload
      };

    case CALL_ACTIONS.RESET_CALL:
      return initialState;

    default:
      return state;
  }
};

export const CallProvider = ({ children }) => {
  const [state, dispatch] = useReducer(callReducer, initialState);
  const { socket } = useSocket();
  const { user } = useAuth();
  const callTimerRef = useRef(null);
  const callDurationRef = useRef(0);

  // Initialize WebRTC service when socket is available
  useEffect(() => {
    if (socket) {
      webrtcService.initialize(socket);
      setupSocketListeners();
      setupWebRTCCallbacks();
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [socket]);

  // Setup socket event listeners for call events
  const setupSocketListeners = () => {
    socket.on('incoming_call', handleIncomingCall);
    socket.on('call_answered', handleCallAnswered);
    socket.on('call_declined', handleCallDeclined);
    socket.on('call_ended', handleCallEnded);
    socket.on('call_error', handleCallError);

    return () => {
      socket.off('incoming_call', handleIncomingCall);
      socket.off('call_answered', handleCallAnswered);
      socket.off('call_declined', handleCallDeclined);
      socket.off('call_ended', handleCallEnded);
      socket.off('call_error', handleCallError);
    };
  };

  // Setup WebRTC service callbacks
  const setupWebRTCCallbacks = () => {
    webrtcService.setOnRemoteStream((stream) => {
      dispatch({ type: CALL_ACTIONS.SET_REMOTE_STREAM, payload: stream });
      dispatch({ type: CALL_ACTIONS.CALL_CONNECTED });
      startCallTimer();
    });

    webrtcService.setOnCallEnd((reason) => {
      dispatch({ type: CALL_ACTIONS.CALL_ENDED });
      stopCallTimer();
    });

    webrtcService.setOnConnectionStateChange((state) => {
      console.log('WebRTC connection state:', state);
      if (state === 'connected') {
        dispatch({ type: CALL_ACTIONS.CALL_CONNECTED });
      } else if (state === 'failed' || state === 'disconnected') {
        dispatch({ type: CALL_ACTIONS.CALL_ERROR, payload: 'Connection failed' });
      }
    });
  };

  // Start call timer
  const startCallTimer = () => {
    callDurationRef.current = 0;
    callTimerRef.current = setInterval(() => {
      callDurationRef.current += 1;
    }, 1000);
  };

  // Stop call timer
  const stopCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    callDurationRef.current = 0;
  };

  // Handle incoming call
  const handleIncomingCall = (data) => {
    dispatch({ type: CALL_ACTIONS.INCOMING_CALL, payload: data });
  };

  // Handle call answered
  const handleCallAnswered = async (data) => {
    console.log('Call answered event received:', data);
    dispatch({ type: CALL_ACTIONS.CALL_ANSWERED });

    // If this is the caller, start WebRTC offer after call is answered
    if (state.currentCall && state.currentCall.receiverId) {
      console.log('Caller: Starting WebRTC offer after call answered');
      try {
        const { receiverId, chatId, callType } = state.currentCall;
        const localStream = await webrtcService.startCall(data.callId, receiverId, callType);
        dispatch({ type: CALL_ACTIONS.SET_LOCAL_STREAM, payload: localStream });
      } catch (error) {
        console.error('Error starting WebRTC after call answered:', error);
        dispatch({ type: CALL_ACTIONS.CALL_ERROR, payload: error.message });
      }
    }
  };

  // Handle call declined
  const handleCallDeclined = (data) => {
    dispatch({ type: CALL_ACTIONS.CALL_ENDED });
    webrtcService.cleanup();
  };

  // Handle call ended
  const handleCallEnded = (data) => {
    dispatch({ type: CALL_ACTIONS.CALL_ENDED });
    webrtcService.cleanup();
    stopCallTimer();
  };

  // Handle call error
  const handleCallError = (data) => {
    const errorMessage = data.message || 'An error occurred during the call';
    dispatch({ type: CALL_ACTIONS.CALL_ERROR, payload: errorMessage });
    webrtcService.cleanup();
    stopCallTimer();

    // Show user-friendly error notification
    if (window.alert) {
      setTimeout(() => {
        alert(`Call Error: ${errorMessage}`);
      }, 100);
    }
  };

  // Initiate a call
  const initiateCall = async (receiverId, chatId, callType) => {
    try {
      // Check if WebRTC is supported
      if (!window.RTCPeerConnection) {
        throw new Error('Your browser does not support video calls. Please use a modern browser like Chrome, Firefox, or Safari.');
      }

      dispatch({
        type: CALL_ACTIONS.INITIATE_CALL,
        payload: { receiverId, chatId, callType }
      });

      // Emit call initiation to server
      socket.emit('initiate_call', {
        receiverId,
        chatId,
        callType
      });

      // WebRTC will be started when call is answered (in handleCallAnswered)
    } catch (error) {
      dispatch({ type: CALL_ACTIONS.CALL_ERROR, payload: error.message });
    }
  };

  // Answer incoming call
  const answerCall = async () => {
    try {
      if (!state.incomingCall) return;

      const { callId, callType, caller } = state.incomingCall;

      // Answer the call via socket
      socket.emit('answer_call', { callId });

      // Start WebRTC connection
      const localStream = await webrtcService.answerCall(callId, caller.id, callType);
      dispatch({ type: CALL_ACTIONS.SET_LOCAL_STREAM, payload: localStream });
      dispatch({ type: CALL_ACTIONS.CALL_ANSWERED });
    } catch (error) {
      console.error('Error answering call:', error);
      const errorMessage = error.message || 'Failed to answer call';
      dispatch({ type: CALL_ACTIONS.CALL_ERROR, payload: errorMessage });

      // Notify the caller that we couldn't answer
      if (state.incomingCall) {
        socket.emit('decline_call', { callId: state.incomingCall.callId });
      }
    }
  };

  // Decline incoming call
  const declineCall = () => {
    if (state.incomingCall) {
      socket.emit('decline_call', { callId: state.incomingCall.callId });
      dispatch({ type: CALL_ACTIONS.CALL_ENDED });
    }
  };

  // End current call
  const endCall = () => {
    webrtcService.endCall();
    dispatch({ type: CALL_ACTIONS.CALL_ENDED });
    stopCallTimer();
  };

  // Toggle audio
  const toggleAudio = () => {
    const isEnabled = webrtcService.toggleAudio();
    dispatch({ type: CALL_ACTIONS.TOGGLE_AUDIO, payload: isEnabled });
    return isEnabled;
  };

  // Toggle video
  const toggleVideo = () => {
    const isEnabled = webrtcService.toggleVideo();
    dispatch({ type: CALL_ACTIONS.TOGGLE_VIDEO, payload: isEnabled });
    return isEnabled;
  };

  const value = {
    ...state,
    callDuration: callDurationRef.current,
    initiateCall,
    answerCall,
    declineCall,
    endCall,
    toggleAudio,
    toggleVideo,
    CALL_STATES
  };

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
};
