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
      const response = await api.get('/api/tags/search', { 
        params: { query } 
      });
      return response.data;
    } catch (error) {
      console.error('Error searching tags:', error);
      throw error;
    }
  }
,

 // NEW METHODS FOR AUTOCOMPLETE

  /**
   * Get popular tags with usage counts
   */
  getPopularTags: async (limit = 10, supercategory = null) => {
    try {
      const params = { limit };
      if (supercategory) {
        params.supercategory = supercategory;
      }
      const response = await api.get('/api/tags/popular', { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching popular tags:', error);
      return [];
    }
  },

  /**
   * Get tag suggestions based on search query
   */
  getSuggestions: async (query, limit = 10, excludeIds = []) => {
    try {
      if (!query || query.trim().length === 0) {
        return [];
      }
      const params = { 
        query: query.trim(), 
        limit 
      };
      if (excludeIds.length > 0) {
        params.exclude = excludeIds.join(',');
      }
      const response = await api.get('/api/tags/suggestions', { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching tag suggestions:', error);
      return [];
    }
  },

  /**
   * Get related tags from same category or supercategory
   */
  getRelatedTags: async (tagId, limit = 5, excludeIds = []) => {
    try {
      const params = { limit };
      if (excludeIds.length > 0) {
        params.exclude = excludeIds.join(',');
      }
      const response = await api.get(`/api/tags/related/${tagId}`, { params });
      return {
        tags: response.data.data || [],
        context: response.data.context || {}
      };
    } catch (error) {
      console.error('Error fetching related tags:', error);
      return { tags: [], context: {} };
    }
  }

};

export default tagService;