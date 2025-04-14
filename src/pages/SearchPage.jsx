import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PageContainer from '../components/layout/PageContainer';
import Grid from '../components/layout/Grid';
import TeamCard from '../components/teams/TeamCard';
import UserCard from '../components/users/UserCard';
import { searchService } from '../services/searchService';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import { Search as SearchIcon, Users, Users2 } from 'lucide-react';

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({
    teams: [],
    users: []
  });
  const [searchType, setSearchType] = useState('all'); // 'all', 'users', or 'teams'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false); // New state to track if a search has been performed
  const { isAuthenticated } = useAuth();

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setHasSearched(true); // Mark that a search has been performed

      const results = await searchService.globalSearch(searchQuery, isAuthenticated);
      setSearchResults(results.data);
    } catch (err) {
      console.error('Search error:', err);
      setError('An error occurred while searching. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle toggle change
  const handleToggleChange = (type) => {
    setSearchType(type);
  };

  // Filter results based on search type
  const filteredResults = {
    users: searchType === 'all' || searchType === 'users' ? searchResults.users : [],
    teams: searchType === 'all' || searchType === 'teams' ? searchResults.teams : []
  };

  // Add this method to handle user updates
  const handleUserUpdate = (updatedUser) => {
    setSearchResults(prevResults => ({
      ...prevResults,
      users: prevResults.users.map(user =>
        user.id === updatedUser.id ? updatedUser : user
      )
    }));
  };

  // Add similar method for team updates if needed
  const handleTeamUpdate = (updatedTeam) => {
    setSearchResults(prevResults => ({
      ...prevResults,
      teams: prevResults.teams.map(team =>
        team.id === updatedTeam.id ? updatedTeam : team
      )
    }));
  };

  // Check if no results were found after a search was performed
  const noResultsFound = hasSearched &&
                         filteredResults.teams.length === 0 &&
                         filteredResults.users.length === 0 &&
                         !loading;

  return (
    <PageContainer
      title="Search teams or users"
      titleAlignment="center"
    >
      <div className="max-w-xl mx-auto mb-8">

          {/* Toggle switch */}
          <div className="flex justify-center space-x-2 pt-2 mb-2">
            <div className="btn-group">
              <button
                type="button"
                className={`btn btn-sm ${searchType === 'all' ? 'btn-active' : ''}`}
                onClick={() => handleToggleChange('all')}
              >
                All
              </button>
              <button
                type="button"
                className={`btn btn-sm ${searchType === 'users' ? 'btn-active' : ''}`}
                onClick={() => handleToggleChange('users')}
              >
                <Users size={16} className="mr-1" />
                People
              </button>
              <button
                type="button"
                className={`btn btn-sm ${searchType === 'teams' ? 'btn-active' : ''}`}
                onClick={() => handleToggleChange('teams')}
              >
                <Users2 size={16} className="mr-1" />
                Teams
              </button>
            </div>
          </div>
        
            <form onSubmit={handleSearch} className="flex-col items-center space-y-4">
              {/* Search input and button */}
              <div className="flex space-x-2 items-center">
                <Input
                  placeholder="Search teams, users, skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-grow"
                />
                <Button
                  type="submit"
                  variant="primary"
                  icon={<SearchIcon className="h-5 w-5"/>}
                  disabled={loading}
                  className="p-2 flex items-center justify-center"
                  aria-label="Search"
                />
              </div>
            </form>
          </div>
     

      {error && (
        <Alert
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
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
          {/* Teams Results */}
          {filteredResults.teams.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Teams</h2>
              <Grid cols={1} md={2} lg={3} gap={6}>
                {filteredResults.teams.map(team => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    onUpdate={handleTeamUpdate}
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
                {filteredResults.users.map(user => (
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