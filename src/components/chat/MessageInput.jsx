import React, { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import ChatAttachmentMenu from "./ChatAttachmentMenu";

const MessageInput = ({
  onSendMessage,
  onSendImage,
  onSendFile,
  onTyping,
  disabled = false,
}) => {
  const [message, setMessage] = useState("");
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);

  // Handle typing indicator (existing logic)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get("type") || "direct";

    if (message.trim() && !isTypingRef.current) {
      onTyping(true, type);
      isTypingRef.current = true;
    } else if (!message.trim() && isTypingRef.current) {
      onTyping(false, type);
      isTypingRef.current = false;
    }

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    if (message.trim()) {
      typingTimerRef.current = setTimeout(() => {
        onTyping(false, type);
        isTypingRef.current = false;
      }, 3000);
    }

    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, [message, onTyping]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get("type") || "direct";

    onSendMessage(message);
    setMessage("");

    // Stop typing indicator
    onTyping(false, type);
    isTypingRef.current = false;

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
  };

  const handleEmojiSelect = (emoji) => {
    setMessage((prev) => prev + emoji);
  };

  const handleImageSelect = async (file, previewUrl) => {
    if (onSendImage) {
      await onSendImage(file, previewUrl);
    }
  };

  const handleFileSelect = async (file) => {
    if (onSendFile) {
      await onSendFile(file);
    }
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex items-center gap-1">
        {/* Attachment Menu */}
        <ChatAttachmentMenu
          onEmojiSelect={handleEmojiSelect}
          onImageSelect={handleImageSelect}
          onFileSelect={handleFileSelect}
          disabled={disabled}
        />

        {/* Text Input */}
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="input input-bordered flex-grow"
          placeholder="Type a message..."
          maxLength={500}
          disabled={disabled}
        />

        {/* Send Button */}
        <button
          type="submit"
          className="btn btn-primary btn-circle"
          disabled={!message.trim() || disabled}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
