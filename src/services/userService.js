import api from "./api"; // Import the configured Axios instance

// Define the user service object
export const userService = {
  /**
   * Fetches user details by their ID.
   * @param {string|number} userId - The ID of the user to fetch.
   * @returns {Promise<object>} A promise resolving to the user data.
   */
  getUserById: async (userId) => {
    try {
      // Make GET request to the user endpoint
      const response = await api.get(`/api/users/${userId}`);
      console.log("API getUserById response:", response.data);

      // Check if visibility info is included
      if (response.data && response.data.data) {
        console.log("Profile visibility in getUserById response:", {
          is_public: response.data.data.is_public,
          type: typeof response.data.data.is_public,
        });
      }

      // Return the data from the response (already converted to camelCase by interceptor)
      return response.data;
    } catch (error) {
      // Log and re-throw errors for handling by the calling component
      console.error(`Error fetching user details for ID ${userId}:`, error);
      throw error;
    }
  },

  searchUsers: (query) =>
    api.get(`/api/users?search=${encodeURIComponent(query)}`),

  /**
   * Updates user details. Includes a temporary mock fallback for development.
   * @param {string|number} userId - The ID of the user to update.
   * @param {object} userData - An object containing the user data fields to update (in camelCase).
   * @returns {Promise<object>} A promise resolving to the backend response (or mock response).
   */
  updateUser: async (userId, userData) => {
    try {
      console.log(
        `Sending request to: ${api.defaults.baseURL}/api/users/${userId}`
      );
      console.log("With data:", userData);

      const response = await api.put(`/api/users/${userId}`, userData);
      console.log("API update response:", response.data);

      // Add some additional debug
      if (response.data && response.data.data) {
        console.log("Profile visibility in updateUser response:", {
          is_public: response.data.data.is_public,
          type: typeof response.data.data.is_public,
        });
      }

      return response.data;
    } catch (error) {
      console.error("Error updating user:", error);
      console.error("Error details:", {
        message: error.message,
        endpoint: `/api/users/${userId}`,
        requestData: userData,
        response: error.response?.data,
      });
      throw error;
    }
  },

  // --- User Tags Functions ---
  getUserTags: async (userId) => {
    try {
      const response = await api.get(`/api/users/${userId}/tags`);
      return response.data; // Assumes backend returns { success: true, data: [...] }
    } catch (error) {
      console.error(`Error fetching user tags for ID ${userId}:`, error);
      throw error;
    }
  },

  updateUserTags: async (userId, tagIds) => {
    // tagIds is likely an array of numbers/strings
    try {
      // Backend expects payload like { tags: [{ tag_id: 1 }, { tag_id: 3 }] }
      // The request interceptor handles converting the outer object keys to snake_case,
      // but ensure the payload structure matches the backend controller's expectation.
      // If backend expects snake_case { tag_id: ... }, send { tagId: ... } from here.
      const payload = {
        tags: tagIds.map((id) => ({ tagId: id })), // Send camelCase `tagId` here
      };
      const response = await api.put(`/api/users/${userId}/tags`, payload);
      return response.data;
    } catch (error) {
      console.error(`Error updating user tags for ID ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Deletes the current user's profile and all associated data.
   * @param {string|number} userId - The ID of the user to delete.
   * @returns {Promise<object>} A promise resolving to the deletion result.
   */
  deleteUser: async (userId) => {
    try {
      const response = await api.delete(`/api/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting user ${userId}:`, error);
      throw error;
    }
  },
};

// Export the service object as the default export
export default userService;
