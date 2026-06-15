import api, { call } from "./api";
import { snakeToCamel } from "../utils/formatters";

// Preserves both snake_case and camelCase keys so callers that read either
// casing keep working — many user-facing components defensively read both.
const normalizeUserPayload = (payload) => {
  const rawUser = payload?.data ?? payload ?? null;
  if (!rawUser || typeof rawUser !== "object" || Array.isArray(rawUser)) {
    return payload;
  }

  const normalized = { ...rawUser, ...snakeToCamel(rawUser) };

  if (Array.isArray(rawUser.badges)) {
    normalized.badges = rawUser.badges.map((badge) =>
      badge && typeof badge === "object"
        ? { ...badge, ...snakeToCamel(badge) }
        : badge,
    );
  }

  return payload?.data !== undefined
    ? { ...payload, data: normalized }
    : normalized;
};

export const userService = {
  /**
   * Fetches user details by their ID.
   * @param {string|number} userId - The ID of the user to fetch.
   * @returns {Promise<object>} A promise resolving to the user data.
   */
  getUserById: (userId) =>
    call(`fetching user details for ID ${userId}`, () =>
      api.get(`/api/users/${userId}`, {
        skipResponseCaseTransform: true,
      }),
    ).then(normalizeUserPayload),

  searchUsers: (query) =>
    api.get("/api/search/global", {
      params: { searchType: "users", query },
    }),

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

  // --- User Blocks ---

  /**
   * Fetches the users the current user has blocked (card data for the blocklist).
   * @param {string|number} userId
   * @returns {Promise<object>}
   */
  getBlockedUsers: (userId) =>
    call(`fetching blocked users for ${userId}`, () =>
      api.get(`/api/users/${userId}/blocks`),
    ),

  /**
   * Blocks another user. The request interceptor converts `blockedId` to
   * `blocked_id` for the backend.
   * @param {string|number} userId - The current (blocking) user's id.
   * @param {string|number} blockedId - The user to block.
   * @returns {Promise<object>}
   */
  blockUser: (userId, blockedId) =>
    call(`blocking user ${blockedId}`, () =>
      api.post(`/api/users/${userId}/blocks`, { blockedId }),
    ),

  /**
   * Removes a user from the current user's blocklist.
   * @param {string|number} userId
   * @param {string|number} blockedId
   * @returns {Promise<object>}
   */
  unblockUser: (userId, blockedId) =>
    call(`unblocking user ${blockedId}`, () =>
      api.delete(`/api/users/${userId}/blocks/${blockedId}`),
    ),

  /**
   * Fetches every user id in a block relationship with the current user
   * (either direction), used to mutually anonymize blocked users in teams.
   * @param {string|number} userId
   * @returns {Promise<object>}
   */
  getBlockRelationships: (userId) =>
    call(`fetching block relationships for ${userId}`, () =>
      api.get(`/api/users/${userId}/block-relationships`),
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
