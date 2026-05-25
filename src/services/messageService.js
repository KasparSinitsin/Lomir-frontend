import api, { call } from "./api";

let _pendingUnreadCount = null;

export const messageService = {
  getConversations: () =>
    call("fetching conversations", () =>
      api.get("/api/messages/conversations"),
    ),

  // Deduplicates concurrent calls: multiple callers within the same tick
  // share one HTTP request.
  getUnreadCount: () => {
    if (_pendingUnreadCount) return _pendingUnreadCount;

    _pendingUnreadCount = call("fetching unread count", () =>
      api.get("/api/messages/unread-count"),
    ).finally(() => {
      _pendingUnreadCount = null;
    });

    return _pendingUnreadCount;
  },

  getConversationById: (conversationId, type = "direct") =>
    call(`fetching conversation ${conversationId}`, () =>
      api.get(`/api/messages/conversations/${conversationId}?type=${type}`),
    ),

  getMessages: (conversationId, type = "direct", { before, limit } = {}) => {
    const params = new URLSearchParams({ type });
    if (before) params.append("before", before);
    if (limit) params.append("limit", limit);
    return call(
      `fetching messages for conversation ${conversationId}`,
      () =>
        api.get(
          `/api/messages/conversations/${conversationId}/messages?${params.toString()}`,
        ),
    );
  },

  sendMessage: (conversationId, content, type = "direct") =>
    call(`sending message in conversation ${conversationId}`, () =>
      api.post(`/api/messages/conversations/${conversationId}/messages`, {
        content,
        type,
      }),
    ),

  // Keeps explicit try/catch — logs the response body in addition to the
  // standard error log because conversation start failures are hard to debug
  // without the server's reason.
  startConversation: async (recipientId, initialMessage = "") => {
    try {
      const response = await api.post("/api/messages/conversations", {
        recipientId: parseInt(recipientId),
        initialMessage: initialMessage.trim(),
      });
      return response.data;
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
      api.patch(`/api/messages/${messageId}`, { content: content.trim() }),
    ),
};

export default messageService;
