import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageContainer from "../components/layout/PageContainer";
import Grid from "../components/layout/Grid";
import Button from "../components/common/Button";
import TeamCard from "../components/teams/TeamCard";
import Section from "../components/layout/Section";
import Pagination from "../components/common/Pagination";
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

  // ===== PAGINATION STATE =====
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage, setResultsPerPage] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalTeams: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // URL params for highlighting
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const openTeamId = searchParams.get("team");
  const shouldOpenApplications =
    searchParams.get("openApplications") === "true";

  // Ref for scrolling to highlighted invitation
  const highlightedInvitationRef = useRef(null);

  // State for auto-opening applications modal
  const [autoOpenApplicationsTeamId, setAutoOpenApplicationsTeamId] =
    useState(null);

  const fetchUserTeams = useCallback(
    async (page = 1, limit = 10) => {
      try {
        setLoading(true);
        if (user && user.id) {
          const response = await teamService.getUserTeams(user.id, page, limit);
          setTeams(response.data);

          // Update pagination metadata from response
          if (response.pagination) {
            setPagination(response.pagination);
          }
        }
      } catch (err) {
        console.error("Failed to fetch teams:", err);
        setError("Could not load teams");
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

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
      fetchUserTeams(currentPage, resultsPerPage);
      fetchPendingApplications();
      fetchPendingInvitations();
    }
  }, [user?.id, fetchPendingApplications, fetchPendingInvitations]);

  // Refetch teams when pagination changes
  useEffect(() => {
    if (user?.id) {
      fetchUserTeams(currentPage, resultsPerPage);
    }
  }, [currentPage, resultsPerPage, user?.id]);

  // Handle URL params for highlighting and auto-opening modals
  useEffect(() => {
    // If we need to open applications modal for a specific team
    if (openTeamId && shouldOpenApplications) {
      setAutoOpenApplicationsTeamId(parseInt(openTeamId));
    }

    // Scroll to highlighted invitation after a short delay
    if (highlightId && highlightedInvitationRef.current) {
      setTimeout(() => {
        highlightedInvitationRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 300);
    }

    // Clear URL params after 5 seconds (so refresh doesn't keep highlighting)
    if (highlightId || openTeamId) {
      const timer = setTimeout(() => {
        setSearchParams({});
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [highlightId, openTeamId, shouldOpenApplications, setSearchParams]);

  // Handler for page changes
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);

    // Scroll to the My Teams section when page changes
    const teamsSection = document.getElementById("my-teams-section");
    if (teamsSection) {
      teamsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Handler for changing results per page
  const handleResultsPerPageChange = (newLimit) => {
    setResultsPerPage(newLimit);
    setCurrentPage(1); // Reset to page 1 when changing limit
  };

  const handleTeamUpdate = (updatedTeam) => {
    if (!updatedTeam) {
      console.warn("Received undefined team data in handleTeamUpdate");
      fetchUserTeams(currentPage, resultsPerPage);
      return;
    }

    setTeams((prevTeams) =>
      prevTeams.map((team) =>
        team.id === updatedTeam.id ? updatedTeam : team,
      ),
    );
  };

  const handleTeamDelete = async (teamId) => {
    try {
      await teamService.deleteTeam(teamId);
      // Refetch to update pagination correctly
      fetchUserTeams(currentPage, resultsPerPage);
      return true;
    } catch (error) {
      console.error("Error deleting team:", error);
      return false;
    }
  };

  // Handler for when user LEAVES a team (not deletes it)
  const handleTeamLeave = (teamId) => {
    console.log("handleTeamLeave called with teamId:", teamId);
    // Refetch to update pagination correctly
    fetchUserTeams(currentPage, resultsPerPage);
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
  const handleInvitationAccept = async (invitationId, responseMessage = "") => {
    try {
      await teamService.respondToInvitation(
        invitationId,
        "accept",
        responseMessage,
      );

      console.log("Invitation accepted successfully");

      // Refresh the data
      fetchPendingInvitations();
      fetchUserTeams(currentPage, resultsPerPage);
    } catch (error) {
      console.error("Error accepting invitation:", error);
    }
  };

  const handleInvitationDecline = async (
    invitationId,
    responseMessage = "",
  ) => {
    try {
      await teamService.respondToInvitation(
        invitationId,
        "decline",
        responseMessage,
      );

      console.log("Invitation declined");

      // Refresh the data
      fetchPendingInvitations();
    } catch (error) {
      console.error("Error declining invitation:", error);
    }
  };

  if (loading && loadingApplications && loadingInvitations) {
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

  const CreateTeamAction = (
    <div className="flex flex-col gap-2 mt-8">
      <Link to="/teams/create">
        <Button variant="primary" icon={<Plus size={16} />}>
          Create New Team
        </Button>
      </Link>
      <Link to="/search?type=teams">
        <Button variant="primary" icon={<SearchIcon size={16} />}>
          Search for Teams
        </Button>
      </Link>
    </div>
  );

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
                <div
                  key={`invitation-${invitation.id}`}
                  ref={
                    String(invitation.id) === highlightId
                      ? highlightedInvitationRef
                      : null
                  }
                  className={
                    String(invitation.id) === highlightId
                      ? "message-highlight rounded-xl"
                      : ""
                  }
                >
                  <TeamCard
                    variant="invitation"
                    invitation={invitation}
                    onAccept={handleInvitationAccept}
                    onDecline={handleInvitationDecline}
                  />
                </div>
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
        id="my-teams-section"
        title="Teams You're A Part Of"
        subtitle="Teams you've created or joined as a member"
      >
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="loading loading-spinner loading-md"></div>
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-base-content/70 mb-4">
              You haven't joined any teams yet.
            </p>
            <Link to="/teams/create" className="btn btn-primary">
              Create Your First Team
            </Link>
          </div>
        ) : (
          <>
            <Grid cols={1} md={2} lg={3} gap={6}>
              {teams.filter(Boolean).map((team) => (
                <TeamCard
                  key={team.id}
                  variant="member"
                  team={{
                    ...team,
                    is_public:
                      team.is_public === true || team.isPublic === true,
                  }}
                  onUpdate={handleTeamUpdate}
                  onDelete={handleTeamDelete}
                  onLeave={handleTeamLeave}
                  autoOpenApplications={team.id === autoOpenApplicationsTeamId}
                  highlightApplicantId={
                    team.id === autoOpenApplicationsTeamId ? highlightId : null
                  }
                  onApplicationsModalClosed={() =>
                    setAutoOpenApplicationsTeamId(null)
                  }
                />
              ))}
            </Grid>

            {/* Pagination for My Teams */}
            {pagination.totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalTeams}
                onPageChange={handlePageChange}
                resultsPerPage={resultsPerPage}
                onResultsPerPageChange={handleResultsPerPageChange}
                resultsPerPageOptions={[10, 20, 30, 40]}
              />
            )}
          </>
        )}
      </Section>
    </PageContainer>
  );
};

export default MyTeams;
