import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import ReactDOM from "react-dom";
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import PageContainer from "../components/layout/PageContainer";
import Grid from "../components/layout/Grid";
import TeamCard from "../components/teams/TeamCard";
import VacantRoleCard from "../components/teams/VacantRoleCard";
import UserCard from "../components/users/UserCard";
import SearchMapView from "../components/search/SearchMapView";
import Pagination from "../components/common/Pagination";
import BooleanSearchInput from "../components/BooleanSearchInput";
import Tooltip from "../components/common/Tooltip";
import FilterSortOptionButton from "../components/common/FilterSortOptionButton";
import ResultViewToggle from "../components/common/ResultViewToggle";
import ScreenAlert from "../components/common/ScreenAlert";
import {
  User,
  UserSearch,
  Users2,
  Clock,
  Filter,
  FlaskConical,
  Sparkles,
  ArrowDownAZ,
  ArrowUpZA,
  RotateCcw,
  SlidersHorizontal,
  UserPlus,
  UserMinus,
  Radius,
  MapPin,
  Globe,
  Target,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "../services/searchService";
import {
  globalSearchQueryKey,
  useGlobalSearch,
} from "../hooks/useSearchQueries";
import { tagService } from "../services/tagService";
import { useBadges } from "../hooks/useBadgeQueries";
import {
  enrichTeamMatchData,
  enrichUserMatchData,
  enrichUserRoleMatchData,
  getResultMatchScore,
} from "../utils/teamMatchUtils";
import useViewerMatchProfile from "../hooks/useViewerMatchProfile";
import useViewerPendingRequests from "../hooks/useViewerPendingRequests";
import useViewerTeamMemberships from "../hooks/useViewerTeamMemberships";
import { useStructuredTags } from "../hooks/useTagQueries";
import {
  buildSearchRequestCriteria,
  DISTANCE_SUBMENU_TYPE,
  getActiveCriteriaPills,
  getSortOptionDisplay,
  getVisibleSortOptions,
  shouldUseMergedResultPagination,
} from "./searchPageHelpers";

import {
  RESULTS_PER_PAGE_OPTIONS,
  DEFAULT_RESULTS_PER_PAGE,
} from "../constants/pagination";
import { CATEGORY_ORDER } from "../constants/badgeConstants";
import {
  calculateDistanceKm,
  locationsHaveDifferentKnownParts,
} from "../utils/locationUtils";

const DISTANCE_UNAVAILABLE_SENTINEL_KM = 999999;
const RESULT_TYPE_TIE_BREAKER_ORDER = {
  team: 0,
  user: 1,
  role: 2,
};
const SORTING_OPTION_VALUES = new Set([
  "name",
  "recent",
  "newest",
  "match",
  "locationPriority",
]);
const EMPTY_QUERY_ARRAY = [];

const getBadgeCategoryOrder = (category) => {
  const index = CATEGORY_ORDER.indexOf(category || "Other");
  return index === -1 ? CATEGORY_ORDER.length : index;
};

const getFilterableDistanceKm = (item) => {
  const matchDetails = item?.matchDetails ?? item?.match_details ?? null;
  const rawDistance =
    item?.distanceKm ??
    item?.distance_km ??
    matchDetails?.distanceKm ??
    matchDetails?.distance_km;
  const distance =
    rawDistance !== null && rawDistance !== undefined && rawDistance !== ""
      ? Number(rawDistance)
      : null;

  return Number.isFinite(distance) &&
    distance < DISTANCE_UNAVAILABLE_SENTINEL_KM
    ? distance
    : null;
};

const getProximitySortValue = (item) =>
  getFilterableDistanceKm(item) ?? DISTANCE_UNAVAILABLE_SENTINEL_KM;

const getUserDisplayName = (u) =>
  (
    (u?.first_name || u?.firstName || "") +
    " " +
    (u?.last_name || u?.lastName || "")
  ).trim().toLowerCase() || (u?.username || "").toLowerCase();

const getSearchItemDisplayName = (item) => {
  if (!item) return "";

  if (item._resultType === "team") {
    return (item.name || "").toLowerCase();
  }

  if (item._resultType === "role") {
    return String(
      item.roleName ??
        item.role_name ??
        item.name ??
        item.teamName ??
        item.team_name ??
        "",
    ).toLowerCase();
  }

  return getUserDisplayName(item);
};

const normalizeViewerTeamRole = (value) => {
  const role = String(value ?? "").trim().toLowerCase();
  return ["owner", "admin", "member"].includes(role) ? role : null;
};

const getSearchTeamId = (team) =>
  team?.id ?? team?.teamId ?? team?.team_id ?? null;

const getSearchItemActivityTime = (item) => {
  if (!item) return 0;

  const value =
    item._resultType === "role"
      ? item.updatedAt ?? item.updated_at ?? item.createdAt ?? item.created_at
      : item.last_active_at ??
        item.lastActiveAt ??
        item.last_active ??
        item.lastActive ??
        item.updated_at ??
        item.updatedAt ??
        item.created_at ??
        item.createdAt;
  const timestamp = value ? new Date(value).getTime() : 0;

  return Number.isFinite(timestamp) ? timestamp : 0;
};

const compareSearchItemTieBreakers = (a, b) => {
  const groupIndexCompare =
    (a?._resultGroupIndex ?? Number.MAX_SAFE_INTEGER) -
    (b?._resultGroupIndex ?? Number.MAX_SAFE_INTEGER);

  if (groupIndexCompare !== 0) return groupIndexCompare;

  const resultTypeCompare =
    (RESULT_TYPE_TIE_BREAKER_ORDER[a?._resultType] ??
      Number.MAX_SAFE_INTEGER) -
    (RESULT_TYPE_TIE_BREAKER_ORDER[b?._resultType] ??
      Number.MAX_SAFE_INTEGER);

  if (resultTypeCompare !== 0) return resultTypeCompare;

  const activityCompare =
    getSearchItemActivityTime(b) - getSearchItemActivityTime(a);

  if (activityCompare !== 0) return activityCompare;

  const nameCompare = getSearchItemDisplayName(a).localeCompare(
    getSearchItemDisplayName(b),
  );

  if (nameCompare !== 0) return nameCompare;

  return `${a?._resultType ?? ""}-${a?.id ?? ""}`.localeCompare(
    `${b?._resultType ?? ""}-${b?.id ?? ""}`,
  );
};

const isTruthyRemoteFlag = (value) =>
  value === true || value === 1 || value === "true" || value === "1";

const isRemoteSearchItem = (item) =>
  isTruthyRemoteFlag(item?.is_remote) ||
  isTruthyRemoteFlag(item?.isRemote) ||
  isTruthyRemoteFlag(item?.role?.is_remote) ||
  isTruthyRemoteFlag(item?.role?.isRemote);

const getNearestSortPriority = (item) => {
  if (isRemoteSearchItem(item)) return 2;
  return getFilterableDistanceKm(item) === null ? 1 : 0;
};

const compareProximityItems = (a, b, sortDir) => {
  const remoteCompare =
    sortDir === "remote"
      ? Number(isRemoteSearchItem(b)) - Number(isRemoteSearchItem(a))
      : getNearestSortPriority(a) - getNearestSortPriority(b);

  if (remoteCompare !== 0) return remoteCompare;

  const aDist = getProximitySortValue(a);
  const bDist = getProximitySortValue(b);
  const distanceCompare =
    sortDir === "remote" ? bDist - aDist : aDist - bDist;

  return distanceCompare !== 0
    ? distanceCompare
    : compareSearchItemTieBreakers(a, b);
};

const sortByProximity = (items, sortDir) =>
  [...items].sort((a, b) => compareProximityItems(a, b, sortDir));

// Stable fallbacks so the derived search state keeps a constant identity between
// renders (avoids churning the downstream `effectiveSearchResults` memo).
const EMPTY_SEARCH_RESULTS = { teams: [], users: [], roles: [] };
const DEFAULT_PAGINATION = {
  page: 1,
  limit: DEFAULT_RESULTS_PER_PAGE,
  totalTeams: 0,
  totalUsers: 0,
  totalRoles: 0,
  totalItems: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
};

const SearchPage = () => {
  const location = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { data: structuredTags = EMPTY_QUERY_ARRAY } = useStructuredTags();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");

  const [searchType, setSearchType] = useState(() => {
    const urlParams = new URLSearchParams(location.search);
    const typeParam = urlParams.get("type");
    return typeParam === "teams"
      ? "teams"
      : typeParam === "users"
        ? "users"
        : typeParam === "roles"
          ? "roles"
        : "all";
  });

  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchInputResetSignal, setSearchInputResetSignal] = useState(0);
  const [searchInputQueryWraps, setSearchInputQueryWraps] = useState(false);
  const [dismissedNoResultsAlertKey, setDismissedNoResultsAlertKey] =
    useState(null);
  const viewerPendingRequestsQuery = useViewerPendingRequests(user?.id, {
    enabled: isAuthenticated,
  });
  const { teamRoles: viewerTeamRoles } = useViewerTeamMemberships(user?.id, {
    enabled: isAuthenticated,
  });
  const viewerPendingApplications = isAuthenticated
    ? viewerPendingRequestsQuery.data?.applications ?? null
    : undefined;
  const viewerPendingInvitations = isAuthenticated
    ? viewerPendingRequestsQuery.data?.invitations ?? null
    : undefined;
  const structuredTagLookup = useMemo(() => {
    const lookup = {};
    structuredTags.forEach((supercat) => {
      supercat.categories?.forEach((cat) => {
        cat.tags?.forEach((tag) => {
          lookup[Number(tag.id)] = {
            ...tag,
            category: cat.name,
            supercategory: supercat.name,
          };
        });
      });
    });
    return lookup;
  }, [structuredTags]);

  const resolveTagWithTaxonomy = useCallback(
    (tag) => {
      const id = Number(tag?.id ?? tag?.tag_id ?? tag?.tagId);
      if (!Number.isFinite(id)) return tag;

      return {
        ...structuredTagLookup[id],
        ...tag,
        id,
      };
    },
    [structuredTagLookup],
  );

  // ===== SORTING STATE =====
  const [sortBy, setSortBy] = useState(() => {
    const p = new URLSearchParams(location.search);
    const sort = p.get("sort");
    if (
      ["match", "name", "recent", "newest", "capacity", "proximity"].includes(
        sort,
      )
    )
      return sort;
    if (p.get("proximity") === "remote") return "proximity";
    return "name";
  });
  const [sortDir, setSortDir] = useState(() => {
    const p = new URLSearchParams(location.search);
    const sort = p.get("sort");
    if (sort === "match") return "asc";
    if (p.get("proximity") === "remote") return "remote";
    return "asc";
  });
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [openSubmenuKey, setOpenSubmenuKey] = useState(null);
  const sortFilterRef = useRef(null);
  const portalContainerRef = useRef(null);

  // ===== BUTTON / PORTAL REFS =====
  const sortButtonRefs = useRef({});
  const submenuRef = useRef(null);

  // ===== PORTAL POSITION STATE =====
  const [submenuPosition, setSubmenuPosition] = useState(null);

  // ===== DISTANCE FILTER STATE =====
  const [maxDistance, setMaxDistance] = useState(null);
  const [customDistanceInput, setCustomDistanceInput] = useState("");
  const [userHasCoordinates, setUserHasCoordinates] = useState(false);
  const [openRolesOnly, setOpenRolesOnly] = useState(false);
  const [includeOwnTeams, setIncludeOwnTeams] = useState(true);
  const [includeDemoData, setIncludeDemoData] = useState(true);

  // ===== CAPACITY FILTER STATE =====
  const [capacityMode, setCapacityMode] = useState("spots");

  // ===== RESULT VIEW STATE =====
  const [resultView, setResultView] = useState("map");

  // ===== ROLE MATCH CONTEXT STATE =====
  const [matchRoleId, setMatchRoleId] = useState(() => {
    const p = new URLSearchParams(location.search);
    const id = p.get("roleId");
    return id ? Number(id) : null;
  });
  const [matchRoleName, setMatchRoleName] = useState(() => {
    const p = new URLSearchParams(location.search);
    return p.get("roleName") || null;
  });
  const [matchRoleMaxDistanceKm, setMatchRoleMaxDistanceKm] = useState(() => {
    const p = new URLSearchParams(location.search);
    const value = Number(p.get("roleMaxDistanceKm"));
    return Number.isFinite(value) && value > 0 ? value : null;
  });
  const [excludeTeamId, setExcludeTeamId] = useState(() => {
    const p = new URLSearchParams(location.search);
    const id = p.get("excludeTeamId");
    return id ? Number(id) : null;
  });
  const [excludeTeamName, setExcludeTeamName] = useState(() => {
    const p = new URLSearchParams(location.search);
    return p.get("excludeTeamName") || null;
  });

  // ===== TAG & BADGE FILTER STATE =====
  const [filterTagIds, setFilterTagIds] = useState(() => {
    const p = new URLSearchParams(location.search);
    const tagsParam = p.get("tags");
    if (tagsParam) {
      return tagsParam.split(",").map(Number).filter(Boolean);
    }
    return [];
  });
  const [filterTagMap, setFilterTagMap] = useState({});
  const [filterBadgeIds, setFilterBadgeIds] = useState(() => {
    const p = new URLSearchParams(location.search);
    const badgesParam = p.get("badges");
    if (badgesParam) {
      return badgesParam.split(",").map(Number).filter(Boolean);
    }
    return [];
  });
  const [filterBadgeMap, setFilterBadgeMap] = useState({});
  // All badges, fetched once and cached across navigation via React Query
  // (staleTime 5min). Used for client-side suggestion filtering + resolving
  // badge names from URL params. Replaces a manual mount-effect fetch that
  // refetched on every SearchPage mount (and double-fired under StrictMode).
  const { data: allBadges = EMPTY_QUERY_ARRAY } = useBadges();
  const {
    viewerMatchProfile: viewerTeamMatchProfile,
    viewerDistanceSource,
  } = useViewerMatchProfile({
    userId: user?.id,
  });

  // ===== PAGINATION STATE =====
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage, setResultsPerPage] = useState(
    DEFAULT_RESULTS_PER_PAGE,
  );

  // Effective filter values (a couple of filters are forced depending on the
  // active search type / auth) — feed both the request criteria and the UI.
  const effectiveOpenRolesOnly =
    searchType === "users" ? false : openRolesOnly;
  const effectiveIncludeOwnTeams =
    !isAuthenticated || searchType === "users" ? true : includeOwnTeams;

  // ===== SEARCH QUERY (React Query) =====
  // The fully-resolved request criteria double as the query key, so each
  // page/filter/sort combination is cached independently and identical requests
  // are deduped across navigations (saves Render CPU + Neon compute).
  const requestCriteria = useMemo(
    () =>
      buildSearchRequestCriteria({
        hasSearched,
        searchQuery,
        searchType,
        currentPage,
        resultsPerPage,
        sortBy,
        sortDir,
        maxDistance,
        effectiveOpenRolesOnly,
        effectiveIncludeOwnTeams,
        includeDemoData,
        capacityMode,
        filterTagIds,
        filterBadgeIds,
        matchRoleId,
        excludeTeamId,
      }),
    [
      hasSearched,
      searchQuery,
      searchType,
      currentPage,
      resultsPerPage,
      sortBy,
      sortDir,
      maxDistance,
      effectiveOpenRolesOnly,
      effectiveIncludeOwnTeams,
      includeDemoData,
      capacityMode,
      filterTagIds,
      filterBadgeIds,
      matchRoleId,
      excludeTeamId,
    ],
  );

  const {
    data: searchData,
    isFetching: isSearchFetching,
    isError: isSearchError,
    error: searchQueryError,
  } = useGlobalSearch(requestCriteria, isAuthenticated, {
    // Wait until auth resolves so we don't fetch with a stale auth flag baked
    // into the request (the result set differs for authenticated viewers).
    enabled: !authLoading,
  });

  // On an actual error, blank the list (keepPreviousData would otherwise keep
  // the last results on screen); on success / while refetching, show the data.
  const activeSearchData = isSearchError ? undefined : searchData;

  const searchResults = useMemo(
    () =>
      activeSearchData?.data
        ? {
            teams: activeSearchData.data.teams ?? [],
            users: activeSearchData.data.users ?? [],
            roles: activeSearchData.data.roles ?? [],
          }
        : EMPTY_SEARCH_RESULTS,
    [activeSearchData],
  );

  const pagination = useMemo(
    () => activeSearchData?.pagination ?? DEFAULT_PAGINATION,
    [activeSearchData],
  );

  // `loading` keeps its old "a request is in flight" meaning (button-disabled
  // states, the no-results gate). The full-page spinner instead uses
  // `showInitialLoader` so background refetches keep the previous list visible.
  const loading = isSearchFetching;
  const showInitialLoader = isSearchFetching && !activeSearchData;

  // Write back the response-derived values that live in editable / URL-bound
  // state. Gated on the (truthy) data object per the RQ default-vs-effect
  // footgun; skipped on error (activeSearchData is undefined), matching the old
  // success-only behaviour.
  useEffect(() => {
    if (!activeSearchData) return;
    setUserHasCoordinates(!!activeSearchData.userLocation?.hasCoordinates);
    if (activeSearchData.matchRole?.roleName) {
      setMatchRoleName(activeSearchData.matchRole.roleName);
    }
    const nextRoleMaxDistanceKm = Number(
      activeSearchData.matchRole?.maxDistanceKm ??
        activeSearchData.matchRole?.max_distance_km ??
        activeSearchData.matchRole?.distanceLimitKm ??
        activeSearchData.matchRole?.distance_limit_km,
    );
    if (Number.isFinite(nextRoleMaxDistanceKm) && nextRoleMaxDistanceKm > 0) {
      setMatchRoleMaxDistanceKm(nextRoleMaxDistanceKm);
    }
  }, [activeSearchData]);

  // Mirror the query error into the dismissable `error` alert state. Only
  // re-runs when the query error itself flips, so a manual dismiss (or the
  // explicit setError(null) clears elsewhere) sticks until the next fetch.
  useEffect(() => {
    setError(searchQueryError ? getApiErrorMessage(searchQueryError) : null);
  }, [searchQueryError]);

  const withResolvedDistance = useCallback((item, viewerEntity) => {
    if (!item) return item;

    const matchType = item.matchType ?? item.match_type ?? null;
    const matchDetails = item.matchDetails ?? item.match_details ?? null;
    const rawRoleDistance =
      matchDetails?.distanceKm ?? matchDetails?.distance_km;
    const roleDistance =
      rawRoleDistance !== null &&
      rawRoleDistance !== undefined &&
      rawRoleDistance !== ""
        ? Number(rawRoleDistance)
        : null;
    const rawDistanceValue = item.distanceKm ?? item.distance_km;
    const rawDistance =
      rawDistanceValue !== null &&
      rawDistanceValue !== undefined &&
      rawDistanceValue !== ""
        ? Number(rawDistanceValue)
        : null;
    const computedDistance = viewerEntity
      ? calculateDistanceKm(viewerEntity, item)
      : null;
    const rawZeroLooksWrong =
      Number.isFinite(rawDistance) &&
      rawDistance <= 0.5 &&
      viewerEntity &&
      locationsHaveDifferentKnownParts(viewerEntity, item);

    let resolvedDistance = null;

    if (
      matchType === "role_match" &&
      Number.isFinite(roleDistance) &&
      roleDistance < DISTANCE_UNAVAILABLE_SENTINEL_KM
    ) {
      resolvedDistance = roleDistance;
    } else if (
      Number.isFinite(rawDistance) &&
      rawDistance < DISTANCE_UNAVAILABLE_SENTINEL_KM
    ) {
      resolvedDistance =
        rawZeroLooksWrong && computedDistance != null
          ? computedDistance
          : rawZeroLooksWrong
            ? null
            : rawDistance;
    } else if (computedDistance != null) {
      resolvedDistance = computedDistance;
    }

    if (resolvedDistance == null && rawZeroLooksWrong) {
      return {
        ...item,
        distance_km: null,
        distanceKm: null,
      };
    }

    if (resolvedDistance == null) {
      return item;
    }

    return {
      ...item,
      distance_km: resolvedDistance,
      distanceKm: resolvedDistance,
    };
  }, []);

  const sortOptions = [
    {
      value: "name",
      defaultDir: "asc",
      labelAsc: "Name (A-Z)",
      labelDesc: "Name (Z-A)",
      shortLabelAsc: "A-Z",
      shortLabelDesc: "Z-A",
      tooltipAsc: "Sort alphabetically from A to Z",
      tooltipDesc: "Sort alphabetically from Z to A",
      iconAsc: ArrowDownAZ,
      iconDesc: ArrowUpZA,
      teamsOnly: false,
    },
    {
      value: "recent",
      defaultDir: "desc",
      labelAsc: "Inactive",
      labelDesc: "Active",
      shortLabelAsc: "Inactive",
      shortLabelDesc: "Active",
      tooltipAsc: "Show the least recently active results first",
      tooltipDesc: "Show the most recently active results first",
      iconAsc: Clock,
      iconDesc: Clock,
      teamsOnly: false,
    },
    {
      value: "newest",
      defaultDir: "desc",
      labelAsc: "Oldest",
      labelDesc: "Newest",
      shortLabelAsc: "Oldest",
      shortLabelDesc: "New",
      tooltipAsc: "Show the oldest results first",
      tooltipDesc: "Show the newest results first",
      iconAsc: Sparkles,
      iconDesc: Sparkles,
      teamsOnly: false,
    },
    {
      value: "match",
      defaultDir: "asc",
      labelAsc: "Best Match",
      shortLabelAsc: "Match",
      tooltipAsc: "Sort results by how well they match your profile",
      iconAsc: Target,
      authOnly: true,
    },
    {
      value: "locationPriority",
      sortValue: "proximity",
      defaultDir: "asc",
      labelAsc: "Nearest",
      labelRemote: "Remote First",
      shortLabelAsc: "Near",
      shortLabelRemote: "Remote 1st",
      tooltipAsc: "Keep nearby results ahead of remote-friendly results",
      tooltipRemote: "Show remote-friendly results first",
      iconAsc: MapPin,
      iconRemote: Globe,
      requiresCoordinates: true,
    },
    {
      value: "proximity",
      defaultDir: "asc",
      filterOnly: true,
      labelAsc: "Distance",
      shortLabelAsc: "Distance",
      tooltipAsc: "Filter results by distance from your location",
      iconAsc: Radius,
    },
    {
      value: "capacity",
      defaultDir: "desc",
      labelAsc: "Almost Full",
      labelDesc: "Most Spots",
      shortLabelAsc: "Full",
      shortLabelDesc: "Spots",
      tooltipAsc: "Show teams with the fewest open spots first\nTeams only",
      tooltipDesc: "Show teams with the most open spots first\nTeams only",
      iconAsc: UserMinus,
      iconDesc: UserPlus,
      teamsOnly: true,
    },
  ];

  const roleMatchTagIds = useMemo(
    () =>
      sortBy === "match" && matchRoleId && filterTagIds.length > 0
        ? new Set(filterTagIds)
        : null,
    [filterTagIds, matchRoleId, sortBy],
  );

  const roleMatchBadgeNames = useMemo(
    () =>
      sortBy === "match" && matchRoleId && filterBadgeIds.length > 0
        ? new Set(
            filterBadgeIds
              .map((id) => filterBadgeMap[id]?.name)
              .filter(Boolean)
              .map((name) => name.toLowerCase()),
          )
        : null,
    [filterBadgeIds, filterBadgeMap, matchRoleId, sortBy],
  );

  const effectiveSearchResults = useMemo(() => {
    const shouldResolveDistance = Boolean(viewerDistanceSource);
    const shouldEnrichMatches =
      sortBy === "match" && Boolean(viewerTeamMatchProfile?.user);

    return {
      ...searchResults,
      users: Array.isArray(searchResults.users)
        ? searchResults.users.map((matchedUser) => {
            const distanceResolvedUser = shouldResolveDistance
              ? withResolvedDistance(matchedUser, viewerDistanceSource)
              : matchedUser;
            const enrichedUser =
              shouldEnrichMatches
                ? matchRoleId
                  ? enrichUserRoleMatchData({
                      user: distanceResolvedUser,
                      requiredTagIds: roleMatchTagIds,
                      requiredBadgeNames: roleMatchBadgeNames,
                    })
                  : enrichUserMatchData({
                      user: distanceResolvedUser,
                      viewerProfile: viewerTeamMatchProfile,
                    })
                : distanceResolvedUser;

            return enrichedUser;
          })
        : searchResults.users,
      teams: Array.isArray(searchResults.teams)
        ? searchResults.teams.map((team) => {
            const distanceResolvedTeam = shouldResolveDistance
              ? withResolvedDistance(team, viewerDistanceSource)
              : team;
            const enrichedTeam =
              shouldEnrichMatches
                ? enrichTeamMatchData({
                    team: distanceResolvedTeam,
                    viewerProfile: viewerTeamMatchProfile,
                  })
                : distanceResolvedTeam;

            return enrichedTeam;
          })
        : searchResults.teams,
      roles: Array.isArray(searchResults.roles)
        ? searchResults.roles.map((role) =>
            shouldResolveDistance
              ? withResolvedDistance(role, viewerDistanceSource)
              : role,
          )
        : searchResults.roles,
    };
  }, [
    matchRoleId,
    roleMatchBadgeNames,
    roleMatchTagIds,
    searchResults,
    sortBy,
    viewerDistanceSource,
    viewerTeamMatchProfile,
    withResolvedDistance,
  ]);

  const shouldExcludeCurrentUserFromBestMatch =
    sortBy === "match" && isAuthenticated && !!user?.id;

  const distanceFilteredSearchResults = useMemo(() => {
    const distanceLimit = Number(maxDistance);

    if (!Number.isFinite(distanceLimit) || distanceLimit <= 0) {
      return effectiveSearchResults;
    }

    const isWithinDistanceLimit = (item) => {
      const distance = getFilterableDistanceKm(item);
      return distance !== null && distance <= distanceLimit;
    };
    const filterItems = (items) =>
      Array.isArray(items) ? items.filter(isWithinDistanceLimit) : items;

    return {
      ...effectiveSearchResults,
      users: filterItems(effectiveSearchResults.users),
      teams: filterItems(effectiveSearchResults.teams),
      roles: filterItems(effectiveSearchResults.roles),
    };
  }, [effectiveSearchResults, maxDistance]);

  const displaySearchResults = useMemo(() => {
    if (
      !shouldExcludeCurrentUserFromBestMatch ||
      !Array.isArray(distanceFilteredSearchResults.users)
    ) {
      return distanceFilteredSearchResults;
    }

    return {
      ...distanceFilteredSearchResults,
      users: distanceFilteredSearchResults.users.filter(
        (matchedUser) => String(matchedUser?.id) !== String(user.id),
      ),
    };
  }, [
    distanceFilteredSearchResults,
    shouldExcludeCurrentUserFromBestMatch,
    user?.id,
  ]);

  const filteredResults = {
    users:
      searchType === "all" || searchType === "users"
        ? displaySearchResults.users
        : [],
    teams:
      searchType === "all" || searchType === "teams"
        ? displaySearchResults.teams
        : [],
    roles:
      searchType === "roles" || searchType === "all"
        ? displaySearchResults.roles
        : [],
  };
  const usesClientMergedPagination = shouldUseMergedResultPagination({
    searchType,
    sortBy,
  });
  const effectivePagination = useMemo(() => {
    if (usesClientMergedPagination) {
      const totalItems =
        (pagination.totalTeams || 0) +
        (pagination.totalUsers || 0) +
        (pagination.totalRoles || 0);
      const totalPages = Math.max(
        1,
        Math.ceil(totalItems / Math.max(1, resultsPerPage)),
      );

      return {
        ...pagination,
        page: currentPage,
        limit: resultsPerPage,
        totalItems,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      };
    }

    if (
      !shouldExcludeCurrentUserFromBestMatch ||
      searchType === "teams" ||
      searchType === "roles"
    ) {
      return pagination;
    }

    const totalUsers = Math.max(0, (pagination.totalUsers || 0) - 1);
    const totalItems =
      searchType === "all"
        ? Math.max(0, (pagination.totalItems || 0) - 1)
        : pagination.totalItems || 0;
    const relevantTotal =
      searchType === "users"
        ? totalUsers
        : searchType === "teams"
          ? pagination.totalTeams || 0
          : totalItems;

    return {
      ...pagination,
      totalUsers,
      totalItems,
      totalPages: Math.max(
        1,
        Math.ceil(relevantTotal / Math.max(1, resultsPerPage)),
      ),
    };
  }, [
    pagination,
    currentPage,
    resultsPerPage,
    searchType,
    shouldExcludeCurrentUserFromBestMatch,
    usesClientMergedPagination,
  ]);

  const mergedDisplayItems = (() => {
    if (searchType !== "all") return null;
    const teams = filteredResults.teams.map((t, index) => ({
      ...t,
      _resultType: "team",
      _resultGroupIndex: index,
    }));
    const users = filteredResults.users.map((u, index) => ({
      ...u,
      _resultType: "user",
      _resultGroupIndex: index,
    }));
    const roles = filteredResults.roles.map((r, index) => ({
      ...r,
      _resultType: "role",
      _resultGroupIndex: index,
    }));
    const combined = [...teams, ...users, ...roles];
    combined.sort((a, b) => {
      const aIsRole = a._resultType === "role";
      const bIsRole = b._resultType === "role";
      if (sortBy === "name") {
        const aName = getSearchItemDisplayName(a);
        const bName = getSearchItemDisplayName(b);
        const cmp = aName.localeCompare(bName);
        return sortDir === "asc" ? cmp : -cmp;
      }
      if (sortBy === "newest") {
        const aDate = new Date(
          aIsRole
            ? (a.createdAt ?? a.created_at ?? 0)
            : (a.created_at ?? a.createdAt ?? 0),
        ).getTime();
        const bDate = new Date(
          bIsRole
            ? (b.createdAt ?? b.created_at ?? 0)
            : (b.created_at ?? b.createdAt ?? 0),
        ).getTime();
        return sortDir === "asc" ? aDate - bDate : bDate - aDate;
      }
      if (sortBy === "recent") {
        const getDate = (item) => {
          if (item._resultType === "role") {
            const roleDate = item.createdAt ?? item.created_at ?? 0;
            return roleDate ? new Date(roleDate).getTime() : 0;
          }
          const val =
            item.last_active_at ?? item.lastActiveAt ?? item.last_active ??
            item.lastActive ?? item.updated_at ?? item.updatedAt ??
            item.created_at ?? item.createdAt;
          return val ? new Date(val).getTime() : 0;
        };
        return sortDir === "asc" ? getDate(a) - getDate(b) : getDate(b) - getDate(a);
      }
      if (sortBy === "proximity") {
        return compareProximityItems(a, b, sortDir);
      }
      if (sortBy === "match") {
        const aScore = getResultMatchScore(a);
        const bScore = getResultMatchScore(b);
        return bScore - aScore;
      }
      return 0;
    });

    const startIndex = usesClientMergedPagination
      ? (currentPage - 1) * resultsPerPage
      : 0;

    return combined.slice(startIndex, startIndex + resultsPerPage);
  })();

  const sortedUsers = (() => {
    const users = filteredResults.users;
    if (sortBy === "match") {
      return [...users].sort(
        (a, b) => getResultMatchScore(b) - getResultMatchScore(a),
      );
    }
    if (sortBy === "proximity") {
      return sortByProximity(users, sortDir);
    }
    if (sortBy !== "name") return users;
    return [...users].sort((a, b) => {
      const cmp = getUserDisplayName(a).localeCompare(getUserDisplayName(b));
      return sortDir === "asc" ? cmp : -cmp;
    });
  })();

  const sortedTeams = (() => {
    const teams = filteredResults.teams;
    if (sortBy === "match") {
      return [...teams].sort(
        (a, b) => getResultMatchScore(b) - getResultMatchScore(a),
      );
    }
    if (sortBy === "proximity") {
      return sortByProximity(teams, sortDir);
    }
    return teams;
  })();

  const sortedRoles =
    sortBy === "proximity"
      ? sortByProximity(filteredResults.roles, sortDir)
      : filteredResults.roles;

  const withViewerTeamRole = useCallback(
    (team) => {
      const teamId = getSearchTeamId(team);
      const role =
        teamId != null
          ? viewerTeamRoles[String(teamId)] ??
            normalizeViewerTeamRole(
              team?.userRole ??
                team?.user_role ??
                team?.currentUserRole ??
                team?.current_user_role,
            )
          : null;

      if (!role) return team;

      return {
        ...team,
        userRole: role,
        user_role: role,
        currentUserRole: role,
        current_user_role: role,
      };
    },
    [viewerTeamRoles],
  );

  const displayedTeams = mergedDisplayItems
    ? []
    : searchType === "users"
      ? []
      : sortedTeams.slice(0, resultsPerPage);
  const displayedUsers = mergedDisplayItems
    ? []
    : searchType === "teams"
      ? []
      : sortedUsers.slice(0, Math.max(0, resultsPerPage - displayedTeams.length));
  const visibleMapItems =
    searchType === "all"
      ? mergedDisplayItems
      : searchType === "roles"
        ? sortedRoles.map((role) => ({ ...role, _resultType: "role" }))
        : [
            ...displayedTeams.map((team) => ({ ...team, _resultType: "team" })),
            ...displayedUsers.map((matchedUser) => ({
              ...matchedUser,
              _resultType: "user",
            })),
          ];
  const visibleMapItemsWithViewerRoles = visibleMapItems.map((item) =>
    item?._resultType === "team" ? withViewerTeamRole(item) : item,
  );

  const hasActiveFilters =
    filterTagIds.length > 0 ||
    filterBadgeIds.length > 0 ||
    maxDistance !== null ||
    !!matchRoleId;

  const noResultsFound =
    (hasSearched || hasActiveFilters) &&
    (searchType === "roles"
      ? filteredResults.roles.length === 0
      : filteredResults.teams.length === 0 &&
        filteredResults.users.length === 0 &&
        filteredResults.roles.length === 0) &&
    !loading;
  const noResultsAlertKey = [
    searchQuery.trim(),
    searchType,
    sortBy,
    sortDir,
    capacityMode,
    maxDistance ?? "any-distance",
    openRolesOnly,
    includeOwnTeams,
    includeDemoData,
    matchRoleId ?? "any-role",
    excludeTeamId ?? "any-team",
    filterTagIds.join(","),
    filterBadgeIds.join(","),
  ].join("|");
  const showNoResultsAlert =
    noResultsFound && dismissedNoResultsAlertKey !== noResultsAlertKey;

  const hasVisibleResults =
    filteredResults.teams.length > 0 ||
    filteredResults.users.length > 0 ||
    filteredResults.roles.length > 0;

  const isCapacitySpotsSort =
    searchType === "teams" && sortBy === "capacity" && capacityMode === "spots";
  const isCapacityRolesSort =
    searchType === "teams" && sortBy === "capacity" && capacityMode === "roles";
  const shouldShowLocationContext = true;

  const activeSubmenuKey =
    showSortDropdown && showFilterOptions ? openSubmenuKey : null;

  const submenuAnchorSortKey =
    activeSubmenuKey === "capacity"
      ? "capacity"
      : activeSubmenuKey === DISTANCE_SUBMENU_TYPE
        ? "proximity"
        : sortBy;
  const visibleSortOptions = getVisibleSortOptions({
    sortOptions,
    searchType,
    userHasCoordinates,
    isAuthenticated,
  });
  const visibleSortingOptions = visibleSortOptions.filter((option) =>
    SORTING_OPTION_VALUES.has(option.value),
  );
  const visibleFilterOptions = visibleSortOptions.filter(
    (option) => !SORTING_OPTION_VALUES.has(option.value),
  );

  // Resolve badge names from URL params once allBadges has loaded
  useEffect(() => {
    if (allBadges.length === 0) return;
    const unresolved = filterBadgeIds.filter((id) => !filterBadgeMap[id]);
    if (unresolved.length === 0) return;
    const additions = {};
    unresolved.forEach((id) => {
      const badge = allBadges.find((b) => Number(b.id) === id);
      if (badge) additions[id] = badge;
    });
    if (Object.keys(additions).length > 0) {
      setFilterBadgeMap((prev) => ({ ...prev, ...additions }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allBadges]);

  const focusAreaPills = filterTagIds.map((id) => ({
    key: `tag-${id}`,
    id,
    label: filterTagMap[id]?.name || `Tag ${id}`,
    category: filterTagMap[id]?.category || "",
    supercategory: filterTagMap[id]?.supercategory || "",
  }));

  const badgePills = filterBadgeIds
    .map((id) => ({
      key: `badge-${id}`,
      id,
      label: filterBadgeMap[id]?.name || `Badge ${id}`,
      category: filterBadgeMap[id]?.category || "",
    }))
    .sort((a, b) => {
      const categoryDiff =
        getBadgeCategoryOrder(a.category) - getBadgeCategoryOrder(b.category);
      if (categoryDiff !== 0) return categoryDiff;
      return a.label.localeCompare(b.label);
    });
  const activeCriteriaPills = getActiveCriteriaPills({
    sortBy,
    sortDir,
    capacityMode,
    maxDistance,
    effectiveOpenRolesOnly,
    effectiveIncludeOwnTeams,
    includeDemoData,
    matchRoleId,
    matchRoleName,
    excludeTeamId,
    excludeTeamName,
  });
  const showIncludeOwnTeamsFilter = isAuthenticated && searchType !== "users";

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const typeParam = urlParams.get("type");

    if (typeParam === "teams") {
      setSearchType("teams");
    } else if (typeParam === "users") {
      setSearchType("users");
    } else if (typeParam === "roles") {
      setSearchType("roles");
    }

    const roleIdParam = urlParams.get("roleId");
    const sortParam = urlParams.get("sort");
    if (roleIdParam && sortParam === "match") {
      setSortBy("match");
      setSortDir("asc");
    }

    // Badge IDs already set via lazy init; names resolved by the allBadges effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tagsParam = urlParams.get("tags");
    if (!tagsParam) return;

    const ids = tagsParam.split(",").map(Number).filter(Boolean);
    if (ids.length === 0 || Object.keys(structuredTagLookup).length === 0) {
      return;
    }

    const map = {};
    ids.forEach((id) => {
      if (structuredTagLookup[id]) map[id] = structuredTagLookup[id];
    });
    setFilterTagMap(map);
  }, [location.search, structuredTagLookup]);

  useEffect(() => {
    if (
      filterTagIds.length === 0 ||
      Object.keys(structuredTagLookup).length === 0
    ) {
      return;
    }

    setFilterTagMap((prev) => {
      let changed = false;
      const next = { ...prev };

      filterTagIds.forEach((id) => {
        const taxonomyTag = structuredTagLookup[id];
        if (!taxonomyTag) return;

        const current = next[id];
        if (
          current?.category === taxonomyTag.category &&
          current?.supercategory === taxonomyTag.supercategory
        ) {
          return;
        }

        next[id] = {
          ...taxonomyTag,
          ...current,
          id,
          category: current?.category || taxonomyTag.category,
          supercategory: current?.supercategory || taxonomyTag.supercategory,
        };
        changed = true;
      });

      return changed ? next : prev;
    });
  }, [filterTagIds, structuredTagLookup]);

  useEffect(() => {
    if (!showSortDropdown) {
      setOpenSubmenuKey(null);
      setShowFilterOptions(false);
      return;
    }

    if (!showFilterOptions) {
      setOpenSubmenuKey(null);
      return;
    }

    if (openSubmenuKey === "capacity" && searchType !== "teams") {
      setOpenSubmenuKey(null);
    }

    if (openSubmenuKey === DISTANCE_SUBMENU_TYPE && !userHasCoordinates) {
      setOpenSubmenuKey(null);
    }
  }, [
    showSortDropdown,
    showFilterOptions,
    openSubmenuKey,
    searchType,
    userHasCoordinates,
  ]);

  useEffect(() => {
    if (sortBy === "proximity" && sortDir === "desc") {
      setSortDir("asc");
      setCurrentPage(1);
    }
  }, [sortBy, sortDir]);

  useLayoutEffect(() => {
    if (!activeSubmenuKey || !showSortDropdown) {
      setSubmenuPosition(null);
      return;
    }

    const updatePosition = () => {
      const anchorEl = sortButtonRefs.current[submenuAnchorSortKey];
      const submenuEl = submenuRef.current;

      if (!anchorEl) return;

      const anchorRect = anchorEl.getBoundingClientRect();
      const visibleButtonTops = Object.values(sortButtonRefs.current)
        .filter(Boolean)
        .map((button) => button.getBoundingClientRect().top);
      const submenuHeight = submenuEl?.offsetHeight || 30;
      const submenuItemRects = submenuEl
        ? Array.from(
            submenuEl.querySelectorAll('[data-submenu-item="true"]'),
          ).map((item) => item.getBoundingClientRect())
        : [];
      const visibleSubmenuItemRects = submenuItemRects.filter(
        (rect) => rect.width > 0 && rect.height > 0,
      );
      const submenuWidth = submenuEl?.offsetWidth || 0;

      const submenuTop = anchorRect.bottom + 6;
      const anchorMidY = anchorRect.top + anchorRect.height / 2;
      const submenuAnchorHeight =
        visibleSubmenuItemRects.length > 0
          ? (() => {
              const firstRowTop = Math.min(
                ...visibleSubmenuItemRects.map((rect) => rect.top),
              );
              const firstRowRects = visibleSubmenuItemRects.filter(
                (rect) => Math.abs(rect.top - firstRowTop) < 2,
              );

              return Math.max(...firstRowRects.map((rect) => rect.bottom)) - firstRowTop;
            })()
          : submenuHeight;
      const submenuMidY = submenuTop + submenuAnchorHeight / 2;
      const firstRowTop =
        visibleButtonTops.length > 0
          ? Math.min(...visibleButtonTops)
          : anchorRect.top;
      const shouldAlignLeft = anchorRect.top > firstRowTop + 4;

      if (shouldAlignLeft) {
        const submenuLeft = Math.min(
          Math.max(8, anchorRect.left),
          Math.max(8, window.innerWidth - submenuWidth - 8),
        );

        setSubmenuPosition({
          submenuTop,
          submenuLeft,
          align: "left",
          bracketLeft: Math.max(2, anchorRect.left - 6),
          bracketTop: anchorMidY,
          bracketHeight: Math.max(16, submenuMidY - anchorMidY),
          bracketOffsetTop: anchorMidY - submenuTop,
        });
        return;
      }

      const submenuRight = window.innerWidth - anchorRect.right;

      setSubmenuPosition({
        submenuTop,
        submenuRight,
        align: "right",
        bracketLeft: anchorRect.right,
        bracketTop: anchorMidY,
        bracketHeight: Math.max(16, submenuMidY - anchorMidY),
        bracketOffsetTop: anchorMidY - submenuTop,
      });
    };

    const raf = requestAnimationFrame(updatePosition);

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [
    activeSubmenuKey,
    submenuAnchorSortKey,
    showSortDropdown,
    sortBy,
    sortDir,
    capacityMode,
    maxDistance,
    customDistanceInput,
    userHasCoordinates,
    searchType,
  ]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!showSortDropdown) return;

      const clickedInsideSort =
        sortFilterRef.current?.contains(event.target) ?? false;

      const clickedInsidePortal =
        portalContainerRef.current?.contains(event.target) ?? false;

      if (!clickedInsideSort && !clickedInsidePortal) {
        setShowSortDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSortDropdown]);

  const handleBooleanSearch = async (q) => {
    const trimmed = (q || "").trim();
    setSearchQuery(q);
    setCurrentPage(1);

    if (!trimmed) {
      setHasSearched(false);
      setError(null);
      return;
    }

    setHasSearched(true);
    setError(null);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleResultsPerPageChange = (newLimit) => {
    setResultsPerPage(newLimit);
    setCurrentPage(1);
  };

  const handleSortDropdownToggle = () => {
    setShowSortDropdown((prev) => !prev);
  };

  const handleFilterOptionsToggle = () => {
    if (showFilterOptions) {
      setOpenSubmenuKey(null);
    }
    setShowFilterOptions((prev) => !prev);
  };

  const resetSortToDefault = () => {
    setSortBy("name");
    setSortDir("asc");
    setCurrentPage(1);
    setOpenSubmenuKey(null);
  };

  const handleResetSearchInput = () => {
    setSearchInputResetSignal((value) => value + 1);
    setSearchQuery("");
    setHasSearched(false);
    setError(null);
    setSearchType("all");
    setSortBy("name");
    setSortDir("asc");
    setMaxDistance(null);
    setCustomDistanceInput("");
    setCapacityMode("spots");
    setOpenRolesOnly(false);
    setIncludeOwnTeams(true);
    setIncludeDemoData(true);
    setFilterTagIds([]);
    setFilterTagMap({});
    setFilterBadgeIds([]);
    setFilterBadgeMap({});
    setMatchRoleId(null);
    setMatchRoleName(null);
    setMatchRoleMaxDistanceKm(null);
    setExcludeTeamId(null);
    setExcludeTeamName(null);
    setOpenSubmenuKey(null);
    setShowFilterOptions(false);
    setCurrentPage(1);

    const newParams = new URLSearchParams(window.location.search);
    [
      "type",
      "sort",
      "proximity",
      "tags",
      "badges",
      "roleId",
      "roleName",
      "roleMaxDistanceKm",
      "excludeTeamId",
      "excludeTeamName",
    ].forEach((param) => newParams.delete(param));
    const nextSearch = newParams.toString();
    window.history.replaceState(
      {},
      "",
      nextSearch
        ? `${window.location.pathname}?${nextSearch}`
        : window.location.pathname,
    );
  };

  const handleSortChange = (newSortBy) => {
    let newSortDir = sortDir;

    if (newSortBy === sortBy) {
      if (newSortBy === "proximity") {
        newSortDir = "asc";
      } else if (newSortBy === "capacity") {
        newSortDir = sortDir === "desc" ? "asc" : "desc";
      } else if (newSortBy === "match") {
        newSortDir = "asc";
      } else {
        newSortDir = sortDir === "asc" ? "desc" : "asc";
      }
    } else {
      switch (newSortBy) {
        case "name":
          newSortDir = "asc";
          break;
        case "capacity":
          newSortDir = "desc";
          break;
        case "proximity":
          newSortDir = "asc";
          break;
        case "match":
          newSortDir = "asc";
          break;
        default:
          newSortDir = "desc";
      }
    }

    setSortBy(newSortBy);
    setSortDir(newSortDir);
    setCurrentPage(1);
  };

  const handleLocationPriorityToggle = () => {
    const newSortDir =
      sortBy !== "proximity"
        ? "asc"
        : sortDir === "remote"
          ? "asc"
          : "remote";

    setSortBy("proximity");
    setSortDir(newSortDir);
    setCurrentPage(1);
  };

  const handleTopLevelSortOptionClick = (optionValue) => {
    if (optionValue === "capacity") {
      handleCapacityModeChange("spots");
      setOpenSubmenuKey("capacity");
      return;
    }

    if (optionValue === "locationPriority") {
      handleLocationPriorityToggle();
      setOpenSubmenuKey(null);
      return;
    }

    if (optionValue === "proximity") {
      setOpenSubmenuKey(DISTANCE_SUBMENU_TYPE);
      return;
    }

    if (optionValue === "match") {
      handleSortChange("match");
      setOpenSubmenuKey(null);
      return;
    }

    handleSortChange(optionValue);
    setOpenSubmenuKey(null);
  };

  const handleCapacityModeChange = (mode) => {
    if (sortBy !== "capacity") {
      setSortBy("capacity");
      setSortDir("desc");
      setCapacityMode(mode);
      setCurrentPage(1);
      return;
    }

    if (capacityMode === mode) {
      setSortDir((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setCapacityMode(mode);
      setSortDir("desc");
    }

    setCurrentPage(1);
  };

  const distancePresets = [5, 10, 25, 50, 100];

  const handleDistancePreset = (km) => {
    if (maxDistance === km) {
      setMaxDistance(null);
      setCustomDistanceInput("");
    } else {
      setMaxDistance(km);
      setCustomDistanceInput("");
    }
    setCurrentPage(1);
  };

  const handleCustomDistanceChange = (e) => {
    setCustomDistanceInput(e.target.value);
  };

  const handleCustomDistanceSubmit = () => {
    const value = parseFloat(customDistanceInput);
    if (value > 0 && Number.isFinite(value)) {
      setMaxDistance(value);
      setCurrentPage(1);
    } else if (customDistanceInput === "") {
      setMaxDistance(null);
      setCurrentPage(1);
    }
  };

  const handleCustomDistanceKeyDown = (e) => {
    if (e.key === "Enter") {
      handleCustomDistanceSubmit();
    }
  };

  const handleToggleChange = (type) => {
    setSearchType(type);
    setCurrentPage(1);
    setOpenSubmenuKey((prev) =>
      prev === "capacity" && type !== "teams" ? null : prev,
    );

    if (type !== "teams" && sortBy === "capacity") {
      setSortBy("name");
      setSortDir("asc");
    }

  };

  const handleOpenRolesOnlyToggle = () => {
    setOpenRolesOnly((prev) => !prev);
    setOpenSubmenuKey(null);
    setCurrentPage(1);
  };

  const handleIncludeOwnTeamsToggle = () => {
    setIncludeOwnTeams((prev) => !prev);
    setOpenSubmenuKey(null);
    setCurrentPage(1);
  };

  const handleAddTagFilter = (tag) => {
    const id = Number(tag?.id ?? tag?.tag_id ?? tag?.tagId);
    if (!Number.isFinite(id) || filterTagIds.includes(id)) return;
    const resolvedTag = resolveTagWithTaxonomy(tag);
    setFilterTagIds((prev) => [...prev, id]);
    setFilterTagMap((prev) => ({ ...prev, [id]: resolvedTag }));
    setCurrentPage(1);
  };

  const handleRemoveTagFilter = (tagId) => {
    const id = Number(tagId);
    setFilterTagIds((prev) => prev.filter((x) => x !== id));
    setFilterTagMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setCurrentPage(1);
  };

  const handleAddBadgeFilter = (badge) => {
    const id = Number(badge.id);
    if (filterBadgeIds.includes(id)) return;
    setFilterBadgeIds((prev) => [...prev, id]);
    setFilterBadgeMap((prev) => ({ ...prev, [id]: badge }));
    setCurrentPage(1);
  };

  const handleRemoveBadgeFilter = (badgeId) => {
    const id = Number(badgeId);
    setFilterBadgeIds((prev) => prev.filter((x) => x !== id));
    setFilterBadgeMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setCurrentPage(1);
  };

  const handleSearchSuggestions = useCallback(
    async (query) => {
      if (!query || query.trim().length < 2) return { tags: [], badges: [] };
      const trimmed = query.trim();

      const [rawTags] = await Promise.all([
        tagService.searchTags(trimmed).catch(() => []),
      ]);

      const tags = (Array.isArray(rawTags) ? rawTags : rawTags?.data || [])
        .filter((t) => !filterTagIds.includes(Number(t.id)))
        .map(resolveTagWithTaxonomy)
        .slice(0, 8);

      const q = trimmed.toLowerCase();
      const badges = allBadges
        .filter(
          (b) =>
            b.name.toLowerCase().includes(q) &&
            !filterBadgeIds.includes(Number(b.id)),
        )
        .slice(0, 5);

      return { tags, badges };
    },
    [allBadges, filterTagIds, filterBadgeIds, resolveTagWithTaxonomy],
  );

  const handleActivePillRemove = (pillKey) => {
    switch (pillKey) {
      case "searchType":
        handleToggleChange("all");
        break;
      case "sort":
        resetSortToDefault();
        break;
      case "maxDistance":
        setMaxDistance(null);
        setCustomDistanceInput("");
        setCurrentPage(1);
        break;
      case "openRolesOnly":
        setOpenRolesOnly(false);
        setCurrentPage(1);
        break;
      case "includeOwnTeams":
        setIncludeOwnTeams(true);
        setCurrentPage(1);
        break;
      case "includeDemoData":
        setIncludeDemoData(true);
        setCurrentPage(1);
        break;
      case "matchRole":
        setMatchRoleId(null);
        setMatchRoleName(null);
        setMatchRoleMaxDistanceKm(null);
        setCurrentPage(1);
        {
          const newParams = new URLSearchParams(window.location.search);
          newParams.delete("roleId");
          newParams.delete("roleName");
          newParams.delete("roleMaxDistanceKm");
          window.history.replaceState(
            {},
            "",
            `${window.location.pathname}?${newParams.toString()}`,
          );
        }
        break;
      case "excludeTeam":
        setExcludeTeamId(null);
        setExcludeTeamName(null);
        setCurrentPage(1);
        {
          const newParams = new URLSearchParams(window.location.search);
          newParams.delete("excludeTeamId");
          newParams.delete("excludeTeamName");
          window.history.replaceState(
            {},
            "",
            `${window.location.pathname}?${newParams.toString()}`,
          );
        }
        break;
      default:
        break;
    }
  };

  // Optimistically patch the cached search response so the affected card
  // reflects the change immediately; the next genuine refetch reconciles it.
  const handleUserUpdate = (updatedUser) => {
    queryClient.setQueryData(
      globalSearchQueryKey(requestCriteria, isAuthenticated),
      (prev) =>
        prev?.data
          ? {
              ...prev,
              data: {
                ...prev.data,
                users: (prev.data.users ?? []).map((u) =>
                  u.id === updatedUser.id ? updatedUser : u,
                ),
              },
            }
          : prev,
    );
  };

  const handleTeamUpdate = (updatedTeam) => {
    queryClient.setQueryData(
      globalSearchQueryKey(requestCriteria, isAuthenticated),
      (prev) =>
        prev?.data
          ? {
              ...prev,
              data: {
                ...prev.data,
                teams: (prev.data.teams ?? []).map((t) =>
                  t.id === updatedTeam.id
                    ? {
                        ...updatedTeam,
                        is_public: updatedTeam.is_public === true,
                      }
                    : t,
                ),
              },
            }
          : prev,
    );
  };

  const getTotalItemsForFilter = () => {
    switch (searchType) {
      case "teams":
        return effectivePagination.totalTeams || 0;
      case "users":
        return effectivePagination.totalUsers || 0;
      case "roles":
        return effectivePagination.totalRoles || 0;
      default:
        return effectivePagination.totalItems || 0;
    }
  };

  const isSortModified =
    sortBy !== "name" ||
    sortDir !== "asc" ||
    maxDistance !== null ||
    effectiveOpenRolesOnly ||
    !effectiveIncludeOwnTeams ||
    !includeDemoData ||
    (sortBy === "capacity" && capacityMode !== "spots") ||
    (customDistanceInput && customDistanceInput.trim() !== "");
  const isFilterOptionsActive =
    showFilterOptions ||
    maxDistance !== null ||
    sortBy === "capacity" ||
    effectiveOpenRolesOnly ||
    !effectiveIncludeOwnTeams ||
    !includeDemoData ||
    (customDistanceInput && customDistanceInput.trim() !== "");

  const sortIconColor = isSortModified
    ? "var(--color-primary)"
    : "var(--color-primary-focus)";
  const IncludeOwnTeamsIcon = Users2;
  const renderSortFilterToggle = (wrapperClassName = "inline-flex items-center") => (
    <Tooltip
      content={
        showSortDropdown
          ? "Hide Filtering & Sorting Options"
          : "Show Filtering & Sorting Options"
      }
      wrapperClassName={wrapperClassName}
    >
      <button
        type="button"
        onClick={handleSortDropdownToggle}
        className="shrink-0 rounded-lg p-0.5 sm:p-1 transition-colors"
        aria-label={
          showSortDropdown
            ? "Hide Filtering & Sorting Options"
            : "Show Filtering & Sorting Options"
        }
      >
        <SlidersHorizontal
          className="w-4 h-4 sm:w-5 sm:h-5"
          color={sortIconColor}
        />
      </button>
    </Tooltip>
  );

  const getReducedMenuIconClassName = (reduced) =>
    reduced ? "w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" : "";

  const renderToolbarOption = (option, { reduced = false, collapseLabel = false } = {}) => {
    const { isActive, IconComponent, label, shortLabel, tooltip } =
      getSortOptionDisplay({
        option,
        sortBy,
        sortDir,
        isCapacitySpotsSort,
        maxDistance,
      });
    const isSubmenuAnchor = !!activeSubmenuKey && submenuAnchorSortKey === option.value;
    const shouldCollapseLabel = !isSubmenuAnchor && collapseLabel && !isActive;
    const optionButton = (
      <FilterSortOptionButton
        ref={(node) => {
          sortButtonRefs.current[option.value] = node;
        }}
        onClick={() => handleTopLevelSortOptionClick(option.value)}
        icon={IconComponent}
        label={label}
        mobileLabel={shortLabel}
        active={isActive}
        disabled={loading}
        iconClassName={getReducedMenuIconClassName(reduced)}
        collapseLabel={shouldCollapseLabel}
        aria-label={tooltip ? `${label} - ${tooltip}` : label}
      />
    );

    return tooltip ? (
      <Tooltip
        key={option.value}
        content={tooltip}
        wrapperClassName="inline-flex items-center shrink-0"
      >
        {optionButton}
      </Tooltip>
    ) : (
      <React.Fragment key={option.value}>{optionButton}</React.Fragment>
    );
  };

  const renderFilterOptionsToggle = ({ reduced = false, collapseLabel = false } = {}) => (
    <Tooltip
      content={
        showFilterOptions ? "Click to hide filters" : "Show filter controls"
      }
      wrapperClassName="inline-flex items-center shrink-0"
    >
      <FilterSortOptionButton
        onClick={handleFilterOptionsToggle}
        icon={Filter}
        label={showFilterOptions ? "Hide Filters:" : "Show Filters ..."}
        mobileLabel={showFilterOptions ? "Hide Filters:" : "Filters ..."}
        active={isFilterOptionsActive}
        disabled={loading}
        iconClassName={getReducedMenuIconClassName(reduced)}
        collapseLabel={collapseLabel && !isFilterOptionsActive}
        aria-label={
          showFilterOptions ? "Hide filter controls" : "Show filter controls"
        }
      />
    </Tooltip>
  );

  const renderSortFilterOptionsMenu = ({ inline = false } = {}) => {
    const collapseLabel =
      activeSubmenuKey === DISTANCE_SUBMENU_TYPE || activeSubmenuKey === "capacity";
    return (
    <div
      className={
        inline
          ? "min-w-0 space-y-[3px]"
          : "space-y-[3px] sm:space-y-[6px]"
      }
    >
      <div
        className={`flex flex-row flex-wrap items-start gap-y-[3px] sm:gap-x-3 sm:gap-y-[6px] ${
          inline ? "gap-x-0.5" : "gap-x-1"
        }`}
      >
        <div
          role="group"
          aria-label="Sort options"
          className="contents"
        >
          {visibleSortingOptions.map((option) =>
            renderToolbarOption(option, { reduced: inline, collapseLabel }),
          )}
        </div>

        {!showFilterOptions && renderFilterOptionsToggle({ reduced: inline, collapseLabel })}
      </div>

      {showFilterOptions && (
        <div
          className={`flex flex-row flex-wrap items-start gap-y-[3px] sm:gap-x-3 sm:gap-y-[6px] ${
            inline ? "gap-x-0.5" : "gap-x-1"
          }`}
        >
          {renderFilterOptionsToggle({ reduced: inline, collapseLabel })}
          <div
            role="group"
            aria-label="Filter options"
            className="contents"
          >
            {visibleFilterOptions.map((option) =>
              renderToolbarOption(option, { reduced: inline, collapseLabel }),
            )}
          </div>

          {showIncludeOwnTeamsFilter && (
            <div
              role="group"
              aria-label="Search filters"
              className="contents"
            >
              <Tooltip
                content={
                  effectiveIncludeOwnTeams
                    ? "Include My Teams"
                    : "Exclude My Teams"
                }
                wrapperClassName="inline-flex items-center shrink-0"
              >
                <FilterSortOptionButton
                  onClick={handleIncludeOwnTeamsToggle}
                  icon={IncludeOwnTeamsIcon}
                  prefix={effectiveIncludeOwnTeams ? "+" : "-"}
                  label="My Teams"
                  active={!effectiveIncludeOwnTeams}
                  disabled={loading}
                  iconClassName={getReducedMenuIconClassName(inline)}
                  collapseLabel={collapseLabel && (
                    activeSubmenuKey === DISTANCE_SUBMENU_TYPE ||
                    activeSubmenuKey === "capacity" ||
                    effectiveIncludeOwnTeams
                  )}
                  aria-label={
                    effectiveIncludeOwnTeams
                      ? "Include My Teams"
                      : "Exclude My Teams"
                  }
                />
              </Tooltip>
            </div>
          )}

          <div
            role="group"
            aria-label="Demo data filter"
            className="contents"
          >
            <Tooltip
              content={
                includeDemoData
                  ? "Include test/demo profiles, roles and teams"
                  : "Show only real users, roles and teams"
              }
              wrapperClassName="inline-flex items-center shrink-0"
            >
              <FilterSortOptionButton
                onClick={() => {
                  setIncludeDemoData((prev) => !prev);
                  setOpenSubmenuKey(null);
                  setCurrentPage(1);
                }}
                icon={FlaskConical}
                prefix={includeDemoData ? "+" : "-"}
                label="Demo Data"
                mobileLabel="Demo"
                active={!includeDemoData}
                disabled={loading}
                iconClassName={getReducedMenuIconClassName(inline)}
                collapseLabel={collapseLabel && (
                  activeSubmenuKey === DISTANCE_SUBMENU_TYPE ||
                  activeSubmenuKey === "capacity" ||
                  includeDemoData
                )}
                aria-label={
                  includeDemoData
                    ? "Include test/demo profiles, roles and teams"
                    : "Show only real users, roles and teams"
                }
              />
            </Tooltip>
          </div>
        </div>
      )}
    </div>
    );
  };

  const renderSortSubmenuPortal = () => {
    if (!activeSubmenuKey || !submenuPosition) return null;

    const submenuContent = (
      <div ref={submenuRef}>
        {activeSubmenuKey === "capacity" && (
          <div className="flex items-center justify-end gap-3 pr-1">
            <button
              data-submenu-item="true"
              type="button"
              onClick={() => handleCapacityModeChange("roles")}
              disabled={loading}
              className={`text-xs rounded transition-colors ${
                isCapacityRolesSort
                  ? "text-[var(--color-primary)] font-bold"
                  : "text-[var(--color-primary-focus)] hover:text-[var(--color-primary-focus)] hover:font-medium"
              }`}
            >
              {isCapacityRolesSort && sortDir === "asc"
                ? "Least Roles"
                : "Most Roles"}
            </button>

            <button
              data-submenu-item="true"
              type="button"
              onClick={handleOpenRolesOnlyToggle}
              disabled={loading}
              className={`text-xs rounded transition-colors ${
                effectiveOpenRolesOnly
                  ? "text-[var(--color-primary)] font-bold"
                  : "text-[var(--color-primary-focus)] hover:text-[var(--color-primary-focus)] hover:font-medium"
              }`}
            >
              Roles only
            </button>
          </div>
        )}

        {activeSubmenuKey === DISTANCE_SUBMENU_TYPE && (
          <div className="flex items-center flex-wrap gap-x-[5px] gap-y-1 pr-1">
            <div className="hidden sm:contents">
              {distancePresets.map((km) => (
                <button
                  data-submenu-item="true"
                  key={km}
                  type="button"
                  onClick={() => handleDistancePreset(km)}
                  disabled={loading}
                  className={`pr-1 text-xs leading-none rounded transition-colors ${
                    maxDistance === km
                      ? "text-[var(--color-primary)] font-bold"
                      : "text-[var(--color-primary-focus)] hover:text-[var(--color-primary-focus)] hover:font-medium"
                  }`}
                >
                  {km}km
                </button>
              ))}
            </div>

            <div
              data-submenu-item="true"
              className="flex h-4 items-center gap-0.5"
            >
              <input
                type="number"
                min="1"
                placeholder="..."
                value={customDistanceInput}
                onChange={handleCustomDistanceChange}
                onBlur={handleCustomDistanceSubmit}
                onKeyDown={handleCustomDistanceKeyDown}
                style={{
                  width: `${Math.max(
                    4.5,
                    (customDistanceInput?.length || 0) + 2,
                  )}ch`,
                }}
                className={`h-4 px-1 text-xs leading-none rounded border transition-colors
                [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                ${
                  maxDistance && !distancePresets.includes(maxDistance)
                    ? "border-[var(--color-success)] text-[var(--color-success)] font-medium"
                    : "border-[var(--color-text)]/20 text-[var(--color-text)]/60"
                }
                bg-white focus:outline-none focus:border-[var(--color-success)]`}
                disabled={loading}
              />
              <span className="text-xs leading-none text-[var(--color-primary-focus)]">
                km
              </span>
            </div>
          </div>
        )}
      </div>
    );

    return ReactDOM.createPortal(
      <div ref={portalContainerRef}>
        {/* submenu */}
        <div
          style={{
            position: "fixed",
            top: submenuPosition.submenuTop,
            ...(submenuPosition.align === "left"
              ? { left: submenuPosition.submenuLeft + 15 }
              : { right: submenuPosition.submenuRight - 15 }),
            zIndex: 1100,
            display: "flex",
            justifyContent:
              submenuPosition.align === "left" ? "flex-start" : "flex-end",
            pointerEvents: "auto",
          }}
        >
          {submenuContent}
        </div>

        {/* bracket */}
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            left: submenuPosition.bracketLeft,
            top: submenuPosition.bracketTop,
            width: 6,
            height: submenuPosition.bracketHeight,
            pointerEvents: "none",
            zIndex: 1099,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              ...(submenuPosition.align === "left"
                ? { left: 0 }
                : { right: 0 }),
              width: 4,
              borderTop: "1.5px solid var(--color-primary)",
              ...(submenuPosition.align === "left"
                ? { borderTopLeftRadius: "3px" }
                : { borderTopRightRadius: "3px" }),
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              ...(submenuPosition.align === "left"
                ? { left: 0 }
                : { right: 0 }),
              height: "100%",
              ...(submenuPosition.align === "left"
                ? {
                    borderLeft: "1.5px solid var(--color-primary)",
                    borderTopLeftRadius: "3px",
                    borderBottomLeftRadius: "3px",
                  }
                : {
                    borderRight: "1.5px solid var(--color-primary)",
                    borderTopRightRadius: "3px",
                    borderBottomRightRadius: "3px",
                  }),
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              ...(submenuPosition.align === "left"
                ? { left: 0 }
                : { right: 0 }),
              width: 4,
              borderBottom: "1.5px solid var(--color-primary)",
              ...(submenuPosition.align === "left"
                ? { borderBottomLeftRadius: "3px" }
                : { borderBottomRightRadius: "3px" }),
            }}
          />
        </div>
      </div>,
      document.body,
    );
  };
  return (
    <PageContainer
      title={
        <>
          <span className="inline-block">Find teams, people</span>{" "}
          <span className="inline-block">or open roles</span>
        </>
      }
      titleAlignment="center"
      variant="muted"
    >
      <div className="w-full max-w-4xl mx-auto mb-8">
        <div className="relative z-20 flex justify-center space-x-2 pt-2 mb-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={`btn btn-sm ${
                searchType === "all"
                  ? "btn-primary"
                  : "btn-ghost hover:bg-base-200"
              }`}
              aria-pressed={searchType === "all"}
              onClick={() => handleToggleChange("all")}
            >
              All
            </button>

            <button
              type="button"
              className={`btn btn-sm !gap-0.5 tooltip tooltip-top tooltip-lomir search-type-tooltip ${
                searchType === "teams"
                  ? "btn-primary"
                  : "btn-ghost hover:bg-base-200"
              }`}
              data-tip="Teams"
              aria-label="Teams"
              aria-pressed={searchType === "teams"}
              onClick={() => handleToggleChange("teams")}
            >
              <Users2 className="w-4 h-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Teams</span>
            </button>

            <button
              type="button"
              className={`btn btn-sm !gap-0.5 tooltip tooltip-top tooltip-lomir search-type-tooltip ${
                searchType === "users"
                  ? "btn-primary"
                  : "btn-ghost hover:bg-base-200"
              }`}
              data-tip="People"
              aria-label="People"
              aria-pressed={searchType === "users"}
              onClick={() => handleToggleChange("users")}
            >
              <User className="w-4 h-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">People</span>
            </button>

            <button
              type="button"
              className={`btn btn-sm !gap-0.5 tooltip tooltip-top tooltip-lomir search-type-tooltip ${
                searchType === "roles"
                  ? "btn-primary"
                  : "btn-ghost hover:bg-base-200"
              }`}
              data-tip="Open Roles"
              aria-label="Open Roles"
              aria-pressed={searchType === "roles"}
              onClick={() => handleToggleChange("roles")}
            >
              <UserSearch className="w-4 h-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Open Roles</span>
            </button>
          </div>
        </div>

        <div
          ref={sortFilterRef}
          className="mx-auto w-full max-w-full"
        >
          <div className="mx-auto w-full max-w-full sm:w-fit">
            <div className="flex w-full max-w-full gap-2 items-center">
              {!searchInputQueryWraps && renderSortFilterToggle()}

              <div className="min-w-0 flex-1 sm:w-auto sm:flex-none sm:max-w-full">
                <BooleanSearchInput
                  initialQuery={searchQuery}
                  onSearch={handleBooleanSearch}
                  placeholder={
                    matchRoleId
                      ? `Finding people matching the "${matchRoleName || "Vacant Role"}" role — type to narrow`
                      : sortBy === "match"
                        ? "Matching results to your profile — type to narrow"
                        : "Try: hiking AND photography, or hiking NOT photography"
                  }
                  compactPlaceholder={
                    matchRoleId
                      ? "Type to narrow results..."
                      : sortBy === "match"
                        ? "Type to narrow results..."
                        : "Try: hiking AND photo"
                  }
                  activePills={activeCriteriaPills}
                  onRemoveActivePill={handleActivePillRemove}
                  focusAreaPills={focusAreaPills}
                  badgePills={badgePills}
                  onRemoveFocusAreaPill={handleRemoveTagFilter}
                  onRemoveBadgePill={handleRemoveBadgeFilter}
                  onSelectTagSuggestion={handleAddTagFilter}
                  onSelectBadgeSuggestion={handleAddBadgeFilter}
                  onSearchSuggestions={handleSearchSuggestions}
                  resetSignal={searchInputResetSignal}
                  onQueryWrapChange={setSearchInputQueryWraps}
                  wrappedLeadingControl={renderSortFilterToggle()}
                  wrappedMiddleControl={
                    showSortDropdown
                      ? renderSortFilterOptionsMenu({ inline: true })
                      : null
                  }
                  wrappedControlsExpanded={showSortDropdown}
                  leftAdornment={
                    <Tooltip content="Clear search input" position="top">
                      <button
                        type="button"
                        onClick={handleResetSearchInput}
                        className="inline-flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded-full bg-transparent p-0 text-[var(--color-primary-focus)] transition-colors hover:text-[var(--color-primary)] focus:outline-none"
                        aria-label="Clear search input"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>
                  }
                  className="min-w-0 w-full sm:w-auto sm:max-w-full"
                />
              </div>
            </div>

            {showSortDropdown && !searchInputQueryWraps && (
              <div
                className={`mt-1.5 py-0.5 sm:mt-2 sm:py-1 sm:pl-9 ${
                  searchInputQueryWraps ? "pl-0" : "pl-7"
                }`}
              >
                {renderSortFilterOptionsMenu()}
              </div>
            )}
          </div>
        </div>
      </div>

      {renderSortSubmenuPortal()}
      <ScreenAlert
        alerts={[
          showNoResultsAlert
            ? {
                type: "violet",
                message:
                  "No teams, users or Roles found matching this search query. Try a different search term.",
                onClose: () => setDismissedNoResultsAlertKey(noResultsAlertKey),
              }
            : null,
          error
            ? {
                type: "error",
                message: error,
                onClose: () => setError(null),
              }
            : null,
        ]}
      />

      {showInitialLoader ? (
        <div className="flex justify-center items-center h-64">
          <div className="loading loading-spinner loading-lg text-primary"></div>
        </div>
      ) : (
        <div>
          {hasVisibleResults && (
            <section className="mb-8">
              <div className="flex flex-wrap items-start sm:items-center justify-between gap-x-4 gap-y-1 mb-4">
                <h2 className="flex flex-wrap items-center gap-x-2 text-sm leading-[1.15] font-semibold">
                  <span className="whitespace-nowrap">
                    {searchType === "all" && "All"}
                    {searchType === "teams" && "Teams"}
                    {searchType === "users" && "People"}
                    {searchType === "roles" && "Open Roles"}
                  </span>
                  <span className="whitespace-nowrap text-sm font-normal text-base-content/60">
                    (
                    {searchType === "all"
                      ? `${effectivePagination.totalItems} results`
                      : searchType === "teams"
                        ? `${effectivePagination.totalTeams} results`
                        : searchType === "users"
                          ? `${effectivePagination.totalUsers} results`
                          : `${effectivePagination.totalRoles} results`}
                    )
                  </span>
                </h2>

                <ResultViewToggle
                  value={resultView}
                  onChange={setResultView}
                  modes={["card", "mini", "list", "map"]}
                  align="responsive-start"
                  className="-ml-1 sm:ml-0"
                />
              </div>

              {resultView === "map" && (
                <SearchMapView
                  items={visibleMapItemsWithViewerRoles}
                  searchType={searchType}
                  roleMatchTagIds={roleMatchTagIds}
                  roleMatchBadgeNames={roleMatchBadgeNames}
                  roleMatchName={matchRoleName}
                  roleMatchMaxDistanceKm={matchRoleMaxDistanceKm}
                  invitationPrefillTeamId={excludeTeamId}
                  invitationPrefillRoleId={matchRoleId}
                  invitationPrefillTeamName={excludeTeamName}
                  invitationPrefillRoleName={matchRoleName}
                  showMatchHighlights={sortBy === "match"}
                  showMatchScore={sortBy === "match"}
                  viewerLocation={viewerDistanceSource}
                  proximityRadiusKm={maxDistance !== null ? maxDistance : null}
                />
              )}

              {searchType !== "roles" && resultView !== "map" &&
                (resultView === "list" ? (
                  <div className="background-opacity bg-opacity-70 shadow-soft rounded-xl divide-y divide-base-200">
                    {(mergedDisplayItems || [...displayedTeams.map((t) => ({ ...t, _resultType: "team" })), ...displayedUsers.map((u) => ({ ...u, _resultType: "user" }))]).map((item) =>
                      item._resultType === "team" ? (
                        <TeamCard
                          key={`team-${item.id}`}
                          team={withViewerTeamRole(item)}
                          onUpdate={handleTeamUpdate}
                          isSearchResult={true}
                          viewerDistanceSource={viewerDistanceSource}
                          viewerPendingApplications={viewerPendingApplications}
                          viewerPendingInvitations={viewerPendingInvitations}
                          roleMatchBadgeNames={roleMatchBadgeNames}
                          showMatchHighlights={sortBy === "match"}
                          showMatchScore={sortBy === "match"}
                          showSearchResultTypeOverlay={searchType === "all"}
                          viewMode="list"
                          activeFilters={{
                            showLocation: shouldShowLocationContext,
                            showTags: sortBy === "match",
                            showBadges: sortBy === "match",
                          }}
                        />
                      ) : item._resultType === "role" ? (
                        <VacantRoleCard
                          key={`role-${item.id}`}
                          role={item}
                          matchScore={
                            item.bestMatchScore ?? item.best_match_score ?? null
                          }
                          matchDetails={
                            item.matchDetails ?? item.match_details ?? null
                          }
                          hideActions
                          showMatchScore={sortBy === "match"}
                          showSearchResultTypeOverlay={searchType === "all"}
                          viewMode={resultView === "list" ? "list" : resultView}
                          activeFilters={{
                            showLocation: shouldShowLocationContext,
                            showTags: sortBy === "match",
                            showBadges: sortBy === "match",
                          }}
                          teamContext={{
                            id: item.teamId ?? item.team_id,
                            name: item.teamName ?? item.team_name,
                            avatarUrl: item.teamAvatarUrl ?? item.team_avatar_url,
                          }}
                        />
                      ) : (
                        <UserCard
                          key={`user-${item.id}`}
                          user={item}
                          onUpdate={handleUserUpdate}
                          roleMatchTagIds={roleMatchTagIds}
                          roleMatchBadgeNames={roleMatchBadgeNames}
                          roleMatchName={matchRoleName}
                          roleMatchMaxDistanceKm={matchRoleMaxDistanceKm}
                          invitationPrefillTeamId={excludeTeamId}
                          invitationPrefillRoleId={matchRoleId}
                          invitationPrefillTeamName={excludeTeamName}
                          invitationPrefillRoleName={matchRoleName}
                          showMatchHighlights={sortBy === "match"}
                          showMatchScore={sortBy === "match"}
                          showSearchResultTypeOverlay={searchType === "all"}
                          viewMode="list"
                          activeFilters={{
                            showLocation: shouldShowLocationContext,
                            showTags: sortBy === "match",
                            showBadges: sortBy === "match",
                          }}
                        />
                      )
                    )}
                  </div>
                ) : (
                  <Grid cols={1} md={2} lg={3} gap={resultView === "card" ? 6 : 4}>
                    {(mergedDisplayItems || [...displayedTeams.map((t) => ({ ...t, _resultType: "team" })), ...displayedUsers.map((u) => ({ ...u, _resultType: "user" }))]).map((item) =>
                      item._resultType === "team" ? (
                        <TeamCard
                          key={`team-${item.id}`}
                          team={withViewerTeamRole(item)}
                          onUpdate={handleTeamUpdate}
                          isSearchResult={true}
                          viewerDistanceSource={viewerDistanceSource}
                          viewerPendingApplications={viewerPendingApplications}
                          viewerPendingInvitations={viewerPendingInvitations}
                          roleMatchBadgeNames={roleMatchBadgeNames}
                          showMatchHighlights={sortBy === "match"}
                          showMatchScore={sortBy === "match"}
                          showSearchResultTypeOverlay={searchType === "all"}
                          viewMode={resultView}
                          activeFilters={{
                            showLocation: shouldShowLocationContext,
                            showTags: sortBy === "match",
                            showBadges: sortBy === "match",
                          }}
                        />
                      ) : item._resultType === "role" ? (
                        <VacantRoleCard
                          key={`role-${item.id}`}
                          role={item}
                          matchScore={
                            item.bestMatchScore ?? item.best_match_score ?? null
                          }
                          matchDetails={
                            item.matchDetails ?? item.match_details ?? null
                          }
                          hideActions
                          showMatchScore={sortBy === "match"}
                          showSearchResultTypeOverlay={searchType === "all"}
                          viewMode={resultView === "list" ? "list" : resultView}
                          activeFilters={{
                            showLocation: shouldShowLocationContext,
                            showTags: sortBy === "match",
                            showBadges: sortBy === "match",
                          }}
                          teamContext={{
                            id: item.teamId ?? item.team_id,
                            name: item.teamName ?? item.team_name,
                            avatarUrl: item.teamAvatarUrl ?? item.team_avatar_url,
                          }}
                        />
                      ) : (
                        <UserCard
                          key={`user-${item.id}`}
                          user={item}
                          onUpdate={handleUserUpdate}
                          roleMatchTagIds={roleMatchTagIds}
                          roleMatchBadgeNames={roleMatchBadgeNames}
                          roleMatchName={matchRoleName}
                          roleMatchMaxDistanceKm={matchRoleMaxDistanceKm}
                          invitationPrefillTeamId={excludeTeamId}
                          invitationPrefillRoleId={matchRoleId}
                          invitationPrefillTeamName={excludeTeamName}
                          invitationPrefillRoleName={matchRoleName}
                          showMatchHighlights={sortBy === "match"}
                          showMatchScore={sortBy === "match"}
                          showSearchResultTypeOverlay={searchType === "all"}
                          viewMode={resultView}
                          activeFilters={{
                            showLocation: shouldShowLocationContext,
                            showTags: sortBy === "match",
                            showBadges: sortBy === "match",
                          }}
                        />
                      )
                    )}
                  </Grid>
                ))}

              {searchType === "roles" && resultView === "list" && (
                <div className="background-opacity bg-opacity-70 shadow-soft rounded-xl divide-y divide-base-200">
                  {sortedRoles.map((role) => (
                    <VacantRoleCard
                      key={`role-${role.id}`}
                      role={role}
                      matchScore={role.bestMatchScore ?? role.best_match_score ?? null}
                      matchDetails={role.matchDetails ?? role.match_details ?? null}
                      hideActions
                      showMatchScore={sortBy === "match"}
                      viewMode="list"
                      activeFilters={{
                        showLocation: shouldShowLocationContext,
                        showTags: sortBy === "match",
                        showBadges: sortBy === "match",
                      }}
                      teamContext={{
                        id: role.teamId ?? role.team_id,
                        name: role.teamName ?? role.team_name,
                        avatarUrl: role.teamAvatarUrl ?? role.team_avatar_url,
                      }}
                    />
                  ))}
                </div>
              )}

              {searchType === "roles" && resultView !== "list" && resultView !== "map" && (
                <Grid cols={1} md={2} lg={3} gap={resultView === "card" ? 6 : 4}>
                  {sortedRoles.map((role) => (
                    <VacantRoleCard
                      key={`role-${role.id}`}
                      role={role}
                      matchScore={role.bestMatchScore ?? role.best_match_score ?? null}
                      matchDetails={role.matchDetails ?? role.match_details ?? null}
                      hideActions
                      showMatchScore={sortBy === "match"}
                      viewMode={resultView}
                      activeFilters={{
                        showLocation: shouldShowLocationContext,
                        showTags: sortBy === "match",
                        showBadges: sortBy === "match",
                      }}
                      teamContext={{
                        id: role.teamId ?? role.team_id,
                        name: role.teamName ?? role.team_name,
                        avatarUrl: role.teamAvatarUrl ?? role.team_avatar_url,
                      }}
                    />
                  ))}
                </Grid>
              )}
            </section>
          )}

          {(filteredResults.teams.length > 0 ||
            filteredResults.users.length > 0 ||
            filteredResults.roles.length > 0) && (
            <Pagination
              currentPage={currentPage}
              totalPages={effectivePagination.totalPages}
              totalItems={getTotalItemsForFilter()}
              onPageChange={handlePageChange}
              resultsPerPage={resultsPerPage}
              onResultsPerPageChange={handleResultsPerPageChange}
              resultsPerPageOptions={RESULTS_PER_PAGE_OPTIONS}
            />
          )}
        </div>
      )}
    </PageContainer>
  );
};

export default SearchPage;
