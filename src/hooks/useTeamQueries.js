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
