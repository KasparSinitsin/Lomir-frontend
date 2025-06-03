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

      // If we have a conversationId but it's not in the conversations list,
      // and we haven't found it yet, try to create it
      if (conversationId && response.data?.length >= 0) {
        const conversationExists = response.data.some(conv => String(conv.id) === String(conversationId));
        
        if (!conversationExists) {
          const urlParams = new URLSearchParams(window.location.search);
          const type = urlParams.get("type") || "direct";
          
          if (type === "direct") {
            console.log('Conversation not found in list, creating new conversation...');
            try {
              await messageService.startConversation(parseInt(conversationId), '');
              
              // Refresh conversations after creating
              const refreshedResponse = await messageService.getConversations();
              setConversations(refreshedResponse.data || []);
              
            } catch (error) {
              console.error('Error creating conversation for direct link:', error);
            }
          }
        }
      }

      // If there are conversations but none is selected, select the first one
      // (but only if we don't already have a conversationId from the URL)
      if (response.data?.length > 0 && !conversationId) {
        const firstConversationType = response.data[0].type || "direct";
        navigate(`/chat/${response.data[0].id}?type=${firstConversationType}`);
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

      // First, try to get conversation details
      let conversationDetails;
      try {
        conversationDetails = await messageService.getConversationById(
          conversationId,
          type
        );
        setActiveConversation(conversationDetails.data);
      } catch (error) {
        console.log("Conversation doesn't exist yet, creating it...");
        
        // If conversation doesn't exist and it's a direct message, create it
        if (type === "direct") {
          try {
            await messageService.startConversation(parseInt(conversationId), '');
            
            // Now try to get the conversation details again
            conversationDetails = await messageService.getConversationById(
              conversationId,
              type
            );
            setActiveConversation(conversationDetails.data);
            
            // Also refresh the conversations list to show the new conversation
            const conversationsResponse = await messageService.getConversations();
            setConversations(conversationsResponse.data || []);
            
          } catch (createError) {
            console.error("Failed to create conversation:", createError);
          }
        }
      }

      // Get messages for the conversation
      try {
        const messagesResponse = await messageService.getMessages(
          conversationId,
          type
        );
        setMessages(messagesResponse.data || []);
      } catch (messagesError) {
        console.log("No messages yet, starting with empty conversation");
        setMessages([]);
      }

      setLoading(false);

      // Join the conversation room
      socketService.joinConversation(conversationId, type);

      // Mark messages as read
      socketService.markMessagesAsRead(conversationId, type);
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
        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get("type") || "direct";
        socketService.leaveConversation(conversationId, type);
      }
    };
  }
}, [isAuthenticated, conversationId]);

  // Set up WebSocket event listeners
  useEffect(() => {
    const socket = socketService.getSocket();

    if (!socket || !isAuthenticated) {
      console.log("No socket or not authenticated");
      return;
    }

    console.log(
      "Setting up socket listeners for conversationId:",
      conversationId
    );

    // Remove any existing listeners first to prevent duplicates
    socket.off("users:online");
    socket.off("message:received");
    socket.off("typing:update");
    socket.off("message:status");
    socket.off("conversation:updated");

    // Handle online users
    const handleOnlineUsers = (users) => {
      setOnlineUsers(users);
    };

    // Handle new messages
    const handleNewMessage = (message) => {
      console.log("=== NEW MESSAGE RECEIVED ===");
      console.log("Message:", message);
      console.log("Current conversationId:", conversationId);
      console.log("Message conversationId:", message.conversationId);

      // Convert both to strings for comparison
      const messageConvId = String(message.conversationId);
      const currentConvId = String(conversationId);

      // Determine the type from the message or URL (fallback to 'direct')
      const messageType =
        message.type ||
        new URLSearchParams(window.location.search).get("type") ||
        "direct";
      const currentType =
        new URLSearchParams(window.location.search).get("type") || "direct";

      // Add message to state if it's for the current conversation
      if (messageConvId === currentConvId) {
        console.log("Adding message to current conversation");

        setMessages((prev) => {
          // Check if message already exists to prevent duplicates
          const messageExists = prev.some((msg) => msg.id === message.id);
          if (messageExists) {
            console.log("Message already exists, skipping duplicate");
            return prev;
          }

          const newMessage = {
            id: message.id,
            senderId: message.senderId,
            content: message.content,
            createdAt: message.createdAt,
            senderUsername: message.senderUsername,
            type: message.type, // Ensure type is included
          };

          console.log("Adding new message to state:", newMessage);
          return [...prev, newMessage];
        });

        // Mark as read if the user is viewing this conversation and didn't send it
        if (message.senderId !== user.id) {
          socketService.markMessagesAsRead(currentConvId, currentType);
        }
      } else {
        console.log(
          "Message not for current conversation, updating conversation list only"
        );
      }

      // Always update conversation list for new messages
      setConversations((prev) => {
        const updatedList = prev.map((conv) => {
          // Check if the conversation ID matches the message's conversation ID
          if (String(conv.id) === messageConvId) {
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
      console.log("=== TYPING UPDATE RECEIVED ===");
      console.log("Typing data:", data);
      console.log("Current conversationId:", conversationId);
      console.log("Data conversationId:", data.conversationId);
      console.log("Current user ID:", user?.id);
      console.log("Typing user ID:", data.userId);

      if (String(data.conversationId) === String(conversationId)) {
        console.log("✅ Typing update is for current conversation");
        setTypingUsers((prev) => {
          const updated = {
            ...prev,
            [data.userId]: data.isTyping ? data.username : null,
          };
          // Clean up null values
          Object.keys(updated).forEach((key) => {
            if (updated[key] === null) {
              delete updated[key];
            }
          });
          console.log("Updated typing users:", updated);
          return updated;
        });
      } else {
        console.log("❌ Typing update NOT for current conversation");
      }
    };

    // Handle message status updates
    const handleMessageStatus = (data) => {
      const currentType =
        new URLSearchParams(window.location.search).get("type") || "direct";
      if (String(data.conversationId) === String(conversationId)) {
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
      console.log("Conversation update:", data);
      setConversations((prev) => {
        const conversationIndex = prev.findIndex(
          (c) => String(c.id) === String(data.id)
        );

        if (conversationIndex === -1) {
          console.log("Conversation not found, refreshing all conversations");
          messageService
            .getConversations()
            .then((response) => setConversations(response.data || []))
            .catch((err) =>
              console.error("Error refreshing conversations:", err)
            );
          return prev;
        }

        const updatedList = [...prev];
        updatedList[conversationIndex] = {
          ...updatedList[conversationIndex],
          lastMessage: data.lastMessage,
          updatedAt: data.updatedAt,
        };

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

    // Cleanup function to remove listeners
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

    // Get type from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get("type") || "direct";

    // Send message via WebSocket with correct type
    socketService.sendMessage(conversationId, content, type);

    // Clear typing indicator
    clearTimeout(typingTimeoutRef.current);
    socketService.sendTypingStop(conversationId, type);
  };

  const handleTyping = (isTyping, type = "direct") => {
    if (!conversationId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      socketService.sendTypingStart(conversationId, type);
      typingTimeoutRef.current = setTimeout(() => {
        socketService.sendTypingStop(conversationId, type);
      }, 3000);
    } else {
      socketService.sendTypingStop(conversationId, type);
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
