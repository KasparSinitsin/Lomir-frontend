import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { searchService } from "../services/searchService";

// One key per fully-resolved search request. The whole criteria object (plus the
// auth flag, which changes what the backend returns) is part of the key, so RQ
// caches every page/filter/sort combination independently and dedupes identical
// requests across navigations.
export const globalSearchQueryKey = (criteria, isAuthenticated) => [
  "search",
  "global",
  { ...criteria, isAuthenticated: Boolean(isAuthenticated) },
];

/**
 * Run the global search (or the unfiltered "all" listing) for the given request
 * criteria. The criteria object's `mode` selects the endpoint, mirroring the old
 * imperative `fetchData`. Returns the raw service payload (`{ data, pagination,
 * userLocation, matchRole, … }`).
 *
 * `keepPreviousData` keeps the last successful results on screen while the next
 * page/filter loads (no full-page spinner flash); the caller blanks the list on
 * an actual error via the query's `isError` flag.
 */
export const useGlobalSearch = (criteria, isAuthenticated, options = {}) =>
  useQuery({
    queryKey: globalSearchQueryKey(criteria, isAuthenticated),
    queryFn: () =>
      criteria.mode === "search"
        ? searchService.globalSearch({ ...criteria, isAuthenticated })
        : searchService.getAllUsersAndTeams({ ...criteria, isAuthenticated }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    ...options,
  });
