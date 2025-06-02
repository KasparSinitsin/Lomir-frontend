import React, { useState, useEffect, useRef } from "react";
import { Send, Smile } from "lucide-react";

const MessageInput = ({ onSendMessage, onTyping }) => {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);

  // Handle typing indicator
useEffect(() => {
  if (message.trim() && !isTypingRef.current) {
    // User started typing
    console.log("User started typing - calling onTyping(true)");
    onTyping(true);
    isTypingRef.current = true;
  } else if (!message.trim() && isTypingRef.current) {
    // User stopped typing (cleared input)
    console.log("User stopped typing (cleared input) - calling onTyping(false)");
    onTyping(false);
    isTypingRef.current = false;
  }

  // Clear existing timer
  if (typingTimerRef.current) {
    clearTimeout(typingTimerRef.current);
  }

  // Set a new timer to stop the typing indicator after 3 seconds of inactivity
  if (message.trim()) {
    typingTimerRef.current = setTimeout(() => {
      console.log("Typing timeout - stopping typing indicator - calling onTyping(false)");
      onTyping(false);
      isTypingRef.current = false;
    }, 3000);
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

    console.log("Sending message and stopping typing indicator");
    onSendMessage(message);
    setMessage("");

    // Stop typing indicator immediately when sending
    onTyping(false);
    isTypingRef.current = false;

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

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
          maxLength={500}
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
