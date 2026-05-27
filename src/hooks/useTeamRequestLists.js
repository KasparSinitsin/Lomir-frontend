import { useQuery } from "@tanstack/react-query";
import { teamService } from "../services/teamService";

export const teamApplicationsQueryKey = (teamId) => [
  "team",
  teamId ?? null,
  "applications",
];

export const teamSentInvitationsQueryKey = (teamId) => [
  "team",
  teamId ?? null,
  "sentInvitations",
];

const extractList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};

export const fetchTeamApplications = async (teamId) => {
  const response = await teamService.getTeamApplications(teamId);
  return extractList(response);
};

export const fetchTeamSentInvitations = async (teamId) => {
  const response = await teamService.getTeamSentInvitations(teamId);
  return extractList(response);
};

const useTeamRequestLists = (
  teamId,
  {
    enabled = true,
    applicationsEnabled = false,
    invitationsEnabled = false,
    staleTime = 15_000,
  } = {},
) => {
  const canFetch = enabled && Boolean(teamId);

  const applicationsQuery = useQuery({
    queryKey: teamApplicationsQueryKey(teamId),
    queryFn: () => fetchTeamApplications(teamId),
    enabled: canFetch && applicationsEnabled,
    staleTime,
  });

  const invitationsQuery = useQuery({
    queryKey: teamSentInvitationsQueryKey(teamId),
    queryFn: () => fetchTeamSentInvitations(teamId),
    enabled: canFetch && invitationsEnabled,
    staleTime,
  });

  return {
    applications: applicationsQuery.data ?? [],
    invitations: invitationsQuery.data ?? [],
    applicationsQuery,
    invitationsQuery,
    applicationsLoaded: applicationsQuery.isFetched,
    invitationsLoaded: invitationsQuery.isFetched,
    refetchApplications: applicationsQuery.refetch,
    refetchInvitations: invitationsQuery.refetch,
  };
};

export default useTeamRequestLists;
