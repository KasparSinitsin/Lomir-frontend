import api, { call } from "./api";

export const teamService = {
  // Create a new team — keeps explicit try/catch for the extra response-data
  // log on failure (the axios interceptor logs error.response.data too, but
  // this duplicate aids debugging team-creation specifically).
  createTeam: async (teamData) => {
    try {
      const formattedTags =
        teamData.tags?.map((tag) => {
          if (typeof tag === "object" && tag.tag_id) {
            return { tag_id: parseInt(tag.tag_id, 10) };
          } else if (typeof tag === "number") {
            return { tag_id: tag };
          } else {
            return { tag_id: parseInt(tag, 10) };
          }
        }) || [];

      const isPublic = teamData.is_public === true;

      // max_members: null = unlimited; missing/empty = 20 (default)
      let maxMembers;
      if (teamData.max_members === null) {
        maxMembers = null;
      } else if (
        teamData.max_members === undefined ||
        teamData.max_members === ""
      ) {
        maxMembers = 20;
      } else {
        const parsed = parseInt(teamData.max_members, 10);
        maxMembers = Number.isNaN(parsed) ? 20 : parsed;
      }

      const validatedTeamData = {
        name: teamData.name,
        description: teamData.description || "",
        is_public: isPublic,
        max_members: maxMembers,
        tags: formattedTags,
        teamavatar_url:
          teamData.teamavatar_url || teamData.teamavatarUrl || null,
        is_remote: teamData.is_remote ?? false,
        postal_code: teamData.is_remote ? null : teamData.postal_code || null,
        city: teamData.is_remote ? null : teamData.city || null,
        country: teamData.is_remote ? null : teamData.country || null,
      };

      const response = await api.post("/api/teams", validatedTeamData);
      return response.data;
    } catch (error) {
      console.error("Error in createTeam:", error);
      console.error("Error response data:", error.response?.data);
      throw error;
    }
  },

  getUserPendingApplications: () =>
    call("fetching user pending applications", () =>
      api.get(`/api/teams/applications/user`),
    ),

  cancelApplication: (applicationId) =>
    call(`canceling application ${applicationId}`, () =>
      api.delete(`/api/teams/applications/${applicationId}`),
    ),

  // Keeps explicit try/catch — suppresses the error log for the expected
  // 403 case when the caller opted in via skipAuthRedirect.
  getTeamApplications: async (teamId, requestConfig = {}) => {
    try {
      const response = await api.get(
        `/api/teams/${teamId}/applications`,
        requestConfig,
      );
      return response.data;
    } catch (error) {
      if (!(requestConfig.skipAuthRedirect && error.response?.status === 403)) {
        console.error(`Error fetching applications for team ${teamId}:`, error);
      }
      throw error;
    }
  },

  // Keeps explicit try/catch — re-throws a wrapped Error with a friendlier
  // message extracted from the server response.
  handleTeamApplication: async (
    applicationId,
    action,
    response = "",
    fillRole = false,
  ) => {
    try {
      const apiResponse = await api.put(
        `/api/teams/applications/${applicationId}`,
        { action, response, fillRole },
      );
      return apiResponse.data;
    } catch (error) {
      console.error(`Error handling application ${applicationId}:`, error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          `Failed to ${action} application`,
      );
    }
  },

  applyToJoinTeam: (teamId, applicationData) =>
    call(`applying to join team ${teamId}`, () =>
      api.post(`/api/teams/${teamId}/apply`, applicationData),
    ),

  deleteTeam: (teamId) =>
    call(`deleting team ${teamId}`, () => api.delete(`/api/teams/${teamId}`)),

  getAllTeams: (params = {}) =>
    call("fetching teams", () => api.get("/api/teams", { params })),

  // Keeps explicit try/catch — post-processes response to normalize boolean
  // flags on the team and its members.
  getTeamById: async (teamId) => {
    const normalizeBoolean = (v) => {
      if (v === true) return true;
      if (v === false) return false;
      if (typeof v === "string") {
        const s = v.trim().toLowerCase();
        if (["true", "1", "t", "yes", "y"].includes(s)) return true;
        if (["false", "0", "f", "no", "n"].includes(s)) return false;
      }
      if (typeof v === "number") return v === 1;
      return undefined;
    };

    try {
      const response = await api.get(`/api/teams/${teamId}`);

      const teamData = response.data?.data || response.data;
      if (!Array.isArray(teamData.members)) teamData.members = [];

      if (teamData && typeof teamData === "object") {
        teamData.is_public = normalizeBoolean(teamData.is_public);
        if (teamData.members && Array.isArray(teamData.members)) {
          teamData.members = teamData.members.map((member) => ({
            ...member,
            is_public: normalizeBoolean(member.is_public),
          }));
        }
      }

      return response.data;
    } catch (error) {
      console.error(`Error fetching team ${teamId}:`, error);
      throw error;
    }
  },

  /**
   * Fetches all badge awards for team members linked to team focus areas.
   * Same shape as user badge awards, with extra awarded_to_* fields.
   * @returns {Promise<object>} { success: true, data: [...awards] }
   */
  getTeamBadgeAwards: (teamId) =>
    call(`fetching badge awards for team ${teamId}`, () =>
      api.get(`/api/teams/${teamId}/badge-awards`),
    ),

  /**
   * Aggregated badge summary for all members of a team. One row per badge
   * with total credits and award counts. Compatible with BadgesDisplaySection.
   * @returns {Promise<object>} { success, data: [...badges], meta: { totalCredits } }
   */
  getTeamMemberBadges: (teamId) =>
    call(`fetching member badges for team ${teamId}`, () =>
      api.get(`/api/teams/${teamId}/member-badges`),
    ),

  /**
   * Bulk variant of getTeamMemberBadges for multiple teams in a single
   * request. Returns { data: { [teamId]: [...badges] }, meta: { ... } }.
   */
  getMemberBadgesForTeams: (teamIds) => {
    const ids = Array.isArray(teamIds) ? teamIds.filter(Boolean) : [];
    if (ids.length === 0) {
      return Promise.resolve({
        success: true,
        data: {},
        meta: { totalCreditsByTeam: {} },
      });
    }
    return call("fetching bulk team member badges", () =>
      api.get(`/api/teams/member-badges?teamIds=${ids.join(",")}`),
    );
  },

  /**
   * ALL badge awards for team members (not filtered by focus areas).
   * Used by badge category and badge pill drill-down modals.
   */
  getTeamMemberBadgeAwards: (teamId) =>
    call(`fetching member badge awards for team ${teamId}`, () =>
      api.get(`/api/teams/${teamId}/member-badge-awards`),
    ),

  // Keeps explicit try/catch — complex tag + location normalization needs to
  // happen before the request.
  updateTeam: async (teamId, teamData) => {
    try {
      const formattedTags =
        teamData.tags?.map((tag) => {
          if (typeof tag === "object" && tag.tag_id) {
            return { tag_id: parseInt(tag.tag_id, 10) };
          } else if (typeof tag === "number") {
            return { tag_id: tag };
          } else {
            return { tag_id: parseInt(tag, 10) };
          }
        }) || [];

      // Accept either snake_case or camelCase from the caller
      const isRemote = teamData.is_remote ?? teamData.isRemote ?? false;
      const toNullOrTrimmed = (v) => {
        if (v === null || v === undefined) return null;
        const s = String(v).trim();
        return s === "" ? null : s;
      };

      const postal_code = isRemote
        ? null
        : toNullOrTrimmed(teamData.postal_code ?? teamData.postalCode);
      const city = isRemote ? null : toNullOrTrimmed(teamData.city);
      const state = isRemote ? null : toNullOrTrimmed(teamData.state);
      const district = isRemote ? null : toNullOrTrimmed(teamData.district);
      const country = isRemote ? null : toNullOrTrimmed(teamData.country);

      const dataToSend = {
        ...teamData,
        tags: formattedTags,
        is_remote: Boolean(isRemote),
        postal_code,
        city,
        state,
        district,
        country,
      };

      // Only include avatar URL if it was explicitly provided
      if (
        teamData.teamavatar_url !== undefined ||
        teamData.teamavatarUrl !== undefined
      ) {
        dataToSend.teamavatar_url =
          teamData.teamavatar_url || teamData.teamavatarUrl || null;
      }

      // Remove camelCase duplicates so we don't send both forms
      delete dataToSend.isRemote;
      delete dataToSend.postalCode;

      const response = await api.put(`/api/teams/${teamId}`, dataToSend);
      return response.data;
    } catch (error) {
      console.error(
        `Error updating team ${teamId}:`,
        error.response ? error.response.data : error.message,
      );
      throw error;
    }
  },

  /**
   * Deletes the team's avatar image and removes it from the team.
   */
  deleteTeamAvatar: (teamId) =>
    call(`deleting avatar for team ${teamId}`, () =>
      api.delete(`/api/teams/${teamId}/avatar`),
    ),

  addTeamMember: (teamId, userId) =>
    call(`adding member to team ${teamId}`, () =>
      api.post(`/api/teams/${teamId}/members`, { memberId: userId }),
    ),

  removeTeamMember: (teamId, userId) =>
    call(`removing member from team ${teamId}`, () =>
      api.delete(`/api/teams/${teamId}/members/${userId}`),
    ),

  /**
   * Get all teams of the user with pagination.
   * @param {number} userId
   * @param {{page?: number, limit?: number}} [opts]
   * @returns {Promise<Object>} User teams with pagination metadata
   */
  getUserTeams: (userId, { page = 1, limit = 10 } = {}) => {
    if (!userId) {
      return Promise.reject(new Error("User ID is required"));
    }
    return call("fetching user teams", () =>
      api.get(`/api/teams/my-teams`, { params: { userId, page, limit } }),
    );
  },

  // Keeps explicit try/catch — returns a synthetic default on error rather
  // than rethrowing, so callers can render without role info.
  getUserRoleInTeam: async (teamId, userId) => {
    try {
      const response = await api.get(
        `/api/teams/${teamId}/members/${userId}/role`,
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching user role in team ${teamId}:`,
        error.response ? error.response.data : error.message,
      );
      return { data: { role: null } };
    }
  },

  updateMemberRole: (teamId, memberId, newRole) =>
    call(`updating member role in team ${teamId}`, () =>
      api.put(`/api/teams/${teamId}/members/${memberId}/role`, { newRole }),
    ),

  // ==================== INVITATION METHODS ====================

  // Keeps explicit try/catch — suppresses log for the expected 403 case.
  getTeamSentInvitations: async (teamId, requestConfig = {}) => {
    try {
      const response = await api.get(
        `/api/teams/${teamId}/invitations`,
        requestConfig,
      );
      return response.data;
    } catch (error) {
      if (!(requestConfig.skipAuthRedirect && error.response?.status === 403)) {
        console.error(
          `Error fetching sent invitations for team ${teamId}:`,
          error,
        );
      }
      throw error;
    }
  },

  getTeamsWhereUserCanInvite: (inviteeId = null) => {
    const params = inviteeId ? { inviteeId } : {};
    return call("fetching teams for invite", () =>
      api.get("/api/teams/can-invite", { params }),
    );
  },

  sendInvitation: (teamId, inviteeId, message = "", roleId = null) => {
    const invitationData = { inviteeId, message };
    if (roleId !== null && roleId !== undefined) {
      invitationData.roleId = roleId;
    }
    return call(`sending invitation to team ${teamId}`, () =>
      api.post(`/api/teams/${teamId}/invitations`, invitationData),
    );
  },

  getUserReceivedInvitations: () =>
    call("fetching received invitations", () =>
      api.get("/api/teams/invitations/received"),
    ),

  // Keeps explicit try/catch — re-throws a wrapped Error with a friendlier
  // message extracted from the server response.
  respondToInvitation: async (
    invitationId,
    action,
    responseMessage = "",
    fillRole = false,
    options = {},
  ) => {
    try {
      const response = await api.put(`/api/teams/invitations/${invitationId}`, {
        action,
        response_message: responseMessage,
        fill_role: fillRole,
        switch_roles: options.switchRoles || options.switch_roles || undefined,
      });
      return response.data;
    } catch (error) {
      console.error(`Error responding to invitation ${invitationId}:`, error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          `Failed to ${action} invitation`,
      );
    }
  },

  cancelInvitation: (invitationId) =>
    call(`canceling invitation ${invitationId}`, () =>
      api.delete(`/api/teams/invitations/${invitationId}`),
    ),

  cancelRoleInvitation: (invitationId) =>
    call(`canceling role invitation ${invitationId}`, () =>
      api.delete(`/api/teams/invitations/${invitationId}/role`),
    ),
};

export default teamService;
