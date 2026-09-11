import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { messageService } from "../services/messageService";
import { teamService } from "../services/teamService";
import socketService from "../services/socketService";
import { uploadToImageKit } from "../config/imagekit";

// Message + conversation action handlers extracted from Chat.jsx (Stage 5).
// Owns send (text/image/file), edit, delete, reply state wiring, and the
// confirmable chat actions (delete message, remove conversation, leave team)
// that share the pendingChatAction modal. Following the established chat-hook
// pattern, Chat.jsx remains the state owner: this hook receives state + setters
// and returns the handler functions the render binds to MessageInput /
// MessageDisplay / the confirmation Modal. The execute* helpers stay internal.
const useChatMessageActions = ({
  activeConversation,
  conversationId,
  messages,
  user,
  replyingTo,
  pendingChatAction,
  pendingChatActionLoading,
  canSendInActiveConversation,
  isCurrentUserActiveTeamMember,
  searchParams,
  navigate,
  refreshActiveTeamMembership,
  handleTyping,
  clearTypingUsers,
  setPendingChatAction,
  setPendingChatActionLoading,
  setReplyingTo,
  setConversations,
  setActiveConversation,
  setMessages,
  setShowChatView,
  setError,
  setIsTeamModalOpen,
  setSelectedTeamId,
  setSelectedTeamData,
}) => {
  const { t } = useTranslation();

  const closePendingChatAction = () => {
    if (pendingChatActionLoading) return;
    setPendingChatAction(null);
  };

  // Handle leaving a deleted team (removes from conversation list)
  const handleLeaveTeam = async () => {
    if (!activeConversation?.team?.id) {
      return;
    }

    const teamId = activeConversation.team.id;
    // Deliberately no fallback here: an unnamed team is rendered by Chat.jsx,
    // which has the hook and can translate it. A literal put in at this point
    // would win over that and leave English in a German dialog.
    const teamName = activeConversation.team.name;

    setPendingChatAction({ type: "leave-team", teamId, teamName });
  };

  const executeLeaveTeam = async ({ teamId }) => {
    try {
      // Call the existing leave team API
      await teamService.removeTeamMember(teamId, user.id);

      // Remove from local conversation list
      setConversations((prev) => prev.filter((c) => c.id !== teamId));

      // Navigate away
      navigate("/chat");

      setActiveConversation(null);
      setMessages([]);
      setShowChatView(false);
      return true;
    } catch (error) {
      console.error("Error leaving team:", error);
      setError(t("chatPage.errors.leaveTeamFailed"));
      return false;
    }
  };

  const handleTeamDetailsLeave = (teamId) => {
    if (!teamId) return;

    setConversations((prev) =>
      prev.filter(
        (conversation) =>
          !(conversation.type === "team" && String(conversation.id) === String(teamId)),
      ),
    );

    if (String(conversationId) === String(teamId)) {
      setActiveConversation(null);
      setMessages([]);
      clearTypingUsers();
      setReplyingTo(null);
      setShowChatView(false);
      setIsTeamModalOpen(false);
      setSelectedTeamId(null);
      setSelectedTeamData(null);
      navigate("/chat", { replace: true });
    }
  };

  // Handle deleting a conversation from the list
  const handleDeleteConversation = async () => {
    if (!activeConversation) {
      return;
    }

    setPendingChatAction({
      type: "delete-conversation",
      conversationId: activeConversation.id,
    });
  };

  const executeDeleteConversation = async ({ conversationId }) => {
    try {
      const convId = conversationId;

      // Remove from local state
      setConversations((prev) => prev.filter((c) => c.id !== convId));

      // Navigate away
      navigate("/chat");

      setActiveConversation(null);
      setMessages([]);
      return true;
    } catch (error) {
      console.error("Error deleting conversation:", error);
      setError(t("chatPage.errors.deleteConversationFailed"));
      return false;
    }
  };

  const handleReplyToMessage = useCallback((message) => {
    setReplyingTo({
      id: message.id,
      content: message.content,
      createdAt: message.createdAt || message.created_at,
      senderId: message.senderId || message.sender_id,
      senderUsername: message.senderUsername || message.sender_username,
      senderFirstName:
        message.senderFirstName ||
        message.sender_first_name ||
        message.senderName,
      imageUrl: message.imageUrl || message.image_url,
      fileUrl: message.fileUrl || message.file_url,
      fileName: message.fileName || message.file_name,
      fileSize: message.fileSize || message.file_size,
      fileExpiresAt: message.fileExpiresAt || message.file_expires_at,
      fileDeletedAt: message.fileDeletedAt || message.file_deleted_at,
    });
  }, [setReplyingTo]);

  const handleClearReply = useCallback(() => {
    setReplyingTo(null);
  }, [setReplyingTo]);

  const handleSendFile = async (file) => {
    if (!canSendInActiveConversation || !file) {
      if (!isCurrentUserActiveTeamMember) {
        setError(t("chatPage.errors.noTeamChatAccess"));
      }
      return;
    }

    try {
      // Upload file attachment before sending the message
      const uploadResult = await uploadToImageKit(file, "chatFiles");

      if (!uploadResult.success) {
        setError(uploadResult.error || t("chatPage.errors.uploadFileRejected"));
        return;
      }

      // Get conversation type and target ID
      const type = searchParams.get("type") || "direct";
      const targetId =
        type === "team"
          ? activeConversation.team?.id
          : activeConversation.partner?.id;

      if (type === "team") {
        const canStillAccess = await refreshActiveTeamMembership(targetId);
        if (!canStillAccess) return;
      }

      // Send message with file via socket
      socketService.sendMessage(
        targetId,
        null,
        type,
        null,
        uploadResult.url,
        file.name,
        replyingTo?.id,
      );
      setReplyingTo(null);
    } catch (error) {
      console.error("Error uploading file:", error);
      setError(t("chatPage.errors.uploadFileFailed"));
    }
  };

  const handleSendImage = async (file) => {
    if (!canSendInActiveConversation || !file) {
      if (!isCurrentUserActiveTeamMember) {
        setError(t("chatPage.errors.noTeamChatAccess"));
      }
      return;
    }

    try {
      // Upload image attachment before sending the message
      const uploadResult = await uploadToImageKit(file, "chatImages");

      if (!uploadResult.success) {
        setError(uploadResult.error || t("chatPage.errors.uploadImageRejected"));
        return;
      }

      // Get conversation type and target ID
      const type = searchParams.get("type") || "direct";
      const targetId =
        type === "team"
          ? activeConversation.team?.id
          : activeConversation.partner?.id;

      if (type === "team") {
        const canStillAccess = await refreshActiveTeamMembership(targetId);
        if (!canStillAccess) return;
      }

      // Send message with image via socket
      socketService.sendMessage(
        targetId,
        null,
        type,
        uploadResult.url,
        null,
        file.name,
        replyingTo?.id,
      );
      setReplyingTo(null);
    } catch (error) {
      console.error("Error uploading image:", error);
      setError(t("chatPage.errors.uploadImageFailed"));
    }
  };

  // Delete message (soft delete)
  const handleDeleteMessage = async (messageId) => {
    if (!messageId) return;

    setPendingChatAction({ type: "delete-message", messageId });
  };

  const executeDeleteMessage = async ({ messageId }) => {
    try {
      if ((searchParams.get("type") || "direct") === "team") {
        const canStillAccess = await refreshActiveTeamMembership(conversationId);
        if (!canStillAccess) return false;
      }

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
      return true;
    } catch (err) {
      console.error("Failed to delete message:", err);
      setError(t("chatPage.errors.deleteMessageFailed"));

      // Optional: re-fetch messages for correctness after failure
      // (you can leave this out if you don’t want)
      return false;
    }
  };

  const confirmPendingChatAction = async () => {
    if (!pendingChatAction) return;

    try {
      setPendingChatActionLoading(true);

      let actionSucceeded = false;

      if (pendingChatAction.type === "leave-team") {
        actionSucceeded = await executeLeaveTeam(pendingChatAction);
      } else if (pendingChatAction.type === "delete-conversation") {
        actionSucceeded = await executeDeleteConversation(pendingChatAction);
      } else if (pendingChatAction.type === "delete-message") {
        actionSucceeded = await executeDeleteMessage(pendingChatAction);
      }

      if (actionSucceeded) {
        setPendingChatAction(null);
      }
    } finally {
      setPendingChatActionLoading(false);
    }
  };

  const handleEditMessage = async (messageId, content) => {
    if (!messageId) return;

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      throw new Error("Message cannot be empty.");
    }

    if ((searchParams.get("type") || "direct") === "team") {
      const canStillAccess = await refreshActiveTeamMembership(conversationId);
      if (!canStillAccess) return;
    }

    const previousMessage = messages.find(
      (m) => String(m.id) === String(messageId),
    );
    const isLatestMessage =
      messages.length > 0 &&
      String(messages[messages.length - 1]?.id) === String(messageId);
    const editedAt = new Date().toISOString();

    setMessages((prev) =>
      prev.map((m) =>
        String(m.id) === String(messageId)
          ? {
              ...m,
              content: trimmedContent,
              editedAt,
              editedBy: user?.id,
              isEdited: true,
            }
          : m,
      ),
    );

    if (isLatestMessage) {
      setConversations((prev) =>
        prev.map((conversation) =>
          String(conversation.id) === String(conversationId)
            ? {
                ...conversation,
                lastMessage: trimmedContent,
              }
            : conversation,
        ),
      );
    }

    try {
      const response = await messageService.updateMessage(
        messageId,
        trimmedContent,
      );
      const updatedMessage = response?.data || response?.message || response;

      if (updatedMessage && typeof updatedMessage === "object") {
        setMessages((prev) =>
          prev.map((m) =>
            String(m.id) === String(messageId)
              ? {
                  ...m,
                  ...updatedMessage,
                  content: updatedMessage.content ?? trimmedContent,
                  editedAt:
                    updatedMessage.editedAt ||
                    updatedMessage.edited_at ||
                    updatedMessage.updatedAt ||
                    updatedMessage.updated_at ||
                    editedAt,
                  editedBy:
                    updatedMessage.editedBy ??
                    updatedMessage.edited_by ??
                    user?.id,
                  isEdited: true,
                }
              : m,
          ),
        );
      }
    } catch (err) {
      if (previousMessage) {
        setMessages((prev) =>
          prev.map((m) =>
            String(m.id) === String(messageId) ? previousMessage : m,
          ),
        );
      }
      if (isLatestMessage) {
        setConversations((prev) =>
          prev.map((conversation) =>
            String(conversation.id) === String(conversationId)
              ? {
                  ...conversation,
                  lastMessage: previousMessage?.content || conversation.lastMessage,
                }
              : conversation,
          ),
        );
      }
      console.error("Failed to edit message:", err);
      setError(t("chatPage.errors.editMessageFailed"));
      throw err;
    }
  };

  const handleSendMessage = async (content) => {
    if (!content.trim() || !conversationId) return;
    if (!canSendInActiveConversation) {
      if (!isCurrentUserActiveTeamMember) {
        setError(t("chatPage.errors.noTeamChatAccess"));
      }
      return;
    }

    // Get type from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get("type") || "direct";

    if (type === "team") {
      const canStillAccess = await refreshActiveTeamMembership(conversationId);
      if (!canStillAccess) return;
    }

    // Create optimistic message (show immediately)
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      senderId: user.id,
      content: content,
      createdAt: new Date().toISOString(),
      senderUsername: user.username,
      type: type,
      isOptimistic: true,
      replyTo: replyingTo,
      replyToId: replyingTo?.id,
    };

    // Add optimistic message to UI immediately
    setMessages((prev) => [...prev, optimisticMessage]);

    // Send message via WebSocket
    socketService.sendMessage(
      conversationId,
      content,
      type,
      null,
      null,
      null,
      replyingTo?.id,
    );
    setReplyingTo(null);

    // Clear typing indicator
    handleTyping(false, type);
  };

  return {
    closePendingChatAction,
    handleLeaveTeam,
    handleTeamDetailsLeave,
    handleDeleteConversation,
    handleReplyToMessage,
    handleClearReply,
    handleSendFile,
    handleSendImage,
    handleDeleteMessage,
    confirmPendingChatAction,
    handleEditMessage,
    handleSendMessage,
  };
};

export default useChatMessageActions;
