import { teamService } from "../services/teamService";
import { userService } from "../services/userService";

const chatUserProfileCache = new Map();
const chatTeamProfileCache = new Map();

export const extractEntityPayload = (response) => {
  const payload = response?.data ?? response;

  if (!payload) return null;
  if (payload?.success !== undefined) return payload?.data ?? null;

  return payload?.data?.data ?? payload?.data ?? payload;
};

const getCachedEntity = async (cache, cacheKey, loader) => {
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const request = loader();
  cache.set(cacheKey, request);

  try {
    const result = await request;
    cache.set(cacheKey, Promise.resolve(result));
    return result;
  } catch (error) {
    cache.delete(cacheKey);
    throw error;
  }
};

export const getCachedChatUserProfile = async (userId) =>
  getCachedEntity(chatUserProfileCache, String(userId), async () => {
    const response = await userService.getUserById(userId);
    return extractEntityPayload(response);
  });

export const getCachedChatTeamProfile = async (teamId) =>
  getCachedEntity(chatTeamProfileCache, String(teamId), async () => {
    const response = await teamService.getTeamById(teamId);
    return extractEntityPayload(response);
  });

export const getTeamAvatarUrl = (team) =>
  team?.avatarUrl ??
  team?.avatar_url ??
  team?.teamavatarUrl ??
  team?.teamavatar_url ??
  null;

export const mergeResolvedUserData = (user, profile) => {
  if (!profile) return user;

  const resolvedAvatarUrl =
    user?.avatar_url ??
    user?.avatarUrl ??
    profile?.avatar_url ??
    profile?.avatarUrl ??
    null;
  const resolvedSyntheticStatus =
    user?.is_synthetic ??
    user?.isSynthetic ??
    profile?.is_synthetic ??
    profile?.isSynthetic ??
    undefined;

  return {
    ...profile,
    ...user,
    avatar_url: resolvedAvatarUrl,
    avatarUrl:
      user?.avatarUrl ??
      user?.avatar_url ??
      profile?.avatarUrl ??
      profile?.avatar_url ??
      null,
    is_synthetic: resolvedSyntheticStatus,
    isSynthetic: resolvedSyntheticStatus,
  };
};

export const mergeResolvedTeamData = (team, profile) => {
  if (!profile) return team;

  const resolvedAvatarUrl = getTeamAvatarUrl(team) ?? getTeamAvatarUrl(profile);
  const resolvedSyntheticStatus =
    team?.is_synthetic ??
    team?.isSynthetic ??
    profile?.is_synthetic ??
    profile?.isSynthetic ??
    undefined;

  return {
    ...profile,
    ...team,
    avatarUrl: resolvedAvatarUrl,
    avatar_url: resolvedAvatarUrl,
    teamavatarUrl:
      team?.teamavatarUrl ??
      team?.teamavatar_url ??
      profile?.teamavatarUrl ??
      profile?.teamavatar_url ??
      resolvedAvatarUrl,
    teamavatar_url:
      team?.teamavatar_url ??
      team?.teamavatarUrl ??
      profile?.teamavatar_url ??
      profile?.teamavatarUrl ??
      resolvedAvatarUrl,
    is_synthetic: resolvedSyntheticStatus,
    isSynthetic: resolvedSyntheticStatus,
  };
};
