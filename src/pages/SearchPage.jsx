import React, { useState, useEffect, useRef, useCallback } from "react";
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
} from "lucide-react";
import Alert from "../components/common/Alert";

import { searchService, getApiErrorMessage } from "../services/searchService";

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

  // ===== DISTANCE FILTER STATE =====
  const [maxDistance, setMaxDistance] = useState(null);
  const [customDistanceInput, setCustomDistanceInput] = useState("");
  const [userHasCoordinates, setUserHasCoordinates] = useState(false);

  // ===== PAGINATION STATE =====
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage, setResultsPerPage] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
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
      labelAsc: "Least Active",
      labelDesc: "Recently Active",
      shortLabelAsc: "Inactive",
      shortLabelDesc: "Active",
      iconAsc: Clock,
      iconDesc: Clock,
      teamsOnly: false,
    },
    {
      value: "newest",
      defaultDir: "desc",
      labelAsc: "Oldest First",
      labelDesc: "Newest First",
      shortLabelAsc: "Oldest",
      shortLabelDesc: "Newest",
      iconAsc: Sparkles,
      iconDesc: Sparkles,
      teamsOnly: false,
    },
    {
      value: "capacity",
      defaultDir: "desc",
      labelAsc: "Almost Full",
      labelDesc: "Most Capacity",
      shortLabelAsc: "Full",
      shortLabelDesc: "Capacity",
      iconAsc: UserMinus,
      iconDesc: UserPlus,
      teamsOnly: true,
    },
    {
      value: "proximity",
      defaultDir: "asc",
      labelAsc: "Nearest First",
      labelDesc: "Farthest First",
      labelRemote: "Remote Only",
      shortLabelAsc: "Near",
      shortLabelDesc: "Far",
      shortLabelRemote: "Remote",
      iconAsc: MapPin,
      iconDesc: MapPin,
      iconRemote: Globe,
    },
  ];

  const getVisibleSortOptions = () => {
    return sortOptions.filter((option) => {
      if (option.teamsOnly && searchType === "users") return false;
      if (option.usersOnly && searchType === "teams") return false;

      if (option.value === "proximity") {
        if (!isAuthenticated) return false;
        if (!userHasLocation) return false;
      }

      return true;
    });
  };

  // Centralized fetch to avoid duplicated logic
  const fetchData = useCallback(
    async ({ mode, queryString, page, limit, sBy, sDir, maxDist }) => {
      if (mode === "search") {
        return await searchService.globalSearch(
          queryString,
          isAuthenticated,
          page,
          limit,
          sBy,
          sDir,
          maxDist,
        );
      }
      return await searchService.getAllUsersAndTeams(
        isAuthenticated,
        page,
        limit,
        sBy,
        sDir,
        maxDist,
      );
    },
    [isAuthenticated],
  );

  // Effect: load data when auth/pagination/sort/search changes
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
        });

        setSearchResults(results.data);
        setUserHasLocation(!!results.userLocation?.hasLocation);
        setUserHasCoordinates(!!results.userLocation?.hasCoordinates);
        if (results.pagination) setPagination(results.pagination);
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
        })); // optional but nice
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
    hasSearched,
    searchQuery,
  ]);

  // Effect: handle URL param changes
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const typeParam = urlParams.get("type");

    if (typeParam === "teams") {
      setSearchType("teams");
    } else if (typeParam === "users") {
      setSearchType("users");
      if (sortBy === "capacity") {
        setSortBy("name");
        setSortDir("asc");
      }
    } else {
      setSearchType("all");
    }
  }, [location.search, sortBy]);

  // Close sort dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showSortDropdown &&
        sortFilterRef.current &&
        !sortFilterRef.current.contains(event.target)
      ) {
        setShowSortDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSortDropdown]);

  // BooleanSearchInput callback
  const handleBooleanSearch = async (q) => {
    const trimmed = (q || "").trim();
    setSearchQuery(q);
    setCurrentPage(1);

    if (!trimmed) {
      setHasSearched(false);
      setError(null);
      return; // effect will load "all"
    }

    setHasSearched(true);
    setError(null);
    // effect will load "search"
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
      // Cycling within the same sort option
      if (newSortBy === "proximity") {
        // Three-state cycle: asc → desc → remote → asc
        if (sortDir === "asc") {
          newSortDir = "desc";
        } else if (sortDir === "desc") {
          newSortDir = "remote";
        } else {
          newSortDir = "asc";
        }
      } else {
        newSortDir = sortDir === "asc" ? "desc" : "asc";
      }
    } else {
      // Switching to a different sort option
      switch (newSortBy) {
        case "name":
        case "proximity":
          newSortDir = "asc";
          break;
        default:
          newSortDir = "desc";
      }
    }

    // Handle searchType switching for proximity
    if (newSortBy === "proximity") {
      if (newSortDir === "remote") {
        setSearchType("teams"); // Remote only applies to teams
      } else if (searchType === "all") {
        setSearchType("users"); // Original behavior for Near/Far
      }
    }

    // Reset distance filter when leaving proximity sort
    if (newSortBy !== "proximity") {
      setMaxDistance(null);
      setCustomDistanceInput("");
    }

    // Also reset when entering remote mode
    if (newSortBy === "proximity" && newSortDir === "remote") {
      setMaxDistance(null);
      setCustomDistanceInput("");
    }

    setSortBy(newSortBy);
    setSortDir(newSortDir);
    setCurrentPage(1);
  };

  // ===== DISTANCE FILTER HANDLERS =====
  const distancePresets = [5, 10, 25, 50, 100];

  const handleDistancePreset = (km) => {
    if (maxDistance === km) {
      // Toggle off
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
    if (type === "users" && sortBy === "capacity") {
      setSortBy("name");
      setSortDir("asc");
    }
    // Reset remote sort when switching away from teams-only view
    if (type !== "teams" && sortBy === "proximity" && sortDir === "remote") {
      setSortDir("asc");
      setMaxDistance(null);
      setCustomDistanceInput("");
    }
  };

  const filteredResults = {
    users:
      searchType === "all" || searchType === "users" ? searchResults.users : [],
    teams:
      searchType === "all" || searchType === "teams" ? searchResults.teams : [],
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

  const noResultsFound =
    hasSearched &&
    filteredResults.teams.length === 0 &&
    filteredResults.users.length === 0 &&
    !loading;

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

  return (
    <PageContainer
      title="Search teams or users"
      titleAlignment="center"
      variant="muted"
    >
      <div className="max-w-xl mx-auto mb-8">
        {/* Toggle for All/Teams/Users */}
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

        {/* Search + Sort */}
        <div ref={sortFilterRef}>
          <div className="flex gap-2 items-start">
            <button
              type="button"
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className={`p-2 rounded-lg transition-colors ${
                showSortDropdown
                  ? "text-[var(--color-text)]"
                  : "text-[var(--color-text)]/60 hover:text-[var(--color-text)]"
              }`}
              title="Sort options"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>

            <div className="flex-1">
              <BooleanSearchInput
                initialQuery={searchQuery}
                onSearch={handleBooleanSearch}
                placeholder="Try: hiking AND photography, or hiking NOT photography"
                className="w-full"
              />
            </div>
          </div>

          {showSortDropdown && (
            <>
              <div className="mt-2 py-1 ml-10 inline-flex flex-col items-end">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
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
                        type="button"
                        onClick={() => handleSortChange(option.value)}
                        className={`flex items-center gap-1 px-1 text-xs rounded transition-colors ${
                          isActive
                            ? "text-[var(--color-success)] font-medium"
                            : "text-[var(--color-text)]/60 hover:text-[var(--color-text)]"
                        }`}
                        disabled={loading}
                        title={option.teamsOnly ? "Teams only" : ""}
                      >
                        <IconComponent className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{label}</span>
                        <span className="sm:hidden">{shortLabel}</span>
                      </button>
                    );
                  })}
                </div>

                {/* DISTANCE FILTER ROW */}
                {sortBy === "proximity" &&
                  sortDir !== "remote" &&
                  userHasCoordinates && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap justify-end self-stretch overflow-x-auto no-scrollbar">
                      {distancePresets.map((km) => (
                        <button
                          key={km}
                          type="button"
                          onClick={() => handleDistancePreset(km)}
                          className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                            maxDistance === km
                              ? "text-[var(--color-success)] font-medium"
                              : "text-[var(--color-text)]/60 hover:text-[var(--color-text)]"
                          }`}
                          disabled={loading}
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
                          className={`w-12 px-1 py-0.5 text-xs rounded border transition-colors
                ${
                  maxDistance && !distancePresets.includes(maxDistance)
                    ? "border-[var(--color-success)] text-[var(--color-success)] font-medium"
                    : "border-[var(--color-text)]/20 text-[var(--color-text)]/60"
                }
                bg-transparent focus:outline-none focus:border-[var(--color-success)]`}
                          disabled={loading}
                        />
                        <span className="text-xs text-[var(--color-text)]/40">
                          km
                        </span>
                      </div>
                    </div>
                  )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <Alert
          type="error"
          message={error}
          className="max-w-xl mx-auto mb-4"
          onClose={() => setError(null)}
        />
      )}

      {/* No results */}
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
          {/* Teams */}
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

          {/* Users */}
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

          {/* Pagination */}
          {(filteredResults.teams.length > 0 ||
            filteredResults.users.length > 0) && (
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              totalItems={getTotalItemsForFilter()}
              onPageChange={handlePageChange}
              resultsPerPage={resultsPerPage}
              onResultsPerPageChange={handleResultsPerPageChange}
              resultsPerPageOptions={[10, 20, 30, 40]}
            />
          )}
        </div>
      )}
    </PageContainer>
  );
};

export default SearchPage;
