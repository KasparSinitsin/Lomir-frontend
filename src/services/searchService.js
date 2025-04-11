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
  }
};