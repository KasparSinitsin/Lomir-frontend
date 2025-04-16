import api from './api';

export const userService = {
  getUserById: async (userId) => {
    try {
      const response = await api.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user details:', error);
      throw error;
    }
  },

  updateUser: async (userId, userData) => {
    try {
      // Format tags consistently with team service
      const formattedTags = userData.tags?.map(tag => {
        if (typeof tag === 'object' && tag.tag_id) {
          return { tag_id: parseInt(tag.tag_id, 10) };
        } else if (typeof tag === 'number') {
          return { tag_id: tag };
        } else {
          return { tag_id: parseInt(tag, 10) };
        }
      }) || [];
  
      // Create submission data with formatted tags
      const submissionData = {
        ...userData,
        tags: formattedTags
      };
  
      const response = await api.put(`/users/${userId}`, submissionData);
      return response.data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  getUserTags: async (userId) => {
    try {
      const response = await api.get(`/users/${userId}/tags`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user tags:', error);
      throw error;
    }
  },

  updateUserTags: async (userId, tagIds) => {
    try {
      const response = await api.put(`/users/${userId}/tags`, { 
        tags: tagIds.map(tagId => ({ tag_id: tagId })) 
      });
      return response.data;
    } catch (error) {
      console.error('Error updating user tags:', error);
      throw error;
    }
  }
};