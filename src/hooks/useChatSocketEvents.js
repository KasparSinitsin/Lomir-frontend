import { useTranslation } from "react-i18next";
import { parseSystemMessage } from "../utils/messageSystemParser";
import { messageService } from "../services/messageService";
import socketService from "../services/socketService";
import useSocketEvents from "./useSocketEvents";
import {
  getConversationPartnerId,
  getPayloadTeamId,
  isCurrentUserRemovalPayload,
  isDirectConversationForPartner,
} from "../utils/chatHelpers";
import { getMessageConversationTarget } from "../utils/messageNotificationUtils";
import {
  buildConversationLastMessagePreview,
  dedupeConversations,
} from "../utils/chatSearch";
import { normalizeTimestampToDate } from "../utils/dateHelpers";

const sortConversationsByUpdatedAt = (conversations) =>
  conversations.sort((a, b) => {
    const aDate = normalizeTimestampToDate(a.updatedAt)?.getTime() ?? 0;
    const bDate = normalizeTimestampToDate(b.updatedAt)?.getTime() ?? 0;
    return bDate - aDate;
  });

const buildSocketMessage = (message) => ({
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
  readCount: message.readCount,
  recipientCount: message.recipientCount,
  readByUsers: message.readByUsers,
  editedAt: message.editedAt || message.edited_at,
  editedBy: message.editedBy ?? message.edited_by,
  isEdited: message.isEdited || message.is_edited,
  replyTo: message.replyTo,
  replyToId: message.replyToId || message.reply_to_id,
});

const useChatSocketEvents = ({
  activeConversationRef,
  clearTypingUsers,
  conversationId,
  conversationType,
  conversationsRef,
  dedupeMessages,
  handleTypingUpdate,
  isAuthenticated,
  navigate,
  refreshActiveTeamMembership,
  refreshConversationList,
  revokeTeamChatAccess,
  setActiveConversation,
  setConversations,
  setError,
  setHasMoreMessages,
  setHighlightMessageIds,
  setMessages,
  setOnlineUsers,
  setTeamMembersRefreshSignal,
  user,
}) => {
  const { t } = useTranslation();

  useSocketEvents((socket) => {
    if (!socket || !isAuthenticated) {
      return undefined;
    }

    const handleKickedFromTeam = (data) => {
      if (
        conversationType === "team" &&
        parseInt(conversationId, 10) === data.teamId
      ) {
        revokeTeamChatAccess(data.teamId, t("chatPage.errors.removedFromTeam"));
        return;
      }

      setConversations((prev) =>
        prev.filter((c) => !(c.type === "team" && c.id === data.teamId)),
      );
    };

    /**
     * The team was permanently deleted. Emitted by the backend only on the
     * solo-owner path, where the deleter is the sole member - so in practice
     * this reaches the person who just pressed delete.
     *
     * Without it the conversation sat in their list until something hit a 404:
     * opening it, or the membership poll, which runs every 60s and only for the
     * active chat.
     *
     * It still words a message rather than vanishing silently. The viewer may
     * have deleted the team in another tab, and a chat that disappears without
     * a word is harder to trust than one that says why.
     */
    const handleTeamDeleted = (data) => {
      const teamId = data?.teamId;
      if (teamId == null) return;

      if (
        conversationType === "team" &&
        parseInt(conversationId, 10) === teamId
      ) {
        revokeTeamChatAccess(teamId, t("chatPage.errors.teamDeleted"));
        return;
      }

      setConversations((prev) =>
        prev.filter((c) => !(c.type === "team" && c.id === teamId)),
      );
    };

    const handleOnlineUsers = (users) => {
      setOnlineUsers(users);
    };

    const handleNewMessage = (message) => {
      const messageTarget = getMessageConversationTarget(message, user?.id);
      const messageConvId = String(
        messageTarget.conversationId ?? message.conversationId,
      );
      const currentConvId = String(conversationId);

      const urlParams = new URLSearchParams(window.location.search);
      const currentType = urlParams.get("type") || "direct";

      let isForCurrentConversation = false;

      if (message.type === currentType) {
        if (currentType === "team") {
          isForCurrentConversation = messageConvId === currentConvId;
        } else {
          const isSentByMe =
            message.senderId === user?.id && messageConvId === currentConvId;
          const isReceivedFromThem = String(message.senderId) === currentConvId;
          isForCurrentConversation = isSentByMe || isReceivedFromThem;
        }
      }

      if (isForCurrentConversation) {
        if (currentType === "team") {
          const parsedMessage = parseSystemMessage(message.content);
          const removedMemberId =
            parsedMessage?.memberId ?? parsedMessage?.userId ?? null;

          if (
            ["member_removed", "member_removed_public"].includes(
              parsedMessage?.type,
            ) &&
            removedMemberId != null &&
            String(removedMemberId) === String(user?.id)
          ) {
            revokeTeamChatAccess(
              messageConvId,
              "You have been removed from this team.",
            );
            return;
          }
        }

        setMessages((prev) => {
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

            return dedupeMessages([
              ...withoutOptimistic,
              buildSocketMessage(message),
            ]);
          }

          const messageExists = prev.some((msg) => msg.id === message.id);
          if (messageExists) {
            return prev;
          }

          return dedupeMessages([...prev, buildSocketMessage(message)]);
        });

        if (message.senderId !== user.id) {
          const urlParams = new URLSearchParams(window.location.search);
          const type = urlParams.get("type") || "direct";
          socketService.markMessagesAsRead(currentConvId, type);
        }
      }

      setConversations((prev) => {
        const isUnreadIncoming =
          messageConvId !== currentConvId && message.senderId !== user.id;
        const lastMessagePreview = buildConversationLastMessagePreview(message);
        let conversationUpdated = false;
        const updatedList = prev.map((conv) => {
          if (String(conv.id) === messageConvId) {
            conversationUpdated = true;
            const currentUnreadCount = conv.unreadCount ?? conv.unread_count ?? 0;
            const unreadCount = isUnreadIncoming
              ? currentUnreadCount + 1
              : currentUnreadCount;

            return {
              ...conv,
              lastMessage: lastMessagePreview,
              updatedAt: message.createdAt,
              isVirtual: false,
              unreadCount,
              unread_count: unreadCount,
            };
          }
          return conv;
        });

        if (!conversationUpdated) {
          if (messageTarget.type === "direct" && message.senderId !== user.id) {
            updatedList.unshift({
              id: Number.isNaN(Number(messageConvId))
                ? messageConvId
                : Number(messageConvId),
              type: "direct",
              partner: {
                id: message.senderId,
                username: message.senderUsername,
                firstName: message.senderFirstName,
                lastName: message.senderLastName,
                avatarUrl: message.senderAvatarUrl,
              },
              lastMessage: lastMessagePreview,
              updatedAt: message.createdAt,
              unreadCount: isUnreadIncoming ? 1 : 0,
              unread_count: isUnreadIncoming ? 1 : 0,
            });
          }

          refreshConversationList();
        }

        return sortConversationsByUpdatedAt(dedupeConversations(updatedList));
      });
    };

    const refreshTeamEventMessages = async (payload) => {
      const urlParams = new URLSearchParams(window.location.search);
      const currentType = urlParams.get("type") || "direct";
      const activeTeamId =
        activeConversationRef.current?.team?.id ?? activeConversationRef.current?.id;
      const teamId =
        getPayloadTeamId(payload) ??
        (currentType === "team" ? activeTeamId : null);
      if (!teamId) return;

      if (isCurrentUserRemovalPayload(payload, user?.id)) {
        revokeTeamChatAccess(teamId, t("chatPage.errors.removedFromTeam"));
        return;
      }

      refreshConversationList();

      if (
        currentType !== "team" ||
        String(teamId) !== String(conversationId)
      ) {
        return;
      }

      try {
        const canStillAccess = await refreshActiveTeamMembership(teamId);

        if (!canStillAccess) {
          return;
        }

        const messagesResponse = await messageService.getMessages(teamId, "team");
        const fetchedMessages = messagesResponse.data || [];
        setHasMoreMessages(messagesResponse.hasMore || false);
        setMessages(dedupeMessages(fetchedMessages));
        socketService.markMessagesAsRead(teamId, "team");
      } catch (err) {
        console.error("Error refreshing team event messages:", err);
      }
    };

    const handleMessageStatus = (data) => {
      if (String(data.conversationId) === String(conversationId)) {
        const readCountByMessageId = new Map(
          (data.messageReadCounts || []).map((status) => [
            String(status.messageId),
            status,
          ]),
        );

        setMessages((prev) =>
          prev.map((msg) => {
            if (data.type === "team") {
              const status = readCountByMessageId.get(String(msg.id));

              if (!status) {
                return msg;
              }

              return {
                ...msg,
                readAt: msg.readAt || status.firstReadAt || data.readAt,
                readCount: status.readCount,
                recipientCount: status.recipientCount,
                readByUsers: status.readByUsers || msg.readByUsers,
              };
            }

            if (msg.senderId !== user.id) {
              return msg;
            }

            return {
              ...msg,
              readAt: msg.readAt || data.readAt,
              readCount: 1,
              recipientCount: 1,
            };
          }),
        );
      }
    };

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
          lastMessage:
            buildConversationLastMessagePreview(data) ||
            data.lastMessage ||
            updatedList[conversationIndex].lastMessage,
          updatedAt: data.updatedAt,
        };

        return sortConversationsByUpdatedAt(dedupeConversations(updatedList));
      });
    };

    const handleTeamMemberLeft = (data) => {
      if (!data?.teamId) return;
      const leftUserId = data.userId ?? data.user_id ?? null;

      setTeamMembersRefreshSignal({
        teamId: data.teamId,
        userId: leftUserId,
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

      if (leftUserId != null && String(leftUserId) === String(user?.id)) {
        revokeTeamChatAccess(data.teamId, t("chatPage.errors.leftTeamChat"));
        return;
      }

      refreshActiveTeamMembership(data.teamId).catch((err) =>
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
      clearTypingUsers();
      setHighlightMessageIds([]);
      setHasMoreMessages(false);
      navigate("/chat", { replace: true });
    };

    const handleMessageDeleted = (payload) => {
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
      refreshConversationList();
    };

    const handleMessageEdited = (payload) => {
      const messageId = payload.messageId ?? payload.id;
      if (!messageId) return;
      const nextContent = payload.content;

      setMessages((prev) =>
        prev.map((m) =>
          String(m.id) === String(messageId)
            ? {
                ...m,
                content: nextContent ?? m.content,
                editedAt:
                  payload.editedAt ||
                  payload.edited_at ||
                  payload.updatedAt ||
                  payload.updated_at ||
                  new Date().toISOString(),
                editedBy: payload.editedBy ?? payload.edited_by ?? m.editedBy,
                isEdited: true,
              }
            : m,
        ),
      );

      if (payload.isLatestMessage || payload.isLastMessage) {
        setConversations((prev) =>
          prev.map((conversation) =>
            String(conversation.id) === String(payload.conversationId) ||
            (payload.type === "direct" &&
              (String(conversation.id) === String(payload.senderId) ||
                String(conversation.id) === String(payload.receiverId)))
              ? {
                  ...conversation,
                  lastMessage: nextContent ?? conversation.lastMessage,
                }
              : conversation,
          ),
        );
      }
    };

    // Fired when the user hits "Mark all as read" in the navbar: every
    // conversation's unread badge drops to zero across the list.
    const handleAllMessagesRead = () => {
      setConversations((prev) =>
        prev.map((conversation) =>
          (conversation.unreadCount ?? conversation.unread_count ?? 0) > 0
            ? { ...conversation, unreadCount: 0, unread_count: 0 }
            : conversation,
        ),
      );
    };

    socket.on("users:online", handleOnlineUsers);
    socket.on("messages:read-all", handleAllMessagesRead);
    socket.on("message:received", handleNewMessage);
    socket.on("typing:update", handleTypingUpdate);
    socket.on("message:status", handleMessageStatus);
    socket.on("conversation:updated", handleConversationUpdate);
    socket.on("team:member_left", handleTeamMemberLeft);
    socket.on("conversation:deleted", handleConversationDeleted);
    socket.on("team:member_kicked", handleKickedFromTeam);
    socket.on("team:deleted", handleTeamDeleted);
    socket.on("message:deleted", handleMessageDeleted);
    socket.on("message:edited", handleMessageEdited);
    socket.on("notification:new", refreshTeamEventMessages);

    return () => {
      socket.off("users:online", handleOnlineUsers);
      socket.off("messages:read-all", handleAllMessagesRead);
      socket.off("message:received", handleNewMessage);
      socket.off("typing:update", handleTypingUpdate);
      socket.off("message:status", handleMessageStatus);
      socket.off("conversation:updated", handleConversationUpdate);
      socket.off("team:member_left", handleTeamMemberLeft);
      socket.off("conversation:deleted", handleConversationDeleted);
      socket.off("team:member_kicked", handleKickedFromTeam);
      socket.off("team:deleted", handleTeamDeleted);
      socket.off("message:deleted", handleMessageDeleted);
      socket.off("message:edited", handleMessageEdited);
      socket.off("notification:new", refreshTeamEventMessages);
    };
  }, [
    activeConversationRef,
    clearTypingUsers,
    conversationId,
    conversationType,
    conversationsRef,
    dedupeMessages,
    handleTypingUpdate,
    isAuthenticated,
    navigate,
    refreshActiveTeamMembership,
    refreshConversationList,
    revokeTeamChatAccess,
    setActiveConversation,
    setConversations,
    setError,
    setHasMoreMessages,
    setHighlightMessageIds,
    setMessages,
    setOnlineUsers,
    setTeamMembersRefreshSignal,
    // Listed so the handlers re-register on a language change; without it they
    // close over the `t` that was current when the socket connected, and a
    // revocation message would arrive in the previous language.
    t,
    user?.id,
  ]);
};

export default useChatSocketEvents;
