import api from './api';

export const teamService = {
  // Create a new team
  createTeam: async (teamData) => {
    const validatedTeamData = {
      name: teamData.name,
      description: teamData.description || '',
      is_public: teamData.is_public === 1 ? true : false, 
      max_members: teamData.max_members || 20, 
      tags: teamData.tags || [], 
    };

    const response = await api.post('/teams', validatedTeamData);
    return response.data;
  },

  // Delete a team
  deleteTeam: async (teamId) => {
    try {
      const response = await api.delete(`/teams/${teamId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting team ${teamId}:`, error.response ? error.response.data : error.message);
      throw error;
    }
  },

  // Fetch all teams
  getAllTeams: async (params = {}) => {
    try {
      const response = await api.get('/teams', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching teams:', error.response ? error.response.data : error.message);
      throw error;
    }
  },

  // Fetch a single team by ID
  getTeamById: async (teamId) => {
    try {
      const response = await api.get(`/teams/${teamId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching team ${teamId}:`, error.response ? error.response.data : error.message);
      throw error;
    }
  },

  // Update team details
  updateTeam: async (teamId, teamData) => {
    try {
      const response = await api.put(`/teams/${teamId}`, teamData);
      return response.data;
    } catch (error) {
      console.error(`Error updating team ${teamId}:`, error.response ? error.response.data : error.message);
      throw error;
    }
  },

  // Add a member to a team
  addTeamMember: async (teamId, userId) => {
    try {
      const response = await api.post(`/teams/${teamId}/members`, { memberId: userId });
      return response.data;
    } catch (error) {
      console.error(`Error adding member to team ${teamId}:`, error.response ? error.response.data : error.message);
      throw error;
    }
  },

  // Remove a member from a team
  removeTeamMember: async (teamId, userId) => {
    try {
      const response = await api.delete(`/teams/${teamId}/members/${userId}`);
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
      const response = await api.get(`/teams/my-teams`, { params: { userId } });
      return response.data;
    } catch (error) {
      console.error('Error fetching user teams:', error.response ? error.response.data : error.message);
      throw error;
    }
  },
  
  // Get user role in a team (new method)
  getUserRoleInTeam: async (teamId, userId) => {
    try {
      const response = await api.get(`/teams/${teamId}/members/${userId}/role`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching user role in team ${teamId}:`, error.response ? error.response.data : error.message);
      return { data: { role: null } }; // Return a default response on error
    }
  }
};