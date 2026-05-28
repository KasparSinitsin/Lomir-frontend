import { useQuery } from "@tanstack/react-query";
import { teamService } from "../services/teamService";

export const viewerPendingRequestsQueryKey = (userId) => [
  "viewer",
  "pendingRequests",
  userId ?? null,
];

export const fetchViewerPendingRequests = async () => {
  const [appsRes, invitesRes] = await Promise.allSettled([
    teamService.getUserPendingApplications(),
    teamService.getUserReceivedInvitations(),
  ]);

  return {
    applications:
      appsRes.status === "fulfilled" && Array.isArray(appsRes.value?.data)
        ? appsRes.value.data
        : [],
    invitations:
      invitesRes.status === "fulfilled" && Array.isArray(invitesRes.value?.data)
        ? invitesRes.value.data
        : [],
  };
};

const useViewerPendingRequests = (userId, { enabled = true } = {}) =>
  useQuery({
    queryKey: viewerPendingRequestsQueryKey(userId),
    queryFn: fetchViewerPendingRequests,
    enabled: enabled && Boolean(userId),
    staleTime: 15_000,
  });

export default useViewerPendingRequests;
