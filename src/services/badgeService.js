import api from "./api";

/**
 * Badge Service
 *
 * Handles all badge-related API calls.
 */
export const badgeService = {
  /**
   * Fetches all available badges (grouped by category on the backend).
   * @returns {Promise<object>} { success: true, data: [...badges] }
   */
  getAllBadges: async () => {
    try {
      const response = await api.get("/api/badges");
      return response.data;
    } catch (error) {
      console.error("Error fetching all badges:", error);
      throw error;
    }
  },

  /**
   * Award a badge to a user.
   * @param {object} awardData
   * @param {number} awardData.awardedToUserId - The user receiving the badge
   * @param {number} awardData.badgeId - The badge to award
   * @param {number} awardData.credits - Credit points (1, 2, or 3)
   * @param {string} [awardData.reason] - Optional reason/comment
   * @param {string} [awardData.contextType] - Optional context type (team, project, profile)
   * @param {number} [awardData.contextId] - Optional context ID
   * @param {number} [awardData.teamId] - Optional team ID
   * @returns {Promise<object>} { success: true, data: {...award} }
   */
  awardBadge: async (awardData) => {
    try {
      const response = await api.post("/api/badges/award", awardData);
      return response.data;
    } catch (error) {
      console.error("Error awarding badge:", error);
      throw error;
    }
  },
};

export default badgeService;
