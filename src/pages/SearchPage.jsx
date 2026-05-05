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
  Ruler,
  MapPin,
  Globe,
  Target,
} from "lucide-react";
import Alert from "../components/common/Alert";
import { searchService, getApiErrorMessage } from "../services/searchService";
import { tagService } from "../services/tagService";
import { badgeService } from "../services/badgeService";
import {
  enrichTeamMatchData,
  enrichUserMatchData,
  enrichUserRoleMatchData,
  getResultMatchScore,
} from "../utils/teamMatchUtils";
import useViewerMatchProfile from "../hooks/useViewerMatchProfile";
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

const SearchPage = () => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({
    teams: [],
    users: [],
    roles: [],
  });

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

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
  const [allBadges, setAllBadges] = useState([]);
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
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_RESULTS_PER_PAGE,
    totalTeams: 0,
    totalUsers: 0,
    totalRoles: 0,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

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
      shortLabelDesc: "Newest",
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
      labelAsc: "Nearest First",
      labelRemote: "Remote First",
      shortLabelAsc: "Near 1st",
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
      iconAsc: Ruler,
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

  const hasVisibleResults =
    filteredResults.teams.length > 0 ||
    filteredResults.users.length > 0 ||
    filteredResults.roles.length > 0;

  const effectiveOpenRolesOnly = searchType === "users" ? false : openRolesOnly;
  const effectiveIncludeOwnTeams =
    !isAuthenticated || searchType === "users" ? true : includeOwnTeams;
  const isCapacitySpotsSort =
    searchType === "teams" && sortBy === "capacity" && capacityMode === "spots";
  const isCapacityRolesSort =
    searchType === "teams" && sortBy === "capacity" && capacityMode === "roles";
  const shouldShowLocationContext =
    sortBy === "proximity" || maxDistance !== null || sortBy === "match";

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

  const fetchData = useCallback(
    async (criteria) => {
      if (criteria.mode === "search") {
        return await searchService.globalSearch({
          ...criteria,
          isAuthenticated,
        });
      }

      return await searchService.getAllUsersAndTeams({
        ...criteria,
        isAuthenticated,
      });
    },
    [isAuthenticated],
  );

  // Fetch all badges once on mount for client-side suggestion filtering
  useEffect(() => {
    badgeService
      .getAllBadges()
      .then((res) => setAllBadges(res.data || []))
      .catch(() => {});
  }, []);

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
  }));

  const badgePills = filterBadgeIds.map((id) => ({
    key: `badge-${id}`,
    id,
    label: filterBadgeMap[id]?.name || `Badge ${id}`,
    category: filterBadgeMap[id]?.category || "",
  }));
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
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const requestCriteria = buildSearchRequestCriteria({
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
        });

        const results = await fetchData(requestCriteria);

        setSearchResults({
          teams: results.data?.teams ?? [],
          users: results.data?.users ?? [],
          roles: results.data?.roles ?? [],
        });
        setUserHasCoordinates(!!results.userLocation?.hasCoordinates);

        if (results.matchRole?.roleName) {
          setMatchRoleName(results.matchRole.roleName);
        }
        const nextRoleMaxDistanceKm = Number(
          results.matchRole?.maxDistanceKm ??
            results.matchRole?.max_distance_km ??
            results.matchRole?.distanceLimitKm ??
            results.matchRole?.distance_limit_km,
        );
        if (Number.isFinite(nextRoleMaxDistanceKm) && nextRoleMaxDistanceKm > 0) {
          setMatchRoleMaxDistanceKm(nextRoleMaxDistanceKm);
        }

        if (results.pagination) {
          setPagination(results.pagination);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setSearchResults({ teams: [], users: [], roles: [] });
        setPagination((p) => ({
          ...p,
          totalTeams: 0,
          totalUsers: 0,
          totalRoles: 0,
          totalItems: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        }));
        setError(getApiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [
    fetchData,
    currentPage,
    resultsPerPage,
    searchType,
    sortBy,
    sortDir,
    maxDistance,
    openRolesOnly,
    effectiveOpenRolesOnly,
    effectiveIncludeOwnTeams,
    includeDemoData,
    capacityMode,
    hasSearched,
    searchQuery,
    filterTagIds,
    filterBadgeIds,
    matchRoleId,
    excludeTeamId,
  ]);

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

    const tagsParam = urlParams.get("tags");
    if (tagsParam) {
      const ids = tagsParam.split(",").map(Number).filter(Boolean);
      if (ids.length > 0) {
        // Resolve tag names from structured tag tree (IDs already set via lazy init)
        tagService
          .getStructuredTags()
          .then((structure) => {
            const lookup = {};
            structure.forEach((supercat) => {
              supercat.categories?.forEach((cat) => {
                cat.tags?.forEach((tag) => {
                  lookup[Number(tag.id)] = {
                    ...tag,
                    supercategory: supercat.name,
                  };
                });
              });
            });
            const map = {};
            ids.forEach((id) => {
              if (lookup[id]) map[id] = lookup[id];
            });
            setFilterTagMap(map);
          })
          .catch(() => {});
      }
    }
    // Badge IDs already set via lazy init; names resolved by the allBadges effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleResetSortFilters = () => {
    setSortBy("name");
    setSortDir("asc");
    setMaxDistance(null);
    setCustomDistanceInput("");
    setCapacityMode("spots");
    setOpenRolesOnly(false);
    setIncludeOwnTeams(true);
    setIncludeDemoData(true);
    setOpenSubmenuKey(null);
    setShowFilterOptions(false);
    setCurrentPage(1);
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
    setCurrentPage(1);
  };

  const handleIncludeOwnTeamsToggle = () => {
    setIncludeOwnTeams((prev) => !prev);
    setCurrentPage(1);
  };

  const handleAddTagFilter = (tag) => {
    const id = Number(tag.id);
    if (filterTagIds.includes(id)) return;
    setFilterTagIds((prev) => [...prev, id]);
    setFilterTagMap((prev) => ({ ...prev, [id]: tag }));
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
    [allBadges, filterTagIds, filterBadgeIds],
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

  const handleUserUpdate = (updatedUser) => {
    setSearchResults((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === updatedUser.id ? updatedUser : u)),
    }));
  };

  const handleTeamUpdate = (updatedTeam) => {
    setSearchResults((prev) => ({
      ...prev,
      teams: prev.teams.map((t) =>
        t.id === updatedTeam.id
          ? { ...updatedTeam, is_public: updatedTeam.is_public === true }
          : t,
      ),
    }));
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

  const renderToolbarOption = (option) => {
    const { isActive, IconComponent, label, shortLabel, tooltip } =
      getSortOptionDisplay({
        option,
        sortBy,
        sortDir,
        isCapacitySpotsSort,
        maxDistance,
      });
    const optionButton = (
      <button
        ref={(node) => {
          sortButtonRefs.current[option.value] = node;
        }}
        type="button"
        onClick={() => handleTopLevelSortOptionClick(option.value)}
        className={`flex items-center gap-1 px-1 text-xs rounded transition-colors shrink-0 ${
          isActive
            ? "text-[var(--color-primary)] font-bold"
            : "text-[var(--color-primary-focus)]/70 hover:text-[var(--color-primary-focus)] hover:font-medium"
        }`}
        disabled={loading}
        aria-label={tooltip ? `${label} - ${tooltip}` : label}
      >
        <IconComponent className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">{shortLabel}</span>
      </button>
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

  const renderFilterOptionsToggle = () => (
    <Tooltip
      content={
        showFilterOptions ? "Hide filter controls" : "Show filter controls"
      }
      wrapperClassName="inline-flex items-center shrink-0"
    >
      <button
        type="button"
        onClick={handleFilterOptionsToggle}
        className={`flex items-center gap-1 px-1 text-xs rounded transition-colors shrink-0 ${
          isFilterOptionsActive
            ? "text-[var(--color-primary)] font-bold"
            : "text-[var(--color-primary-focus)]/70 hover:text-[var(--color-primary-focus)] hover:font-medium"
        }`}
        disabled={loading}
        aria-label={
          showFilterOptions ? "Hide filter controls" : "Show filter controls"
        }
      >
        <Filter className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">{showFilterOptions ? "Hide Filters" : "Show Filters ..."}</span>
        <span className="sm:hidden">{showFilterOptions ? "Hide Filters" : "Filters ..."}</span>
      </button>
    </Tooltip>
  );

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
                ? "Least Open Roles"
                : "Most Open Roles"}
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
              Open Roles Only
            </button>
          </div>
        )}

        {activeSubmenuKey === DISTANCE_SUBMENU_TYPE && (
          <div className="flex items-center justify-end flex-wrap gap-x-[5px] gap-y-1 pr-1">
            <div className="hidden sm:contents">
              {distancePresets.map((km) => (
                <button
                  data-submenu-item="true"
                  key={km}
                  type="button"
                  onClick={() => handleDistancePreset(km)}
                  disabled={loading}
                  className={`px-1 text-xs leading-none rounded transition-colors ${
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
                bg-transparent focus:outline-none focus:border-[var(--color-success)]`}
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
      title="Search teams, people or open roles"
      titleAlignment="center"
      variant="muted"
    >
      <div className="w-full max-w-4xl mx-auto mb-8">
        <div className="flex justify-center space-x-2 pt-2 mb-2">
          <div className="btn-group">
            <button
              type="button"
              className={`btn btn-sm ${
                searchType === "all"
                  ? "btn-primary"
                  : "btn-ghost hover:bg-base-200"
              }`}
              onClick={() => handleToggleChange("all")}
            >
              All
            </button>

            <button
              type="button"
              className={`btn btn-sm ${
                searchType === "teams"
                  ? "btn-primary"
                  : "btn-ghost hover:bg-base-200"
              }`}
              onClick={() => handleToggleChange("teams")}
            >
              <Users2 className="w-4 h-4 mr-1" />
              Teams
            </button>

            <button
              type="button"
              className={`btn btn-sm ${
                searchType === "users"
                  ? "btn-primary"
                  : "btn-ghost hover:bg-base-200"
              }`}
              onClick={() => handleToggleChange("users")}
            >
              <User className="w-4 h-4 mr-1" />
              People
            </button>

            <button
              type="button"
              className={`btn btn-sm ${
                searchType === "roles"
                  ? "btn-primary"
                  : "btn-ghost hover:bg-base-200"
              }`}
              onClick={() => handleToggleChange("roles")}
            >
              <UserSearch className="w-4 h-4 mr-1" />
              Open Roles
            </button>
          </div>
        </div>

        <div
          ref={sortFilterRef}
          className="mx-auto w-full max-w-full px-2 sm:px-0"
        >
          <div className="mx-auto w-full max-w-full sm:w-fit">
            <div className="flex w-full max-w-full items-center gap-2">
              <Tooltip
                content={
                  showSortDropdown
                    ? "Hide Filtering & Sorting Options"
                    : "Show Filtering & Sorting Options"
                }
              >
                <button
                  type="button"
                  onClick={handleSortDropdownToggle}
                  className="shrink-0 rounded-lg p-2 transition-colors"
                  aria-label={
                    showSortDropdown
                      ? "Hide Filtering & Sorting Options"
                      : "Show Filtering & Sorting Options"
                  }
                >
                  <SlidersHorizontal
                    className="w-5 h-5"
                    color={sortIconColor}
                  />
                </button>
              </Tooltip>

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
                  activePills={activeCriteriaPills}
                  onRemoveActivePill={handleActivePillRemove}
                  focusAreaPills={focusAreaPills}
                  badgePills={badgePills}
                  onRemoveFocusAreaPill={handleRemoveTagFilter}
                  onRemoveBadgePill={handleRemoveBadgeFilter}
                  onSelectTagSuggestion={handleAddTagFilter}
                  onSelectBadgeSuggestion={handleAddBadgeFilter}
                  onSearchSuggestions={handleSearchSuggestions}
                  leftAdornment={
                    isSortModified ? (
                      <div className="transition-all duration-200 opacity-100 scale-100">
                        <Tooltip content="Reset sorting and filters">
                          <button
                            type="button"
                            onClick={handleResetSortFilters}
                            className="shrink-0 rounded-lg p-0.5 transition-colors"
                            aria-label="Reset sorting and filters"
                          >
                            <RotateCcw
                              className="w-3.5 h-3.5"
                              color="var(--color-primary-focus)"
                            />
                          </button>
                        </Tooltip>
                      </div>
                    ) : null
                  }
                  className="min-w-0 w-full sm:w-auto sm:max-w-full"
                />
              </div>
            </div>

            {showSortDropdown && (
              <div className="mt-2 py-1 pl-11">
                <div className="space-y-[6px]">
                  <div className="flex flex-row flex-wrap items-start gap-x-3 gap-y-[6px]">
                    <div
                      role="group"
                      aria-label="Sort options"
                      className="contents"
                    >
                      {visibleSortingOptions.map(renderToolbarOption)}
                    </div>

                    {!showFilterOptions && renderFilterOptionsToggle()}
                  </div>

                  {showFilterOptions && (
                    <div className="flex flex-row flex-wrap items-start gap-x-3 gap-y-[6px]">
                      {renderFilterOptionsToggle()}
                      <div
                        role="group"
                        aria-label="Filter options"
                        className="contents"
                      >
                        {visibleFilterOptions.map(renderToolbarOption)}
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
                            <button
                              type="button"
                              onClick={handleIncludeOwnTeamsToggle}
                              className={`flex items-center gap-1 px-1 text-xs rounded transition-colors shrink-0 ${
                                !effectiveIncludeOwnTeams
                                  ? "text-[var(--color-primary)] font-bold"
                                  : "text-[var(--color-primary-focus)]/70 hover:text-[var(--color-primary-focus)] hover:font-medium"
                              }`}
                              disabled={loading}
                              aria-label={
                                effectiveIncludeOwnTeams
                                  ? "Include My Teams"
                                  : "Exclude My Teams"
                              }
                            >
                              <IncludeOwnTeamsIcon className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                {effectiveIncludeOwnTeams
                                  ? "+ My Teams"
                                  : "- My Teams"}
                              </span>
                            </button>
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
                          <button
                            type="button"
                            onClick={() => {
                              setIncludeDemoData((prev) => !prev);
                              setCurrentPage(1);
                            }}
                            className={`flex items-center gap-1 px-1 text-xs rounded transition-colors shrink-0 ${
                              !includeDemoData
                                ? "text-[var(--color-primary)] font-bold"
                                : "text-[var(--color-primary-focus)]/70 hover:text-[var(--color-primary-focus)] hover:font-medium"
                            }`}
                            disabled={loading}
                            aria-label={
                              includeDemoData
                                ? "Include test/demo profiles, roles and teams"
                                : "Show only real users, roles and teams"
                            }
                          >
                            <FlaskConical className="w-3.5 h-3.5 shrink-0" />
                            <span className="hidden sm:inline">
                              {includeDemoData ? "+ Demo Data" : "- Demo Data"}
                            </span>
                            <span className="sm:hidden">
                              {includeDemoData ? "+ Demo" : "- Demo"}
                            </span>
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {renderSortSubmenuPortal()}

      {error && (
        <Alert
          type="error"
          message={error}
          className="max-w-xl mx-auto mb-4"
          onClose={() => setError(null)}
        />
      )}

      {noResultsFound && (
        <Alert
          type="info"
          message={
            searchQuery.trim()
              ? `No ${searchType === "all" ? "teams or users" : searchType} found matching "${searchQuery}". Try a different search term.`
              : `No matching ${searchType === "all" ? "teams or users" : searchType} found for the current filters. Try adjusting or removing some filters.`
          }
          className="max-w-xl mx-auto"
        />
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="loading loading-spinner loading-lg text-primary"></div>
        </div>
      ) : (
        <div>
          {hasVisibleResults && (
            <section className="mb-8">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 mb-4">
                <h2 className="flex flex-wrap items-baseline gap-x-2 text-sm leading-[1.15] font-semibold">
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

                <div className="flex flex-wrap items-center justify-end text-sm leading-[1.15] font-normal text-base-content/60 gap-1">
                  <button
                    type="button"
                    aria-pressed={resultView === "card"}
                    onClick={() => setResultView("card")}
                    className={`pl-0 pr-2 rounded hover:text-base-content transition-colors ${
                      resultView === "card" ? "font-bold text-base-content" : ""
                    }`}
                  >
                    Card
                  </button>
                  <span className="text-base-content/30">|</span>
                  <button
                    type="button"
                    aria-pressed={resultView === "mini"}
                    onClick={() => setResultView("mini")}
                    className={`px-2 rounded hover:text-base-content transition-colors ${
                      resultView === "mini" ? "font-bold text-base-content" : ""
                    }`}
                  >
                    Mini Card
                  </button>
                  <span className="text-base-content/30">|</span>
                  <button
                    type="button"
                    aria-pressed={resultView === "list"}
                    onClick={() => setResultView("list")}
                    className={`px-2 rounded hover:text-base-content transition-colors ${
                      resultView === "list" ? "font-bold text-base-content" : ""
                    }`}
                  >
                    List
                  </button>
                  <span className="text-base-content/30">|</span>
                  <button
                    type="button"
                    aria-pressed={resultView === "map"}
                    onClick={() => setResultView("map")}
                    className={`px-2 rounded hover:text-base-content transition-colors ${
                      resultView === "map" ? "font-bold text-base-content" : ""
                    }`}
                  >
                    Map
                  </button>
                </div>
              </div>

              {resultView === "map" && (
                <SearchMapView
                  items={visibleMapItems}
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
                          team={item}
                          onUpdate={handleTeamUpdate}
                          isSearchResult={true}
                          viewerDistanceSource={viewerDistanceSource}
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
                          showSearchResultTypeOverlay={searchType === "all"}
                          viewMode={resultView === "list" ? "list" : resultView}
                          activeFilters={{
                            showLocation: shouldShowLocationContext,
                            showTags: sortBy === "match",
                            showBadges: sortBy === "match",
                          }}
                          teamContext={{
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
                          team={item}
                          onUpdate={handleTeamUpdate}
                          isSearchResult={true}
                          viewerDistanceSource={viewerDistanceSource}
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
                          showSearchResultTypeOverlay={searchType === "all"}
                          viewMode={resultView === "list" ? "list" : resultView}
                          activeFilters={{
                            showLocation: shouldShowLocationContext,
                            showTags: sortBy === "match",
                            showBadges: sortBy === "match",
                          }}
                          teamContext={{
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
                      viewMode="list"
                      activeFilters={{
                        showLocation: shouldShowLocationContext,
                        showTags: sortBy === "match",
                        showBadges: sortBy === "match",
                      }}
                      teamContext={{
                        name: role.teamName ?? role.team_name,
                        avatarUrl: role.teamAvatarUrl ?? role.team_avatar_url,
                      }}
                    />
                  ))}
                </div>
              )}

              {searchType === "roles" && resultView !== "list" && resultView !== "map" && (
                <Grid
                  cols={1}
                  md={resultView === "mini" ? 3 : 2}
                  lg={resultView === "mini" ? 4 : 3}
                  gap={resultView === "mini" ? 2 : 6}
                >
                  {sortedRoles.map((role) => (
                    <VacantRoleCard
                      key={`role-${role.id}`}
                      role={role}
                      matchScore={role.bestMatchScore ?? role.best_match_score ?? null}
                      matchDetails={role.matchDetails ?? role.match_details ?? null}
                      hideActions
                      viewMode={resultView}
                      activeFilters={{
                        showLocation: shouldShowLocationContext,
                        showTags: sortBy === "match",
                        showBadges: sortBy === "match",
                      }}
                      teamContext={{
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
