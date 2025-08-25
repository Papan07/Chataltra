class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.socket = null;
    this.callId = null;
    this.isInitiator = false;
    this.onRemoteStreamCallback = null;
    this.onCallEndCallback = null;
    this.onConnectionStateChangeCallback = null;

    // ICE servers configuration
    this.iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ]
    };
  }

  // Initialize WebRTC service with socket
  initialize(socket) {
    this.socket = socket;
    this.setupSocketListeners();
  }

  // Setup socket event listeners for WebRTC signaling
  setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('webrtc_offer', this.handleOffer.bind(this));
    this.socket.on('webrtc_answer', this.handleAnswer.bind(this));
    this.socket.on('webrtc_ice_candidate', this.handleIceCandidate.bind(this));
  }

  // Create peer connection
  createPeerConnection() {
    try {
      this.peerConnection = new RTCPeerConnection(this.iceServers);

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.socket && this.callId) {
          this.socket.emit('webrtc_ice_candidate', {
            callId: this.callId,
            candidate: event.candidate,
            targetUserId: this.targetUserId
          });
        }
      };

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        console.log('Received remote stream');
        this.remoteStream = event.streams[0];
        if (this.onRemoteStreamCallback) {
          this.onRemoteStreamCallback(this.remoteStream);
        }
      };

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', this.peerConnection.connectionState);
        if (this.onConnectionStateChangeCallback) {
          this.onConnectionStateChangeCallback(this.peerConnection.connectionState);
        }

        if (this.peerConnection.connectionState === 'failed' || 
            this.peerConnection.connectionState === 'disconnected') {
          this.endCall('connection_failed');
        }
      };

      // Handle ICE connection state changes
      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', this.peerConnection.iceConnectionState);
        
        if (this.peerConnection.iceConnectionState === 'failed' ||
            this.peerConnection.iceConnectionState === 'disconnected') {
          this.endCall('connection_failed');
        }
      };

      return this.peerConnection;
    } catch (error) {
      console.error('Error creating peer connection:', error);
      throw error;
    }
  }

  // Get user media (audio/video)
  async getUserMedia(constraints) {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support media access. Please use a modern browser like Chrome, Firefox, or Safari.');
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = stream;
      return stream;
    } catch (error) {
      console.error('Error getting user media:', error);

      // Provide user-friendly error messages
      let userMessage = 'Failed to access camera/microphone. ';

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        userMessage += 'Please allow camera and microphone access in your browser settings and try again.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        userMessage += 'No camera or microphone found. Please check your device connections.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        userMessage += 'Camera or microphone is already in use by another application.';
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        userMessage += 'Camera or microphone does not meet the required specifications.';
      } else if (error.name === 'NotSupportedError') {
        userMessage += 'Your browser does not support the required media features.';
      } else {
        userMessage += error.message || 'Unknown error occurred.';
      }

      const enhancedError = new Error(userMessage);
      enhancedError.originalError = error;
      throw enhancedError;
    }
  }

  // Start a call (as initiator)
  async startCall(callId, targetUserId, callType) {
    try {
      console.log('Starting WebRTC call:', { callId, targetUserId, callType });
      this.callId = callId;
      this.targetUserId = targetUserId;
      this.isInitiator = true;

      // Get user media
      const constraints = {
        audio: true,
        video: callType === 'video'
      };

      console.log('Getting user media with constraints:', constraints);
      const stream = await this.getUserMedia(constraints);
      console.log('Got local stream:', stream);

      // Create peer connection
      console.log('Creating peer connection...');
      this.createPeerConnection();

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        console.log('Adding track to peer connection:', track.kind);
        this.peerConnection.addTrack(track, stream);
      });

      // Create and send offer
      console.log('Creating WebRTC offer...');
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      console.log('Set local description (offer)');

      console.log('Sending WebRTC offer via socket...');
      this.socket.emit('webrtc_offer', {
        callId: this.callId,
        offer: offer,
        targetUserId: this.targetUserId
      });

      return stream;
    } catch (error) {
      console.error('Error starting call:', error);
      this.cleanup();
      throw error;
    }
  }

  // Answer a call (as receiver)
  async answerCall(callId, targetUserId, callType) {
    try {
      console.log('Answering WebRTC call:', { callId, targetUserId, callType });
      this.callId = callId;
      this.targetUserId = targetUserId;
      this.isInitiator = false;

      // Get user media
      const constraints = {
        audio: true,
        video: callType === 'video'
      };

      console.log('Getting user media for answer with constraints:', constraints);
      const stream = await this.getUserMedia(constraints);
      console.log('Got local stream for answer:', stream);

      // Create peer connection
      console.log('Creating peer connection for answer...');
      this.createPeerConnection();

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        console.log('Adding track to peer connection (answer):', track.kind);
        this.peerConnection.addTrack(track, stream);
      });

      console.log('WebRTC answer setup complete, waiting for offer...');
      return stream;
    } catch (error) {
      console.error('Error answering call:', error);
      this.cleanup();
      throw error;
    }
  }

  // Handle incoming WebRTC offer
  async handleOffer(data) {
    try {
      const { callId, offer, fromUserId } = data;
      console.log('Received WebRTC offer:', { callId, fromUserId });

      if (!this.peerConnection) {
        console.error('No peer connection available to handle offer');
        return;
      }

      console.log('Setting remote description (offer)...');
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('Remote description set successfully');

      // Create and send answer
      console.log('Creating WebRTC answer...');
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      console.log('Set local description (answer)');

      console.log('Sending WebRTC answer via socket...');
      this.socket.emit('webrtc_answer', {
        callId: callId,
        answer: answer,
        targetUserId: fromUserId
      });
      console.log('WebRTC answer sent');
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  // Handle incoming WebRTC answer
  async handleAnswer(data) {
    try {
      const { answer, fromUserId } = data;
      console.log('Received WebRTC answer:', { fromUserId });

      if (!this.peerConnection) {
        console.error('No peer connection available to handle answer');
        return;
      }

      console.log('Setting remote description (answer)...');
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('Remote description (answer) set successfully');
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  // Handle incoming ICE candidate
  async handleIceCandidate(data) {
    try {
      const { candidate, fromUserId } = data;
      console.log('Received ICE candidate from:', fromUserId);

      if (!this.peerConnection) {
        console.error('No peer connection available to handle ICE candidate');
        return;
      }

      console.log('Adding ICE candidate...');
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('ICE candidate added successfully');
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  // Toggle audio mute
  toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }

  // Toggle video
  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  // End call
  endCall(reason = 'caller_ended') {
    if (this.socket && this.callId) {
      this.socket.emit('end_call', {
        callId: this.callId,
        endReason: reason
      });
    }

    this.cleanup();

    if (this.onCallEndCallback) {
      this.onCallEndCallback(reason);
    }
  }

  // Cleanup resources
  cleanup() {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Reset state
    this.remoteStream = null;
    this.callId = null;
    this.targetUserId = null;
    this.isInitiator = false;
  }

  // Set callbacks
  setOnRemoteStream(callback) {
    this.onRemoteStreamCallback = callback;
  }

  setOnCallEnd(callback) {
    this.onCallEndCallback = callback;
  }

  setOnConnectionStateChange(callback) {
    this.onConnectionStateChangeCallback = callback;
  }

  // Get current call state
  getCallState() {
    return {
      callId: this.callId,
      isActive: !!this.callId,
      isInitiator: this.isInitiator,
      connectionState: this.peerConnection?.connectionState || 'new',
      iceConnectionState: this.peerConnection?.iceConnectionState || 'new'
    };
  }
}

// Export singleton instance
export default new WebRTCService();
