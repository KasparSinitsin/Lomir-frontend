import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import PageContainer from "../components/layout/PageContainer";
import Grid from "../components/layout/Grid";
import Button from "../components/common/Button";
import TeamCard from "../components/teams/TeamCard";
import Section from "../components/layout/Section";
import { teamService } from "../services/teamService";
import { useAuth } from "../contexts/AuthContext";
import { Plus, Search as SearchIcon } from "lucide-react";
import Alert from "../components/common/Alert";

const MyTeams = () => {
  const [teams, setTeams] = useState([]);
  const [pendingApplications, setPendingApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const fetchUserTeams = useCallback(async () => {
    try {
      setLoading(true);
      if (user && user.id) {
        const response = await teamService.getUserTeams(user.id);
        setTeams(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch teams:", err);
      setError("Could not load teams");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchPendingApplications = useCallback(async () => {
    try {
      setLoadingApplications(true);
      if (user && user.id) {
        const response = await teamService.getUserPendingApplications();
        setPendingApplications(response.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch pending applications:", err);
    } finally {
      setLoadingApplications(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUserTeams();
      fetchPendingApplications();
    }
  }, [user, fetchUserTeams, fetchPendingApplications]);

  const handleTeamUpdate = (updatedTeam) => {
    if (!updatedTeam) {
      console.warn("Received undefined team data in handleTeamUpdate");
      fetchUserTeams();
      return;
    }

    setTeams((prevTeams) =>
      prevTeams.map((team) => (team.id === updatedTeam.id ? updatedTeam : team))
    );
  };

  const handleTeamDelete = (teamId) => {
    setTeams((prevTeams) => prevTeams.filter((team) => team.id !== teamId));
  };

  const handleApplicationCancel = async (applicationId) => {
    try {
      await teamService.cancelApplication(applicationId);
      // Refresh applications after cancellation
      fetchPendingApplications();
    } catch (error) {
      console.error("Error canceling application:", error);
    }
  };

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

  if (loading && loadingApplications) {
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

  // Process application data to create team cards with application info
  const applicationTeams = pendingApplications.map((application) => ({
    ...application.team,
    applicationId: application.id,
    applicationStatus: application.status,
    applicationMessage: application.message,
    applicationDate: application.created_at,
    isPendingApplication: true, // Flag to indicate this is a pending application
  }));

  return (
    <PageContainer title="My Teams" action={CreateTeamAction}>
      {/* Pending Applications Section */}
      {applicationTeams.length > 0 && (
        <Section
          title="My Pending Membership Applications"
          subtitle="Teams that I would like to join"
          className="mb-10"
        >
          {loadingApplications ? (
            <div className="flex justify-center py-8">
              <div className="loading loading-spinner loading-md"></div>
            </div>
          ) : (
            <Grid cols={1} md={2} lg={3} gap={6}>
              {applicationTeams.map((team) => (
                <TeamCard
                  key={`application-${team.applicationId}`}
                  team={team}
                  isPendingApplication={true}
                  onCancelApplication={() =>
                    handleApplicationCancel(team.applicationId)
                  }
                />
              ))}
            </Grid>
          )}
        </Section>
      )}

      {/* My Teams Section */}
      <Section
        title="Teams You're A Part Of"
        subtitle="Teams you've created or joined as a member"
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
            {teams.map((team) => (
              <TeamCard
                key={team.id}
                team={{
                  ...team,
                  is_public: team.is_public === true,
                }}
                onUpdate={handleTeamUpdate}
                onDelete={handleTeamDelete}
              />
            ))}
          </Grid>
        )}
      </Section>
    </PageContainer>
  );
};

export default MyTeams;
