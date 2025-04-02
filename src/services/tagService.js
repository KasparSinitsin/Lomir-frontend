import api from '../services/api';  

export const tagService = {
  // Fetch structured tags
  getStructuredTags: async () => {
    try {
      const response = await api.get('/tags/structured');
      return response.data;
    } catch (error) {
      console.error('Error fetching structured tags:', error);
      throw error;
    }
  },

  // Create a new tag
  createTag: async (tagData) => {
    try {
      const response = await api.post('/tags/create', tagData);
      return response.data;
    } catch (error) {
      console.error('Error creating tag:', error);
      throw error;
    }
  },

  // Search tags
  searchTags: async (query) => {
    try {
      const response = await api.get('/tags/search', { 
        params: { query } 
      });
      return response.data;
    } catch (error) {
      console.error('Error searching tags:', error);
      throw error;
    }
  }
};