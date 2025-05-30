import React, { useState, useEffect, useRef } from "react";
import { Send, Smile } from "lucide-react";

const MessageInput = ({ onSendMessage, onTyping }) => {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const typingTimerRef = useRef(null);

  // Handle typing indicator
  useEffect(() => {
    if (message.trim()) {
      // User is typing
      onTyping(true);

      // Clear existing timer
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }

      // Set a new timer to stop the typing indicator after 3 seconds of inactivity
      typingTimerRef.current = setTimeout(() => {
        onTyping(false);
      }, 3000);
    } else {
      // Message is empty, stop typing indicator
      onTyping(false);
    }

    // Clean up on unmount
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, [message, onTyping]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    onSendMessage(message);
    setMessage("");
    onTyping(false);

    // Hide emoji picker after sending
    setShowEmojiPicker(false);
  };

  const handleEmojiClick = (emoji) => {
    setMessage((prev) => prev + emoji);
  };

  // Simple emoji picker (for a real app, you'd want to use a library)
  const emojis = ["😊", "👍", "❤️", "🎉", "👋", "😂", "🤔", "🙏", "🔥", "✨"];

  return (
    <div className="relative">
      {showEmojiPicker && (
        <div className="absolute bottom-full mb-2 p-2 bg-base-200 rounded-lg shadow-md">
          <div className="flex gap-2">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="text-xl hover:bg-base-300 p-1 rounded"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center">
        <button
          type="button"
          className="btn btn-ghost btn-circle mr-1"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        >
          <Smile size={18} />
        </button>

        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="input input-bordered flex-grow mr-2"
          placeholder="Type a message..."
        />

        <button
          type="submit"
          className="btn btn-primary btn-circle"
          disabled={!message.trim()}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
