import api from './api';

export const searchService = {
  async globalSearch(query, isAuthenticated = false) {
    try {
      const response = await api.get('/search/global', {
        params: { 
          query, 
          authenticated: isAuthenticated 
        }
      });
      return response.data;
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  },

  // New function to fetch recommended results
  async getRecommended(isAuthenticated = false) {
    try {
      const response = await api.get('/search/recommended', {
        params: { authenticated: isAuthenticated }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching recommended data:', error);
      throw error;
    }
  }
};