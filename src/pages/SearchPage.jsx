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
  const [userHasLocation, setUserHasLocation] = useState(false);

  // ===== SORTING STATE =====
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
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
      value: "capacity",
      defaultDir: "desc",
      labelAsc: "Capacity",
      labelDesc: "Capacity",
      shortLabelAsc: "Cap",
      shortLabelDesc: "Cap",
      iconAsc: UserMinus,
      iconDesc: UserPlus,
      teamsOnly: true,
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

  const showDistanceRow =
    sortBy === "proximity" && sortDir !== "remote" && userHasCoordinates;

  const showCapacityRow = sortBy === "capacity" && searchType === "teams";

  const activeSubmenuType = showSortDropdown
    ? showCapacityRow
      ? "capacity"
      : showDistanceRow
        ? "proximity"
        : null
    : null;

  const getVisibleSortOptions = () => {
    return sortOptions.filter((option) => {
      if (option.teamsOnly && searchType !== "teams") return false;
      if (option.usersOnly && searchType === "teams") return false;

      if (option.value === "proximity") {
        if (!isAuthenticated) return false;
        if (!userHasLocation) return false;
      }

      if (option.value === "match") {
        if (!isAuthenticated) return false;
      }

      return true;
    });
  };

  const fetchData = useCallback(
    async ({ mode, queryString, page, limit, sBy, sDir, maxDist, capMode }) => {
      if (mode === "search") {
        return await searchService.globalSearch(
          queryString,
          isAuthenticated,
          page,
          limit,
          sBy,
          sDir,
          maxDist,
          capMode,
        );
      }

      return await searchService.getAllUsersAndTeams(
        isAuthenticated,
        page,
        limit,
        sBy,
        sDir,
        maxDist,
        capMode,
      );
    },
    [isAuthenticated],
  );

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const mode = hasSearched && searchQuery.trim() ? "search" : "all";

        const results = await fetchData({
          mode,
          queryString: searchQuery.trim(),
          page: currentPage,
          limit: resultsPerPage,
          sBy: sortBy,
          sDir: sortDir,
          maxDist: maxDistance,
          capMode: capacityMode,
        });

        setSearchResults(results.data);
        setUserHasLocation(!!results.userLocation?.hasLocation);
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
    sortBy,
    sortDir,
    maxDistance,
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

  useLayoutEffect(() => {
    if (!activeSubmenuType || !showSortDropdown) {
      setSubmenuPosition(null);
      return;
    }

    const updatePosition = () => {
      const anchorEl = sortButtonRefs.current[sortBy];
      const submenuEl = submenuRef.current;

      if (!anchorEl) return;

      const anchorRect = anchorEl.getBoundingClientRect();
      const submenuHeight = submenuEl?.offsetHeight || 30;

      const submenuTop = anchorRect.bottom + 6;
      const submenuRight = window.innerWidth - anchorRect.right;
      const anchorMidY = anchorRect.top + anchorRect.height / 2;
      const submenuMidY = submenuTop + submenuHeight / 2;

      setSubmenuPosition({
        submenuTop,
        submenuRight,
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

  const handleSortChange = (newSortBy) => {
    let newSortDir = sortDir;

    if (newSortBy === sortBy) {
      if (newSortBy === "proximity") {
        if (sortDir === "asc") newSortDir = "desc";
        else if (sortDir === "desc") newSortDir = "remote";
        else newSortDir = "asc";
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
        case "proximity":
          newSortDir = "asc";
          break;
        case "capacity":
          newSortDir = "desc";
          setCapacityMode("spots");
          break;
        case "match":
          newSortDir = "asc";
          break;
        default:
          newSortDir = "desc";
      }
    }

    if (newSortBy === "proximity") {
      if (newSortDir === "remote") {
        setSearchType("teams");
      } else if (searchType === "all") {
        setSearchType("users");
      }
    }

    if (newSortBy === "capacity") {
      setSearchType("teams");
    }

    if (newSortBy !== "proximity") {
      setMaxDistance(null);
      setCustomDistanceInput("");
    }

    if (newSortBy === "proximity" && newSortDir === "remote") {
      setMaxDistance(null);
      setCustomDistanceInput("");
    }

    if (newSortBy !== "capacity") {
      setCapacityMode("spots");
    }

    setSortBy(newSortBy);
    setSortDir(newSortDir);
    setCurrentPage(1);
  };

  const handleCapacityModeChange = (mode) => {
    if (sortBy !== "capacity") {
      setSortBy("capacity");
      setSortDir("desc");
      setCapacityMode(mode);
      setSearchType("teams");
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

    if (type !== "teams" && sortBy === "capacity") {
      setSortBy("name");
      setSortDir("asc");
      setCapacityMode("spots");
    }

    if (type !== "teams" && sortBy === "proximity" && sortDir === "remote") {
      setSortDir("asc");
      setMaxDistance(null);
      setCustomDistanceInput("");
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
    capacityMode !== "spots" ||
    (customDistanceInput && customDistanceInput.trim() !== "");

  const sortIconColor = isSortModified
    ? "var(--color-primary)"
    : "var(--color-primary-focus)";

  const renderSortSubmenuPortal = () => {
    if (!activeSubmenuType || !submenuPosition) return null;

    const submenuContent = (
      <div ref={submenuRef}>
        {sortBy === "capacity" && (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => handleCapacityModeChange("spots")}
              disabled={loading}
              className={`text-xs rounded transition-colors ${
                capacityMode === "spots"
                  ? "text-[var(--color-primary)] font-bold"
                  : "text-[var(--color-primary-focus)] hover:text-[var(--color-primary-focus)] hover:font-medium"
              }`}
            >
              {capacityMode === "spots" && sortDir === "asc"
                ? "Least Spots"
                : "Free Spots"}
            </button>

            <button
              type="button"
              onClick={() => handleCapacityModeChange("roles")}
              disabled={loading}
              className={`py-0.5 text-xs rounded transition-colors ${
                capacityMode === "roles"
                  ? "text-[var(--color-primary)] font-bold"
                  : "text-[var(--color-primary-focus)] hover:text-[var(--color-primary-focus)] hover:font-medium"
              }`}
            >
              {capacityMode === "roles" && sortDir === "asc"
                ? "Least Open Roles"
                : "Open Roles"}
            </button>
          </div>
        )}

        {sortBy === "proximity" &&
          sortDir !== "remote" &&
          userHasCoordinates && (
            <div className="flex items-center justify-end flex-wrap gap-1">
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
            right: submenuPosition.submenuRight - 15,
            zIndex: 1100,
            display: "flex",
            justifyContent: "flex-end",
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
              right: 0,
              width: 4,
              borderTop: "1.5px solid var(--color-primary)",
              borderTopRightRadius: "3px",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              height: "100%",
              borderRight: "1.5px solid var(--color-primary)",
              borderTopRightRadius: "3px",
              borderBottomRightRadius: "3px",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 4,
              borderBottom: "1.5px solid var(--color-primary)",
              borderBottomRightRadius: "3px",
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
      <div className="max-w-xl mx-auto mb-8">
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

        <div ref={sortFilterRef}>
          <div className="flex gap-2 items-start">
            <button
              type="button"
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="p-2 rounded-lg transition-colors"
              title="Sort options"
            >
              <SlidersHorizontal className="w-5 h-5" color={sortIconColor} />
            </button>

            <div className="flex-1">
              <BooleanSearchInput
                initialQuery={searchQuery}
                onSearch={handleBooleanSearch}
                placeholder={
                  sortBy === "match"
                    ? "Matching results to your profile — type to narrow"
                    : "Try: hiking AND photography, or hiking NOT photography"
                }
                className="w-full"
              />
            </div>
          </div>

          {showSortDropdown && (
            <div className="mt-2 py-1 ml-10">
              <div className="flex items-center gap-3 flex-wrap">
                {getVisibleSortOptions().map((option) => {
                  const isActive = sortBy === option.value;
                  const currentDir = isActive
                    ? sortDir
                    : option.defaultDir || "desc";

                  let IconComponent, label, shortLabel;

                  if (currentDir === "remote" && option.iconRemote) {
                    IconComponent = option.iconRemote;
                    label = option.labelRemote;
                    shortLabel = option.shortLabelRemote;
                  } else if (currentDir === "asc") {
                    IconComponent = option.iconAsc;
                    label = option.labelAsc;
                    shortLabel = option.shortLabelAsc;
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
                      onClick={() => handleSortChange(option.value)}
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
            </div>
          )}
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
