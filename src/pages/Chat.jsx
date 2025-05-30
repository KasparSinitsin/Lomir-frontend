import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageContainer from "../components/layout/PageContainer";
import ConversationList from "../components/chat/ConversationList";
import MessageDisplay from "../components/chat/MessageDisplay";
import MessageInput from "../components/chat/MessageInput";
import { useAuth } from "../contexts/AuthContext";
import { messageService } from "../services/messageService";
import socketService from "../services/socketService";
import Alert from "../components/common/Alert";

const Chat = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});

  const typingTimeoutRef = useRef(null);

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const response = await messageService.getConversations();
        setConversations(response.data || []);

        // If there are conversations but none is selected, select the first one
        if (response.data?.length > 0 && !conversationId) {
          navigate(`/chat/${response.data[0].id}`);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching conversations:", err);
        setError("Failed to load conversations. Please try again.");
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchConversations();
    }
  }, [isAuthenticated, conversationId, navigate]);

  // Fetch messages when conversation changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!conversationId) return;

      try {
        setLoading(true);

        // Get type from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get("type") || "direct";

        const conversationDetails = await messageService.getConversationById(
          conversationId,
          type
        );
        setActiveConversation(conversationDetails.data);

        const messagesResponse = await messageService.getMessages(
          conversationId,
          type
        );
        setMessages(messagesResponse.data || []);

        setLoading(false);

        // Join the conversation room
        socketService.joinConversation(conversationId);

        // Mark messages as read
        socketService.markMessagesAsRead(conversationId);
      } catch (err) {
        console.error("Error fetching messages:", err);
        setError("Failed to load messages. Please try again.");
        setLoading(false);
      }
    };

    if (isAuthenticated && conversationId) {
      fetchMessages();

      // When leaving, leave the conversation room
      return () => {
        if (conversationId) {
          socketService.leaveConversation(conversationId);
        }
      };
    }
  }, [isAuthenticated, conversationId]);

  // Set up WebSocket event listeners
  useEffect(() => {
    const socket = socketService.getSocket();

    if (!socket || !isAuthenticated) return;

    // Handle online users
    const handleOnlineUsers = (users) => {
      setOnlineUsers(users);
    };

    // Handle new messages
    const handleNewMessage = (message) => {
      // Add message to state if it's for the current conversation
      if (message.conversationId === conversationId) {
        setMessages((prev) => [...prev, message]);

        // Mark as read if the user is viewing this conversation
        socketService.markMessagesAsRead(message.conversationId);
      }

      // Update conversation list
      setConversations((prev) => {
        // Find and update the conversation
        const updatedList = prev.map((conv) => {
          if (conv.id === message.conversationId) {
            return {
              ...conv,
              lastMessage: message.content,
              updatedAt: message.createdAt,
            };
          }
          return conv;
        });

        // Sort by updatedAt (newest first)
        return updatedList.sort(
          (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
        );
      });
    };

    // Handle typing indicators
    const handleTypingUpdate = (data) => {
      if (data.conversationId === conversationId) {
        setTypingUsers((prev) => ({
          ...prev,
          [data.userId]: data.isTyping ? data.username : null,
        }));
      }
    };

    // Handle message status updates
    const handleMessageStatus = (data) => {
      if (data.conversationId === conversationId) {
        // Update read status for messages
        setMessages((prev) =>
          prev.map((msg) => ({
            ...msg,
            readAt:
              msg.readAt || (msg.senderId !== user.id ? data.readAt : null),
          }))
        );
      }
    };

    // Handle conversation updates
    const handleConversationUpdate = (data) => {
      setConversations((prev) => {
        // Find the conversation
        const conversationIndex = prev.findIndex((c) => c.id === data.id);

        if (conversationIndex === -1) {
          // If conversation not found, fetch all conversations again
          messageService
            .getConversations()
            .then((response) => setConversations(response.data || []))
            .catch((err) =>
              console.error("Error refreshing conversations:", err)
            );
          return prev;
        }

        // Update the conversation
        const updatedList = [...prev];
        updatedList[conversationIndex] = {
          ...updatedList[conversationIndex],
          lastMessage: data.lastMessage,
          updatedAt: data.updatedAt,
        };

        // Sort by updatedAt (newest first)
        return updatedList.sort(
          (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
        );
      });
    };

    // Subscribe to events
    socket.on("users:online", handleOnlineUsers);
    socket.on("message:received", handleNewMessage);
    socket.on("typing:update", handleTypingUpdate);
    socket.on("message:status", handleMessageStatus);
    socket.on("conversation:updated", handleConversationUpdate);

    // Cleanup
    return () => {
      socket.off("users:online", handleOnlineUsers);
      socket.off("message:received", handleNewMessage);
      socket.off("typing:update", handleTypingUpdate);
      socket.off("message:status", handleMessageStatus);
      socket.off("conversation:updated", handleConversationUpdate);
    };
  }, [isAuthenticated, conversationId, user]);

  const handleSendMessage = (content) => {
    if (!content.trim() || !conversationId) return;

    // Send message via WebSocket
    socketService.sendMessage(conversationId, content);

    // Clear typing indicator
    clearTimeout(typingTimeoutRef.current);
    socketService.sendTypingStop(conversationId);
  };

  const handleTyping = (isTyping) => {
    if (!conversationId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      // Send typing indicator
      socketService.sendTypingStart(conversationId);

      // Set timeout to stop typing indicator after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        socketService.sendTypingStop(conversationId);
      }, 3000);
    } else {
      // Send stop typing
      socketService.sendTypingStop(conversationId);
    }
  };

  const selectConversation = (id) => {
    // Find the conversation to get its type
    const conversation = conversations.find((c) => c.id === id);
    const type = conversation?.type || "direct";

    // Navigate with type parameter
    navigate(`/chat/${id}?type=${type}`);
  };

  // Get active typing users for current conversation
  const activeTypingUsers = Object.entries(typingUsers)
    .filter(([userId, username]) => userId !== user?.id && username)
    .map(([_, username]) => username);

  return (
    <PageContainer title="Messages" className="p-0 overflow-hidden">
      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} />
      )}

      <div className="flex h-[calc(100vh-200px)] bg-base-100 rounded-xl overflow-hidden">
        {/* Conversation List - Left Sidebar */}
        <div className="w-1/3 border-r border-base-200 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            activeConversationId={conversationId}
            onSelectConversation={selectConversation}
            loading={loading}
            onlineUsers={onlineUsers}
          />
        </div>

        {/* Message Display - Right Side */}
        <div className="w-2/3 flex flex-col">
          {conversationId ? (
            <>
              <div className="flex-grow overflow-y-auto p-4">
                <MessageDisplay
                  messages={messages}
                  currentUserId={user?.id}
                  conversationPartner={activeConversation?.partner}
                  loading={loading}
                  typingUsers={activeTypingUsers}
                />
              </div>
              <div className="p-4 border-t border-base-200">
                <MessageInput
                  onSendMessage={handleSendMessage}
                  onTyping={handleTyping}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-base-content/70">
                Select a conversation to start chatting
              </p>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default Chat;
