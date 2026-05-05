import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import socketService from '../../services/socketService';
import { messageService } from '../../services/messageService';
import { useAuth } from '../../contexts/AuthContext';
import {
  getMessageConversationTarget,
  getMessagePreviewText,
  isMessageForCurrentChatPath,
  isOwnMessage,
} from '../../utils/messageNotificationUtils';

const MessageNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef({
    pathname: location.pathname,
    search: location.search,
  });
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    locationRef.current = {
      pathname: location.pathname,
      search: location.search,
    };
  }, [location.pathname, location.search]);
  
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Fetch initial unread count
    const fetchUnreadCount = async () => {
      try {
        const response = await messageService.getUnreadCount();
        const count = response.data?.count ?? response.count ?? 0;
        if (count > 0) {
          setNotifications([{ 
            id: 'initial', 
            text: `You have ${count} unread messages` 
          }]);
        }
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };
    
    fetchUnreadCount();
    
    let detachMessageListener = null;

    const attachMessageListener = (socket) => {
      if (!socket) return;

      if (detachMessageListener) {
        detachMessageListener();
      }

      const handleNewMessage = (message) => {
        if (isOwnMessage(message, user?.id)) return;

        const isInConversation = isMessageForCurrentChatPath(
          message,
          locationRef.current.pathname,
          locationRef.current.search,
          user?.id,
        );
        
        if (!isInConversation) {
          const target = getMessageConversationTarget(message, user?.id);
          setNotifications(prev => [
            ...prev, 
            {
              id: message.id || `${target.type}-${target.conversationId}-${Date.now()}`,
              conversationId: target.conversationId,
              conversationType: target.type,
              senderId: message.senderId || message.sender_id,
              senderName: message.senderUsername,
              text: getMessagePreviewText(message),
              time: new Date()
            }
          ]);
        }
      };
      
      socket.on('message:received', handleNewMessage);

      detachMessageListener = () => {
        socket.off('message:received', handleNewMessage);
      };
    };

    const unsubscribeSocketReady = socketService.onSocketReady(attachMessageListener);
    
    return () => {
      unsubscribeSocketReady();
      if (detachMessageListener) {
        detachMessageListener();
      }
    };
  }, [isAuthenticated, user?.id]);
  
  // Remove notification when clicked and navigate to conversation
  const handleNotificationClick = (notification) => {
    setNotifications(prev => 
      prev.filter(n => n.id !== notification.id)
    );
    
    if (notification.conversationId) {
      navigate(`/chat/${notification.conversationId}?type=${notification.conversationType || 'direct'}`);
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
