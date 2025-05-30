import api from './api';

export const messageService = {
  // Get all conversations for the current user
  getConversations: async () => {
    try {
      const response = await api.get('/api/messages/conversations');
      return response.data;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  },

  // Get a specific conversation by ID
  getConversationById: async (conversationId) => {
    try {
      const response = await api.get(`/api/messages/conversations/${conversationId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching conversation ${conversationId}:`, error);
      throw error;
    }
  },

  // Get messages for a specific conversation
  getMessages: async (conversationId) => {
    try {
      const response = await api.get(`/api/messages/conversations/${conversationId}/messages`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching messages for conversation ${conversationId}:`, error);
      throw error;
    }
  },

  // Send a message in a conversation
  sendMessage: async (conversationId, messageData) => {
    try {
      const response = await api.post(`/api/messages/conversations/${conversationId}/messages`, messageData);
      return response.data;
    } catch (error) {
      console.error(`Error sending message in conversation ${conversationId}:`, error);
      throw error;
    }
  },

  // Start a new conversation with a user
  startConversation: async (recipientId, initialMessage) => {
    try {
      const response = await api.post('/api/messages/conversations', {
        recipientId,
        initialMessage
      });
      return response.data;
    } catch (error) {
      console.error('Error starting conversation:', error);
      throw error;
    }
  }
};

export default messageService;