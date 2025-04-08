// src/pages/MyTeams.jsx (updated)
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';
import Grid from '../components/layout/Grid';
import Button from '../components/common/Button';
import TeamCard from '../components/teams/TeamCard';
import { teamService } from '../services/teamService';
import { useAuth } from '../contexts/AuthContext';
import { Plus } from 'lucide-react';

const MyTeams = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const fetchUserTeams = async () => {
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
  };

  useEffect(() => {
    // Only call fetchUserTeams if user is defined
    if (user) {
      fetchUserTeams();
    }
  }, [user]); // Depend on user to re-run when user changes

  const handleTeamUpdate = (updatedTeam) => {
    // Update the team in the local state
    setTeams(prevTeams => 
      prevTeams.map(team => 
        team.id === updatedTeam.id ? updatedTeam : team
      )
    );
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
    <Link to="/teams/create">
      <Button variant="primary" icon={<Plus size={16} />}>
        Create New Team
      </Button>
    </Link>
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
            />
          ))}
        </Grid>
      )}
    </PageContainer>
  );
};

export default MyTeams;