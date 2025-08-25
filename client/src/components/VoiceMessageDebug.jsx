import { useState, useRef } from 'react';
import { Play, Pause, Mic, MicOff } from 'lucide-react';

const VoiceMessageDebug = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [debugInfo, setDebugInfo] = useState([]);
  
  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);
  const streamRef = useRef(null);
  const audioChunksRef = useRef([]);

  const addDebugInfo = (message) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const startRecording = async () => {
    try {
      addDebugInfo('Starting recording...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      // Try different MIME types
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/wav',
        'audio/ogg;codecs=opus'
      ];
      
      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          addDebugInfo(`Using MIME type: ${mimeType}`);
          break;
        }
      }
      
      if (!selectedMimeType) {
        throw new Error('No supported audio MIME type found');
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          addDebugInfo(`Audio chunk received: ${event.data.size} bytes`);
        }
      };
      
      mediaRecorder.onstop = () => {
        addDebugInfo('Recording stopped');
        const blob = new Blob(audioChunksRef.current, { type: selectedMimeType });
        setAudioBlob(blob);
        
        // Create object URL for testing
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Convert to base64 for testing
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result;
          addDebugInfo(`Base64 length: ${base64.length}`);
          addDebugInfo(`Base64 prefix: ${base64.substring(0, 50)}...`);
        };
        reader.readAsDataURL(blob);
        
        addDebugInfo(`Blob created: ${blob.size} bytes, type: ${blob.type}`);
        
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      addDebugInfo('Recording started');
      
    } catch (error) {
      addDebugInfo(`Recording error: ${error.message}`);
      console.error('Recording error:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const testPlayback = async () => {
    if (!audioRef.current || !audioUrl) {
      addDebugInfo('No audio to play');
      return;
    }

    try {
      const audio = audioRef.current;
      
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        addDebugInfo('Playback paused');
      } else {
        addDebugInfo('Starting playback...');
        addDebugInfo(`Audio src: ${audio.src}`);
        addDebugInfo(`Audio readyState: ${audio.readyState}`);
        addDebugInfo(`Audio networkState: ${audio.networkState}`);
        
        await audio.play();
        setIsPlaying(true);
        addDebugInfo('Playback started');
      }
    } catch (error) {
      addDebugInfo(`Playback error: ${error.message}`);
      console.error('Playback error:', error);
      setIsPlaying(false);
    }
  };

  const clearDebug = () => {
    setDebugInfo([]);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Voice Message Debug Tool</h2>
      
      {/* Controls */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
            isRecording 
              ? 'bg-red-500 text-white' 
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          <span>{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
        </button>
        
        <button
          onClick={testPlayback}
          disabled={!audioUrl}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
            !audioUrl
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : isPlaying
              ? 'bg-orange-500 text-white'
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </button>
        
        <button
          onClick={clearDebug}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
        >
          Clear Debug
        </button>
      </div>
      
      {/* Audio element for testing */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onLoadStart={() => addDebugInfo('Audio loadstart event')}
          onLoadedMetadata={() => addDebugInfo('Audio loadedmetadata event')}
          onCanPlay={() => addDebugInfo('Audio canplay event')}
          onError={(e) => addDebugInfo(`Audio error event: ${e.target.error?.message || 'Unknown error'}`)}
          onEnded={() => {
            setIsPlaying(false);
            addDebugInfo('Audio ended');
          }}
        />
      )}
      
      {/* Debug Info */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Debug Information:</h3>
        <div className="max-h-64 overflow-y-auto text-sm font-mono">
          {debugInfo.length === 0 ? (
            <p className="text-gray-500">No debug information yet...</p>
          ) : (
            debugInfo.map((info, index) => (
              <div key={index} className="mb-1">
                {info}
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Browser Support Info */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">Browser Support:</h3>
        <div className="text-sm">
          <p>getUserMedia: {navigator.mediaDevices?.getUserMedia ? '✅ Supported' : '❌ Not supported'}</p>
          <p>MediaRecorder: {window.MediaRecorder ? '✅ Supported' : '❌ Not supported'}</p>
          <p>Audio element: {document.createElement('audio').canPlayType ? '✅ Supported' : '❌ Not supported'}</p>
        </div>
      </div>
    </div>
  );
};

export default VoiceMessageDebug;
