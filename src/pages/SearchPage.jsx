import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from "react";
import ReactDOM from "react-dom";
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import PageContainer from "../components/layout/PageContainer";
import Grid from "../components/layout/Grid";
import TeamCard from "../components/teams/TeamCard";
import UserCard from "../components/users/UserCard";
import Pagination from "../components/common/Pagination";
import BooleanSearchInput from "../components/BooleanSearchInput";
import {
  User,
  Users2,
  Clock,
  Sparkles,
  ArrowDownAZ,
  ArrowUpZA,
  SlidersHorizontal,
  UserPlus,
  UserMinus,
  MapPin,
  Globe,
  Target,
} from "lucide-react";
import Alert from "../components/common/Alert";
import { searchService, getApiErrorMessage } from "../services/searchService";
import { tagService } from "../services/tagService";
import { badgeService } from "../services/badgeService";
import {
  buildSearchRequestCriteria,
  DISTANCE_SUBMENU_TYPE,
  getActiveCriteriaPills,
  getSortOptionDisplay,
  getVisibleSortOptions,
} from "./searchPageHelpers";

import {
  RESULTS_PER_PAGE_OPTIONS,
  DEFAULT_RESULTS_PER_PAGE,
} from "../constants/pagination";

const SearchPage = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({ teams: [], users: [] });

  const [searchType, setSearchType] = useState(() => {
    const urlParams = new URLSearchParams(location.search);
    const typeParam = urlParams.get("type");
    return typeParam === "teams"
      ? "teams"
      : typeParam === "users"
        ? "users"
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

  // ===== CAPACITY FILTER STATE =====
  const [capacityMode, setCapacityMode] = useState("spots");

  // ===== RESULT VIEW STATE =====
  const [resultView, setResultView] = useState("card");

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
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const sortOptions = [
    {
      value: "name",
      defaultDir: "asc",
      labelAsc: "Name (A-Z)",
      labelDesc: "Name (Z-A)",
      shortLabelAsc: "A-Z",
      shortLabelDesc: "Z-A",
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
      iconAsc: Sparkles,
      iconDesc: Sparkles,
      teamsOnly: false,
    },
    {
      value: "match",
      defaultDir: "asc",
      labelAsc: "Best Match",
      shortLabelAsc: "Match",
      iconAsc: Target,
      authOnly: true,
    },
    {
      value: "proximity",
      defaultDir: "asc",
      labelAsc: "Nearest",
      labelDesc: "Farthest",
      labelRemote: "Remote",
      shortLabelAsc: "Near",
      shortLabelDesc: "Far",
      shortLabelRemote: "Remote",
      iconAsc: MapPin,
      iconDesc: MapPin,
      iconRemote: Globe,
    },
    {
      value: "capacity",
      defaultDir: "desc",
      labelAsc: "Almost Full",
      labelDesc: "Most Spots",
      shortLabelAsc: "Full",
      shortLabelDesc: "Spots",
      iconAsc: UserMinus,
      iconDesc: UserPlus,
      teamsOnly: true,
    },
  ];

  const filteredResults = {
    users:
      searchType === "all" || searchType === "users" ? searchResults.users : [],
    teams:
      searchType === "all" || searchType === "teams" ? searchResults.teams : [],
  };

  const getUserDisplayName = (u) =>
    (
      (u.first_name || u.firstName || "") +
      " " +
      (u.last_name || u.lastName || "")
    ).trim().toLowerCase() || (u.username || "").toLowerCase();

  const mergedDisplayItems = (() => {
    if (searchType !== "all") return null;
    const teams = filteredResults.teams.map((t) => ({ ...t, _resultType: "team" }));
    const users = filteredResults.users.map((u) => ({ ...u, _resultType: "user" }));
    const combined = [...teams, ...users];
    combined.sort((a, b) => {
      const aIsTeam = a._resultType === "team";
      const bIsTeam = b._resultType === "team";
      if (sortBy === "name") {
        const aName = aIsTeam ? (a.name || "").toLowerCase() : getUserDisplayName(a);
        const bName = bIsTeam ? (b.name || "").toLowerCase() : getUserDisplayName(b);
        const cmp = aName.localeCompare(bName);
        return sortDir === "asc" ? cmp : -cmp;
      }
      if (sortBy === "newest") {
        const aDate = new Date(a.created_at || a.createdAt || 0).getTime();
        const bDate = new Date(b.created_at || b.createdAt || 0).getTime();
        return sortDir === "asc" ? aDate - bDate : bDate - aDate;
      }
      if (sortBy === "recent") {
        const getDate = (item) => {
          const val =
            item.last_active_at ?? item.lastActiveAt ?? item.last_active ??
            item.lastActive ?? item.updated_at ?? item.updatedAt ??
            item.created_at ?? item.createdAt;
          return val ? new Date(val).getTime() : 0;
        };
        return sortDir === "asc" ? getDate(a) - getDate(b) : getDate(b) - getDate(a);
      }
      if (sortBy === "proximity") {
        const aDist = a.distance_km ?? a.distanceKm ?? Infinity;
        const bDist = b.distance_km ?? b.distanceKm ?? Infinity;
        return sortDir === "asc" ? aDist - bDist : bDist - aDist;
      }
      if (sortBy === "match") {
        const aScore = a.match_score ?? a.matchScore ?? 0;
        const bScore = b.match_score ?? b.matchScore ?? 0;
        return bScore - aScore;
      }
      return 0;
    });
    return combined.slice(0, resultsPerPage);
  })();

  const sortedUsers = (() => {
    const users = filteredResults.users;
    if (sortBy !== "name") return users;
    return [...users].sort((a, b) => {
      const cmp = getUserDisplayName(a).localeCompare(getUserDisplayName(b));
      return sortDir === "asc" ? cmp : -cmp;
    });
  })();

  const displayedTeams = mergedDisplayItems
    ? []
    : searchType === "users"
      ? []
      : filteredResults.teams.slice(0, resultsPerPage);
  const displayedUsers = mergedDisplayItems
    ? []
    : searchType === "teams"
      ? []
      : sortedUsers.slice(0, Math.max(0, resultsPerPage - displayedTeams.length));

  const roleMatchTagIds =
    sortBy === "match" && matchRoleId && filterTagIds.length > 0
      ? new Set(filterTagIds)
      : null;

  const roleMatchBadgeNames =
    sortBy === "match" && matchRoleId && filterBadgeIds.length > 0
      ? new Set(
          filterBadgeIds
            .map((id) => filterBadgeMap[id]?.name)
            .filter(Boolean)
            .map((name) => name.toLowerCase()),
        )
      : null;

  const hasActiveFilters =
    filterTagIds.length > 0 || filterBadgeIds.length > 0 || !!matchRoleId;

  const noResultsFound =
    (hasSearched || hasActiveFilters) &&
    filteredResults.teams.length === 0 &&
    filteredResults.users.length === 0 &&
    !loading;

  const effectiveOpenRolesOnly = searchType === "users" ? false : openRolesOnly;
  const effectiveIncludeOwnTeams =
    !isAuthenticated || searchType === "users" ? true : includeOwnTeams;
  const isCapacitySpotsSort =
    searchType === "teams" && sortBy === "capacity" && capacityMode === "spots";
  const isCapacityRolesSort =
    searchType === "teams" && sortBy === "capacity" && capacityMode === "roles";

  const activeSubmenuKey = showSortDropdown ? openSubmenuKey : null;

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
          capacityMode,
          filterTagIds,
          filterBadgeIds,
          matchRoleId,
          excludeTeamId,
        });

        const results = await fetchData(requestCriteria);

        setSearchResults(results.data);
        setUserHasCoordinates(!!results.userLocation?.hasCoordinates);

        if (results.matchRole?.roleName) {
          setMatchRoleName(results.matchRole.roleName);
        }

        if (results.pagination) {
          setPagination(results.pagination);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setSearchResults({ teams: [], users: [] });
        setPagination((p) => ({
          ...p,
          totalTeams: 0,
          totalUsers: 0,
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
      return;
    }

    if (openSubmenuKey === "capacity" && searchType !== "teams") {
      setOpenSubmenuKey(null);
    }

    if (openSubmenuKey === DISTANCE_SUBMENU_TYPE && !userHasCoordinates) {
      setOpenSubmenuKey(null);
    }
  }, [showSortDropdown, openSubmenuKey, searchType, userHasCoordinates]);

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
      const submenuWidth = submenuEl?.offsetWidth || 0;

      const submenuTop = anchorRect.bottom + 6;
      const anchorMidY = anchorRect.top + anchorRect.height / 2;
      const submenuMidY = submenuTop + submenuHeight / 2;
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

  const resetSortToDefault = () => {
    setSortBy("name");
    setSortDir("asc");
    setCurrentPage(1);
    setOpenSubmenuKey(null);
  };

  const handleSortChange = (newSortBy) => {
    let newSortDir = sortDir;

    if (newSortBy === sortBy) {
      if (newSortBy === "proximity") {
        if (sortDir === "asc") {
          newSortDir = "desc";
        } else if (sortDir === "desc") {
          newSortDir = "remote";
        } else {
          newSortDir = "asc";
        }
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

    if (newSortBy === "proximity" && newSortDir === "remote") {
      setSearchType("teams");
      setMaxDistance(null);
      setCustomDistanceInput("");
    }

    setSortBy(newSortBy);
    setSortDir(newSortDir);
    setCurrentPage(1);
  };

  const handleTopLevelSortOptionClick = (optionValue) => {
    if (optionValue === "capacity") {
      handleCapacityModeChange("spots");
      setOpenSubmenuKey("capacity");
      return;
    }

    if (optionValue === "proximity") {
      handleSortChange("proximity");
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

    if (type !== "teams" && sortBy === "proximity" && sortDir === "remote") {
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
      case "matchRole":
        setMatchRoleId(null);
        setMatchRoleName(null);
        setCurrentPage(1);
        {
          const newParams = new URLSearchParams(window.location.search);
          newParams.delete("roleId");
          newParams.delete("roleName");
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
        return pagination.totalTeams || 0;
      case "users":
        return pagination.totalUsers || 0;
      default:
        return pagination.totalItems || 0;
    }
  };

  const isSortModified =
    sortBy !== "name" ||
    sortDir !== "asc" ||
    maxDistance !== null ||
    effectiveOpenRolesOnly ||
    !effectiveIncludeOwnTeams ||
    (sortBy === "capacity" && capacityMode !== "spots") ||
    (customDistanceInput && customDistanceInput.trim() !== "");

  const sortIconColor = isSortModified
    ? "var(--color-primary)"
    : "var(--color-primary-focus)";
  const IncludeOwnTeamsIcon = Users2;

  const renderSortSubmenuPortal = () => {
    if (!activeSubmenuKey || !submenuPosition) return null;
    if (activeSubmenuKey === DISTANCE_SUBMENU_TYPE && sortDir === "remote") {
      return null;
    }

    const submenuContent = (
      <div ref={submenuRef}>
        {activeSubmenuKey === "capacity" && (
          <div className="flex items-center justify-end gap-3 pr-1">
            <button
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
          <div className="flex items-center justify-end flex-wrap gap-1 pr-1">
            {distancePresets.map((km) => (
              <button
                key={km}
                type="button"
                onClick={() => handleDistancePreset(km)}
                disabled={loading}
                className={`px-1 py-0.5 text-xs rounded transition-colors ${
                  maxDistance === km
                    ? "text-[var(--color-primary)] font-bold"
                    : "text-[var(--color-primary-focus)] hover:text-[var(--color-primary-focus)] hover:font-medium"
                }`}
              >
                {km}km
              </button>
            ))}

            <div className="flex items-center gap-0.5">
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
                className={`px-1 py-0.5 text-xs rounded border transition-colors
                [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                ${
                  maxDistance && !distancePresets.includes(maxDistance)
                    ? "border-[var(--color-success)] text-[var(--color-success)] font-medium"
                    : "border-[var(--color-text)]/20 text-[var(--color-text)]/60"
                }
                bg-transparent focus:outline-none focus:border-[var(--color-success)]`}
                disabled={loading}
              />
              <span className="text-xs text-[var(--color-primary-focus)]">
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
      title="Search teams or users"
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
          </div>
        </div>

        <div
          ref={sortFilterRef}
          className="mx-auto w-full max-w-full px-2 sm:px-0"
        >
          <div className="mx-auto w-full max-w-full sm:w-fit">
            <div className="flex w-full max-w-full items-center gap-2">
              <button
                type="button"
                onClick={handleSortDropdownToggle}
                className="shrink-0 rounded-lg p-2 transition-colors"
                title="Sort options"
              >
                <SlidersHorizontal className="w-5 h-5" color={sortIconColor} />
              </button>

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
                  className="min-w-0 w-full sm:w-auto sm:max-w-full"
                />
              </div>
            </div>

            {showSortDropdown && (
              <div className="mt-2 py-1 pl-11">
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:gap-4">
                  <div
                    role="group"
                    aria-label="Sort options"
                    className="flex items-center gap-3 flex-wrap"
                  >
                    {visibleSortOptions.map((option) => {
                      const { isActive, IconComponent, label, shortLabel } =
                        getSortOptionDisplay({
                          option,
                          sortBy,
                          sortDir,
                          isCapacitySpotsSort,
                        });

                      return (
                        <button
                          key={option.value}
                          ref={(node) => {
                            sortButtonRefs.current[option.value] = node;
                          }}
                          type="button"
                          onClick={() =>
                            handleTopLevelSortOptionClick(option.value)
                          }
                          className={`flex items-center gap-1 px-1 text-xs rounded transition-colors shrink-0 ${
                            isActive
                              ? "text-[var(--color-primary)] font-bold"
                              : "text-[var(--color-primary-focus)]/70 hover:text-[var(--color-primary-focus)] hover:font-medium"
                          }`}
                          disabled={loading}
                          title={option.teamsOnly ? "Teams only" : ""}
                        >
                          <IconComponent className="w-3.5 h-3.5 shrink-0" />
                          <span className="hidden sm:inline">{label}</span>
                          <span className="sm:hidden">{shortLabel}</span>
                        </button>
                      );
                    })}
                  </div>

                  {showIncludeOwnTeamsFilter && (
                    <div
                      role="group"
                      aria-label="Search filters"
                      className="flex items-center gap-3 flex-wrap pt-1 sm:pt-0"
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
                        title={
                          effectiveIncludeOwnTeams
                            ? "Include My Teams"
                            : "Exclude My Teams"
                        }
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
          {(filteredResults.teams.length > 0 ||
            filteredResults.users.length > 0) && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  {searchType === "all" && "Teams & People"}
                  {searchType === "teams" && "Teams"}
                  {searchType === "users" && "People"}
                  <span className="text-sm font-normal text-base-content/60 ml-2">
                    (
                    {searchType === "all"
                      ? `${filteredResults.teams.length + filteredResults.users.length} results`
                      : searchType === "teams"
                        ? `${pagination.totalTeams} results`
                        : `${pagination.totalUsers} results`}
                    )
                  </span>
                </h2>

                <div className="flex items-center text-sm font-normal text-base-content/60 gap-1">
                  <button
                    type="button"
                    onClick={() => setResultView("card")}
                    className={`px-2 py-1 rounded hover:text-base-content transition-colors ${
                      resultView === "card" ? "font-bold text-base-content" : ""
                    }`}
                  >
                    Card
                  </button>
                  <span className="text-base-content/30">|</span>
                  <button
                    type="button"
                    onClick={() => setResultView("mini")}
                    className={`px-2 py-1 rounded hover:text-base-content transition-colors ${
                      resultView === "mini" ? "font-bold text-base-content" : ""
                    }`}
                  >
                    Mini Card
                  </button>
                  <span className="text-base-content/30">|</span>
                  <button
                    type="button"
                    onClick={() => setResultView("list")}
                    className={`px-2 py-1 rounded hover:text-base-content transition-colors ${
                      resultView === "list" ? "font-bold text-base-content" : ""
                    }`}
                  >
                    List
                  </button>
                </div>
              </div>

              {resultView === "list" ? (
                <div className="background-opacity bg-opacity-70 shadow-soft rounded-xl divide-y divide-base-200">
                  {(mergedDisplayItems || [...displayedTeams.map((t) => ({ ...t, _resultType: "team" })), ...displayedUsers.map((u) => ({ ...u, _resultType: "user" }))]).map((item) =>
                    item._resultType === "team" ? (
                      <TeamCard
                        key={`team-${item.id}`}
                        team={item}
                        onUpdate={handleTeamUpdate}
                        isSearchResult={true}
                        showMatchHighlights={sortBy === "match"}
                        viewMode="list"
                        activeFilters={{
                          showLocation:
                            (sortBy === "proximity" && sortDir !== "remote") ||
                            sortBy === "match",
                          showTags: sortBy === "match",
                          showBadges: sortBy === "match",
                        }}
                      />
                    ) : (
                      <UserCard
                        key={`user-${item.id}`}
                        user={item}
                        onUpdate={handleUserUpdate}
                        roleMatchTagIds={roleMatchTagIds}
                        roleMatchBadgeNames={roleMatchBadgeNames}
                        showMatchHighlights={sortBy === "match"}
                        viewMode="list"
                        activeFilters={{
                          showLocation:
                            (sortBy === "proximity" && sortDir !== "remote") ||
                            sortBy === "match",
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
                        showMatchHighlights={sortBy === "match"}
                        viewMode={resultView}
                        activeFilters={{
                          showLocation:
                            (sortBy === "proximity" && sortDir !== "remote") ||
                            sortBy === "match",
                          showTags: sortBy === "match",
                          showBadges: sortBy === "match",
                        }}
                      />
                    ) : (
                      <UserCard
                        key={`user-${item.id}`}
                        user={item}
                        onUpdate={handleUserUpdate}
                        roleMatchTagIds={roleMatchTagIds}
                        roleMatchBadgeNames={roleMatchBadgeNames}
                        showMatchHighlights={sortBy === "match"}
                        viewMode={resultView}
                        activeFilters={{
                          showLocation:
                            (sortBy === "proximity" && sortDir !== "remote") ||
                            sortBy === "match",
                          showTags: sortBy === "match",
                          showBadges: sortBy === "match",
                        }}
                      />
                    )
                  )}
                </Grid>
              )}
            </section>
          )}

          {(filteredResults.teams.length > 0 ||
            filteredResults.users.length > 0) && (
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
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
