import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PageContainer from '../components/layout/PageContainer';
import Grid from '../components/layout/Grid';
import TeamCard from '../components/teams/TeamCard';
import UserCard from '../components/users/UserCard';
import { searchService } from '../services/searchService';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { Search as SearchIcon } from 'lucide-react';

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({
    teams: [],
    users: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const results = await searchService.globalSearch(searchQuery, isAuthenticated);
      setSearchResults(results.data);
    } catch (err) {
      console.error('Search error:', err);
      setError('An error occurred while searching. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="Search"
      subtitle="Find teams, users, and projects"
    >
      <div className="max-w-xl mx-auto mb-8">
        <form onSubmit={handleSearch} className="flex space-x-2">
          <Input
            placeholder="Search teams, users, skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-grow"
          />
          <Button
            type="submit"
            variant="primary"
            icon={<SearchIcon />}
            disabled={loading}
          >
            Search
          </Button>
        </form>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="loading loading-spinner loading-lg text-primary"></div>
        </div>
      ) : (
        <div>
          {/* Teams Results */}
          {searchResults.teams.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Teams</h2>
              <Grid cols={1} md={2} lg={3} gap={6}>
                {searchResults.teams.map(team => (
                  <TeamCard key={team.id} team={team} />
                ))}
              </Grid>
            </section>
          )}

          {/* Users Results */}
          {searchResults.users.length > 0 && (
  <section>
    <h2 className="text-xl font-semibold mb-4">Users</h2>
    <Grid cols={1} md={2} lg={3} gap={6}>
      {searchResults.users.map(user => (
        <UserCard 
          key={user.id} 
          user={user} 
          onUpdate={handleUserUpdate} // You'll need to implement this method
        />
      ))}
    </Grid>
  </section>
)}

          {searchResults.teams.length === 0 &&
           searchResults.users.length === 0 &&
           !loading && (
            <div className="text-center text-base-content/70 py-12">
              <p>No results found. Try a different search term.</p>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
};

export default SearchPage;