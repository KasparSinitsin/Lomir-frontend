import api from "./api";

/**
 * Normalize team data to ensure consistent property names
 * @param {Object} team - Raw team data from API
 * @returns {Object} Normalized team data
 */
const normalizeTeamData = (team) => {
  if (!team) return team;

  const normalizedTeam = { ...team };

  // Normalize avatar URL property name
  if (team.teamavatar_url && !team.teamavatarUrl) {
    normalizedTeam.teamavatarUrl = team.teamavatar_url;
  }
  if (team.teamavatarUrl && !team.teamavatar_url) {
    normalizedTeam.teamavatar_url = team.teamavatarUrl;
  }

  // Normalize is_public to boolean
  normalizedTeam.is_public = team.is_public === true;

  return normalizedTeam;
};

export const searchService = {
  /**
   * Perform a global search across teams and users with pagination and sorting
   * @param {string} query - Search query
   * @param {boolean} isAuthenticated - Whether user is authenticated
   * @param {number} page - Current page number (default: 1)
   * @param {number} limit - Results per page (default: 20)
   * @param {string} sortBy - Sort option: 'recent', 'newest', or 'name' (default: 'name')
   * @param {string} sortDir - Sort direction: 'asc' or 'desc' (default: 'asc')
   * @returns {Promise<Object>} Search results with pagination metadata
   */
  async globalSearch(
    query,
    isAuthenticated = false,
    page = 1,
    limit = 20,
    sortBy = "name",
    sortDir = "asc",
  ) {
    try {
      console.log(
        `Performing global search: "${query}", authenticated: ${isAuthenticated}, page: ${page}, limit: ${limit}, sortBy: ${sortBy}, sortDir: ${sortDir}`,
      );
      const response = await api.get("/api/search/global", {
        params: {
          query,
          authenticated: isAuthenticated,
          page,
          limit,
          sortBy,
          sortDir,
        },
      });

      // Normalize all teams in the response
      if (response.data?.data?.teams) {
        response.data.data.teams =
          response.data.data.teams.map(normalizeTeamData);
        console.log("Normalized team data:", response.data.data.teams);
      }

      return response.data;
    } catch (error) {
      console.error("Search error:", error);
      throw error;
    }
  },

  /**
   * Fetch recommended results based on user profile
   * @param {string|number} userId - User ID
   * @param {boolean} isAuthenticated - Whether user is authenticated
   * @returns {Promise<Object>} Recommended results
   */
  async getRecommended(userId, isAuthenticated = false) {
    try {
      const response = await api.get("/api/search/recommended", {
        params: {
          userId: userId,
          authenticated: isAuthenticated,
        },
      });

      // Normalize teams in the response
      if (response.data?.data?.teams) {
        response.data.data.teams =
          response.data.data.teams.map(normalizeTeamData);
      }

      return response.data;
    } catch (error) {
      console.error("Error fetching recommended data:", error);
      throw error;
    }
  },

  /**
   * Fetch all users and teams with pagination and sorting
   * @param {boolean} isAuthenticated - Whether user is authenticated
   * @param {number} page - Current page number (default: 1)
   * @param {number} limit - Results per page (default: 20)
   * @param {string} sortBy - Sort option: 'recent', 'newest', or 'name' (default: 'name')
   * @param {string} sortDir - Sort direction: 'asc' or 'desc' (default: 'asc')
   * @returns {Promise<Object>} All users and teams with pagination metadata
   */
  async getAllUsersAndTeams(
    isAuthenticated = false,
    page = 1,
    limit = 20,
    sortBy = "name",
    sortDir = "asc",
  ) {
    try {
      console.log(
        `Fetching all users and teams: authenticated: ${isAuthenticated}, page: ${page}, limit: ${limit}, sortBy: ${sortBy}, sortDir: ${sortDir}`,
      );
      const response = await api.get("/api/search/all", {
        params: {
          authenticated: isAuthenticated,
          page,
          limit,
          sortBy,
          sortDir,
        },
      });

      // Normalize all teams in the response
      if (response.data?.data?.teams) {
        response.data.data.teams =
          response.data.data.teams.map(normalizeTeamData);
      }

      return response.data;
    } catch (error) {
      console.error("Error fetching all users and teams:", error);
      throw error;
    }
  },
};

export default searchService;
