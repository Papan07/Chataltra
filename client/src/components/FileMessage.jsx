import { useState } from 'react';
import { 
  Download, 
  FileText, 
  Image, 
  Video, 
  Music, 
  Archive, 
  File,
  Play,
  Pause,
  Eye
} from 'lucide-react';

const FileMessage = ({ message, isOwn }) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType, extension) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.startsWith('video/')) return Video;
    if (mimeType.startsWith('audio/')) return Music;
    if (mimeType.includes('pdf')) return FileText;
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return Archive;
    if (mimeType.includes('document') || mimeType.includes('text') || 
        mimeType.includes('spreadsheet') || mimeType.includes('presentation')) return FileText;
    return File;
  };

  const getFileUrl = () => {
    const token = localStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';
    return `${baseUrl}${message.fileUrl}?token=${token}`;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = getFileUrl();
    link.download = message.fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderImageMessage = () => (
    <div className="max-w-sm">
      <div className="relative group">
        <img
          src={getFileUrl()}
          alt={message.fileName}
          className="rounded-lg max-w-full h-auto cursor-pointer"
          onLoad={() => setIsImageLoaded(true)}
          onClick={() => setShowImagePreview(true)}
        />
        {isImageLoaded && (
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
            <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-gray-500">{message.fileName}</span>
        <button
          onClick={handleDownload}
          className="text-xs text-blue-500 hover:text-blue-700 flex items-center space-x-1"
        >
          <Download className="h-3 w-3" />
          <span>{formatFileSize(message.fileSize)}</span>
        </button>
      </div>
      
      {/* Image preview modal */}
      {showImagePreview && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setShowImagePreview(false)}
        >
          <div className="max-w-4xl max-h-4xl p-4">
            <img
              src={getFileUrl()}
              alt={message.fileName}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );

  const renderVideoMessage = () => (
    <div className="max-w-sm">
      <div className="relative">
        <video
          controls
          className="rounded-lg max-w-full h-auto"
          preload="metadata"
          onPlay={() => setIsVideoPlaying(true)}
          onPause={() => setIsVideoPlaying(false)}
        >
          <source
            src={getFileUrl()}
            type={message.fileMimeType}
          />
          Your browser does not support the video tag.
        </video>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-gray-500">{message.fileName}</span>
        <button
          onClick={handleDownload}
          className="text-xs text-blue-500 hover:text-blue-700 flex items-center space-x-1"
        >
          <Download className="h-3 w-3" />
          <span>{formatFileSize(message.fileSize)}</span>
        </button>
      </div>
    </div>
  );

  const renderAudioMessage = () => (
    <div className="max-w-sm">
      <div className="bg-gray-100 rounded-lg p-3">
        <audio
          controls
          className="w-full"
          preload="metadata"
        >
          <source
            src={getFileUrl()}
            type={message.fileMimeType}
          />
          Your browser does not support the audio tag.
        </audio>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-gray-500">{message.fileName}</span>
        <button
          onClick={handleDownload}
          className="text-xs text-blue-500 hover:text-blue-700 flex items-center space-x-1"
        >
          <Download className="h-3 w-3" />
          <span>{formatFileSize(message.fileSize)}</span>
        </button>
      </div>
    </div>
  );

  const renderDocumentMessage = () => {
    const FileIcon = getFileIcon(message.fileMimeType, message.fileExtension);
    
    return (
      <div className={`max-w-sm p-3 rounded-lg border ${
        isOwn ? 'bg-white bg-opacity-20 border-white border-opacity-30' : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${
            isOwn ? 'bg-white bg-opacity-20' : 'bg-gray-200'
          }`}>
            <FileIcon className={`h-6 w-6 ${
              isOwn ? 'text-white' : 'text-gray-600'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${
              isOwn ? 'text-white' : 'text-gray-900'
            }`}>
              {message.fileName}
            </p>
            <p className={`text-xs ${
              isOwn ? 'text-white text-opacity-70' : 'text-gray-500'
            }`}>
              {formatFileSize(message.fileSize)}
            </p>
          </div>
          <button
            onClick={handleDownload}
            className={`p-2 rounded-lg transition-colors ${
              isOwn 
                ? 'hover:bg-white hover:bg-opacity-20 text-white' 
                : 'hover:bg-gray-200 text-gray-600'
            }`}
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  // Render based on message type
  if (message.messageType === 'image') {
    return renderImageMessage();
  } else if (message.messageType === 'video') {
    return renderVideoMessage();
  } else if (message.messageType === 'audio') {
    return renderAudioMessage();
  } else {
    return renderDocumentMessage();
  }
};

export default FileMessage;
