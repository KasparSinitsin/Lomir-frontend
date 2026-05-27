import { useQuery } from "@tanstack/react-query";
import { badgeService } from "../services/badgeService";

export const badgesQueryKey = ["badges"];

export const sharedTeamsForAwardQueryKey = (userId) => [
  "badges",
  "sharedTeams",
  userId ?? null,
];

const unwrapRows = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};

export const fetchBadges = async () => unwrapRows(await badgeService.getAllBadges());

export const fetchSharedTeamsForAward = async (userId) =>
  unwrapRows(await badgeService.getSharedTeams(userId));

export const useBadges = (options = {}) =>
  useQuery({
    queryKey: badgesQueryKey,
    queryFn: fetchBadges,
    staleTime: 5 * 60_000,
    ...options,
  });

export const useSharedTeamsForAward = (userId, options = {}) =>
  useQuery({
    queryKey: sharedTeamsForAwardQueryKey(userId),
    queryFn: () => fetchSharedTeamsForAward(userId),
    enabled: Boolean(userId),
    staleTime: 60_000,
    ...options,
  });
