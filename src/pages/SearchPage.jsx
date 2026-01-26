import React, { useState, useEffect } from "react";
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
import {
  Search as SearchIcon,
  Users,
  Users2,
  Clock,
  Sparkles,
  ArrowDownAZ,
  SlidersHorizontal,
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

  // ===== SORTING STATE =====
  const [sortBy, setSortBy] = useState("name"); // 'name', 'recent', 'newest'

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
    { value: "name", label: "Name (A-Z)", icon: ArrowDownAZ },
    { value: "recent", label: "Recently Active", icon: Clock },
    { value: "newest", label: "Newest First", icon: Sparkles },
  ];

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
          sortBy
        );
        setSearchResults(results.data);

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
  }, [isAuthenticated, currentPage, resultsPerPage, sortBy]);

  // Effect to handle URL parameter changes
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const typeParam = urlParams.get("type");

    if (typeParam === "teams") {
      setSearchType("teams");
    } else if (typeParam === "users") {
      setSearchType("users");
    } else if (typeParam === "all") {
      setSearchType("all");
    }
  }, [location.search]);

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
          sortBy
        );
        setSearchResults(results.data);

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
        sortBy
      );
      setSearchResults(results.data);

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
          sortBy
        );
      } else {
        // Otherwise, get all users and teams
        results = await searchService.getAllUsersAndTeams(
          isAuthenticated,
          newPage,
          resultsPerPage,
          sortBy
        );
      }

      setSearchResults(results.data);

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
          sortBy
        );
      } else {
        results = await searchService.getAllUsersAndTeams(
          isAuthenticated,
          1, // Reset to page 1
          newLimit,
          sortBy
        );
      }

      setSearchResults(results.data);

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
    setSortBy(newSortBy);
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
          newSortBy
        );
      } else {
        results = await searchService.getAllUsersAndTeams(
          isAuthenticated,
          1, // Reset to page 1
          resultsPerPage,
          newSortBy
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

  const handleToggleChange = (type) => setSearchType(type);

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
        user.id === updatedUser.id ? updatedUser : user
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
          : team
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

        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search by name, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
              icon={<SearchIcon className="w-4 h-4" />}
            />
          </div>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              "Search"
            )}
          </Button>
        </form>

        {/* Sort Filter */}
        <div className="flex items-center justify-between mt-4 py-2 px-1">
          <div className="flex items-center gap-2 text-sm text-base-content/70">
            <SlidersHorizontal className="w-4 h-4" />
            <span>Sort by:</span>
          </div>
          <div className="flex gap-1">
            {sortOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSortChange(option.value)}
                  className={`btn btn-xs gap-1 ${
                    sortBy === option.value
                      ? "btn-primary"
                      : "btn-ghost hover:bg-base-200"
                  }`}
                  disabled={loading}
                >
                  <IconComponent className="w-3 h-3" />
                  <span className="hidden sm:inline">{option.label}</span>
                  <span className="sm:hidden">
                    {option.value === "name"
                      ? "A-Z"
                      : option.value === "recent"
                        ? "Active"
                        : "New"}
                  </span>
                </button>
              );
            })}
          </div>
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
