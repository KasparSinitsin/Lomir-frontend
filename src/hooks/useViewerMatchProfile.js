import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchUserBadges,
  fetchUserProfile,
  fetchUserTags,
  userBadgesQueryKey,
  userProfileQueryKey,
  userTagsQueryKey,
} from "./useUserQueries";
import { buildViewerTeamMatchProfile } from "../utils/teamMatchUtils";

export const viewerMatchProfileQueryKey = (userId) => [
  "viewer",
  "matchProfile",
  userId ?? null,
];

const idsMatch = (left, right) =>
  left != null && right != null && String(left) === String(right);

const buildViewerMatchUser = ({ basicUser, freshUser, userId }) => {
  const resolvedId = freshUser?.id ?? basicUser?.id ?? userId ?? null;
  if (!resolvedId) return null;

  return {
    ...(basicUser ?? {}),
    ...(freshUser ?? {}),
    id: resolvedId,
    city: freshUser?.city ?? basicUser?.city ?? null,
    country: freshUser?.country ?? basicUser?.country ?? null,
  };
};

const fetchViewerMatchProfile = async ({ userId, basicUser, queryClient }) => {
  try {
    const [userResult, tagsResult, badgesResult] = await Promise.allSettled([
      queryClient.fetchQuery({
        queryKey: userProfileQueryKey(userId),
        queryFn: () => fetchUserProfile(userId),
        staleTime: 30_000,
      }),
      queryClient.fetchQuery({
        queryKey: userTagsQueryKey(userId),
        queryFn: () => fetchUserTags(userId),
        staleTime: 30_000,
      }),
      queryClient.fetchQuery({
        queryKey: userBadgesQueryKey(userId),
        queryFn: () => fetchUserBadges(userId),
        staleTime: 30_000,
      }),
    ]);

    const freshUser =
      userResult.status === "fulfilled" ? userResult.value : null;
    const nextViewerDistanceSource = freshUser ?? basicUser ?? null;
    const viewerMatchUser = buildViewerMatchUser({
      basicUser,
      freshUser: nextViewerDistanceSource,
      userId,
    });
    const userTags =
      tagsResult.status === "fulfilled" ? tagsResult.value : [];
    const userBadges =
      badgesResult.status === "fulfilled" ? badgesResult.value : [];

    if (userResult.status === "rejected") {
      console.warn(
        "Could not fetch fresh viewer profile for match calculations:",
        userResult.reason,
      );
    }

    if (
      tagsResult.status === "rejected" ||
      badgesResult.status === "rejected"
    ) {
      console.warn("Could not fully fetch viewer match metadata:", {
        tagsError:
          tagsResult.status === "rejected" ? tagsResult.reason : null,
        badgesError:
          badgesResult.status === "rejected" ? badgesResult.reason : null,
      });
    }

    return {
      viewerDistanceSource: nextViewerDistanceSource,
      viewerMatchProfile: viewerMatchUser
        ? buildViewerTeamMatchProfile({
            user: viewerMatchUser,
            userTags,
            userBadges,
          })
        : null,
    };
  } catch (error) {
    console.warn("Could not build viewer match profile:", error);

    const fallbackViewerMatchUser = buildViewerMatchUser({
      basicUser,
      freshUser: basicUser,
      userId,
    });

    return {
      viewerDistanceSource: basicUser,
      viewerMatchProfile: fallbackViewerMatchUser
        ? buildViewerTeamMatchProfile({
            user: fallbackViewerMatchUser,
          })
        : null,
    };
  }
};

const useViewerMatchProfile = ({ userId } = {}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const basicUser = idsMatch(user?.id, userId) ? user : { id: userId };
  const query = useQuery({
    queryKey: viewerMatchProfileQueryKey(userId),
    queryFn: () =>
      fetchViewerMatchProfile({ userId, basicUser, queryClient }),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });

  return {
    viewerMatchProfile: query.data?.viewerMatchProfile ?? null,
    viewerDistanceSource: query.data?.viewerDistanceSource ?? null,
    loading: query.isLoading,
  };
};

export default useViewerMatchProfile;
