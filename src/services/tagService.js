import axios from 'axios';

const BASE_URL = '/api/tags'; // Adjust this to match your backend API base URL

export const tagService = {
  // Fetch structured tags
  getStructuredTags: async () => {
    try {
      const response = await axios.get(`${BASE_URL}/structured`);
      return response.data;
    } catch (error) {
      console.error('Error fetching structured tags:', error);
      throw error;
    }
  },

  // Create a new tag
  createTag: async (tagData) => {
    try {
      const response = await axios.post(`${BASE_URL}/create`, tagData);
      return response.data;
    } catch (error) {
      console.error('Error creating tag:', error);
      throw error;
    }
  },

  // Search tags
  searchTags: async (query) => {
    try {
      const response = await axios.get(`${BASE_URL}/search`, { 
        params: { query } 
      });
      return response.data;
    } catch (error) {
      console.error('Error searching tags:', error);
      throw error;
    }
  }
};