import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socketService from '../../services/socketService';
import { messageService } from '../../services/messageService';
import { useAuth } from '../../contexts/AuthContext';

const MessageNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Fetch initial unread count
    const fetchUnreadCount = async () => {
      try {
        const response = await messageService.getUnreadCount();
        if (response.data.count > 0) {
          setNotifications([{ 
            id: 'initial', 
            text: `You have ${response.data.count} unread messages` 
          }]);
        }
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };
    
    fetchUnreadCount();
    
    // Set up socket listener for new messages
    const socket = socketService.getSocket();
    
    if (socket) {
      const handleNewMessage = (message) => {
        // Only add notification if we're not already in that conversation
        const currentPath = window.location.pathname;
        const isInConversation = currentPath === `/chat/${message.conversationId}`;
        
        if (!isInConversation) {
          setNotifications(prev => [
            ...prev, 
            {
              id: message.id,
              conversationId: message.conversationId,
              senderId: message.senderId,
              senderName: message.senderUsername,
              text: message.content,
              time: new Date()
            }
          ]);
        }
      };
      
      socket.on('message:received', handleNewMessage);
      
      return () => {
        socket.off('message:received', handleNewMessage);
      };
    }
  }, [isAuthenticated]);
  
  // Remove notification when clicked and navigate to conversation
  const handleNotificationClick = (notification) => {
    setNotifications(prev => 
      prev.filter(n => n.id !== notification.id)
    );
    
    if (notification.conversationId) {
      navigate(`/chat/${notification.conversationId}`);
    } else {
      navigate('/chat');
    }
  };
  
  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (notifications.length > 0) {
      const timeout = setTimeout(() => {
        setNotifications(prev => {
          if (prev.length > 0) {
            const [_, ...rest] = prev;
            return rest;
          }
          return prev;
        });
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [notifications]);
  
  if (notifications.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {notifications.map(notification => (
        <div 
          key={notification.id}
          className="bg-primary text-primary-content rounded-lg shadow-lg p-4 max-w-xs animate-slide-in cursor-pointer"
          onClick={() => handleNotificationClick(notification)}
        >
          <h4 className="font-medium">New Message</h4>
          <p className="text-sm truncate">{notification.text}</p>
          {notification.senderName && (
            <p className="text-xs mt-1">From: {notification.senderName}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default MessageNotifications;