import api, { call } from "./api";

export const userService = {
  /**
   * Fetches user details by their ID.
   * @param {string|number} userId - The ID of the user to fetch.
   * @returns {Promise<object>} A promise resolving to the user data.
   */
  getUserById: (userId) =>
    call(`fetching user details for ID ${userId}`, () =>
      api.get(`/api/users/${userId}`),
    ),

  searchUsers: (query) =>
    api.get(`/api/users?search=${encodeURIComponent(query)}`),

  /**
   * Updates user details. Keeps the verbose error block because we want the
   * request payload in the log when the backend rejects an update.
   * @param {string|number} userId
   * @param {object} userData - Fields to update (camelCase).
   * @returns {Promise<object>}
   */
  updateUser: async (userId, userData) => {
    try {
      const response = await api.put(`/api/users/${userId}`, userData);
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

  // --- User Tags ---
  getUserTags: (userId) =>
    call(`fetching user tags for ID ${userId}`, () =>
      api.get(`/api/users/${userId}/tags`),
    ),

  updateUserTags: (userId, tagIds) =>
    call(`updating user tags for ID ${userId}`, () =>
      api.put(`/api/users/${userId}/tags`, {
        // Backend expects { tags: [{ tag_id: ... }] }; send camelCase tagId
        // here and rely on the request interceptor to convert to snake_case.
        tags: tagIds.map((id) => ({ tagId: id })),
      }),
    ),

  /**
   * Fetches badges for a specific user.
   * @param {string|number} userId
   * @returns {Promise<object>}
   */
  getUserBadges: (userId) =>
    call(`fetching badges for user ${userId}`, () =>
      api.get(`/api/users/${userId}/badges`),
    ),

  /**
   * Hide or unhide one awarded badge event on the current user's profile.
   * @param {string|number} userId
   * @param {string|number} awardId
   * @param {boolean} hidden
   * @returns {Promise<object>}
   */
  updateUserBadgeVisibility: (userId, awardId, hidden = true) =>
    call(
      `updating badge award ${awardId} visibility for user ${userId}`,
      () =>
        api.patch(
          `/api/users/${userId}/badges/awards/${awardId}/visibility`,
          { hidden },
        ),
    ),

  /**
   * Delete one awarded badge event from the current user's profile.
   * @param {string|number} userId
   * @param {string|number} awardId
   * @returns {Promise<object>}
   */
  deleteUserBadgeAward: (userId, awardId) =>
    call(`deleting badge award ${awardId} for user ${userId}`, () =>
      api.delete(`/api/badges/awards/${awardId}`),
    ),

  /**
   * Fetches a preview of everything affected by deleting the current user's account.
   * @param {string|number} userId
   * @param {string} password
   * @returns {Promise<object>}
   */
  deletionPreview: (userId, password) =>
    call(`fetching deletion preview for user ${userId}`, () =>
      api.post(
        `/api/users/${userId}/deletion-preview`,
        { password },
        { skipAuthRedirect: true },
      ),
    ),

  /**
   * Deletes the current user's profile and all associated data.
   * @param {string|number} userId
   * @param {string} password
   * @param {Array<object>} ownershipOverrides
   * @returns {Promise<object>}
   */
  deleteUser: (userId, password, ownershipOverrides = []) =>
    call(`deleting user ${userId}`, () =>
      api.delete(`/api/users/${userId}`, {
        data: { password, ownershipOverrides },
        skipAuthRedirect: true,
      }),
    ),

  /**
   * Deletes the user's avatar image and removes it from the profile.
   * @param {string|number} userId
   * @returns {Promise<object>}
   */
  deleteUserAvatar: (userId) =>
    call(`deleting avatar for user ${userId}`, () =>
      api.delete(`/api/users/${userId}/avatar`),
    ),

  changePassword: (currentPassword, newPassword) =>
    call("changing password", () =>
      api.put("/api/auth/change-password", { currentPassword, newPassword }),
    ),

  changeEmail: (newEmail, currentPassword) =>
    call("changing email", () =>
      api.put("/api/auth/change-email", { newEmail, currentPassword }),
    ),
};

export default userService;
