import api from './api';

export const userService = {
  getUserById: async (userId) => {
    try {
      const response = await api.get(`/api/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user details:', error);
      throw error;
    }
  },

  updateUser: async (userId, userData) => {
    try {
      const response = await api.put(`/api/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  getUserTags: async (userId) => {
    try {
      const response = await api.get(`/api/users/${userId}/tags`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user tags:', error);
      throw error;
    }
  },

  updateUserTags: async (userId, tagIds) => {
    try {
      const response = await api.put(`/api/users/${userId}/tags`, { 
        tags: tagIds.map(tagId => ({ tag_id: tagId })) 
      });
      return response.data;
    } catch (error) {
      console.error('Error updating user tags:', error);
      throw error;
    }
  }
};