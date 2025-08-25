import { useState, useRef } from 'react';

const AudioDebugger = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [logs, setLogs] = useState([]);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  const addLog = (message) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    console.log(message);
  };

  const startRecording = async () => {
    try {
      addLog('Requesting microphone access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      
      addLog('Microphone access granted');
      addLog(`Stream active: ${stream.active}, tracks: ${stream.getTracks().length}`);

      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      }
      
      addLog(`Using MIME type: ${mimeType}`);

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        addLog(`Data available: ${event.data.size} bytes`);
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        addLog(`Recording stopped. Chunks: ${chunksRef.current.length}`);
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          addLog(`Created blob: ${blob.size} bytes`);
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      addLog('Recording started');

    } catch (error) {
      addLog(`Error: ${error.name} - ${error.message}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      addLog('Stop recording requested');
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setAudioUrl(null);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Audio Recording Debugger</h2>
      
      <div className="space-x-2 mb-4">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`px-4 py-2 rounded ${
            isRecording 
              ? 'bg-red-500 text-white' 
              : 'bg-blue-500 text-white'
          }`}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
        
        <button
          onClick={clearLogs}
          className="px-4 py-2 bg-gray-500 text-white rounded"
        >
          Clear Logs
        </button>
      </div>

      {audioUrl && (
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Recorded Audio:</h3>
          <audio controls src={audioUrl} className="w-full" />
        </div>
      )}

      <div className="bg-gray-100 p-4 rounded max-h-64 overflow-y-auto">
        <h3 className="font-semibold mb-2">Debug Logs:</h3>
        {logs.map((log, index) => (
          <div key={index} className="text-sm font-mono">
            {log}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AudioDebugger;
