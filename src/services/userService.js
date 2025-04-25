import api from './api'; // Import the configured Axios instance

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
      // Return the data from the response (already converted to camelCase by interceptor)
      return response.data;
    } catch (error) {
      // Log and re-throw errors for handling by the calling component
      console.error(`Error fetching user details for ID ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Updates user details. Includes a temporary mock fallback for development.
   * @param {string|number} userId - The ID of the user to update.
   * @param {object} userData - An object containing the user data fields to update (in camelCase).
   * @returns {Promise<object>} A promise resolving to the backend response (or mock response).
   */
  updateUser: async (userId, userData) => {
    try {
      // Log the attempt to update
      console.log(`userService.updateUser called for user ${userId} with:`, userData);

      // --- Temporary Workaround Logic ---
      try {
        // Attempt the actual API call first using PUT request
        // userData will be converted to snake_case by the request interceptor in api.js
        const response = await api.put(`/api/users/${userId}`, userData);
        console.log('API update call successful:', response.data);
        // Return the actual response data (converted back to camelCase by response interceptor)
        return response.data;

      } catch (apiError) {
        // Handle errors specifically from the API call
        console.warn('API update call failed:', apiError);

        // Check if in development environment to provide mock data
        // Ensure NODE_ENV is correctly set in your frontend build process
        if (process.env.NODE_ENV !== 'production') {
          console.log('Development mode: Providing mock success response for updateUser.');

          // Simulate successful update locally
          // Get current user data stored locally (if any)
          const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

          // --- FIX: Use 'let' instead of 'const' to allow reassignment ---
          let updatedUser = {}; // Initialize as empty object

          // Merge existing stored data with the new data provided
          // Note: This assumes 'currentUser' in localStorage is the user being edited.
          // Adjust logic if editing profiles other than the logged-in user.
          updatedUser = { ...currentUser, ...userData };

          // Update local storage only if the ID matches, to avoid overwriting wrong data
          if (currentUser && currentUser.id === parseInt(userId, 10)) {
             localStorage.setItem('currentUser', JSON.stringify(updatedUser));
             console.log('Mock update: Updated currentUser in localStorage.');
          } else {
             console.warn('Mock update: currentUser in localStorage does not match userId. LocalStorage not updated.');
             // If not the logged-in user, create a basic mock object based on input for the return value
             // Now this assignment is valid because updatedUser is declared with 'let'
             updatedUser = { id: parseInt(userId, 10), ...userData };
          }


          // Return a mock success response mimicking the backend structure
          return {
            success: true, // Simulate success status
            message: 'User updated successfully (mock)', // Mock message
            data: updatedUser // Return the merged/updated data
          };
        } else {
          // In production, do not mock. Re-throw the original API error.
          console.error('Production mode: Re-throwing API update error.');
          throw apiError;
        }
      }
      // --- End Temporary Workaround Logic ---

    } catch (error) {
      // Catch any other unexpected errors in this function's scope
      // This includes the "invalid assignment to const" error if the fix wasn't applied
      console.error('Error in top-level updateUser service function:', error);
      // Ensure the error is propagated so the UI can display the message
      throw error;
    }
  },


  // --- Commented Out Functions ---
  // These functions are currently commented out. Uncomment and potentially adjust
  // when you need to implement/test tag functionality.

  getUserTags: async (userId) => {
     try {
       const response = await api.get(`/api/users/${userId}/tags`);
       return response.data; // Assumes backend returns { success: true, data: [...] }
     } catch (error) {
       console.error(`Error fetching user tags for ID ${userId}:`, error);
       throw error;
     }
   },

  updateUserTags: async (userId, tagIds) => { // tagIds is likely an array of numbers/strings
     try {
       // Backend expects payload like { tags: [{ tag_id: 1 }, { tag_id: 3 }] }
       // The request interceptor handles converting the outer object keys to snake_case,
       // but ensure the payload structure matches the backend controller's expectation.
       // If backend expects snake_case { tag_id: ... }, send { tagId: ... } from here.
       const payload = {
         tags: tagIds.map(id => ({ tagId: id })) // Send camelCase `tagId` here
       };
       const response = await api.put(`/api/users/${userId}/tags`, payload);
       return response.data;
     } catch (error) {
       console.error(`Error updating user tags for ID ${userId}:`, error);
       throw error;
     }
   }
  // --- End Commented Out Functions ---

};

// Export the service object as the default export
export default userService;
