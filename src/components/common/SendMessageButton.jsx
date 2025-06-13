import React from "react";
import { MessageCircle } from "lucide-react";
import Button from "./Button";
import { messageService } from "../../services/messageService";

const SendMessageButton = ({
  recipientId,
  recipientName,
  variant = "primary",
  size = "sm",
  className = "",
  children,
  type = "direct", // "direct" or "team"
  teamId = null,
  teamName = null,
}) => {
  const handleSendMessage = async () => {
    if (type === "team" && teamId) {
      // Handle team message
      const chatUrl = `${window.location.origin}/chat/${teamId}?type=team`;
      window.open(chatUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (type === "direct" && recipientId) {
      // Existing direct message logic
      try {
        await messageService.startConversation(recipientId, "");
        const chatUrl = `${window.location.origin}/chat/${recipientId}?type=direct`;
        window.open(chatUrl, "_blank", "noopener,noreferrer");
      } catch (error) {
        console.error("Error starting conversation:", error);
        const chatUrl = `${window.location.origin}/chat/${recipientId}?type=direct`;
        window.open(chatUrl, "_blank", "noopener,noreferrer");
      }
      return;
    }

    console.error("Missing required props for message type:", type);
  };

  const getDefaultText = () => {
    if (type === "team") return "Send Team Message";
    return "Send Message";
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSendMessage}
      className={className}
      icon={<MessageCircle size={16} />}
    >
      {children || getDefaultText()}
    </Button>
  );
};

export default SendMessageButton;
