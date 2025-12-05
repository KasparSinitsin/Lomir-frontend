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
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
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

  const fetchPendingInvitations = useCallback(async () => {
    try {
      setLoadingInvitations(true);
      const response = await teamService.getUserReceivedInvitations();
      setPendingInvitations(response.data || []);
    } catch (err) {
      console.error("Error fetching pending invitations:", err);
    } finally {
      setLoadingInvitations(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchUserTeams();
      fetchPendingApplications();
      fetchPendingInvitations();
    }
  }, [
    user?.id,
    fetchUserTeams,
    fetchPendingApplications,
    fetchPendingInvitations,
  ]);

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

  const handleTeamDelete = async (teamId) => {
    try {
      await teamService.deleteTeam(teamId);
      setTeams((prevTeams) => prevTeams.filter((team) => team.id !== teamId));
      return true;
    } catch (error) {
      console.error("Error deleting team:", error);
      return false;
    }
  };

  // Handler for when user LEAVES a team (not deletes it)
  const handleTeamLeave = (teamId) => {
    // Server-side removal already happened in TeamDetailsModal
    console.log("handleTeamLeave called with teamId:", teamId);
    setTeams((prevTeams) => prevTeams.filter((team) => team.id !== teamId));
  };

  // Application handlers
  const handleApplicationCancel = async (applicationId) => {
    try {
      await teamService.cancelApplication(applicationId);
      fetchPendingApplications();
    } catch (error) {
      console.error("Error canceling application:", error);
    }
  };

  const handleSendReminder = async (applicationId) => {
    // TODO: Implement send reminder functionality
    console.log("Send reminder for application:", applicationId);
    alert("Reminder feature coming soon!");
  };

  // Invitation handlers
  const handleInvitationAccept = async (invitationId) => {
    try {
      await teamService.respondToInvitation(invitationId, "accept");
      fetchUserTeams();
      fetchPendingInvitations();
    } catch (error) {
      console.error("Error accepting invitation:", error);
    }
  };

  const handleInvitationDecline = async (invitationId) => {
    try {
      await teamService.respondToInvitation(invitationId, "decline");
      fetchPendingInvitations();
    } catch (error) {
      console.error("Error declining invitation:", error);
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
    <PageContainer variant="muted">
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    </PageContainer>
  );
}


if (error) {
  return (
    <PageContainer variant="muted">
      <div className="alert alert-error">
        <span>{error}</span>
      </div>
    </PageContainer>
  );
}


  return (
    <PageContainer title="My Teams" action={CreateTeamAction} variant="muted">
      {/* Pending Invitations Section */}
      {pendingInvitations.length > 0 && (
        <Section
          title="My Pending Membership Invitations"
          subtitle="Teams that have invited you to join"
          className="mb-10"
        >
          {loadingInvitations ? (
            <div className="flex justify-center py-8">
              <div className="loading loading-spinner loading-md"></div>
            </div>
          ) : (
            <Grid cols={1} md={2} lg={3} gap={6}>
              {pendingInvitations.filter(Boolean).map((invitation) => (
                <TeamCard
                  key={`invitation-${invitation.id}`}
                  variant="invitation"
                  invitation={invitation}
                  onAccept={handleInvitationAccept}
                  onDecline={handleInvitationDecline}
                />
              ))}
            </Grid>
          )}
        </Section>
      )}

      {/* Pending Applications Section */}
      {pendingApplications.length > 0 && (
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
              {pendingApplications.filter(Boolean).map((application) => (
                <TeamCard
                  key={`application-${application.id}`}
                  variant="application"
                  application={application}
                  onCancel={handleApplicationCancel}
                  onSendReminder={handleSendReminder}
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
            {teams.filter(Boolean).map((team) => (
              <TeamCard
                key={team.id}
                variant="member"
                team={{
                  ...team,
                  // Check both snake_case and camelCase versions
                  is_public: team.is_public === true || team.isPublic === true,
                }}
                onUpdate={handleTeamUpdate}
                onDelete={handleTeamDelete}
                onLeave={handleTeamLeave}
              />
            ))}
          </Grid>
        )}
      </Section>
    </PageContainer>
  );
};

export default MyTeams;
