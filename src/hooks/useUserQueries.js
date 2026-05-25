import { useQuery } from "@tanstack/react-query";
import { userService } from "../services/userService";

export const userProfileQueryKey = (userId) => [
  "users",
  userId ?? null,
  "profile",
];

export const userTagsQueryKey = (userId) => ["users", userId ?? null, "tags"];

export const userBadgesQueryKey = (userId) => [
  "users",
  userId ?? null,
  "badges",
];

export const unwrapUser = (response) => {
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

export const unwrapRows = (response) => {
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

export const fetchUserProfile = async (userId) =>
  unwrapUser(await userService.getUserById(userId));

export const fetchUserTags = async (userId) =>
  unwrapRows(await userService.getUserTags(userId));

export const fetchUserBadges = async (userId) =>
  unwrapRows(await userService.getUserBadges(userId));

export const useUserProfile = (userId, options = {}) =>
  useQuery({
    queryKey: userProfileQueryKey(userId),
    queryFn: () => fetchUserProfile(userId),
    enabled: Boolean(userId),
    staleTime: 30_000,
    ...options,
  });

export const useUserTags = (userId, options = {}) =>
  useQuery({
    queryKey: userTagsQueryKey(userId),
    queryFn: () => fetchUserTags(userId),
    enabled: Boolean(userId),
    staleTime: 30_000,
    ...options,
  });

export const useUserBadges = (userId, options = {}) =>
  useQuery({
    queryKey: userBadgesQueryKey(userId),
    queryFn: () => fetchUserBadges(userId),
    enabled: Boolean(userId),
    staleTime: 30_000,
    ...options,
  });
