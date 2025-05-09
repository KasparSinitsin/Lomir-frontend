import api from './api';  

export const teamService = {
  // Create a new team
createTeam: async (teamData) => {
  try {
    console.log("createTeam: Received data:", teamData);
    
    // Ensure tags are properly formatted
    const formattedTags = teamData.tags?.map(tag => {
      if (typeof tag === 'object' && tag.tag_id) {
        return { tag_id: parseInt(tag.tag_id, 10) };
      } else if (typeof tag === 'number') {
        return { tag_id: tag };
      } else {
        return { tag_id: parseInt(tag, 10) };
      }
    }) || [];
    
    // Make sure is_public is properly set as a boolean
    const isPublic = teamData.is_public === true;
    
    const validatedTeamData = {
      name: teamData.name,
      description: teamData.description || '',
      is_public: isPublic, // Ensure it's a boolean
      max_members: parseInt(teamData.max_members || 20, 10),
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
      console.log(`Fetching team details for ID: ${teamId}`);
      const response = await api.get(`/api/teams/${teamId}`);
      
      // Log the complete raw response including headers
      console.log('Raw API response from getTeamById:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      });
      
      // Examine response structure
      if (response.data) {
        console.log('Response data structure:', {
          hasData: Boolean(response.data),
          dataType: typeof response.data,
          keys: Object.keys(response.data),
          hasNestedData: Boolean(response.data.data),
          hasTeamId: Boolean(response.data.id || (response.data.data && response.data.data.id)),
          hasCreatorId: Boolean(response.data.creator_id || (response.data.data && response.data.data.creator_id)),
          hasIsPublic: Boolean(response.data.is_public !== undefined || (response.data.data && response.data.data.is_public !== undefined))
        });
      }
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching team ${teamId}:`, error);
      throw error;
    }
  },

  // Update team details
updateTeam: async (teamId, teamData) => {
  try {
    console.log(`Updating team with ID: ${teamId}`);
    console.log('Update data being sent:', teamData);
    
    // Ensure is_public is a proper boolean
    const validatedData = {
      ...teamData,
      is_public: teamData.is_public === true
    };
    
    const response = await api.put(`/api/teams/${teamId}`, validatedData);
    
    console.log('Update response:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error updating team ${teamId}:`, error);
    console.error('Error details:', error.response?.data || error.message);
    throw error;
  }
}

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