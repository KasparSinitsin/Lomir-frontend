import api from './api';

export const searchService = {
  async globalSearch(query, isAuthenticated = false) {
    try {
      const response = await api.get('/search', {
        params: { 
          query, 
          // Only pass authenticated flag if true
          ...(isAuthenticated && { authenticated: true }) 
        }
      });
      return response.data;
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }
};