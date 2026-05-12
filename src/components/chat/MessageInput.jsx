import React, { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import ChatAttachmentMenu from "./ChatAttachmentMenu";
import MentionDropdown from "./MentionDropdown";

// Replace @Name occurrences tracked in mentionMap with @[Name](userId) tokens
const tokenizeMentions = (text, mentionMap) => {
  // Sort by name length descending to avoid partial matches on shorter names first
  const entries = Object.entries(mentionMap).sort((a, b) => b[0].length - a[0].length);
  let result = text;
  for (const [name, userId] of entries) {
    result = result.split(`@${name}`).join(`@[${name}](${userId})`);
  }
  return result;
};

const MessageInput = ({
  onSendMessage,
  onSendImage,
  onSendFile,
  onTyping,
  disabled = false,
  participants = [],
}) => {
  const [message, setMessage] = useState("");
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionStart, setMentionStart] = useState(null);
  const [mentionMap, setMentionMap] = useState({});
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);
  const inputRef = useRef(null);

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

  const detectMention = (value, cursorPos) => {
    const beforeCursor = value.slice(0, cursorPos);
    // Match @ followed by anything that isn't another @
    const match = beforeCursor.match(/@([^@]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionStart(match.index);
    } else {
      setMentionQuery(null);
      setMentionStart(null);
    }
  };

  const handleChange = (e) => {
    setMessage(e.target.value);
    detectMention(e.target.value, e.target.selectionStart);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape" && mentionQuery !== null) {
      setMentionQuery(null);
      setMentionStart(null);
    }
  };

  const handleMentionSelect = (participant) => {
    const fullName = `${participant.firstName || ""} ${participant.lastName || ""}`.trim();
    const cursorPos = inputRef.current?.selectionStart ?? message.length;
    const before = message.slice(0, mentionStart);
    const after = message.slice(cursorPos);
    const newMessage = `${before}@${fullName} ${after}`;

    setMessage(newMessage);
    setMentionMap((prev) => ({ ...prev, [fullName]: participant.id }));
    setMentionQuery(null);
    setMentionStart(null);

    setTimeout(() => {
      if (inputRef.current) {
        const newPos = before.length + fullName.length + 2; // @ + name + space
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get("type") || "direct";

    onSendMessage(tokenizeMentions(message, mentionMap));
    setMessage("");
    setMentionMap({});
    setMentionQuery(null);
    setMentionStart(null);

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
      {mentionQuery !== null && participants.length > 0 && (
        <MentionDropdown
          participants={participants}
          query={mentionQuery}
          onSelect={handleMentionSelect}
        />
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        {/* Attachment Menu */}
        <ChatAttachmentMenu
          onEmojiSelect={handleEmojiSelect}
          onImageSelect={handleImageSelect}
          onFileSelect={handleFileSelect}
          disabled={disabled}
        />

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
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
