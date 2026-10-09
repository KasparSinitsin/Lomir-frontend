import { teamService } from "../services/teamService";
import { userService } from "../services/userService";
import { vacantRoleService } from "../services/vacantRoleService";
import { rememberTeamName } from "./teamNameRegistry";
import { rememberRoleName } from "./roleNameRegistry";

const chatUserProfileCache = new Map();
const chatTeamProfileCache = new Map();

export const extractEntityPayload = (response) => {
  const payload = response?.data ?? response;

  if (!payload) return null;
  if (payload?.success !== undefined) return payload?.data ?? null;

  return payload?.data?.data ?? payload?.data ?? payload;
};

// A 404 from an entity endpoint is a stable "gone or not visible to you"
// result for the session (e.g. a chat system/event message that references a
// deleted team). Keep the rejected request cached so repeat renders/intervals
// short-circuit through the cache instead of re-hitting /api/teams/:id or
// /api/users/:id every time. Transient failures (network, 5xx) stay evicted so
// they can be retried on the next call.
const isCacheableAbsence = (error) => error?.response?.status === 404;

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
    // Leave the (rejected) request in the cache for a known-absent entity so
    // future lookups reuse it; evict only transient failures. Callers already
    // handle the rejection, so the caching is transparent to them.
    if (!isCacheableAbsence(error)) {
      cache.delete(cacheKey);
    }
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
    const profile = extractEntityPayload(response);
    rememberTeamName(teamId, profile?.name);
    return profile;
  });

// Fetches the given teams (each once per session) so `describeEvent` can use
// their current names. Never rejects: a team that cannot be fetched (deleted,
// or private/archived to this reader) keeps its stored name.
export const resolveTeamNames = async (teamIds) => {
  const ids = [...new Set((teamIds ?? []).filter((id) => id != null && id !== "").map(String))];
  await Promise.allSettled(ids.map((id) => getCachedChatTeamProfile(id)));
};

// Role names by `${teamId}:${roleId}`, each asked once per session. A role the
// answer leaves out (deleted, or not visible to this reader) settles without a
// name and keeps its stored one; a failed request is forgotten so a later call
// can retry it.
const chatRoleNameRequests = new Map();

// Fetches the given roles, one request per team, so `describeEvent` can use
// their current names. Never rejects. `refs`: [{ teamId, roleId }].
export const resolveRoleNames = async (refs) => {
  const pendingByTeam = new Map();
  const waits = [];

  for (const ref of refs ?? []) {
    if (ref?.teamId == null || ref?.roleId == null) continue;
    const key = `${ref.teamId}:${ref.roleId}`;
    if (chatRoleNameRequests.has(key)) {
      waits.push(chatRoleNameRequests.get(key));
      continue;
    }
    const ids = pendingByTeam.get(String(ref.teamId)) ?? new Set();
    ids.add(String(ref.roleId));
    pendingByTeam.set(String(ref.teamId), ids);
  }

  for (const [teamId, idSet] of pendingByTeam) {
    const roleIds = [...idSet];
    const request = vacantRoleService
      .getVacantRolesByIds(teamId, roleIds)
      .then((response) => {
        const roles = extractEntityPayload(response);
        for (const role of Array.isArray(roles) ? roles : []) {
          rememberRoleName(role?.id, role?.roleName ?? role?.role_name);
        }
      })
      .catch(() => {
        for (const roleId of roleIds) chatRoleNameRequests.delete(`${teamId}:${roleId}`);
      });
    for (const roleId of roleIds) chatRoleNameRequests.set(`${teamId}:${roleId}`, request);
    waits.push(request);
  }

  await Promise.allSettled(waits);
};

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
