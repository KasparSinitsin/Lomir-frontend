import api from "./api";

/**
 * Extract a human-friendly message from Axios/backend errors.
 */
export const getApiErrorMessage = (error) => {
  const data = error?.response?.data;

  if (data?.error && data?.message) {
    return data.error;
  }

  if (data?.error) return String(data.error);
  if (data?.message) return String(data.message);
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

const VALID_SEARCH_TYPES = new Set(["all", "teams", "users", "roles"]);

const normalizeSearchType = (searchType = "all") =>
  VALID_SEARCH_TYPES.has(searchType) ? searchType : "all";

const normalizeSearchResponse = (payload = {}) => {
  const data = payload?.data ?? {};
  const pagination = payload?.pagination ?? {};

  return {
    ...payload,
    data: {
      ...data,
      teams: Array.isArray(data.teams)
        ? data.teams.map(normalizeTeamData)
        : [],
      users: data.users ?? [],
      roles: data.roles ?? [],
    },
    pagination: {
      ...pagination,
      totalTeams: pagination.totalTeams ?? 0,
      totalUsers: pagination.totalUsers ?? 0,
      totalRoles: pagination.totalRoles ?? 0,
    },
  };
};

const buildSearchParams = ({
  query,
  isAuthenticated = false,
  page = 1,
  limit = 20,
  searchType = "all",
  sortBy = "name",
  sortDir = "asc",
  maxDistance = null,
  openRolesOnly = false,
  excludeOwnTeams = false,
  capacityMode = "spots",
  tagIds = [],
  badgeIds = [],
  roleId = null,
  excludeTeamId = null,
  includeDemoData = true,
} = {}) => {
  const params = {
    authenticated: isAuthenticated,
    page,
    limit,
    searchType: normalizeSearchType(searchType),
    sortBy,
    sortDir,
    openRolesOnly,
    includeDemoData: String(includeDemoData),
  };

  if (query) params.query = query;
  if (maxDistance) params.maxDistance = maxDistance;
  if (excludeOwnTeams) params.excludeOwnTeams = true;

  if (sortBy === "capacity") {
    params.capacityMode = capacityMode;
  }

  if (tagIds && tagIds.length > 0) params.tagIds = tagIds.join(",");
  if (badgeIds && badgeIds.length > 0) params.badgeIds = badgeIds.join(",");
  if (roleId) params.roleId = roleId;
  if (excludeTeamId) params.excludeTeamId = excludeTeamId;

  return params;
};

export const searchService = {
  async globalSearch(criteria = {}) {
    const params = buildSearchParams(criteria);
    const response = await api.get("/api/search/global", { params });

    return normalizeSearchResponse(response.data);
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

  async getAllUsersAndTeams(criteria = {}) {
    const params = buildSearchParams(criteria);
    const response = await api.get("/api/search/all", { params });

    return normalizeSearchResponse(response.data);
  },
};

export default searchService;
