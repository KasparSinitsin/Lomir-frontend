import React, { useState, useEffect, useRef, useCallback } from "react";
import { LogOut } from "lucide-react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
import { uploadToImageKit } from "../config/imagekit";

const getConversationPartnerId = (conversation) =>
  conversation?.partner?.id ??
  conversation?.partnerUser?.id ??
  conversation?.partnerId ??
  conversation?.partner_id ??
  null;

const isDirectConversationForPartner = (conversation, partnerId) =>
  conversation?.type === "direct" &&
  String(getConversationPartnerId(conversation)) === String(partnerId);

const dedupeConversations = (list) =>
  (list || []).filter((conv, index, self) => {
    if (conv.type === "direct") {
      return (
        index ===
        self.findIndex((candidate) =>
          isDirectConversationForPartner(
            candidate,
            getConversationPartnerId(conv),
          ),
        )
      );
    }

    return index === self.findIndex((candidate) => candidate.id === conv.id);
  });

const Chat = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [highlightMessageIds, setHighlightMessageIds] = useState([]);
  const [isTeamArchived, setIsTeamArchived] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [teamMembersRefreshSignal, setTeamMembersRefreshSignal] =
    useState(null);

  const typingTimeoutRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const pendingScrollAdjustmentRef = useRef(null);
  const conversationsRef = useRef([]);
  const activeConversationRef = useRef(null);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // ---- Message de-duplication (focus: ownership/system duplicates) ----
  const toMinuteBucket = (isoOrDate) => {
    try {
      const d = isoOrDate ? new Date(isoOrDate) : null;
      if (!d || Number.isNaN(d.getTime())) return "";
      return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
    } catch {
      return "";
    }
  };

  const buildMessageDedupeKey = (msg) => {
    const content = (msg?.content || "").trim();
    const minute = toMinuteBucket(msg?.createdAt);
    const senderId = msg?.senderId ?? "";

    // OWNERSHIP_TEAM (legacy emoji optional)
    let m = content.match(/^(?:👑\s*)?OWNERSHIP_TEAM:\s*(.+?)\s*\|\s*(.+)\s*$/);
    if (m) return `ownership_team|${m[1].trim()}|${m[2].trim()}|${minute}`;

    // OWNERSHIP_TRANSFERRED (legacy emoji optional)
    m = content.match(
      /^(?:👑\s*)?OWNERSHIP_TRANSFERRED:\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)\s*$/,
    );
    if (m)
      return `ownership_transferred|${m[1].trim()}|${m[2].trim()}|${m[3].trim()}|${minute}`;

    // Plain team chat sentence variant
    m = content.match(
      /^(.+?)\s+transferred\s+(?:team\s+)?ownership\s+to\s+(.+?)\.?$/i,
    );
    if (m)
      return `ownership_team_plain|${m[1].trim()}|${m[2].trim()}|${minute}`;

    // Plain DM sentence variant
    m = content.match(
      /^(.+?)\s+transferred\s+ownership\s+of\s+"(.+?)"\s+to\s+you\.\s*Congratulations!?\.?$/i,
    );
    if (m) return `ownership_dm_plain|${m[1].trim()}|${m[2].trim()}|${minute}`;

    // Fallback: exact duplicates per minute
    return `generic|${senderId}|${content}|${minute}`;
  };

  const dedupeMessages = (list) => {
    const seen = new Set();
    const out = [];
    for (const msg of list || []) {
      const key = buildMessageDedupeKey(msg);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(msg);
    }
    return out;
  };

  // Conversation type (used for read-only rendering)
  const conversationType =
    activeConversation?.type ||
    new URLSearchParams(window.location.search).get("type") ||
    "direct";

  const conversationPartner =
    conversationType === "direct"
      ? activeConversation?.partner || activeConversation?.partnerUser || null
      : null;

  const teamData =
    conversationType === "team" ? activeConversation?.team || null : null;

  const teamMembers =
    conversationType === "team" ? activeConversation?.team?.members || [] : [];

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  const refreshConversationList = useCallback(async () => {
    try {
      const response = await messageService.getConversations();
      setConversations(dedupeConversations(response.data || []));
    } catch (err) {
      console.error("Error refreshing conversations:", err);
    }
  }, []);

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
            (conv) => String(conv.id) === String(conversationId),
          );

          if (!conversationExists) {
            const urlParams = new URLSearchParams(window.location.search);
            const type = urlParams.get("type") || "direct";

            if (type === "direct") {
              try {
                // Get the user details for the virtual conversation
                const userResponse =
                  await userService.getUserById(conversationId);

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
                    isSynthetic:
                      userData.isSynthetic ?? userData.is_synthetic ?? undefined,
                    is_synthetic:
                      userData.is_synthetic ?? userData.isSynthetic ?? undefined,
                  },
                  lastMessage: "Start your conversation...",
                  updatedAt: new Date().toISOString(),
                  isVirtual: true,
                  unreadCount: 0,
                };

                // Add to the beginning of the conversations list
                conversationsList = [virtualConversation, ...conversationsList];
              } catch (error) {
                console.error("Error creating virtual conversation:", error);
              }
            }
          }
        }

        const deduplicatedList = dedupeConversations(conversationsList);
        setConversations(deduplicatedList);

        // If there are conversations but none is selected, select the first one
        if (deduplicatedList.length > 0 && !conversationId) {
          const firstConversationType = deduplicatedList[0].type || "direct";
          navigate(
            `/chat/${deduplicatedList[0].id}?type=${firstConversationType}`,
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
        setLoadingMessages(true);
        setLoadingMore(false);
        setHasMoreMessages(false);

        // ✅ Reset archived state when switching conversations
        setIsTeamArchived(false);

        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get("type") || "direct";

        let conversationDetails;
        try {
          conversationDetails = await messageService.getConversationById(
            conversationId,
            type,
          );

          // If it's a team conversation, fetch detailed team member information
          if (type === "team" && conversationDetails?.data) {
            try {
              const teamDetails = await teamService.getTeamById(conversationId);

              // ✅ Check if team is archived
              if (
                teamDetails.data?.archived_at ||
                teamDetails.data?.status === "inactive"
              ) {
                setIsTeamArchived(true);
              } else {
                setIsTeamArchived(false);
              }

              if (teamDetails?.data?.members) {
                conversationDetails.data.team = {
                  ...conversationDetails.data.team,
                  avatarUrl:
                    conversationDetails.data.team.avatarUrl ||
                    conversationDetails.data.team.teamavatarUrl ||
                    conversationDetails.data.team.teamavatar_url ||
                    teamDetails.data.avatarUrl ||
                    teamDetails.data.teamavatarUrl ||
                    teamDetails.data.teamavatar_url,
                  isSynthetic:
                    conversationDetails.data.team.isSynthetic ??
                    conversationDetails.data.team.is_synthetic ??
                    teamDetails.data.isSynthetic ??
                    teamDetails.data.is_synthetic ??
                    undefined,
                  is_synthetic:
                    conversationDetails.data.team.is_synthetic ??
                    conversationDetails.data.team.isSynthetic ??
                    teamDetails.data.is_synthetic ??
                    teamDetails.data.isSynthetic ??
                    undefined,
                  members: teamDetails.data.members,
                };
              }
            } catch (teamError) {
              console.error("Error fetching team member details:", teamError);
            }
          }

          setActiveConversation(conversationDetails.data);

          // Ensure team conversation appears in conversation list
          if (type === "team" && conversationDetails.data) {
            setConversations((prev) => {
              const existingConversation = prev.find(
                (conv) =>
                  String(conv.id) === String(conversationId) &&
                  conv.type === "team",
              );

              if (!existingConversation) {
                const newTeamConversation = {
                  id: parseInt(conversationId),
                  type: "team",
                  team: {
                    id: conversationDetails.data.team.id,
                    name: conversationDetails.data.team.name,
                    avatarUrl: conversationDetails.data.team.avatarUrl,
                    isSynthetic:
                      conversationDetails.data.team.isSynthetic ??
                      conversationDetails.data.team.is_synthetic ??
                      undefined,
                    is_synthetic:
                      conversationDetails.data.team.is_synthetic ??
                      conversationDetails.data.team.isSynthetic ??
                      undefined,
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
          // Check if it's an access denied error (user was removed from team)
          if (error.response?.status === 403) {
            setError("You no longer have access to this conversation.");
            setLoadingMessages(false);
            // Navigate back to chat list or my teams
            navigate("/chat");
            return;
          }

          if (type === "team" && conversationDetails?.data) {
            try {
              const teamDetails = await teamService.getTeamById(conversationId);

              // ✅ Check if team is archived (also in fallback path)
              if (
                teamDetails.data?.archived_at ||
                teamDetails.data?.status === "inactive"
              ) {
                setIsTeamArchived(true);
              } else {
                setIsTeamArchived(false);
              }

              if (teamDetails?.data?.members) {
                conversationDetails.data.team = {
                  ...conversationDetails.data.team,
                  avatarUrl:
                    conversationDetails.data.team.avatarUrl ||
                    conversationDetails.data.team.teamavatarUrl ||
                    conversationDetails.data.team.teamavatar_url ||
                    teamDetails.data.avatarUrl ||
                    teamDetails.data.teamavatarUrl ||
                    teamDetails.data.teamavatar_url,
                  isSynthetic:
                    conversationDetails.data.team.isSynthetic ??
                    conversationDetails.data.team.is_synthetic ??
                    teamDetails.data.isSynthetic ??
                    teamDetails.data.is_synthetic ??
                    undefined,
                  is_synthetic:
                    conversationDetails.data.team.is_synthetic ??
                    conversationDetails.data.team.isSynthetic ??
                    teamDetails.data.is_synthetic ??
                    teamDetails.data.isSynthetic ??
                    undefined,
                  members: teamDetails.data.members,
                };
              }
            } catch (error) {}
          }

          if (type === "direct") {
            try {
              await messageService.startConversation(
                parseInt(conversationId),
                "",
              );

              conversationDetails = await messageService.getConversationById(
                conversationId,
                type,
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
            type,
          );
          const fetchedMessages = messagesResponse.data || [];
          setHasMoreMessages(messagesResponse.hasMore || false);
          setMessages(dedupeMessages(fetchedMessages));

          // Check if we need to highlight messages from a specific user (from notification)
          const highlightUser = searchParams.get("highlightUser");

          if (highlightUser) {
            // Highlight the most recent messages from this user (join message + response)
            const userMessages = fetchedMessages
              .filter((msg) => String(msg.senderId) === String(highlightUser))
              .slice(-3) // Get last 3 messages from this user
              .map((msg) => msg.id);

            if (userMessages.length > 0) {
              setHighlightMessageIds(userMessages);
              // Clear highlights after 4 seconds
              setTimeout(() => {
                setHighlightMessageIds([]);
                // Clear the URL parameter
                setSearchParams((prev) => {
                  prev.delete("highlightUser");
                  return prev;
                });
              }, 4000);
            }
          } else {
            // Default behavior: highlight unread messages
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
          }
        } catch (messagesError) {
          setHasMoreMessages(false);
          setMessages([]);
        }

        setLoadingMessages(false);

        // Wait for socket to be connected before joining
        const socket = socketService.getSocket();
        if (socket && socket.connected) {
          socketService.joinConversation(conversationId, type);
          socketService.markMessagesAsRead(conversationId, type);
        } else {
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
        setLoadingMessages(false);
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
  }, [
    isAuthenticated,
    conversationId,
    searchParams,
    setSearchParams,
    navigate,
    user?.id,
  ]);

  useEffect(() => {
    if (!pendingScrollAdjustmentRef.current) return;

    const container = messagesContainerRef.current;

    if (!container) {
      pendingScrollAdjustmentRef.current = null;
      return;
    }

    const { previousScrollHeight, previousScrollTop } =
      pendingScrollAdjustmentRef.current;

    container.scrollTop =
      container.scrollHeight - previousScrollHeight + previousScrollTop;
    pendingScrollAdjustmentRef.current = null;
  }, [messages, hasMoreMessages]);

  const handleKickedFromTeam = useCallback(
    (data) => {
      if (
        conversationType === "team" &&
        parseInt(conversationId, 10) === data.teamId
      ) {
        setError("You have been removed from this team.");
        setConversations((prev) =>
          prev.filter((c) => !(c.type === "team" && c.id === data.teamId)),
        );
        navigate("/chat");
        setActiveConversation(null);
        setMessages([]);
        return;
      }

      setConversations((prev) =>
        prev.filter((c) => !(c.type === "team" && c.id === data.teamId)),
      );
    },
    [conversationId, conversationType, navigate],
  );

  // Set up WebSocket event listeners
  useEffect(() => {
    const socket = socketService.getSocket();

    if (!socket || !isAuthenticated) {
      return;
    }

    // Remove any existing listeners first to prevent duplicates
    socket.off("users:online");
    socket.off("message:received");
    socket.off("message:deleted");
    socket.off("typing:update");
    socket.off("message:status");
    socket.off("conversation:updated");
    socket.off("team:member_left");
    socket.off("conversation:deleted");

    // Handle online users
    const handleOnlineUsers = (users) => {
      setOnlineUsers(users);
    };

    // Handle new messages
    const handleNewMessage = (message) => {
      const messageConvId = String(message.conversationId);
      const currentConvId = String(conversationId);

      // Get current conversation type from URL
      const urlParams = new URLSearchParams(window.location.search);
      const currentType = urlParams.get("type") || "direct";

      // Check if message belongs to current conversation
      let isForCurrentConversation = false;

      if (message.type === currentType) {
        if (currentType === "team") {
          // For team chats: conversationId must match
          isForCurrentConversation = messageConvId === currentConvId;
        } else {
          // For DMs: either I sent it to this person, or this person sent it to me
          const isSentByMe =
            message.senderId === user?.id && messageConvId === currentConvId;
          const isReceivedFromThem = String(message.senderId) === currentConvId;
          isForCurrentConversation = isSentByMe || isReceivedFromThem;
        }
      }

      if (isForCurrentConversation) {
        setMessages((prev) => {
          // If this is our own message, replace the optimistic version
          if (message.senderId === user.id) {
            const withoutOptimistic = prev.filter(
              (msg) => !msg.isOptimistic || msg.senderId !== user.id,
            );

            const messageExists = withoutOptimistic.some(
              (msg) => msg.id === message.id,
            );
            if (messageExists) {
              return prev;
            }

            const newMessage = {
              id: message.id,
              senderId: message.senderId,
              content: message.content,
              imageUrl: message.imageUrl,
              fileUrl: message.fileUrl,
              fileName: message.fileName,
              createdAt: message.createdAt,
              senderUsername: message.senderUsername,
              type: message.type,
              fileSize: message.fileSize,
              fileExpiresAt: message.fileExpiresAt,
              fileDeletedAt: message.fileDeletedAt,
            };

            return dedupeMessages([...withoutOptimistic, newMessage]);
          } else {
            const messageExists = prev.some((msg) => msg.id === message.id);
            if (messageExists) {
              return prev;
            }

            const newMessage = {
              id: message.id,
              senderId: message.senderId,
              content: message.content,
              imageUrl: message.imageUrl,
              fileUrl: message.fileUrl,
              fileName: message.fileName,
              createdAt: message.createdAt,
              senderUsername: message.senderUsername,
              type: message.type,
              fileSize: message.fileSize,
              fileExpiresAt: message.fileExpiresAt,
              fileDeletedAt: message.fileDeletedAt,
            };

            return dedupeMessages([...prev, newMessage]);
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

        const deduplicatedList = dedupeConversations(updatedList);

        return deduplicatedList.sort(
          (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
        );
      });
    };

    // Handle typing indicators
    const handleTypingUpdate = (data) => {
      if (String(data.conversationId) === String(conversationId)) {
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
          return updated;
        });
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
          })),
        );
      }
    };

    // Handle conversation updates
    const handleConversationUpdate = (data) => {
      setConversations((prev) => {
        const conversationIndex = prev.findIndex(
          (c) => String(c.id) === String(data.id),
        );

        if (conversationIndex === -1) {
          refreshConversationList();
          return prev;
        }

        const updatedList = [...prev];
        updatedList[conversationIndex] = {
          ...updatedList[conversationIndex],
          lastMessage: data.lastMessage,
          updatedAt: data.updatedAt,
        };

        const deduplicatedList = dedupeConversations(updatedList);

        return deduplicatedList.sort(
          (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
        );
      });
    };

    const handleTeamMemberLeft = (data) => {
      if (!data?.teamId) return;

      setTeamMembersRefreshSignal({
        teamId: data.teamId,
        userId: data.userId ?? null,
        receivedAt: Date.now(),
      });

      const hasTeamConversation = conversationsRef.current.some(
        (conversation) =>
          conversation.type === "team" &&
          String(conversation.id) === String(data.teamId),
      );

      if (hasTeamConversation) {
        refreshConversationList();
      }

      const activeTeamId =
        activeConversationRef.current?.team?.id ?? activeConversationRef.current?.id;

      if (String(activeTeamId) !== String(data.teamId)) {
        return;
      }

      teamService
        .getTeamById(data.teamId)
        .then((response) => {
          const teamPayload =
            response?.data && typeof response.data === "object"
              ? response.data
              : response;

          if (!Array.isArray(teamPayload?.members)) {
            return;
          }

          setActiveConversation((prev) => {
            if (
              !prev ||
              prev.type !== "team" ||
              String(prev.team?.id ?? prev.id) !== String(data.teamId)
            ) {
              return prev;
            }

            return {
              ...prev,
              team: {
                ...prev.team,
                members: teamPayload.members,
              },
            };
          });
        })
        .catch((err) =>
          console.error("Error refreshing active team members:", err),
        );
    };

    const handleConversationDeleted = (data) => {
      if (!data?.partnerId) return;

      setConversations((prev) =>
        prev.filter(
          (conversation) =>
            !isDirectConversationForPartner(conversation, data.partnerId),
        ),
      );

      const currentUrlType =
        new URLSearchParams(window.location.search).get("type") ||
        activeConversationRef.current?.type ||
        "direct";

      const activePartnerId =
        getConversationPartnerId(activeConversationRef.current) ??
        getConversationPartnerId(
          conversationsRef.current.find(
            (conversation) =>
              conversation.type === "direct" &&
              String(conversation.id) === String(conversationId),
          ),
        );

      const isCurrentConversationDeleted =
        currentUrlType === "direct" &&
        (String(activePartnerId ?? "") === String(data.partnerId) ||
          String(conversationId ?? "") === String(data.partnerId));

      if (!isCurrentConversationDeleted) {
        return;
      }

      setError("This conversation is no longer available.");
      setActiveConversation(null);
      setMessages([]);
      setTypingUsers({});
      setHighlightMessageIds([]);
      setHasMoreMessages(false);
      navigate("/chat", { replace: true });
    };

    // Handle message deleted (soft delete broadcast)
    const handleMessageDeleted = (payload) => {
      // payload: { messageId, deletedAt, deletedBy, type, teamId, senderId, receiverId }
      setMessages((prev) =>
        prev.map((m) =>
          String(m.id) === String(payload.messageId)
            ? {
                ...m,
                deletedAt: payload.deletedAt || new Date().toISOString(),
                deletedBy: payload.deletedBy,
                content: null,
                imageUrl: null,
                fileUrl: null,
                fileName: null,
                fileSize: null,
              }
            : m,
        ),
      );
    };

    // Subscribe to events
    socket.on("users:online", handleOnlineUsers);
    socket.on("message:received", handleNewMessage);
    socket.on("typing:update", handleTypingUpdate);
    socket.on("message:status", handleMessageStatus);
    socket.on("conversation:updated", handleConversationUpdate);
    socket.on("team:member_left", handleTeamMemberLeft);
    socket.on("conversation:deleted", handleConversationDeleted);
    socket.on("team:member_kicked", handleKickedFromTeam);
    socket.on("message:deleted", handleMessageDeleted);

    // Cleanup function to remove listeners
    return () => {
      socket.off("users:online", handleOnlineUsers);
      socket.off("message:received", handleNewMessage);
      socket.off("typing:update", handleTypingUpdate);
      socket.off("message:status", handleMessageStatus);
      socket.off("conversation:updated", handleConversationUpdate);
      socket.off("team:member_left", handleTeamMemberLeft);
      socket.off("conversation:deleted", handleConversationDeleted);
      socket.off("team:member_kicked", handleKickedFromTeam);
      socket.off("message:deleted", handleMessageDeleted);
    };
  }, [
    conversationId,
    handleKickedFromTeam,
    isAuthenticated,
    navigate,
    refreshConversationList,
    searchParams,
    user?.id,
    user?.username,
  ]);

  // Handle leaving a deleted team (removes from conversation list)
  const handleLeaveTeam = async () => {
    if (!activeConversation?.team?.id) {
      return;
    }

    const teamId = activeConversation.team.id;
    const teamName = activeConversation.team.name || "this team";

    const confirmLeave = window.confirm(
      `Are you sure you want to leave "${teamName}"? This will remove the chat from your conversation list.`,
    );

    if (!confirmLeave) return;

    try {
      // Call the existing leave team API
      await teamService.removeTeamMember(teamId, user.id);

      // Remove from local conversation list
      setConversations((prev) => prev.filter((c) => c.id !== teamId));

      // Navigate away
      navigate("/chat");

      setActiveConversation(null);
      setMessages([]);
    } catch (error) {
      console.error("Error leaving team:", error);
      setError("Failed to leave team. Please try again.");
    }
  };

  // Handle deleting a conversation from the list
  const handleDeleteConversation = async () => {
    if (!activeConversation) {
      return;
    }

    const confirmDelete = window.confirm(
      "Are you sure you want to remove this chat from your conversation list?",
    );

    if (!confirmDelete) return;

    try {
      const convId = activeConversation.id;
      const type = activeConversation.type || conversationType;

      // Remove from local state
      setConversations((prev) => prev.filter((c) => c.id !== convId));

      // Navigate away
      navigate("/chat");

      setActiveConversation(null);
      setMessages([]);
    } catch (error) {
      console.error("Error deleting conversation:", error);
      setError("Failed to delete conversation. Please try again.");
    }
  };

  const loadEarlierMessages = async () => {
    if (loadingMore || !hasMoreMessages || messages.length === 0) return;

    const container = messagesContainerRef.current;

    if (container) {
      pendingScrollAdjustmentRef.current = {
        previousScrollHeight: container.scrollHeight,
        previousScrollTop: container.scrollTop,
      };
    }

    setLoadingMore(true);

    try {
      const oldestMessage = messages[0];
      const type = searchParams.get("type") || "direct";
      const response = await messageService.getMessages(conversationId, type, {
        before: oldestMessage.id,
        limit: 50,
      });
      const olderMessages = response.data || [];

      setHasMoreMessages(response.hasMore || false);

      if (olderMessages.length > 0) {
        setMessages((prev) => dedupeMessages([...olderMessages, ...prev]));
      } else {
        pendingScrollAdjustmentRef.current = null;
      }
    } catch (err) {
      pendingScrollAdjustmentRef.current = null;
      console.error("Error loading earlier messages:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSendFile = async (file) => {
    if (!activeConversation || !file) return;

    try {
      // Upload file attachment before sending the message
      const uploadResult = await uploadToImageKit(file, "chatFiles");

      if (!uploadResult.success) {
        setError(uploadResult.error || "Failed to upload file");
        return;
      }

      // Get conversation type and target ID
      const type = searchParams.get("type") || "direct";
      const targetId =
        type === "team"
          ? activeConversation.team?.id
          : activeConversation.partner?.id;

      // Send message with file via socket
      socketService.sendMessage(
        targetId,
        null,
        type,
        null,
        uploadResult.url,
        file.name,
      );
    } catch (error) {
      console.error("Error uploading file:", error);
      setError("Failed to upload file. Please try again.");
    }
  };

  const handleSendImage = async (file, previewUrl) => {
    if (!activeConversation || !file) return;

    try {
      // Upload image attachment before sending the message
      const uploadResult = await uploadToImageKit(file, "chatImages");

      if (!uploadResult.success) {
        setError(uploadResult.error || "Failed to upload image");
        return;
      }

      // Get conversation type and target ID
      const type = searchParams.get("type") || "direct";
      const targetId =
        type === "team"
          ? activeConversation.team?.id
          : activeConversation.partner?.id;

      // Send message with image via socket
      socketService.sendMessage(targetId, null, type, uploadResult.url);
    } catch (error) {
      console.error("Error uploading image:", error);
      setError("Failed to upload image. Please try again.");
    }
  };

  // Delete message (soft delete)
  const handleDeleteMessage = async (messageId) => {
    if (!messageId) return;

    const ok = window.confirm("Delete this message?");
    if (!ok) return;

    try {
      // Optimistic UI update
      setMessages((prev) =>
        prev.map((m) =>
          String(m.id) === String(messageId)
            ? {
                ...m,
                deletedAt: new Date().toISOString(),
                deletedBy: user?.id,
                content: null,
                imageUrl: null,
                fileUrl: null,
                fileName: null,
                fileSize: null,
              }
            : m,
        ),
      );

      await messageService.deleteMessage(messageId);
    } catch (err) {
      console.error("Failed to delete message:", err);
      setError("Failed to delete message. Please try again.");

      // Optional: re-fetch messages for correctness after failure
      // (you can leave this out if you don’t want)
    }
  };

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
      prev.map((conv) => (conv.id === id ? { ...conv, unreadCount: 0 } : conv)),
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
            teamMembersRefreshSignal={teamMembersRefreshSignal}
          />
        </div>

        {/* Message Display - Right Side */}
        <div className="w-2/3 flex flex-col">
          {conversationId ? (
            <>
              <div ref={messagesContainerRef} className="flex-grow overflow-y-auto p-4">
                <MessageDisplay
                  messages={messages}
                  currentUserId={user?.id}
                  conversationPartner={conversationPartner}
                  teamData={teamData}
                  loading={loadingMessages}
                  typingUsers={activeTypingUsers}
                  conversationType={conversationType}
                  teamMembers={teamMembers}
                  highlightMessageIds={highlightMessageIds}
                  hasMoreMessages={hasMoreMessages}
                  loadingMore={loadingMore}
                  teamMembersRefreshSignal={teamMembersRefreshSignal}
                  onLoadEarlierMessages={loadEarlierMessages}
                  onDeleteConversation={handleDeleteConversation}
                  onDeleteMessage={handleDeleteMessage}
                  onLeaveTeam={handleLeaveTeam}
                />
              </div>

              {/* Deleted team banner + message input */}
              <div className="border-t border-base-200">
                {/* Show banner for archived teams */}
                {isTeamArchived && conversationType === "team" && (
                  <div
                    className="flex flex-col items-center gap-3 px-5 py-4 mx-4 mt-4 rounded-2xl text-center"
                    style={{
                      backgroundColor: "rgba(239, 68, 68, 0.1)",
                      color: "#dc2626",
                    }}
                  >
                    <span className="text-sm font-medium">
                      {activeConversation?.team?.members?.some(
                        (m) => m.userId === user?.id && m.role === "owner",
                      )
                        ? `You initiated the deletion of this team. The team is archived and inactive now. Remaining members are able to text in this chat until the last member leaves.`
                        : `${(() => {
                            const owner =
                              activeConversation?.team?.members?.find(
                                (m) => m.role === "owner",
                              );
                            return owner
                              ? `${owner.firstName} ${owner.lastName}`
                              : "The owner";
                          })()} has initiated the deletion of this team. The team is archived and inactive now. Remaining members are able to text in this chat until the last member leaves.`}
                    </span>

                    {/* Leave Team Button */}
                    <button
                      onClick={() => handleLeaveTeam()}
                      className="flex items-center gap-1 text-xs underline hover:no-underline opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <LogOut size={14} />
                      Leave team and remove from chat list
                    </button>
                  </div>
                )}

                {/* Always show message input */}
                <div className="p-4">
                  <MessageInput
                    onSendMessage={handleSendMessage}
                    onSendImage={handleSendImage}
                    onSendFile={handleSendFile}
                    onTyping={handleTyping}
                    disabled={!activeConversation}
                  />
                </div>
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
