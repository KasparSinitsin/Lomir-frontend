import api from "./api";

/**
 * Service for team vacant role CRUD operations.
 *
 * All endpoints are scoped to a team:
 *   /api/teams/:teamId/vacant-roles
 */
export const vacantRoleService = {
  /**
   * Get all vacant roles for a team
   * @param {number} teamId
   * @param {string} status - "open" (default), "filled", "closed", or "all"
   */
  async getVacantRoles(teamId, status = "open") {
    const response = await api.get(`/api/teams/${teamId}/vacant-roles`, {
      params: { status },
    });
    return response.data;
  },

  /**
   * Get a single vacant role by ID
   * @param {number} teamId
   * @param {number} roleId
   */
  async getVacantRoleById(teamId, roleId) {
    const response = await api.get(
      `/api/teams/${teamId}/vacant-roles/${roleId}`,
    );
    return response.data;
  },

  /**
   * Create a new vacant role
   * @param {number} teamId
   * @param {object} roleData - { role_name, bio, postal_code, city, country,
   *   state, latitude, longitude, max_distance_km, is_remote, tag_ids, badge_ids }
   */
  async createVacantRole(teamId, roleData) {
    const response = await api.post(
      `/api/teams/${teamId}/vacant-roles`,
      roleData,
    );
    return response.data;
  },

  /**
   * Update an existing vacant role
   * @param {number} teamId
   * @param {number} roleId
   * @param {object} roleData - same shape as create, partial updates OK
   */
  async updateVacantRole(teamId, roleId, roleData) {
    const response = await api.put(
      `/api/teams/${teamId}/vacant-roles/${roleId}`,
      roleData,
    );
    return response.data;
  },

  /**
   * Delete a vacant role
   * @param {number} teamId
   * @param {number} roleId
   */
  async deleteVacantRole(teamId, roleId) {
    const response = await api.delete(
      `/api/teams/${teamId}/vacant-roles/${roleId}`,
    );
    return response.data;
  },

  /**
   * Update role status (open → filled/closed)
   * @param {number} teamId
   * @param {number} roleId
   * @param {string} status - "open", "filled", or "closed"
   * @param {number|null} filledBy - user ID if status is "filled"
   */
  async updateVacantRoleStatus(teamId, roleId, status, filledBy = null) {
    const response = await api.put(
      `/api/teams/${teamId}/vacant-roles/${roleId}/status`,
      { status, filled_by: filledBy },
    );
    return response.data;
  },
};

export default vacantRoleService;
