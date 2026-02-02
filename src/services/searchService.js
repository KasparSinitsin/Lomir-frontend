import api from "./api";

/**
 * Extract a human-friendly message from Axios/backend errors.
 * Backend shape you showed:
 * { success:false, message:"Error performing search", error:"userParamIdx is not defined" }
 */
export const getApiErrorMessage = (error) => {
  const data = error?.response?.data;

  // Backend-provided details
  if (data?.error && data?.message) {
    // Return the specific error (more useful), optionally keep the generic message
    // Example: "userParamIdx is not defined"
    return data.error;
    // If you prefer: return `${data.message}: ${data.error}`;
  }

  if (data?.error) return String(data.error);
  if (data?.message) return String(data.message);

  // Axios fallback
  if (error?.message) return String(error.message);

  return "Something went wrong";
};

/**
 * Normalize team data to ensure consistent property names
 */
const normalizeTeamData = (team) => {
  if (!team) return team;

  const normalizedTeam = { ...team };

  if (team.teamavatar_url && !team.teamavatarUrl) {
    normalizedTeam.teamavatarUrl = team.teamavatar_url;
  }
  if (team.teamavatarUrl && !team.teamavatar_url) {
    normalizedTeam.teamavatar_url = team.teamavatarUrl;
  }

  normalizedTeam.is_public = team.is_public === true;

  return normalizedTeam;
};

export const searchService = {
  async globalSearch(
    query,
    isAuthenticated = false,
    page = 1,
    limit = 20,
    sortBy = "name",
    sortDir = "asc",
    maxDistance = null, // ← ADD
  ) {
    const params = {
      query,
      authenticated: isAuthenticated,
      page,
      limit,
      sortBy,
      sortDir,
    };

    // Only include when set (matches your colleague's direction)
    if (maxDistance) params.maxDistance = maxDistance;

    const response = await api.get("/api/search/global", { params });

    if (response.data?.data?.teams) {
      response.data.data.teams =
        response.data.data.teams.map(normalizeTeamData);
    }

    return response.data;
  },

  async getRecommended(userId, isAuthenticated = false) {
    const response = await api.get("/api/search/recommended", {
      params: {
        userId,
        authenticated: isAuthenticated,
      },
    });

    if (response.data?.data?.teams) {
      response.data.data.teams =
        response.data.data.teams.map(normalizeTeamData);
    }

    return response.data;
  },

  async getAllUsersAndTeams(
    isAuthenticated = false,
    page = 1,
    limit = 20,
    sortBy = "name",
    sortDir = "asc",
    maxDistance = null,
  ) {
    const params = {
      authenticated: isAuthenticated,
      page,
      limit,
      sortBy,
      sortDir,
    };

    // Only include when set
    if (maxDistance) params.maxDistance = maxDistance;

    const response = await api.get("/api/search/all", { params });

    if (response.data?.data?.teams) {
      response.data.data.teams =
        response.data.data.teams.map(normalizeTeamData);
    }

    return response.data;
  },
};

export default searchService;
