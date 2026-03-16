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
  Users,
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

const SEARCH_RESULTS_PER_PAGE_OPTIONS = [15, 30, 50, 75, 100];
const DEFAULT_RESULTS_PER_PAGE = SEARCH_RESULTS_PER_PAGE_OPTIONS[0];

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
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [openSubmenuType, setOpenSubmenuType] = useState(null);
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

  const noResultsFound =
    hasSearched &&
    filteredResults.teams.length === 0 &&
    filteredResults.users.length === 0 &&
    !loading;

  const effectiveOpenRolesOnly =
    searchType === "users" ? false : openRolesOnly;
  const effectiveIncludeOwnTeams =
    !isAuthenticated || searchType === "users" ? true : includeOwnTeams;
  const isCapacitySpotsSort =
    searchType === "teams" && sortBy === "capacity" && capacityMode === "spots";
  const isCapacityRolesSort =
    searchType === "teams" && sortBy === "capacity" && capacityMode === "roles";

  const activeSubmenuType = showSortDropdown ? openSubmenuType : null;

  const submenuAnchorKey =
    activeSubmenuType === "capacity"
      ? "capacity"
      : activeSubmenuType === "proximity"
        ? "proximity"
        : sortBy;

  const getVisibleSortOptions = () => {
    return sortOptions.filter((option) => {
      if (option.teamsOnly && searchType !== "teams") return false;
      if (option.usersOnly && searchType === "teams") return false;

      if (option.value === "proximity" && !userHasCoordinates) return false;

      if (option.value === "match") {
        if (!isAuthenticated) return false;
      }

      return true;
    });
  };

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

  const activeCriteriaPills = [];

  if (sortBy === "match") {
    activeCriteriaPills.push({ key: "sort", label: "Best Match" });
  } else if (sortBy === "name" && sortDir === "desc") {
    activeCriteriaPills.push({ key: "sort", label: "Name Z-A" });
  } else if (sortBy === "recent") {
    activeCriteriaPills.push({
      key: "sort",
      label: sortDir === "desc" ? "Active" : "Inactive",
    });
  } else if (sortBy === "newest") {
    activeCriteriaPills.push({
      key: "sort",
      label: sortDir === "desc" ? "Newest" : "Oldest",
    });
  } else if (sortBy === "capacity") {
    if (capacityMode === "spots") {
      activeCriteriaPills.push({
        key: "sort",
        label: sortDir === "desc" ? "Most Spots" : "Almost Full",
      });
    } else {
      activeCriteriaPills.push({
        key: "sort",
        label: sortDir === "desc" ? "Most Open Roles" : "Least Open Roles",
      });
    }
  } else if (sortBy === "proximity") {
    activeCriteriaPills.push({
      key: "sort",
      label:
        sortDir === "remote"
          ? "Remote"
          : sortDir === "desc"
            ? "Farthest"
            : "Nearest",
    });
  }

  if (maxDistance !== null) {
    activeCriteriaPills.push({
      key: "maxDistance",
      label: `Within ${maxDistance} km`,
    });
  }

  if (effectiveOpenRolesOnly) {
    activeCriteriaPills.push({ key: "openRolesOnly", label: "Open Roles Only" });
  }

  if (!effectiveIncludeOwnTeams) {
    activeCriteriaPills.push({
      key: "includeOwnTeams",
      label: "Exclude My Teams",
    });
  }

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const requestCriteria = {
          mode: hasSearched && searchQuery.trim() ? "search" : "all",
          query: searchQuery.trim(),
          searchType,
          page: currentPage,
          limit: resultsPerPage,
          sortBy,
          sortDir,
          maxDistance,
          openRolesOnly: effectiveOpenRolesOnly,
          excludeOwnTeams: !effectiveIncludeOwnTeams,
          capacityMode,
        };

        const results = await fetchData(requestCriteria);

        setSearchResults(results.data);
        setUserHasCoordinates(!!results.userLocation?.hasCoordinates);

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
  ]);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const typeParam = urlParams.get("type");

    if (typeParam === "teams") {
      setSearchType("teams");
    } else if (typeParam === "users") {
      setSearchType("users");
    }
  }, [location.search]);

  useEffect(() => {
    if (!showSortDropdown) {
      setOpenSubmenuType(null);
      return;
    }

    if (openSubmenuType === "capacity" && searchType !== "teams") {
      setOpenSubmenuType(null);
    }

    if (openSubmenuType === "proximity" && !userHasCoordinates) {
      setOpenSubmenuType(null);
    }
  }, [showSortDropdown, openSubmenuType, searchType, userHasCoordinates]);

  useLayoutEffect(() => {
    if (!activeSubmenuType || !showSortDropdown) {
      setSubmenuPosition(null);
      return;
    }

    const updatePosition = () => {
      const anchorEl = sortButtonRefs.current[submenuAnchorKey];
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
        visibleButtonTops.length > 0 ? Math.min(...visibleButtonTops) : anchorRect.top;
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
    activeSubmenuType,
    submenuAnchorKey,
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
    setOpenSubmenuType(null);
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
      setOpenSubmenuType("capacity");
      return;
    }

    if (optionValue === "proximity") {
      handleSortChange("proximity");
      setOpenSubmenuType("proximity");
      return;
    }

    handleSortChange(optionValue);
    setOpenSubmenuType(null);
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
    setOpenSubmenuType((prev) =>
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
    if (!activeSubmenuType || !submenuPosition) return null;
    if (activeSubmenuType === "proximity" && sortDir === "remote") return null;

    const submenuContent = (
      <div ref={submenuRef}>
        {activeSubmenuType === "capacity" && (
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

        {activeSubmenuType === "proximity" && (
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
              ...(submenuPosition.align === "left" ? { left: 0 } : { right: 0 }),
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
              ...(submenuPosition.align === "left" ? { left: 0 } : { right: 0 }),
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
              ...(submenuPosition.align === "left" ? { left: 0 } : { right: 0 }),
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
              <Users className="w-4 h-4 mr-1" />
              People
            </button>
          </div>
        </div>

        <div ref={sortFilterRef} className="mx-auto w-full max-w-full px-2 sm:px-0">
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
                    sortBy === "match"
                      ? "Matching results to your profile — type to narrow"
                      : "Try: hiking AND photography, or hiking NOT photography"
                  }
                  activePills={activeCriteriaPills}
                  onRemoveActivePill={handleActivePillRemove}
                  className="min-w-0 w-full sm:w-auto sm:max-w-full"
                />
              </div>
            </div>

            {showSortDropdown && (
              <div className="mt-2 py-1 pl-11">
                <div className="flex items-center gap-3 flex-wrap">
                  {getVisibleSortOptions().map((option) => {
                    const isActive =
                      option.value === "capacity"
                        ? isCapacitySpotsSort
                        : option.value === "proximity"
                          ? sortBy === option.value || maxDistance !== null
                          : sortBy === option.value;
                    const currentDir = isActive
                      ? option.value === "capacity"
                        ? sortDir
                        : sortBy === option.value
                          ? sortDir
                          : option.defaultDir || "desc"
                      : option.defaultDir || "desc";

                    let IconComponent, label, shortLabel;

                  if (currentDir === "asc") {
                    IconComponent = option.iconAsc;
                    label = option.labelAsc;
                    shortLabel = option.shortLabelAsc;
                  } else if (currentDir === "remote") {
                    IconComponent = option.iconRemote;
                    label = option.labelRemote;
                    shortLabel = option.shortLabelRemote;
                  } else {
                    IconComponent = option.iconDesc;
                    label = option.labelDesc;
                      shortLabel = option.shortLabelDesc;
                    }

                    return (
                      <button
                        key={option.value}
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
                        title={option.teamsOnly ? "Teams only" : ""}
                      >
                        <IconComponent className="w-3.5 h-3.5 shrink-0" />
                        <span className="hidden sm:inline">{label}</span>
                        <span className="sm:hidden">{shortLabel}</span>
                      </button>
                    );
                  })}

                  {isAuthenticated && searchType !== "users" && (
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
                      <span className="hidden sm:inline">
                        {effectiveIncludeOwnTeams
                          ? "Include My Teams"
                          : "Exclude My Teams"}
                      </span>
                      <span className="sm:hidden" aria-hidden="true">
                        {effectiveIncludeOwnTeams ? "+" : "-"}
                      </span>
                    </button>
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
          message={`No ${
            searchType === "all" ? "teams or users" : searchType
          } found matching "${searchQuery}". Try a different search term.`}
          className="max-w-xl mx-auto"
        />
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="loading loading-spinner loading-lg text-primary"></div>
        </div>
      ) : (
        <div>
          {filteredResults.teams.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">
                Teams
                {searchType === "teams" && (
                  <span className="text-sm font-normal text-base-content/60 ml-2">
                    ({pagination.totalTeams} total)
                  </span>
                )}
              </h2>

              <Grid cols={1} md={2} lg={3} gap={6}>
                {filteredResults.teams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    onUpdate={handleTeamUpdate}
                    isSearchResult={true}
                  />
                ))}
              </Grid>
            </section>
          )}

          {filteredResults.users.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-4">
                People
                {searchType === "users" && (
                  <span className="text-sm font-normal text-base-content/60 ml-2">
                    ({pagination.totalUsers} total)
                  </span>
                )}
              </h2>

              <Grid cols={1} md={2} lg={3} gap={6}>
                {filteredResults.users.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onUpdate={handleUserUpdate}
                  />
                ))}
              </Grid>
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
              resultsPerPageOptions={SEARCH_RESULTS_PER_PAGE_OPTIONS}
            />
          )}
        </div>
      )}
    </PageContainer>
  );
};

export default SearchPage;
