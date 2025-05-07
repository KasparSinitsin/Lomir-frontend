import api from './api';

export const teamService = {
  // Create a new team
  createTeam: async (teamData) => {
    try {
      console.log("createTeam: Received data:", teamData);
      
      // Ensure tags are properly formatted
      const formattedTags = teamData.tags?.map(tag => {
        if (typeof tag === 'object' && tag.tag_id) {
          // If it's already an object with tag_id, ensure it's a number
          return { tag_id: parseInt(tag.tag_id, 10) };
        } else if (typeof tag === 'number') {
          // If it's already a number, use it directly
          return { tag_id: tag };
        } else {
          // Otherwise, try to parse it as a number
          return { tag_id: parseInt(tag, 10) };
        }
      }) || [];
      
      const validatedTeamData = {
        name: teamData.name,
        description: teamData.description || '',
        is_public: typeof teamData.is_public === 'boolean' ? teamData.is_public : Boolean(teamData.is_public),
        max_members: teamData.max_members || 20,
        tags: formattedTags,
      };
      
      console.log("createTeam: Sending validated data:", validatedTeamData);
      
      const response = await api.post('/api/teams', validatedTeamData); 
      return response.data;
    } catch (error) {
      console.error("Error in createTeam:", error);
      console.error("Error response data:", error.response?.data);
      throw error;
    }
  },

  // Delete a team
  deleteTeam: async (teamId) => {
    try {
      const response = await api.delete(`/api/teams/${teamId}`); 
      return response.data;
    } catch (error) {
      console.error(`Error deleting team ${teamId}:`, error.response ? error.response.data : error.message);
      throw error;
    }
  },

  // Fetch all teams
  getAllTeams: async (params = {}) => {
    try {
      const response = await api.get('/api/teams', { params }); 
      return response.data;
    } catch (error) {
      console.error('Error fetching teams:', error.response ? error.response.data : error.message);
      throw error;
    }
  },

  // Fetch a single team by ID
  getTeamById: async (teamId) => {
    try {
      const response = await api.get(`/api/teams/${teamId}`); 
      return response.data;
    } catch (error) {
      console.error(`Error fetching team ${teamId}:`, error.response ? error.response.data : error.message);
      throw error;
    }
  },

  // Update team details
  updateTeam: async (teamId, teamData) => {
    try {
      console.log("updateTeam: Updating team with data:", teamData);
      
      // Ensure tags are properly formatted
      const formattedTags = teamData.tags?.map(tag => {
        if (typeof tag === 'object' && tag.tag_id) {
          // If it's already an object with tag_id, ensure it's a number
          return { tag_id: parseInt(tag.tag_id, 10) };
        } else if (typeof tag === 'number') {
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
        tags: formattedTags
      };
      
      console.log("updateTeam: Sending formatted data:", dataToSend);
      
      const response = await api.put(`/api/teams/${teamId}`, dataToSend); 
      return response.data;
    } catch (error) {
      console.error(`Error updating team ${teamId}:`, error.response ? error.response.data : error.message);
      throw error;
    }
  },

  // Add a member to a team
  addTeamMember: async (teamId, userId) => {
    try {
      const response = await api.post(`/api/teams/${teamId}/members`, { memberId: userId }); 
      return response.data;
    } catch (error) {
      console.error(`Error adding member to team ${teamId}:`, error.response ? error.response.data : error.message);
      throw error;
    }
  },

  // Remove a member from a team
  removeTeamMember: async (teamId, userId) => {
    try {
      const response = await api.delete(`/api/teams/${teamId}/members/${userId}`); 
      return response.data;
    } catch (error) {
      console.error(`Error removing member from team ${teamId}:`, error.response ? error.response.data : error.message);
      throw error;
    }
  },

  // Get all teams of the user
  getUserTeams: async (userId) => {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }
      const response = await api.get(`/api/teams/my-teams`, { params: { userId } }); 
      return response.data;
    } catch (error) {
      console.error('Error fetching user teams:', error.response ? error.response.data : error.message);
      throw error;
    }
  },
  
  // Get user role in a team
  getUserRoleInTeam: async (teamId, userId) => {
    try {
      const response = await api.get(`/api/teams/${teamId}/members/${userId}/role`); 
      return response.data;
    } catch (error) {
      console.error(`Error fetching user role in team ${teamId}:`, error.response ? error.response.data : error.message);
      return { data: { role: null } }; // Return a default response on error
    }
  }
};

export default teamService;