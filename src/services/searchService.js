// src/services/searchService.js
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
  async getRecommended(userId, isAuthenticated = false) { // Expecting userId now
    try {
      const response = await api.get('/search/recommended', {
        params: {
          userId: userId, // Passing userId as a parameter
          authenticated: isAuthenticated
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching recommended data:', error);
      throw error;
    }
  },

  // Function to fetch all users and teams
  async getAllUsersAndTeams(isAuthenticated = false) {
    try {
      const response = await api.get('/search/all', {
        params: { authenticated: isAuthenticated }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching all users and teams:', error);
      throw error;
    }
  }
};