import React, { useState, useEffect, useRef } from "react";
import {
  AlertTriangle,
  CircleX,
  Crown,
  FileText,
  LogOut,
  Reply,
  Send,
  Shield,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  UserSearch,
  X,
} from "lucide-react";
import ChatAttachmentMenu from "./ChatAttachmentMenu";
import MentionDropdown from "./MentionDropdown";
import { getEventPreview } from "../../utils/eventPreview";
import { getFileExpirationStatus } from "../../utils/fileExpiration";

const EVENT_PREVIEW_ICONS = {
  AlertTriangle,
  CircleX,
  Crown,
  FileText,
  LogOut,
  Shield,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  UserSearch,
};

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

const MENTION_RE = /@\[([^\]]+)\]\([^)]+\)/g;
const renderReplyText = (text) => {
  const parts = [];
  let last = 0;
  let m;
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <span key={m.index} className="font-medium text-primary">
        @{m[1]}
      </span>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
};

const MessageInput = ({
  onSendMessage,
  onSendImage,
  onSendFile,
  onTyping,
  disabled = false,
  participants = [],
  replyingTo = null,
  onClearReply,
}) => {
  const [message, setMessage] = useState("");
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionStart, setMentionStart] = useState(null);
  const [mentionMap, setMentionMap] = useState({});
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);
  const inputRef = useRef(null);
  const replyEventPreview = replyingTo?.content
    ? getEventPreview(replyingTo.content)
    : null;
  const ReplyEventIcon = replyEventPreview
    ? EVENT_PREVIEW_ICONS[replyEventPreview.icon]
    : null;
  const replyImageUrl = replyingTo?.imageUrl || replyingTo?.image_url;
  const replyFileUrl = replyingTo?.fileUrl || replyingTo?.file_url;
  const replyFileName = replyingTo?.fileName || replyingTo?.file_name;
  const replyExpirationStatus =
    replyImageUrl || replyFileUrl || replyFileName
      ? getFileExpirationStatus(replyingTo)
      : { status: "none" };

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

      {replyingTo && (
        <div className="flex items-center gap-2 px-3 py-2 mb-1 bg-base-200 rounded-lg animate-in slide-in-from-bottom-2">
          <Reply size={14} className="text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary truncate">
              Replying to{" "}
              {replyingTo.senderFirstName ||
                replyingTo.senderUsername ||
                "message"}
            </p>
            {replyImageUrl ? (
              <div className="mt-1 flex min-w-0 items-center gap-2">
                <img
                  src={replyImageUrl}
                  alt="Reply preview"
                  className="h-10 w-10 shrink-0 rounded-md object-cover"
                />
                <div className="min-w-0 flex-1">
                  {replyingTo.content && (
                    <p className="text-xs text-base-content/60 truncate">
                      {renderReplyText(replyingTo.content.slice(0, 100))}
                    </p>
                  )}
                  {replyExpirationStatus.status !== "none" &&
                  replyExpirationStatus.daysLeft !== null ? (
                    <p
                      className={`text-xs truncate ${
                        replyExpirationStatus.status === "expiring-soon"
                          ? "text-warning"
                          : "text-base-content/60"
                      }`}
                    >
                      {replyExpirationStatus.message}
                    </p>
                  ) : (
                    !replyingTo.content && (
                      <p className="text-xs text-base-content/60 truncate">
                        Image
                      </p>
                    )
                  )}
                </div>
              </div>
            ) : replyEventPreview && ReplyEventIcon ? (
              <p
                className="flex min-w-0 items-center gap-1 text-xs font-medium truncate"
                style={{ color: replyEventPreview.color }}
              >
                <ReplyEventIcon size={13} className="shrink-0" />
                <span className="truncate">{replyEventPreview.text}</span>
              </p>
            ) : (
              <p className="text-xs text-base-content/60 truncate">
                {replyingTo.content
                  ? renderReplyText(replyingTo.content.slice(0, 100))
                  : "Image / File"}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClearReply}
            className="btn btn-ghost btn-xs btn-circle shrink-0"
            aria-label="Cancel reply"
          >
            <X size={14} />
          </button>
        </div>
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
