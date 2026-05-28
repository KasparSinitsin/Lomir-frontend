import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { teamService } from "../services/teamService";

export const viewerTeamMembershipsQueryKey = (userId) => [
  "viewer",
  "teamMemberships",
  userId ?? null,
];

const normalizeViewerTeamRole = (value) => {
  const role = String(value ?? "").trim().toLowerCase();
  return ["owner", "admin", "member"].includes(role) ? role : null;
};

const getTeamId = (team) => team?.id ?? team?.teamId ?? team?.team_id ?? null;

export const fetchViewerTeamMemberships = async (userId) => {
  if (!userId) return { teamIds: [], teamRoles: {} };

  const teamIds = [];
  const teamRoles = {};
  const limit = 100;
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await teamService.getUserTeams(userId, { page, limit });
    const teams = Array.isArray(response?.data) ? response.data : [];

    teams.forEach((team) => {
      const teamId = getTeamId(team);
      if (teamId == null) return;

      const teamKey = String(teamId);
      const role = normalizeViewerTeamRole(team.userRole ?? team.user_role);

      teamIds.push(teamKey);
      if (role) {
        teamRoles[teamKey] = role;
      }
    });

    const pagination = response?.pagination ?? {};
    const nextTotalPages = Number(
      pagination.totalPages ?? pagination.total_pages ?? 1,
    );
    totalPages =
      Number.isFinite(nextTotalPages) && nextTotalPages > 0
        ? nextTotalPages
        : 1;

    const hasNextPage = Boolean(
      pagination.hasNextPage ??
        pagination.has_next_page ??
        page < totalPages,
    );

    if (!hasNextPage) break;
    page += 1;
  }

  return { teamIds, teamRoles };
};

const useViewerTeamMemberships = (userId, { enabled = true } = {}) => {
  const query = useQuery({
    queryKey: viewerTeamMembershipsQueryKey(userId),
    queryFn: () => fetchViewerTeamMemberships(userId),
    enabled: enabled && Boolean(userId),
    staleTime: 30_000,
  });

  const teamIdSet = useMemo(
    () => new Set(query.data?.teamIds ?? []),
    [query.data?.teamIds],
  );

  return {
    ...query,
    teamIdSet,
    teamRoles: query.data?.teamRoles ?? {},
  };
};

export default useViewerTeamMemberships;
