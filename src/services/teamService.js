import api from './api';

export const teamService = {
  // Create a new team
  createTeam: async (teamData) => {
    try {
      const response = await api.post('/teams', teamData);
      return response.data;
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  },

  // Fetch all teams
  getAllTeams: async (params = {}) => {
    try {
      const response = await api.get('/teams', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching teams:', error);
      throw error;
    }
  },

  // Fetch a single team by ID
  getTeamById: async (teamId) => {
    try {
      const response = await api.get(`/teams/${teamId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching team ${teamId}:`, error);
      throw error;
    }
  },

  // Update team details
  updateTeam: async (teamId, teamData) => {
    try {
      const response = await api.put(`/teams/${teamId}`, teamData);
      return response.data;
    } catch (error) {
      console.error(`Error updating team ${teamId}:`, error);
      throw error;
    }
  },

  // Add a member to a team
  addTeamMember: async (teamId, userId) => {
    try {
      const response = await api.post(`/teams/${teamId}/members`, { userId });
      return response.data;
    } catch (error) {
      console.error(`Error adding member to team ${teamId}:`, error);
      throw error;
    }
  },

  // Remove a member from a team
  removeTeamMember: async (teamId, userId) => {
    try {
      const response = await api.delete(`/teams/${teamId}/members/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`Error removing member from team ${teamId}:`, error);
      throw error;
    }
  }
};