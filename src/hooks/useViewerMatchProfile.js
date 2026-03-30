import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { userService } from "../services/userService";
import { buildViewerTeamMatchProfile } from "../utils/teamMatchUtils";

const idsMatch = (left, right) =>
  left != null && right != null && String(left) === String(right);

const unwrapUser = (response) => {
  const candidates = [
    response?.data?.data?.user,
    response?.data?.user,
    response?.user,
    response?.data?.data,
    response?.data,
    response,
  ];

  for (const candidate of candidates) {
    if (
      candidate &&
      typeof candidate === "object" &&
      !Array.isArray(candidate) &&
      candidate.success === undefined
    ) {
      return candidate;
    }
  }

  return null;
};

const unwrapRows = (response) => {
  if (!response) return [];
  if (Array.isArray(response)) return response;

  if (response.success !== undefined) {
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.data)) return response.data.data;
    return [];
  }

  const payload = response.data ?? response;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;

  return [];
};

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

const useViewerMatchProfile = ({ userId } = {}) => {
  const { user } = useAuth();
  const [viewerMatchProfile, setViewerMatchProfile] = useState(null);
  const [viewerDistanceSource, setViewerDistanceSource] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setViewerMatchProfile(null);
      setViewerDistanceSource(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const basicUser = idsMatch(user?.id, userId) ? user : { id: userId };

    setLoading(true);

    const fetchViewerMatchProfile = async () => {
      try {
        const [userResult, tagsResult, badgesResult] = await Promise.allSettled([
          userService.getUserById(userId),
          userService.getUserTags(userId),
          userService.getUserBadges(userId),
        ]);

        if (cancelled) return;

        const freshUser =
          userResult.status === "fulfilled" ? unwrapUser(userResult.value) : null;
        const nextViewerDistanceSource = freshUser ?? basicUser ?? null;
        const viewerMatchUser = buildViewerMatchUser({
          basicUser,
          freshUser: nextViewerDistanceSource,
          userId,
        });
        const userTags =
          tagsResult.status === "fulfilled" ? unwrapRows(tagsResult.value) : [];
        const userBadges =
          badgesResult.status === "fulfilled"
            ? unwrapRows(badgesResult.value)
            : [];

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
          console.warn(
            "Could not fully fetch viewer match metadata:",
            {
              tagsError:
                tagsResult.status === "rejected" ? tagsResult.reason : null,
              badgesError:
                badgesResult.status === "rejected"
                  ? badgesResult.reason
                  : null,
            },
          );
        }

        setViewerDistanceSource(nextViewerDistanceSource);
        setViewerMatchProfile(
          viewerMatchUser
            ? buildViewerTeamMatchProfile({
                user: viewerMatchUser,
                userTags,
                userBadges,
              })
            : null,
        );
      } catch (error) {
        console.warn("Could not build viewer match profile:", error);

        if (cancelled) return;

        const fallbackViewerMatchUser = buildViewerMatchUser({
          basicUser,
          freshUser: basicUser,
          userId,
        });

        setViewerDistanceSource(basicUser);
        setViewerMatchProfile(
          fallbackViewerMatchUser
            ? buildViewerTeamMatchProfile({
                user: fallbackViewerMatchUser,
              })
            : null,
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchViewerMatchProfile();

    return () => {
      cancelled = true;
    };
  }, [userId, user]);

  return {
    viewerMatchProfile,
    viewerDistanceSource,
    loading,
  };
};

export default useViewerMatchProfile;
