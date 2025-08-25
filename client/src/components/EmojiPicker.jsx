import { useState, useRef, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';

const CustomEmojiPicker = ({ onEmojiClick, isOpen, onClose, anchorRef }) => {
  const pickerRef = useRef(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isOpen &&
        pickerRef.current &&
        !pickerRef.current.contains(event.target) &&
        anchorRef.current &&
        !anchorRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, anchorRef]);

  // Close picker on escape key
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full right-0 mb-2 z-50 shadow-lg rounded-lg overflow-hidden"
      style={{
        transform: 'translateX(0)',
      }}
    >
      <EmojiPicker
        onEmojiClick={onEmojiClick}
        width={350}
        height={400}
        theme="light"
        searchDisabled={false}
        skinTonesDisabled={false}
        previewConfig={{
          showPreview: false
        }}
        lazyLoadEmojis={true}
        emojiStyle="native"
      />
    </div>
  );
};

export default CustomEmojiPicker;
