// src/services/tagService.js

import api from './api';  

export const tagService = {
  // Fetch structured tags
  getStructuredTags: async () => {
    try {
      const response = await api.get('/api/tags/structured');
      console.log("Raw tag structure from API:", response.data);
      
      // Process data to ensure all IDs are numeric
      const processedData = response.data.map(supercat => ({
        ...supercat,
        id: parseInt(supercat.id, 10),
        categories: supercat.categories.map(cat => ({
          ...cat,
          id: parseInt(cat.id, 10),
          tags: cat.tags.map(tag => ({
            ...tag,
            id: parseInt(tag.id, 10)
          }))
        }))
      }));
      
      console.log("Processed tag structure:", processedData);
      return processedData;
    } catch (error) {
      console.error('Error fetching structured tags:', error);
      throw error;
    }
  },

  // Create a new tag
  createTag: async (tagData) => {
    try {
      const response = await api.post('/api/tags/create', tagData);
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

export default tagService;