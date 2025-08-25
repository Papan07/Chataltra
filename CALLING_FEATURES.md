# Audio and Video Calling Features

This document describes the comprehensive audio and video calling functionality implemented in the Chataltra chat application.

## Features Overview

### ✅ Audio Calling
- **Initiate audio calls** between users in individual chats
- **Accept/decline incoming calls** with intuitive UI
- **Mute/unmute microphone** during calls
- **End call functionality** with proper cleanup
- **Call status indicators** (ringing, connected, ended)
- **Call duration tracking** with real-time display

### ✅ Video Calling
- **Initiate video calls** between users in individual chats
- **Accept/decline incoming calls** with video preview
- **Turn camera on/off** during calls
- **Mute/unmute audio** during video calls
- **Local and remote video display** with picture-in-picture
- **Responsive video layout** for different screen sizes

### ✅ Technical Implementation
- **WebRTC peer-to-peer communication** for high-quality calls
- **Socket.io signaling** for call initiation, acceptance, and rejection
- **Media permissions handling** with user-friendly error messages
- **Connection quality monitoring** and automatic reconnection
- **Call history tracking** with detailed metadata
- **Cross-browser compatibility** (Chrome, Firefox, Safari)

### ✅ User Interface
- **Incoming call modal** with caller information
- **Active call window** with full-screen video support
- **Call controls** (answer, decline, end, mute, camera toggle)
- **Visual call state indicators** (ringing, connecting, connected)
- **Minimizable call window** for multitasking
- **Call history viewer** with call details and duration

## Architecture

### Client-Side Components

1. **WebRTC Service** (`client/src/services/webrtcService.js`)
   - Manages peer connections and media streams
   - Handles ICE candidates and signaling
   - Provides media control functions

2. **Call Context** (`client/src/context/CallContext.jsx`)
   - Global call state management
   - Call event handling and coordination
   - Integration with Socket.io and WebRTC service

3. **UI Components**
   - `IncomingCallModal.jsx` - Handles incoming call notifications
   - `ActiveCallWindow.jsx` - Full-screen call interface
   - `CallNotification.jsx` - Call status notifications
   - `CallHistory.jsx` - Call history viewer
   - `CallManager.jsx` - Orchestrates all call UI components

### Server-Side Implementation

1. **Call Model** (`server/models/Call.js`)
   - MongoDB schema for call records
   - Call status tracking and metadata
   - Call history and statistics methods

2. **Socket Events** (`server/sockets/chatSocket.js`)
   - Call signaling (initiate, answer, decline, end)
   - WebRTC signaling (offer, answer, ICE candidates)
   - Call timeout and cleanup handling

3. **API Endpoints** (`server/controllers/callController.js`)
   - Call history retrieval
   - Call statistics
   - Recent calls across chats

## Usage

### Starting a Call

1. **Audio Call**: Click the phone icon in the chat header
2. **Video Call**: Click the video icon in the chat header
3. **Requirements**: 
   - Individual chat (not group chat)
   - Other user must be online
   - Browser must support WebRTC

### Receiving a Call

1. **Incoming call modal** appears with caller information
2. **Answer**: Click the green answer button
3. **Decline**: Click the red decline button
4. **Automatic timeout**: Calls timeout after 30 seconds

### During a Call

1. **Mute/Unmute**: Click the microphone button
2. **Camera Toggle**: Click the camera button (video calls only)
3. **End Call**: Click the red phone button
4. **Minimize**: Click the minimize button to continue chatting

### Call History

1. Click the **more options** button (⋮) in chat header
2. View **call history** with details:
   - Call type (audio/video)
   - Call duration
   - Call status (answered, missed, declined)
   - Timestamp

## Browser Compatibility

### Supported Browsers
- ✅ **Chrome 60+** (Recommended)
- ✅ **Firefox 55+**
- ✅ **Safari 11+**
- ✅ **Edge 79+**

### Required Permissions
- 🎤 **Microphone access** (for all calls)
- 📹 **Camera access** (for video calls)
- 🌐 **Secure context** (HTTPS in production)

## Error Handling

### Common Issues and Solutions

1. **Permission Denied**
   - Allow camera/microphone access in browser settings
   - Refresh page and try again

2. **No Camera/Microphone Found**
   - Check device connections
   - Ensure devices are not in use by other applications

3. **Connection Failed**
   - Check internet connection
   - Try refreshing the page
   - Contact support if issues persist

4. **Browser Not Supported**
   - Use a modern browser (Chrome, Firefox, Safari)
   - Update browser to latest version

### Error Recovery
- **Automatic cleanup** on connection failures
- **User-friendly error messages** with troubleshooting tips
- **Graceful fallback** to text chat if calls fail
- **Error boundary** to prevent app crashes

## Performance Optimizations

1. **Efficient signaling** with minimal server overhead
2. **Peer-to-peer connections** for direct media transfer
3. **Adaptive bitrate** based on connection quality
4. **Resource cleanup** when calls end
5. **Optimized UI rendering** for smooth experience

## Security Considerations

1. **Encrypted media streams** via WebRTC DTLS
2. **Secure signaling** over authenticated Socket.io connections
3. **Permission validation** on server-side
4. **Call access control** based on chat membership
5. **No media recording** or storage on servers

## Future Enhancements

- [ ] Group video calls (up to 4 participants)
- [ ] Screen sharing functionality
- [ ] Call recording (with consent)
- [ ] Call quality metrics and feedback
- [ ] Push notifications for missed calls
- [ ] Integration with calendar for scheduled calls

## Testing

To test the calling features:

1. **Start the application**:
   ```bash
   # Terminal 1 - Server
   cd server && npm run dev
   
   # Terminal 2 - Client
   cd client && npm run dev
   ```

2. **Open two browser windows** with different user accounts
3. **Start a call** from one user to another
4. **Test all call controls** and scenarios
5. **Check call history** after ending calls

## Troubleshooting

If you encounter issues:

1. **Check browser console** for error messages
2. **Verify network connectivity** and firewall settings
3. **Test with different browsers** and devices
4. **Review server logs** for backend issues
5. **Clear browser cache** and cookies if needed

For additional support, please refer to the main README.md or contact the development team.
