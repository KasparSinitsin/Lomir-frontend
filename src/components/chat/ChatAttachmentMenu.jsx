import React, { useState, useRef, useEffect } from "react";
import { Plus, Smile, Image, X } from "lucide-react";
import ChatImageUploader from "./ChatImageUploader";

const ChatAttachmentMenu = ({
  onEmojiSelect,
  onImageSelect,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showImageUploader, setShowImageUploader] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowEmojiPicker(false);
        setShowImageUploader(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const emojis = [
    "😊",
    "👍",
    "❤️",
    "🎉",
    "👋",
    "😂",
    "🤔",
    "🙏",
    "🔥",
    "✨",
    "😍",
    "🤗",
    "😎",
    "🙌",
    "💪",
    "🎯",
    "✅",
    "💡",
    "📌",
    "🚀",
  ];

  const handleEmojiClick = (emoji) => {
    onEmojiSelect(emoji);
    setShowEmojiPicker(false);
    setIsOpen(false);
  };

  const handleOptionClick = (option) => {
    if (option === "emoji") {
      setShowEmojiPicker(true);
      setShowImageUploader(false);
    } else if (option === "image") {
      setShowImageUploader(true);
      setShowEmojiPicker(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Main Plus Button */}
      <button
        type="button"
        className={`btn btn-ghost btn-circle ${isOpen ? "bg-base-200" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        aria-label="Add attachment"
      >
        {isOpen ? <X size={18} /> : <Plus size={18} />}
      </button>

      {/* Options Menu */}
      {isOpen && !showEmojiPicker && !showImageUploader && (
        <div className="absolute bottom-full mb-2 left-0 bg-base-100 rounded-lg shadow-lg border border-base-300 p-2 min-w-[140px] z-50">
          <button
            type="button"
            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-base-200 rounded-lg transition-colors text-left"
            onClick={() => handleOptionClick("emoji")}
          >
            <Smile size={18} className="text-yellow-500" />
            <span className="text-sm">Emoji</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-base-200 rounded-lg transition-colors text-left"
            onClick={() => handleOptionClick("image")}
          >
            <Image size={18} className="text-blue-500" />
            <span className="text-sm">Image</span>
          </button>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-full mb-2 left-0 p-3 bg-base-100 rounded-lg shadow-lg border border-base-300 z-50 w-64">
          <div className="grid grid-cols-5 gap-2">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiClick(emoji)}
                className="w-10 h-10 text-xl hover:bg-base-200 rounded flex items-center justify-center transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Image Upload Panel */}
      {showImageUploader && (
        <ChatImageUploader
          onImageSelect={(file, previewUrl) => {
            onImageSelect(file, previewUrl);
            setShowImageUploader(false);
            setIsOpen(false);
          }}
          onClose={() => {
            setShowImageUploader(false);
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default ChatAttachmentMenu;
