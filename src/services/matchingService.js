import api from "./api";

/**
 * Service for the matching system API.
 *
 * Endpoints:
 *   GET /api/matching/roles            — roles matching the current user
 *   GET /api/matching/role/:id/candidates — users matching a specific role
 */
export const matchingService = {
  /**
   * Get vacant roles that match the current user's profile.
   * Requires authentication.
   *
   * @param {Object} options
   * @param {number} options.limit - Max results (default 20)
   * @param {number} options.minScore - Minimum match score 0–1 (default 0)
   * @returns {Promise<Object>} { success, data: [...roles with match_score], meta }
   */
  async getMatchingRoles({ limit = 20, minScore = 0 } = {}) {
    const response = await api.get("/api/matching/roles", {
      params: { limit, min_score: minScore },
    });
    return response.data;
  },

  /**
   * Get matching scores for vacant roles within a specific team.
   * Scopes the scoring to a single team so it can be used inside
   * TeamDetailsModal's VacantRolesSection.
   *
   * @param {number} teamId - The team whose roles to score
   * @param {Object} options
   * @param {number} options.limit - Max results (default 20)
   * @param {number} options.minScore - Minimum match score 0–1 (default 0)
   * @returns {Promise<Object>} { success, data: [...roles with match_score], meta }
   */
  async getMatchingRolesForTeam(teamId, { limit = 20, minScore = 0 } = {}) {
    const response = await api.get("/api/matching/roles", {
      params: { limit, min_score: minScore, team_id: teamId },
    });
    return response.data;
  },

  /**
   * Get users that match a specific vacant role.
   * Requires authentication (owner/admin of the team).
   *
   * @param {number} roleId - The vacant role ID
   * @param {Object} options
   * @param {number} options.limit - Max results (default 20)
   * @returns {Promise<Object>} { success, data: [...users with match_score], meta }
   */
  async getMatchingCandidates(roleId, { limit = 20 } = {}) {
    const response = await api.get(
      `/api/matching/role/${roleId}/candidates`,
      { params: { limit } },
    );
    return response.data;
  },
};

export default matchingService;