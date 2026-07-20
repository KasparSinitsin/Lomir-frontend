import React from "react";
import { MessageCircle } from "lucide-react";
import Button from "./Button";

// Opens a team chat in a new tab. There used to be a "direct" mode here that
// called messageService.startConversation first, but its last caller was
// removed in 17adcde; direct chats are opened straight from UserDetailsModal,
// and Chat.jsx handles blocked partners on its own.
const SendMessageButton = ({
  teamId,
  variant = "primary",
  size = "sm",
  className = "",
  children,
}) => {
  const handleSendMessage = () => {
    if (!teamId) {
      console.error("SendMessageButton: teamId is required");
      return;
    }

    const chatUrl = `${window.location.origin}/chat/${teamId}?type=team`;
    window.open(chatUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSendMessage}
      className={className}
      icon={<MessageCircle size={16} />}
    >
      {children || "Send Team Message"}
    </Button>
  );
};

export default SendMessageButton;
