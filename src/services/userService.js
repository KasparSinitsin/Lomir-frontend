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

// In src/services/userService.js
updateUser: async (userId, userData) => {
  try {
    console.log(`userService.updateUser called for user ${userId} with:`, userData);
    
    // Try the real API call
    try {
      const response = await api.put(`/api/users/${userId}`, userData);
      return response.data;
    } catch (apiError) {
      console.warn('API call failed, using mock response:', apiError);
      
      // Mock successful response for development
      if (process.env.NODE_ENV !== 'production') {
        // Update local storage to maintain state between refreshes
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const updatedUser = { ...currentUser, ...userData };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        
        return {
          success: true,
          message: 'User updated successfully (mock)',
          data: updatedUser
        };
      } else {
        throw apiError; // Re-throw in production
      }
    }
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}


  // updateUser: async (userId, userData) => {
  //   try {
  //     const response = await api.put(`/api/users/${userId}`, userData);
  //     return response.data;
  //   } catch (error) {
  //     console.error('Error updating user:', error);
  //     throw error;
  //   }
  // },

  // getUserTags: async (userId) => {
  //   try {
  //     const response = await api.get(`/api/users/${userId}/tags`);
  //     return response.data;
  //   } catch (error) {
  //     console.error('Error fetching user tags:', error);
  //     throw error;
  //   }
  // },

  // updateUserTags: async (userId, tagIds) => {
  //   try {
  //     const response = await api.put(`/api/users/${userId}/tags`, { 
  //       tags: tagIds.map(tagId => ({ tagId })) // Use camelCase here
  //     });
  //     return response.data;
  //   } catch (error) {
  //     console.error('Error updating user tags:', error);
  //     throw error;
  //   }
  // }
};

export default userService;