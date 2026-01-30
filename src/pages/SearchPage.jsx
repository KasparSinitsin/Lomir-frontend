import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import PageContainer from "../components/layout/PageContainer";
import Grid from "../components/layout/Grid";
import TeamCard from "../components/teams/TeamCard";
import UserCard from "../components/users/UserCard";
import { searchService } from "../services/searchService";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import Pagination from "../components/common/Pagination";
import BooleanSearchInput from "../components/BooleanSearchInput";
import {
  Search as SearchIcon,
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
} from "lucide-react";
import Alert from "../components/common/Alert";

const SearchPage = () => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({ teams: [], users: [] });

  // Initialize searchType based on URL parameters
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
  const { isAuthenticated } = useAuth();
  const [userHasLocation, setUserHasLocation] = useState(false);

  // ===== SORTING STATE =====
  const [sortBy, setSortBy] = useState("name"); // 'name', 'recent', 'newest', 'capacity'
  const [sortDir, setSortDir] = useState("asc"); // 'asc' or 'desc'
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortFilterRef = useRef(null);

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

  // Sort options configuration
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
      shortLabelAsc: "Near",
      shortLabelDesc: "Far",
      iconAsc: MapPin,
      iconDesc: MapPin,
    },
  ];

  // Filter sort options based on searchType
  const getVisibleSortOptions = () => {
    return sortOptions.filter((option) => {
      // teams-only options should not show on users view
      if (option.teamsOnly && searchType === "users") return false;

      // users-only options should not show on teams view
      if (option.usersOnly && searchType === "teams") return false;

      // proximity requires auth + location
      if (option.value === "proximity") {
        if (!isAuthenticated) return false;
        if (!userHasLocation) return false;
      }

      return true;
    });
  };

  // Effect to load initial data when the component mounts
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);

        const results = await searchService.getAllUsersAndTeams(
          isAuthenticated,
          currentPage,
          resultsPerPage,
          sortBy,
          sortDir,
        );

        setSearchResults(results.data);

        const hasLoc = !!results.userLocation?.hasLocation;
        setUserHasLocation(hasLoc);

        console.log("AUTH + LOCATION (initial load):", {
          isAuthenticated,
          hasLoc,
          userLocation: results.userLocation,
        });

        // Update pagination metadata from response
        if (results.pagination) {
          setPagination(results.pagination);
        }
      } catch (err) {
        console.error("Error fetching initial data:", err);
        setError("Failed to load initial data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [isAuthenticated, currentPage, resultsPerPage, sortBy, sortDir]);

  // Effect to handle URL parameter changes
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const typeParam = urlParams.get("type");

    if (typeParam === "teams") {
      setSearchType("teams");
    } else if (typeParam === "users") {
      setSearchType("users");
      // If switching to users and capacity is selected, switch to name sort
      if (sortBy === "capacity") {
        setSortBy("name");
        setSortDir("asc");
      }
    } else if (typeParam === "all") {
      setSearchType("all");
    }
  }, [location.search, sortBy]);

  // Effect to close sort dropdown when clicking outside
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

  // Handler for search form submission
  const handleSearch = async (e) => {
    e.preventDefault();

    // Reset to page 1 when performing a new search
    setCurrentPage(1);

    if (!searchQuery.trim()) {
      // If search query is empty, reload all data
      try {
        setLoading(true);
        setError(null);
        setHasSearched(false);

        const results = await searchService.getAllUsersAndTeams(
          isAuthenticated,
          1, // Reset to page 1
          resultsPerPage,
          sortBy,
          sortDir,
        );
        setSearchResults(results.data);
        setUserHasLocation(!!results.userLocation?.hasLocation);

        if (results.pagination) {
          setPagination(results.pagination);
        }
      } catch (err) {
        console.error("Error reloading data:", err);
        setError("Failed to reload data. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setHasSearched(true);

      const results = await searchService.globalSearch(
        searchQuery,
        isAuthenticated,
        1, // Reset to page 1 for new search
        resultsPerPage,
        sortBy,
        sortDir,
      );
      setSearchResults(results.data);
      setUserHasLocation(!!results.userLocation?.hasLocation);

      if (results.pagination) {
        setPagination(results.pagination);
      }
    } catch (err) {
      console.error("Search error:", err);
      setError("An error occurred while searching. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBooleanSearch = async (q) => {
    setSearchQuery(q);
    setCurrentPage(1);

    if (!q.trim()) {
      setHasSearched(false);
      const results = await searchService.getAllUsersAndTeams(
        isAuthenticated,
        1,
        resultsPerPage,
        sortBy,
        sortDir,
      );
      setSearchResults(results.data);
      if (results.pagination) setPagination(results.pagination);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setHasSearched(true);

      const results = await searchService.globalSearch(
        q,
        isAuthenticated,
        1,
        resultsPerPage,
        sortBy,
        sortDir,
      );

      setSearchResults(results.data);
      setUserHasLocation(!!results.userLocation?.hasLocation);

      if (results.pagination) {
        setPagination(results.pagination);
      }
    } catch (err) {
      console.error("Search error:", err);
      setError("An error occurred while searching. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handler for page changes
  const handlePageChange = async (newPage) => {
    setCurrentPage(newPage);

    // Scroll to top of results when page changes
    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      setLoading(true);
      setError(null);

      let results;
      if (hasSearched && searchQuery.trim()) {
        // If we have an active search, use globalSearch
        results = await searchService.globalSearch(
          searchQuery,
          isAuthenticated,
          newPage,
          resultsPerPage,
          sortBy,
          sortDir,
        );
      } else {
        // Otherwise, get all users and teams
        results = await searchService.getAllUsersAndTeams(
          isAuthenticated,
          newPage,
          resultsPerPage,
          sortBy,
          sortDir,
        );
      }

      setSearchResults(results.data);
      setUserHasLocation(!!results.userLocation?.hasLocation);

      if (results.pagination) {
        setPagination(results.pagination);
      }
    } catch (err) {
      console.error("Error changing page:", err);
      setError("Failed to load page. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handler for changing results per page
  const handleResultsPerPageChange = async (newLimit) => {
    setResultsPerPage(newLimit);
    setCurrentPage(1); // Reset to page 1 when changing limit

    try {
      setLoading(true);
      setError(null);

      let results;
      if (hasSearched && searchQuery.trim()) {
        results = await searchService.globalSearch(
          searchQuery,
          isAuthenticated,
          1, // Reset to page 1
          newLimit,
          sortBy,
          sortDir,
        );
      } else {
        results = await searchService.getAllUsersAndTeams(
          isAuthenticated,
          1, // Reset to page 1
          newLimit,
          sortBy,
          sortDir,
        );
      }

      setSearchResults(results.data);
      setUserHasLocation(!!results.userLocation?.hasLocation);

      if (results.pagination) {
        setPagination(results.pagination);
      }
    } catch (err) {
      console.error("Error changing results per page:", err);
      setError("Failed to update results. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handler for changing sort option
  const handleSortChange = async (newSortBy) => {
    if (newSortBy === "proximity" && searchType === "all") {
      setSearchType("users");
    }
    let newSortDir = sortDir;

    // If clicking the same sort option, toggle direction
    if (newSortBy === sortBy) {
      newSortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      // Set correct default direction per sort type
      switch (newSortBy) {
        case "name":
          newSortDir = "asc"; // A–Z
          break;
        case "proximity":
          newSortDir = "asc"; // Nearest first ✅
          break;
        default:
          newSortDir = "desc"; // recent, newest, capacity
      }
    }

    setSortBy(newSortBy);
    setSortDir(newSortDir);
    setCurrentPage(1); // Reset to page 1 when changing sort

    try {
      setLoading(true);
      setError(null);

      let results;
      if (hasSearched && searchQuery.trim()) {
        results = await searchService.globalSearch(
          searchQuery,
          isAuthenticated,
          1, // Reset to page 1
          resultsPerPage,
          newSortBy,
          newSortDir,
        );
      } else {
        results = await searchService.getAllUsersAndTeams(
          isAuthenticated,
          1, // Reset to page 1
          resultsPerPage,
          newSortBy,
          newSortDir,
        );
      }

      setSearchResults(results.data);

      if (results.pagination) {
        setPagination(results.pagination);
      }
    } catch (err) {
      console.error("Error changing sort:", err);
      setError("Failed to update results. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleChange = (type) => {
    setSearchType(type);
    // If switching to users and capacity is selected, switch to name sort
    if (type === "users" && sortBy === "capacity") {
      setSortBy("name");
      setSortDir("asc");
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
      users: prev.users.map((user) =>
        user.id === updatedUser.id ? updatedUser : user,
      ),
    }));
  };

  const handleTeamUpdate = (updatedTeam) => {
    setSearchResults((prev) => ({
      ...prev,
      teams: prev.teams.map((team) =>
        team.id === updatedTeam.id
          ? {
              ...updatedTeam,
              is_public: updatedTeam.is_public === true,
            }
          : team,
      ),
    }));
  };

  const noResultsFound =
    hasSearched &&
    filteredResults.teams.length === 0 &&
    filteredResults.users.length === 0 &&
    !loading;

  // Calculate total items for current filter
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
            {/* Sort Toggle Button (THIS brings your filters back) */}
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

            {/* Boolean Search Input */}
            <div className="flex-1">
              <BooleanSearchInput
                initialQuery={searchQuery}
                onSearch={handleBooleanSearch}
                placeholder="Search by name, description, or tags..."
                className="w-full"
              />
            </div>
          </div>

          {/* Sort Options - Horizontal row below search */}
          {showSortDropdown && (
            <div className="flex items-center gap-1 mt-2 py-1 ml-10">
              {getVisibleSortOptions().map((option) => {
                const isActive = sortBy === option.value;
                const currentDir = isActive
                  ? sortDir
                  : option.defaultDir || "desc";

                const IconComponent =
                  currentDir === "asc" ? option.iconAsc : option.iconDesc;
                const label =
                  currentDir === "asc" ? option.labelAsc : option.labelDesc;
                const shortLabel =
                  currentDir === "asc"
                    ? option.shortLabelAsc
                    : option.shortLabelDesc;

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
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant="error" className="max-w-xl mx-auto mb-4">
          {error}
        </Alert>
      )}

      {/* No Results Message */}
      {noResultsFound && (
        <Alert
          variant="info"
          title="No results found"
          message={`No ${searchType === "all" ? "teams or users" : searchType} found matching "${searchQuery}". Try a different search term.`}
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

          {/* Users Results */}
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
