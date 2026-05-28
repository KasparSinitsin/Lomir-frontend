import api, { call } from "./api";

let _pendingUnreadCount = null;

const FIELD_ALIASES = [
  ["createdAt", "created_at"],
  ["updatedAt", "updated_at"],
  ["deletedAt", "deleted_at"],
  ["readAt", "read_at"],
  ["sentAt", "sent_at"],
  ["conversationId", "conversation_id"],
  ["partnerId", "partner_id"],
  ["partnerUser", "partner_user"],
  ["teamId", "team_id"],
  ["teamName", "team_name"],
  ["userId", "user_id"],
  ["senderId", "sender_id"],
  ["senderFirstName", "sender_first_name"],
  ["senderLastName", "sender_last_name"],
  ["senderUsername", "sender_username"],
  ["senderAvatarUrl", "sender_avatar_url"],
  ["receiverId", "receiver_id"],
  ["recipientId", "recipient_id"],
  ["firstName", "first_name"],
  ["lastName", "last_name"],
  ["avatarUrl", "avatar_url"],
  ["teamavatarUrl", "teamavatar_url"],
  ["isSynthetic", "is_synthetic"],
  ["isPublic", "is_public"],
  ["lastMessage", "last_message"],
  ["latestMessage", "latest_message"],
  ["recentMessage", "recent_message"],
  ["lastMessageContent", "last_message_content"],
  ["latestMessageContent", "latest_message_content"],
  ["lastMessageFileName", "last_message_file_name"],
  ["lastMessageFilename", "last_message_filename"],
  ["latestMessageFileName", "latest_message_file_name"],
  ["lastMessageFileUrl", "last_message_file_url"],
  ["latestMessageFileUrl", "latest_message_file_url"],
  ["lastMessageImageUrl", "last_message_image_url"],
  ["latestMessageImageUrl", "latest_message_image_url"],
  ["fileName", "file_name"],
  ["fileSize", "file_size"],
  ["fileUrl", "file_url"],
  ["fileExpiresAt", "file_expires_at"],
  ["fileDeletedAt", "file_deleted_at"],
  ["imageUrl", "image_url"],
  ["replyTo", "reply_to"],
  ["replyToId", "reply_to_id"],
  ["unreadCount", "unread_count"],
  ["readByUsers", "read_by_users"],
  ["readCount", "read_count"],
  ["recipientCount", "recipient_count"],
  ["editedAt", "edited_at"],
  ["isEdited", "is_edited"],
  ["membershipStatus", "membership_status"],
  ["memberStatus", "member_status"],
  ["roleName", "role_name"],
  ["removedAt", "removed_at"],
  ["leftAt", "left_at"],
];

const addCaseAliases = (value, aliases = FIELD_ALIASES) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const next = { ...value };
  aliases.forEach(([camelKey, snakeKey]) => {
    if (next[camelKey] === undefined && next[snakeKey] !== undefined) {
      next[camelKey] = next[snakeKey];
    }
    if (next[snakeKey] === undefined && next[camelKey] !== undefined) {
      next[snakeKey] = next[camelKey];
    }
  });
  return next;
};

const normalizeChatUser = (user) => addCaseAliases(user);

const normalizeChatMember = (member) => {
  if (!member || typeof member !== "object") return member;
  const normalized = addCaseAliases(member);
  const user = normalizeChatUser(normalized.user);
  return {
    ...normalized,
    ...(user !== undefined ? { user } : {}),
  };
};

const normalizeChatTeam = (team) => {
  if (!team || typeof team !== "object") return team;
  const normalized = addCaseAliases(team);
  const members = Array.isArray(normalized.members)
    ? normalized.members.map(normalizeChatMember)
    : normalized.members;

  return {
    ...normalized,
    ...(members !== undefined ? { members } : {}),
  };
};

const normalizeChatMessage = (message) => {
  if (!message || typeof message !== "object") return message;
  const normalized = addCaseAliases(message);
  const sender = normalizeChatUser(normalized.sender);
  const readByUsers = Array.isArray(normalized.readByUsers)
    ? normalized.readByUsers.map(normalizeChatUser)
    : normalized.readByUsers;
  const replyTo = normalizeChatMessage(normalized.replyTo);

  return {
    ...normalized,
    ...(sender !== undefined ? { sender } : {}),
    ...(readByUsers !== undefined
      ? {
          readByUsers,
          read_by_users: readByUsers,
        }
      : {}),
    ...(replyTo !== undefined
      ? {
          replyTo,
          reply_to: replyTo,
        }
      : {}),
  };
};

const normalizeConversation = (conversation) => {
  if (!conversation || typeof conversation !== "object") return conversation;

  const normalized = addCaseAliases(conversation);
  const partner = normalizeChatUser(normalized.partner);
  const partnerUser = normalizeChatUser(normalized.partnerUser);
  const team = normalizeChatTeam(normalized.team);
  const members = Array.isArray(normalized.members)
    ? normalized.members.map(normalizeChatMember)
    : normalized.members;
  const lastMessage = normalizeChatMessage(normalized.lastMessage);
  const latestMessage = normalizeChatMessage(normalized.latestMessage);
  const recentMessage = normalizeChatMessage(normalized.recentMessage);

  return {
    ...normalized,
    ...(partner !== undefined
      ? {
          partner,
        }
      : {}),
    ...(partnerUser !== undefined
      ? {
          partnerUser,
          partner_user: partnerUser,
        }
      : {}),
    ...(team !== undefined ? { team } : {}),
    ...(members !== undefined ? { members } : {}),
    ...(lastMessage !== undefined
      ? {
          lastMessage,
          last_message: lastMessage,
        }
      : {}),
    ...(latestMessage !== undefined
      ? {
          latestMessage,
          latest_message: latestMessage,
        }
      : {}),
    ...(recentMessage !== undefined
      ? {
          recentMessage,
          recent_message: recentMessage,
        }
      : {}),
  };
};

const normalizeConversationListPayload = (payload) => {
  const rawConversations = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.data?.conversations)
        ? payload.data.conversations
        : Array.isArray(payload?.conversations)
          ? payload.conversations
          : [];
  const conversations = rawConversations.map(normalizeConversation);

  if (Array.isArray(payload)) {
    return { data: conversations };
  }

  return {
    ...payload,
    data: conversations,
    ...(Array.isArray(payload?.conversations)
      ? { conversations }
      : {}),
  };
};

const normalizeConversationPayload = (payload) => {
  const rawConversation = payload?.data ?? payload ?? null;
  const conversation = normalizeConversation(rawConversation);

  return {
    ...payload,
    data: conversation,
  };
};

const normalizeMessagesPayload = (payload) => {
  const rawMessages = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.data?.messages)
        ? payload.data.messages
        : Array.isArray(payload?.messages)
          ? payload.messages
          : [];
  const messages = rawMessages.map(normalizeChatMessage);
  const hasMore =
    payload?.hasMore ??
    payload?.has_more ??
    payload?.data?.hasMore ??
    payload?.data?.has_more ??
    false;

  if (Array.isArray(payload)) {
    return { data: messages, hasMore };
  }

  return {
    ...payload,
    data: messages,
    hasMore,
    has_more: payload?.has_more ?? hasMore,
    ...(Array.isArray(payload?.messages) ? { messages } : {}),
  };
};

const normalizeMessagePayload = (payload) => {
  const rawMessage = payload?.data ?? payload ?? null;
  const message = normalizeChatMessage(rawMessage);

  return payload?.data !== undefined
    ? {
        ...payload,
        data: message,
      }
    : message;
};

const normalizeUnreadCountPayload = (payload) => {
  const data = payload?.data ?? payload ?? {};
  const rawFirstUnread = data.firstUnread ?? data.first_unread ?? null;
  const firstUnread = rawFirstUnread
    ? {
        ...rawFirstUnread,
        conversationId:
          rawFirstUnread.conversationId ?? rawFirstUnread.conversation_id,
        conversation_id:
          rawFirstUnread.conversation_id ?? rawFirstUnread.conversationId,
      }
    : null;

  return {
    ...payload,
    data: {
      ...data,
      count: data.count ?? 0,
      firstUnread,
      first_unread: firstUnread,
      teamCount: data.teamCount ?? data.team_count ?? 0,
      team_count: data.team_count ?? data.teamCount ?? 0,
      senderCount: data.senderCount ?? data.sender_count ?? 0,
      sender_count: data.sender_count ?? data.senderCount ?? 0,
    },
  };
};

export const messageService = {
  getConversations: () =>
    call("fetching conversations", () =>
      api.get("/api/messages/conversations", {
        skipResponseCaseTransform: true,
      }),
    ).then(normalizeConversationListPayload),

  // Deduplicates concurrent calls: multiple callers within the same tick
  // share one HTTP request.
  getUnreadCount: () => {
    if (_pendingUnreadCount) return _pendingUnreadCount;

    _pendingUnreadCount = call("fetching unread count", () =>
      api.get("/api/messages/unread-count", {
        skipResponseCaseTransform: true,
      }),
    ).then(normalizeUnreadCountPayload).finally(() => {
      _pendingUnreadCount = null;
    });

    return _pendingUnreadCount;
  },

  getConversationById: (conversationId, type = "direct") =>
    call(`fetching conversation ${conversationId}`, () =>
      api.get(`/api/messages/conversations/${conversationId}?type=${type}`, {
        skipResponseCaseTransform: true,
      }),
    ).then(normalizeConversationPayload),

  getMessages: (conversationId, type = "direct", { before, limit } = {}) => {
    const params = new URLSearchParams({ type });
    if (before) params.append("before", before);
    if (limit) params.append("limit", limit);
    return call(
      `fetching messages for conversation ${conversationId}`,
      () =>
        api.get(
          `/api/messages/conversations/${conversationId}/messages?${params.toString()}`,
          {
            skipResponseCaseTransform: true,
          },
        ),
    ).then(normalizeMessagesPayload);
  },

  sendMessage: (conversationId, content, type = "direct", options = {}) => {
    const payload = {
      content,
      type,
    };

    if (options.imageUrl !== undefined) payload.image_url = options.imageUrl;
    if (options.fileUrl !== undefined) payload.file_url = options.fileUrl;
    if (options.fileName !== undefined) payload.file_name = options.fileName;
    if (options.replyToId !== undefined) payload.reply_to_id = options.replyToId;

    return call(`sending message in conversation ${conversationId}`, () =>
      api.post(
        `/api/messages/conversations/${conversationId}/messages`,
        payload,
        {
          skipRequestCaseTransform: true,
          skipResponseCaseTransform: true,
        },
      ),
    ).then(normalizeMessagePayload);
  },

  // Keeps explicit try/catch — logs the response body in addition to the
  // standard error log because conversation start failures are hard to debug
  // without the server's reason.
  startConversation: async (recipientId, initialMessage = "") => {
    try {
      const response = await api.post(
        "/api/messages/conversations",
        {
          recipient_id: parseInt(recipientId, 10),
          initial_message: initialMessage.trim(),
        },
        {
          skipRequestCaseTransform: true,
          skipResponseCaseTransform: true,
        },
      );
      return normalizeConversationPayload(response.data).data;
    } catch (error) {
      console.error("Error starting conversation:", error);
      console.error("Error response:", error.response?.data);
      throw error;
    }
  },

  deleteMessage: (messageId) =>
    call(`deleting message ${messageId}`, () =>
      api.delete(`/api/messages/${messageId}`),
    ),

  updateMessage: (messageId, content) =>
    call(`updating message ${messageId}`, () =>
      api.patch(
        `/api/messages/${messageId}`,
        { content: content.trim() },
        {
          skipRequestCaseTransform: true,
          skipResponseCaseTransform: true,
        },
      ),
    ).then(normalizeMessagePayload),
};

export default messageService;
