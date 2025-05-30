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
import { Search as SearchIcon, Users, Users2 } from "lucide-react";
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

  // Effect to load initial data when the component mounts
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);

        const results = await searchService.getAllUsersAndTeams(
          isAuthenticated
        );
        setSearchResults(results.data);
      } catch (err) {
        console.error("Error fetching initial data:", err);
        setError("Failed to load initial data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [isAuthenticated]);

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

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      // If search query is empty, reload all data
      try {
        setLoading(true);
        setError(null);
        setHasSearched(false);

        const results = await searchService.getAllUsersAndTeams(
          isAuthenticated
        );
        setSearchResults(results.data);
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
        isAuthenticated
      );
      setSearchResults(results.data);
    } catch (err) {
      console.error("Search error:", err);
      setError("An error occurred while searching. Please try again.");
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
              is_public: updatedTeam.is_public === true, // Ensure proper boolean
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

  return (
    <PageContainer title="Search teams or users" titleAlignment="center">
      <div className="max-w-xl mx-auto mb-8">
        {/* Toggle */}
        <div className="flex justify-center space-x-2 pt-2 mb-2">
          <div className="btn-group">
            <button
              type="button"
              className={`btn btn-sm ${
                searchType === "all" ? "btn-active" : ""
              }`}
              onClick={() => handleToggleChange("all")}
            >
              All
            </button>
            <button
              type="button"
              className={`btn btn-sm ${
                searchType === "users" ? "btn-active" : ""
              }`}
              onClick={() => handleToggleChange("users")}
            >
              <Users size={16} className="mr-1" />
              People
            </button>
            <button
              type="button"
              className={`btn btn-sm ${
                searchType === "teams" ? "btn-active" : ""
              }`}
              onClick={() => handleToggleChange("teams")}
            >
              <Users2 size={16} className="mr-1" />
              Teams
            </button>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex space-x-2">
          {/* Search input and button */}
          <Input
            placeholder="Search teams, users, skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-grow"
          />
          <Button
            type="submit"
            variant="primary"
            icon={<SearchIcon className="h-5 w-5" />}
            disabled={loading}
            className="p-2 flex items-center justify-center"
            aria-label="Search"
          />
        </form>
      </div>

      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} />
      )}

      {noResultsFound && (
        <Alert
          type="info"
          message={`No results found for "${searchQuery}". Try a different search term.`}
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
              <h2 className="text-xl font-semibold mb-4">Teams</h2>
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
              <h2 className="text-xl font-semibold mb-4">People</h2>
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
        </div>
      )}
    </PageContainer>
  );
};

export default SearchPage;
