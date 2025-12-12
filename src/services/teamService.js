import api from "./api";

export const teamService = {
  // Create a new team
  createTeam: async (teamData) => {
    try {
      console.log("createTeam: Received data:", teamData);

      // Debug the teamavatar_url field
      console.log(
        "Team avatar URL field:",
        teamData.teamavatar_url || teamData.teamavatarUrl || "Not provided"
      );

      // Ensure tags are properly formatted
      const formattedTags =
        teamData.tags?.map((tag) => {
          if (typeof tag === "object" && tag.tag_id) {
            // If it's already an object with tag_id, ensure it's a number
            return { tag_id: parseInt(tag.tag_id, 10) };
          } else if (typeof tag === "number") {
            // If it's already a number, use it directly
            return { tag_id: tag };
          } else {
            // Otherwise, try to parse it as a number
            return { tag_id: parseInt(tag, 10) };
          }
        }) || [];

      // Make sure is_public is properly set as a boolean
      const isPublic = teamData.is_public === true;

      // 🔧 Correct handling of max_members:
      // - null  -> stays null       (unlimited)
      // - number/string -> parsed
      // - undefined/empty -> default (20)
      let maxMembers;

      if (teamData.max_members === null) {
        maxMembers = null; // unlimited
      } else if (
        teamData.max_members === undefined ||
        teamData.max_members === ""
      ) {
        maxMembers = 20; // fallback default
      } else {
        const parsed = parseInt(teamData.max_members, 10);
        maxMembers = Number.isNaN(parsed) ? 20 : parsed;
      }

      // Create validated team data with the avatar URL
      const validatedTeamData = {
        name: teamData.name,
        description: teamData.description || "",
        is_public: isPublic, // Ensure it's a boolean
        max_members: maxMembers,
        tags: formattedTags,
        // Include the team avatar URL - try both possible field names
        teamavatar_url:
          teamData.teamavatar_url || teamData.teamavatarUrl || null,
      };

      console.log("createTeam: Sending validated data:", validatedTeamData);

      const response = await api.post("/api/teams", validatedTeamData);
      return response.data;
    } catch (error) {
      console.error("Error in createTeam:", error);
      console.error("Error response data:", error.response?.data);
      throw error;
    }
  },

  getUserPendingApplications: async () => {
    try {
      const response = await api.get(`/api/teams/applications/user`);
      return response.data;
    } catch (error) {
      console.error("Error fetching user pending applications:", error);
      throw error;
    }
  },

  cancelApplication: async (applicationId) => {
    try {
      const response = await api.delete(
        `/api/teams/applications/${applicationId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error canceling application ${applicationId}:`, error);
      throw error;
    }
  },

  getTeamApplications: async (teamId) => {
    try {
      const response = await api.get(`/api/teams/${teamId}/applications`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching applications for team ${teamId}:`, error);
      throw error;
    }
  },

  handleTeamApplication: async (applicationId, action, response = "") => {
    try {
      const apiResponse = await api.put(
        `/api/teams/applications/${applicationId}`,
        {
          action,
          response,
        }
      );
      return apiResponse.data;
    } catch (error) {
      console.error(`Error handling application ${applicationId}:`, error);
      throw error;
    }
  },

  applyToJoinTeam: async (teamId, applicationData) => {
    try {
      const response = await api.post(
        `/api/teams/${teamId}/apply`,
        applicationData
      );
      return response.data;
    } catch (error) {
      console.error(`Error applying to join team ${teamId}:`, error);
      throw error;
    }
  },

  // Delete a team
  deleteTeam: async (teamId) => {
    try {
      const response = await api.delete(`/api/teams/${teamId}`);
      return response.data;
    } catch (error) {
      console.error(
        `Error deleting team ${teamId}:`,
        error.response ? error.response.data : error.message
      );
      throw error;
    }
  },

  // Fetch all teams
  getAllTeams: async (params = {}) => {
    try {
      const response = await api.get("/api/teams", { params });
      return response.data;
    } catch (error) {
      console.error(
        "Error fetching teams:",
        error.response ? error.response.data : error.message
      );
      throw error;
    }
  },

  // Fetch a single team by ID

  getTeamById: async (teamId) => {
    try {
      console.log(`Fetching team details for ID: ${teamId}`);
      const response = await api.get(`/api/teams/${teamId}`);

      // Ensure we preserve the privacy flag for members
      if (response.data && response.data.members) {
        response.data.members = response.data.members.map((member) => ({
          ...member,
          is_public: member.is_public === true, // Ensure it's a boolean
        }));
      }

      return response.data;
    } catch (error) {
      console.error(`Error fetching team ${teamId}:`, error);
      throw error;
    }
  },

  // getTeamById: async (teamId) => {
  //   try {
  //     console.log(`Fetching team details for ID: ${teamId}`);
  //     const response = await api.get(`/api/teams/${teamId}`);

  //     // Log the complete raw response including headers
  //     console.log('Raw API response from getTeamById:', {
  //       status: response.status,
  //       statusText: response.statusText,
  //       headers: response.headers,
  //       data: response.data
  //     });

  //     // Examine response structure
  //     if (response.data) {
  //       console.log('Response data structure:', {
  //         hasData: Boolean(response.data),
  //         dataType: typeof response.data,
  //         keys: Object.keys(response.data),
  //         hasNestedData: Boolean(response.data.data),
  //         hasTeamId: Boolean(response.data.id || (response.data.data && response.data.data.id)),
  //         hasOwnerId: Boolean(response.data.owner_id || (response.data.data && response.data.data.owner_id)),
  //         hasIsPublic: Boolean(response.data.is_public !== undefined || (response.data.data && response.data.data.is_public !== undefined))
  //       });
  //     }

  //     return response.data;
  //   } catch (error) {
  //     console.error(`Error fetching team ${teamId}:`, error);
  //     throw error;
  //   }
  // },

  // Update team details
  updateTeam: async (teamId, teamData) => {
    try {
      console.log("updateTeam: Updating team with data:", teamData);

      // Ensure tags are properly formatted
      const formattedTags =
        teamData.tags?.map((tag) => {
          if (typeof tag === "object" && tag.tag_id) {
            // If it's already an object with tag_id, ensure it's a number
            return { tag_id: parseInt(tag.tag_id, 10) };
          } else if (typeof tag === "number") {
            // If it's already a number, use it directly
            return { tag_id: tag };
          } else {
            // Otherwise, try to parse it as a number
            return { tag_id: parseInt(tag, 10) };
          }
        }) || [];

      // Create a new object with formatted tags
      const dataToSend = {
        ...teamData,
        tags: formattedTags,
      };

      // Only include avatar URL if it was explicitly provided
      if (
        teamData.teamavatar_url !== undefined ||
        teamData.teamavatarUrl !== undefined
      ) {
        dataToSend.teamavatar_url =
          teamData.teamavatar_url || teamData.teamavatarUrl || null;
      }

      console.log("updateTeam: Sending formatted data:", dataToSend);

      const response = await api.put(`/api/teams/${teamId}`, dataToSend);
      return response.data;
    } catch (error) {
      console.error(
        `Error updating team ${teamId}:`,
        error.response ? error.response.data : error.message
      );
      throw error;
    }
  },

  // Add a member to a team
  addTeamMember: async (teamId, userId) => {
    try {
      const response = await api.post(`/api/teams/${teamId}/members`, {
        memberId: userId,
      });
      return response.data;
    } catch (error) {
      console.error(
        `Error adding member to team ${teamId}:`,
        error.response ? error.response.data : error.message
      );
      throw error;
    }
  },

  // Remove a member from a team
  removeTeamMember: async (teamId, userId) => {
    try {
      const response = await api.delete(
        `/api/teams/${teamId}/members/${userId}`
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error removing member from team ${teamId}:`,
        error.response ? error.response.data : error.message
      );
      throw error;
    }
  },

  // Get all teams of the user
  getUserTeams: async (userId) => {
    try {
      if (!userId) {
        throw new Error("User ID is required");
      }
      const response = await api.get(`/api/teams/my-teams`, {
        params: { userId },
      });
      return response.data;
    } catch (error) {
      console.error(
        "Error fetching user teams:",
        error.response ? error.response.data : error.message
      );
      throw error;
    }
  },

  // Get user role in a team
  getUserRoleInTeam: async (teamId, userId) => {
    try {
      const response = await api.get(
        `/api/teams/${teamId}/members/${userId}/role`
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching user role in team ${teamId}:`,
        error.response ? error.response.data : error.message
      );
      return { data: { role: null } }; // Return a default response on error
    }
  },

  // Update member role in a team
  updateMemberRole: async (teamId, memberId, newRole) => {
    try {
      const response = await api.put(
        `/api/teams/${teamId}/members/${memberId}/role`,
        {
          newRole: newRole,
        }
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error updating member role in team ${teamId}:`,
        error.response ? error.response.data : error.message
      );
      throw error;
    }
  },

  // ==================== INVITATION METHODS ====================

  /**
   * Get all pending invitations sent by a specific team
   */
  getTeamSentInvitations: async (teamId) => {
    try {
      const response = await api.get(`/api/teams/${teamId}/invitations`);
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching sent invitations for team ${teamId}:`,
        error
      );
      throw error;
    }
  },

  getTeamsWhereUserCanInvite: async () => {
    try {
      const response = await api.get("/api/teams/can-invite");
      return response.data;
    } catch (error) {
      console.error("Error fetching teams for invite:", error);
      throw error;
    }
  },

  sendInvitation: async (teamId, inviteeId, message = "") => {
    try {
      const response = await api.post(`/api/teams/${teamId}/invitations`, {
        inviteeId,
        message,
      });
      return response.data;
    } catch (error) {
      console.error(`Error sending invitation to team ${teamId}:`, error);
      throw error;
    }
  },

  getUserReceivedInvitations: async () => {
    try {
      const response = await api.get("/api/teams/invitations/received");
      return response.data;
    } catch (error) {
      console.error("Error fetching received invitations:", error);
      throw error;
    }
  },

respondToInvitation: async (invitationId, action, responseMessage = "") => {
  try {
    const response = await api.put(`/api/teams/invitations/${invitationId}`, {
      action,
      response_message: responseMessage,
    });
    return response.data;
  } catch (error) {
    console.error(`Error responding to invitation ${invitationId}:`, error);
    throw error;
  }
},

  cancelInvitation: async (invitationId) => {
    try {
      const response = await api.delete(
        `/api/teams/invitations/${invitationId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error canceling invitation ${invitationId}:`, error);
      throw error;
    }
  },
};
export default teamService;
