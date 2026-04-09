import api from "./api";

export const messageService = {
  // Get all conversations for the current user
  getConversations: async () => {
    try {
      const response = await api.get("/api/messages/conversations");
      return response.data;
    } catch (error) {
      console.error("Error fetching conversations:", error);
      throw error;
    }
  },

  // Get unread message count for current user
  getUnreadCount: async () => {
    try {
      const response = await api.get("/api/messages/unread-count");
      return response.data;
    } catch (error) {
      console.error("Error fetching unread count:", error);
      throw error;
    }
  },

  // Get a specific conversation by ID
  getConversationById: async (conversationId, type = "direct") => {
    try {
      const response = await api.get(
        `/api/messages/conversations/${conversationId}?type=${type}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching conversation ${conversationId}:`, error);
      throw error;
    }
  },

  // Get messages for a specific conversation
  getMessages: async (conversationId, type = "direct", { before, limit } = {}) => {
    try {
      const params = new URLSearchParams({ type });
      if (before) params.append("before", before);
      if (limit) params.append("limit", limit);
      const response = await api.get(
        `/api/messages/conversations/${conversationId}/messages?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching messages for conversation ${conversationId}:`,
        error
      );
      throw error;
    }
  },

  // Send a message in a conversation
  sendMessage: async (conversationId, content, type = "direct") => {
    try {
      const response = await api.post(
        `/api/messages/conversations/${conversationId}/messages`,
        {
          content,
          type,
        }
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error sending message in conversation ${conversationId}:`,
        error
      );
      throw error;
    }
  },

  // Start a new conversation with a user
  startConversation: async (recipientId, initialMessage = "") => {
    try {
      const response = await api.post("/api/messages/conversations", {
        recipientId: parseInt(recipientId), // Ensure it's a number
        initialMessage: initialMessage.trim(),
      });

      return response.data;
    } catch (error) {
      console.error("Error starting conversation:", error);
      console.error("Error response:", error.response?.data); // More detailed error
      throw error;
    }
  },

  // Soft-delete a message
  deleteMessage: async (messageId) => {
    try {
      const response = await api.delete(`/api/messages/${messageId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting message ${messageId}:`, error);
      throw error;
    }
  },
};

export default messageService;
