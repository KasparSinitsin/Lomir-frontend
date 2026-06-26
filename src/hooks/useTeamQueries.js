import { useQuery } from "@tanstack/react-query";
import { teamService } from "../services/teamService";

// Base key for all paginated user-teams queries — invalidate this prefix to
// refresh every cached page at once after a mutation (create/leave/delete/…).
export const userTeamsBaseQueryKey = (userId) => [
  "teams",
  "userTeams",
  userId ?? null,
];

export const userTeamsQueryKey = (userId, page, limit) => [
  ...userTeamsBaseQueryKey(userId),
  page,
  limit,
];

/**
 * Paginated list of the current user's teams. Returns the raw service payload
 * (`{ success, data, pagination }`) so the caller can read both the rows and
 * the server pagination meta.
 */
export const useUserTeams = (
  userId,
  { page = 1, limit = 10 } = {},
  options = {},
) =>
  useQuery({
    queryKey: userTeamsQueryKey(userId, page, limit),
    queryFn: () => teamService.getUserTeams(userId, { page, limit }),
    enabled: Boolean(userId),
    ...options,
  });

export const teamByIdQueryKey = (teamId) => ["teams", "byId", String(teamId)];

// The getTeamById endpoint may return either the bare team object or an axios
// envelope ({ data: team }); normalize to the team payload either way.
const extractTeamDetailsPayload = (response) =>
  response?.data && typeof response.data === "object" ? response.data : response;

/**
 * Imperatively fetch (and cache) a team's full detail payload through React
 * Query — replaces a hand-rolled Map cache plus in-flight-request dedup. A
 * cached hit is reused while fresh (mirrors the old never-expiring Map);
 * `force` drops staleness so the call always refetches and refreshes the cache.
 * Resolves to the unwrapped team payload, not the axios envelope.
 */
export const fetchTeamById = (queryClient, teamId, { force = false } = {}) =>
  queryClient.fetchQuery({
    queryKey: teamByIdQueryKey(teamId),
    queryFn: () =>
      teamService.getTeamById(teamId).then(extractTeamDetailsPayload),
    staleTime: force ? 0 : Infinity,
  });

export const teamMemberBadgesQueryKey = (teamIds) => [
  "teams",
  "memberBadges",
  (teamIds ?? []).join(","),
];

/**
 * Bulk member-badge map for the given team ids, keyed by team id. One request
 * for the whole list instead of a per-card fetch. Resolves to `{}` when there
 * are no ids (the query stays disabled).
 */
export const useTeamMemberBadges = (teamIds, options = {}) =>
  useQuery({
    queryKey: teamMemberBadgesQueryKey(teamIds),
    queryFn: async () =>
      (await teamService.getMemberBadgesForTeams(teamIds))?.data || {},
    enabled: (teamIds ?? []).length > 0,
    ...options,
  });
