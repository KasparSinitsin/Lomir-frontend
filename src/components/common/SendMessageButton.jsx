import React from 'react';
import { MessageCircle } from 'lucide-react';
import Button from './Button';
import { messageService } from '../../services/messageService';

const SendMessageButton = ({ 
  recipientId, 
  recipientName, 
  variant = "primary", 
  size = "sm",
  className = "",
  children
}) => {
  const handleSendMessage = async () => {
    if (!recipientId) {
      console.error('Recipient ID is required');
      return;
    }

    try {
      // Create conversation or get existing one
      await messageService.startConversation(recipientId, '');
      
      // Open chat in new tab with direct message type
      const chatUrl = `${window.location.origin}/chat/${recipientId}?type=direct`;
      window.open(chatUrl, '_blank', 'noopener,noreferrer');
      
    } catch (error) {
      console.error('Error starting conversation:', error);
      // Fallback: still open chat page even if API call fails
      const chatUrl = `${window.location.origin}/chat/${recipientId}?type=direct`;
      window.open(chatUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSendMessage}
      className={className}
      icon={<MessageCircle size={16} />}
    >
      {children || 'Send Message'}
    </Button>
  );
};

export default SendMessageButton;