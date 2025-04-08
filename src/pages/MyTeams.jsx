import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';
import Grid from '../components/layout/Grid';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { teamService } from '../services/teamService';
import { useAuth } from '../contexts/AuthContext';

const MyTeams = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchUserTeams = async () => {
      try {
        setLoading(true);
        const response = await teamService.getUserTeams();
        setTeams(response.data || []);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch teams:', err);
        setError(err.response?.data?.message || 'Could not load teams');
        setLoading(false);
      }
    };

    if (user) {
      fetchUserTeams();
    }
  }, [user]);

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
      <Button variant="primary">Create New Team</Button>
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
            <Card 
              key={team.id} 
              title={team.name}
              subtitle={`${team.current_members_count} members`}
              footer={
                <Link to={`/teams/${team.id}`} className="btn btn-primary btn-sm">
                  View Details
                </Link>
              }
            >
              <p className="text-base-content/80">{team.description}</p>
              <div className="flex items-center mt-2">
                <span className="text-sm text-base-content/60">
                  {team.is_public ? 'Public Team' : 'Private Team'}
                </span>
                {team.user_team_role && (
                  <span className="ml-2 badge badge-primary badge-outline">
                    {team.user_team_role}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </Grid>
      )}
    </PageContainer>
  );
};

export default MyTeams;