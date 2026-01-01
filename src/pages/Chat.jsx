import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageContainer from "../components/layout/PageContainer";
import ConversationList from "../components/chat/ConversationList";
import MessageDisplay from "../components/chat/MessageDisplay";
import MessageInput from "../components/chat/MessageInput";
import { useAuth } from "../contexts/AuthContext";
import { messageService } from "../services/messageService";
import socketService from "../services/socketService";
import { userService } from "../services/userService";
import { teamService } from "../services/teamService";
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
  const [highlightMessageIds, setHighlightMessageIds] = useState([]);

  const typingTimeoutRef = useRef(null);

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const response = await messageService.getConversations();
        let conversationsList = response.data || [];

        // If we have a conversationId from URL but it's not in the conversations list,
        // create a virtual conversation entry
        if (conversationId && conversationsList.length >= 0) {
          const conversationExists = conversationsList.some(
            (conv) => String(conv.id) === String(conversationId)
          );

          if (!conversationExists) {
            const urlParams = new URLSearchParams(window.location.search);
            const type = urlParams.get("type") || "direct";

            if (type === "direct") {
              console.log("Creating virtual conversation for new contact...");
              try {
                // Get the user details for the virtual conversation
                const userResponse = await userService.getUserById(
                  conversationId
                );
                console.log("User details fetched:", userResponse.data);

                const userData = userResponse.data;

                // Create a virtual conversation entry
                const virtualConversation = {
                  id: parseInt(conversationId),
                  type: "direct",
                  partner: {
                    id: userData.id,
                    username: userData.username,
                    firstName: userData.firstName || userData.first_name,
                    lastName: userData.lastName || userData.last_name,
                    avatarUrl: userData.avatarUrl || userData.avatar_url,
                  },
                  lastMessage: "Start your conversation...",
                  updatedAt: new Date().toISOString(),
                  isVirtual: true,
                  unreadCount: 0,
                };

                // Add to the beginning of the conversations list
                conversationsList = [virtualConversation, ...conversationsList];
                console.log(
                  "Virtual conversation created:",
                  virtualConversation
                );
              } catch (error) {
                console.error("Error creating virtual conversation:", error);
              }
            }
          }
        }

        setConversations(conversationsList);

        // If there are conversations but none is selected, select the first one
        if (conversationsList.length > 0 && !conversationId) {
          const firstConversationType = conversationsList[0].type || "direct";
          navigate(
            `/chat/${conversationsList[0].id}?type=${firstConversationType}`
          );
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

        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get("type") || "direct";

        console.log("=== CHAT DEBUG ===");
        console.log("Conversation ID:", conversationId);
        console.log("Conversation Type:", type);

        let conversationDetails;
        try {
          conversationDetails = await messageService.getConversationById(
            conversationId,
            type
          );

          console.log("Initial conversation details:", conversationDetails);

          // If it's a team conversation, fetch detailed team member information
          if (type === "team" && conversationDetails?.data) {
            try {
              console.log("Fetching team details for team ID:", conversationId);
              const teamDetails = await teamService.getTeamById(conversationId);
              console.log("Team details fetched:", teamDetails);

              if (teamDetails?.data?.members) {
                console.log("Team members found:", teamDetails.data.members);
                conversationDetails.data.team = {
                  ...conversationDetails.data.team,
                  members: teamDetails.data.members,
                };
                console.log(
                  "Updated conversation with team members:",
                  conversationDetails.data
                );
              } else {
                console.log("No team members in team details response");
              }
            } catch (teamError) {
              console.error("Error fetching team member details:", teamError);
            }
          }

          setActiveConversation(conversationDetails.data);
          console.log("Set active conversation:", conversationDetails.data);

          // Ensure team conversation appears in conversation list
          if (type === "team" && conversationDetails.data) {
            setConversations((prev) => {
              const existingConversation = prev.find(
                (conv) =>
                  String(conv.id) === String(conversationId) &&
                  conv.type === "team"
              );

              if (!existingConversation) {
                const newTeamConversation = {
                  id: parseInt(conversationId),
                  type: "team",
                  team: {
                    id: conversationDetails.data.team.id,
                    name: conversationDetails.data.team.name,
                    avatarUrl: conversationDetails.data.team.avatarUrl,
                  },
                  lastMessage: "Start your team conversation...",
                  updatedAt: new Date().toISOString(),
                  isVirtual: true,
                  unreadCount: 0,
                };

                return [newTeamConversation, ...prev];
              }

              return prev;
            });
          }
        } catch (error) {
          console.log("Conversation doesn't exist yet, creating it...");

          if (type === "team" && conversationDetails?.data) {
            try {
              const teamDetails = await teamService.getTeamById(conversationId);
              if (teamDetails?.data?.members) {
                conversationDetails.data.team = {
                  ...conversationDetails.data.team,
                  members: teamDetails.data.members,
                };
              }
            } catch (error) {
              console.log("Could not fetch team member details:", error);
            }
          }

          if (type === "direct") {
            try {
              await messageService.startConversation(
                parseInt(conversationId),
                ""
              );

              conversationDetails = await messageService.getConversationById(
                conversationId,
                type
              );
              setActiveConversation(conversationDetails.data);

              const conversationsResponse =
                await messageService.getConversations();
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
          const fetchedMessages = messagesResponse.data || [];
          setMessages(fetchedMessages);
          console.log("Messages fetched:", fetchedMessages);

          // Identify unread messages (not sent by current user, no readAt)
          // These will be highlighted temporarily
          const unreadIds = fetchedMessages
            .filter((msg) => msg.senderId !== user?.id && !msg.readAt)
            .map((msg) => msg.id);

          if (unreadIds.length > 0) {
            setHighlightMessageIds(unreadIds);
            // Clear highlights after 3 seconds
            setTimeout(() => {
              setHighlightMessageIds([]);
            }, 3000);
          }
        } catch (messagesError) {
          console.log("No messages yet, starting with empty conversation");
          setMessages([]);
        }

        setLoading(false);

        // Wait for socket to be connected before joining
        const socket = socketService.getSocket();
        if (socket && socket.connected) {
          socketService.joinConversation(conversationId, type);
          socketService.markMessagesAsRead(conversationId, type);
        } else {
          console.log("Socket not connected, waiting for connection...");
          const checkConnection = setInterval(() => {
            const socket = socketService.getSocket();
            if (socket && socket.connected) {
              const urlParams = new URLSearchParams(window.location.search);
              const type = urlParams.get("type") || "direct";
              socketService.joinConversation(conversationId, type);
              socketService.markMessagesAsRead(conversationId, type);
              clearInterval(checkConnection);
            }
          }, 100);

          setTimeout(() => clearInterval(checkConnection), 5000);
        }
      } catch (err) {
        console.error("Error fetching messages:", err);
        setError("Failed to load messages. Please try again.");
        setLoading(false);
      }
    };

    if (isAuthenticated && conversationId) {
      fetchMessages();

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

      const messageConvId = String(message.conversationId);
      const currentConvId = String(conversationId);

      if (messageConvId === currentConvId) {
        setMessages((prev) => {
          // If this is our own message, replace the optimistic version
          if (message.senderId === user.id) {
            const withoutOptimistic = prev.filter(
              (msg) => !msg.isOptimistic || msg.senderId !== user.id
            );

            const messageExists = withoutOptimistic.some(
              (msg) => msg.id === message.id
            );
            if (messageExists) {
              return prev;
            }

            const newMessage = {
              id: message.id,
              senderId: message.senderId,
              content: message.content,
              createdAt: message.createdAt,
              senderUsername: message.senderUsername,
              type: message.type,
            };

            return [...withoutOptimistic, newMessage];
          } else {
            const messageExists = prev.some((msg) => msg.id === message.id);
            if (messageExists) {
              return prev;
            }

            const newMessage = {
              id: message.id,
              senderId: message.senderId,
              content: message.content,
              createdAt: message.createdAt,
              senderUsername: message.senderUsername,
              type: message.type,
            };

            return [...prev, newMessage];
          }
        });

        // Mark as read if viewing and didn't send it
        if (message.senderId !== user.id) {
          const urlParams = new URLSearchParams(window.location.search);
          const type = urlParams.get("type") || "direct";
          socketService.markMessagesAsRead(currentConvId, type);
        }
      }

      // Update conversation list
      setConversations((prev) => {
        const updatedList = prev.map((conv) => {
          if (String(conv.id) === messageConvId) {
            return {
              ...conv,
              lastMessage: message.content,
              updatedAt: message.createdAt,
              isVirtual: false,
              // Increment unread count if not current conversation
              unreadCount:
                messageConvId !== currentConvId && message.senderId !== user.id
                  ? (conv.unreadCount || 0) + 1
                  : conv.unreadCount,
            };
          }
          return conv;
        });

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

    // Create optimistic message (show immediately)
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      senderId: user.id,
      content: content,
      createdAt: new Date().toISOString(),
      senderUsername: user.username,
      type: type,
      isOptimistic: true,
    };

    // Add optimistic message to UI immediately
    setMessages((prev) => [...prev, optimisticMessage]);

    // Send message via WebSocket
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

    // Reset unread count for selected conversation
    setConversations((prev) =>
      prev.map((conv) => (conv.id === id ? { ...conv, unreadCount: 0 } : conv))
    );

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
                  teamData={activeConversation?.team}
                  loading={loading}
                  typingUsers={activeTypingUsers}
                  conversationType={activeConversation?.type || "direct"}
                  teamMembers={activeConversation?.team?.members || []}
                  highlightMessageIds={highlightMessageIds}
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
