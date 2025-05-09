import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';
import Grid from '../components/layout/Grid';
import Button from '../components/common/Button';
import TeamCard from '../components/teams/TeamCard';
import { teamService } from '../services/teamService';
import { useAuth } from '../contexts/AuthContext';
import { Plus } from 'lucide-react';
import { Search as SearchIcon } from 'lucide-react';

const MyTeams = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const fetchUserTeams = useCallback(async () => {
    try {
      setLoading(true);
      // Ensure user and user.id exist before making the API call
      if (user && user.id) {
        const response = await teamService.getUserTeams(user.id);
        setTeams(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch teams:', err);
      setError('Could not load teams');
    } finally {
      setLoading(false);
    }
  }, [user]); // Include user as a dependency

  useEffect(() => {
    // Only call fetchUserTeams if user is defined
    if (user) {
      fetchUserTeams();
    }
  }, [user, fetchUserTeams]); // Now it's safe to include fetchUserTeams

  const handleTeamUpdate = (updatedTeam) => {
    // First, add a check to ensure updatedTeam is not undefined
    if (!updatedTeam) {
      console.warn('Received undefined team data in handleTeamUpdate');
      // Optionally, you could refresh the teams list here
      fetchUserTeams();
      return;
    }

    // Update the team in the local state
    setTeams(prevTeams => 
      prevTeams.map(team => 
        team.id === updatedTeam.id ? updatedTeam : team
      )
    );
  };

  const handleTeamDelete = (teamId) => {
    // Remove the deleted team from the state
    setTeams(prevTeams => prevTeams.filter(team => team.id !== teamId));
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex justify-center items-center h-64">
          <div className="loading loading-spinner loading-lg text-primary"></div>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      </PageContainer>
    );
  }

  const CreateTeamAction = (
    <div className="flex flex-col gap-2 mt-8">
      <Link to="/teams/create">
        <Button variant="primary" icon={<Plus size={16} />}>
          Create New Team
        </Button>
      </Link>
      <Link to="/search">
        <Button variant="primary" icon={<SearchIcon size={16} />}>
          Search for Teams
        </Button>
      </Link>
    </div>
  );

  return (
    <PageContainer 
      title="My Teams" 
      subtitle="Teams you're a part of or have created"
      action={CreateTeamAction}
    >
      {teams.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-base-content/70 mb-4">
            You haven't joined any teams yet.
          </p>
          <Link to="/teams/create" className="btn btn-primary">
            Create Your First Team
          </Link>
        </div>
      ) : (
<Grid cols={1} md={2} lg={3} gap={6}>
  {teams.map(team => (
    <TeamCard 
      key={team.id} 
      team={team}
      onUpdate={handleTeamUpdate}
      onDelete={handleTeamDelete}
    />
  ))}
</Grid>
      )}
    </PageContainer>
  );
};

export default MyTeams;