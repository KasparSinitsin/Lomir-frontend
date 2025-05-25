import api from "./api";

/**
 * Normalizes team data to ensure consistent tag structure
 * @param {Object} team - Team object from API
 * @returns {Object} Normalized team object
 */
const normalizeTeamData = (team) => {
  if (!team) return team;

  // Create a copy to avoid mutating the original
  const normalizedTeam = { ...team };

  // Handle missing tags
  if (!normalizedTeam.tags) {
    normalizedTeam.tags = [];
  }
  // Handle tags that might be a string (JSON or comma-separated)
  else if (typeof normalizedTeam.tags === "string") {
    try {
      // Try to parse as JSON
      normalizedTeam.tags = JSON.parse(normalizedTeam.tags);
    } catch (e) {
      // If not valid JSON, treat as comma-separated list
      normalizedTeam.tags = normalizedTeam.tags.split(",").map((tag) => ({
        id: Math.random().toString(36).substr(2, 9), // Temporary ID if none exists
        name: tag.trim(),
      }));
    }
  }
  // Ensure tags is always an array
  else if (!Array.isArray(normalizedTeam.tags)) {
    normalizedTeam.tags = [];
  }

  // Ensure each tag has at least a name property
  normalizedTeam.tags = normalizedTeam.tags
    .map((tag) => {
      if (typeof tag === "string") {
        return { id: Math.random().toString(36).substr(2, 9), name: tag };
      }
      return tag;
    })
    .filter((tag) => tag && (tag.name || tag.id)); // Filter out any invalid tags

  // Ensure is_public is a proper boolean
  if (normalizedTeam.is_public !== undefined) {
    normalizedTeam.is_public = normalizedTeam.is_public === true;
  }

  return normalizedTeam;
};

export const searchService = {
  /**
   * Perform a global search across teams and users
   * @param {string} query - Search query
   * @param {boolean} isAuthenticated - Whether user is authenticated
   * @returns {Promise<Object>} Search results
   */
  async globalSearch(query, isAuthenticated = false) {
    try {
      console.log(
        `Performing global search: "${query}", authenticated: ${isAuthenticated}`
      );
      const response = await api.get("/api/search/global", {
        params: {
          query,
          authenticated: isAuthenticated,
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
   * Fetch all users and teams
   * @param {boolean} isAuthenticated - Whether user is authenticated
   * @returns {Promise<Object>} All users and teams
   */
  async getAllUsersAndTeams(isAuthenticated = false) {
    try {
      const response = await api.get("/api/search/all", {
        params: { authenticated: isAuthenticated },
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
