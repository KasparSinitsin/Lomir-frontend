import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useToast } from "../contexts/ToastContext";
import PageContainer from "../components/layout/PageContainer";
import Grid from "../components/layout/Grid";
import Button from "../components/common/Button";
import Alert from "../components/common/Alert";
import TeamCard from "../components/teams/TeamCard";
import Section from "../components/layout/Section";
import Pagination from "../components/common/Pagination";
import FilterSortOptionButton from "../components/common/FilterSortOptionButton";
import ResultViewToggle from "../components/common/ResultViewToggle";
import { teamService } from "../services/teamService";
import useSocketEvents from "../hooks/useSocketEvents";
import { useAuth } from "../contexts/AuthContext";
import {
  Plus,
  Search as SearchIcon,
  ArrowDownAZ,
  ArrowUpZA,
  Clock,
  Sparkles,
  Inbox,
  Mail,
  SendHorizontal,
  Users,
} from "lucide-react";
import CreateTeamModal from "../components/teams/CreateTeamModal";
import TeamApplicationDetailsModal from "../components/teams/TeamApplicationDetailsModal";
import TeamInvitationDetailsModal from "../components/teams/TeamInvitationDetailsModal";
import { enrichTeamMatchData } from "../utils/teamMatchUtils";
import useClientPagination from "../hooks/useClientPagination";
import useMyTeamsSort from "../hooks/useMyTeamsSort";
import useViewerMatchProfile from "../hooks/useViewerMatchProfile";
import useViewerPendingRequests from "../hooks/useViewerPendingRequests";

import {
  RESULTS_PER_PAGE_OPTIONS,
  DEFAULT_RESULTS_PER_PAGE,
} from "../constants/pagination";

const MY_TEAMS_LIST_LOCATION_WIDTH_CLASSNAME = "sm:w-40";
const MY_TEAMS_LIST_LOCATION_INSET_CLASSNAME = "sm:pl-[24px]";
const MY_TEAMS_LIST_LOCATION_VISIBILITY_CLASSNAME = "hidden sm:flex";
const MY_TEAMS_LIST_TAGS_WIDTH_CLASSNAME = "sm:w-36";
const MY_TEAMS_LIST_BADGES_WIDTH_CLASSNAME = "sm:w-32";

const MyTeams = () => {
  const showToast = useToast();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const {
    data: viewerPending,
    isLoading: viewerPendingLoading,
    refetch: refetchViewerPending,
  } = useViewerPendingRequests(user?.id, { enabled: Boolean(user?.id) });
  const pendingApplications = useMemo(
    () => viewerPending?.applications ?? [],
    [viewerPending],
  );
  const pendingInvitations = useMemo(
    () => viewerPending?.invitations ?? [],
    [viewerPending],
  );
  const loadingApplications = viewerPendingLoading;
  const loadingInvitations = viewerPendingLoading;
  const { viewerMatchProfile, viewerDistanceSource } = useViewerMatchProfile({
    userId: user?.id,
  });

  // ===== VIEW MODE STATE =====
  const [resultView, setResultView] = useState("list");

  // ===== CREATE TEAM MODAL STATE =====
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);

  // ===== PAGINATION STATE =====
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage, setResultsPerPage] = useState(DEFAULT_RESULTS_PER_PAGE);
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
  const highlightApplicationId = searchParams.get("highlightApplication");
  const highlightApplicantId = searchParams.get("highlightApplicant") || highlightId;
  const highlightInvitationId = searchParams.get("highlightInvitation");
  const openTeamId = searchParams.get("team");
  const shouldOpenApplications =
    searchParams.get("openApplications") === "true";
  // Notification click-through: auto-open the specific application/invitation modal
  const openApplicationIdParam = searchParams.get("openApplication");
  const openInvitationIdParam = searchParams.get("openInvitation");

  // State for notification-triggered detail modals
  const [notifApplicationModal, setNotifApplicationModal] = useState(null); // the application object
  const [notifInvitationModal, setNotifInvitationModal] = useState(null); // the invitation object

  // Ref for scrolling to highlighted invitation
  const highlightedInvitationRef = useRef(null);
  const highlightedTeamRef = useRef(null);
  const pendingPaginationResettersRef = useRef({
    resetInvitations: () => {},
    resetApplications: () => {},
  });

  // State to track which team should auto-open its applications modal
  const [autoOpenApplicationsTeamId, setAutoOpenApplicationsTeamId] =
    useState(null);

  // Bulk-fetched member badges keyed by team id. null = "still loading" so
  // child cards wait instead of falling back to their own per-card fetch.
  const [teamMemberBadgesById, setTeamMemberBadgesById] = useState(null);

  const teamIdsKey = useMemo(
    () =>
      teams
        .map((t) => t?.id)
        .filter((id) => id != null)
        .join(","),
    [teams],
  );

  useEffect(() => {
    if (!teamIdsKey) {
      setTeamMemberBadgesById({});
      return;
    }

    const ids = teamIdsKey.split(",").map((id) => parseInt(id, 10));
    let cancelled = false;
    setTeamMemberBadgesById(null);

    teamService
      .getMemberBadgesForTeams(ids)
      .then((response) => {
        if (!cancelled) {
          setTeamMemberBadgesById(response?.data || {});
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to fetch bulk team member badges:", err);
          // Surface as empty map so cards stop waiting and just show no badges
          // rather than perpetually loading.
          setTeamMemberBadgesById({});
        }
      });

    return () => {
      cancelled = true;
    };
  }, [teamIdsKey]);

  // Fetch user's teams with pagination
  const fetchUserTeams = useCallback(
    async (page = 1, limit = 10) => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const response = await teamService.getUserTeams(user.id, {
          page,
          limit,
        });

        if (response.success) {
          setTeams(response.data || []);
          setPagination(
            response.pagination || {
              page: 1,
              limit: 10,
              totalTeams: response.data?.length || 0,
              totalPages: 1,
              hasNextPage: false,
              hasPrevPage: false,
            },
          );
        }
      } catch (err) {
        console.error("Error fetching teams:", err);
        setError("Failed to load teams. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [user?.id],
  );

  const handleRequestNotification = useCallback(() => {
    refetchViewerPending();
    // Also refresh the team list so each card's badge counts
    // (pendingApplicationsCount / pendingSentInvitationsCount) stay live
    // without per-card refetches.
    if (user?.id) {
      fetchUserTeams(currentPage, resultsPerPage);
    }
  }, [refetchViewerPending, fetchUserTeams, user?.id, currentPage, resultsPerPage]);

  useSocketEvents(
    user?.id
      ? {
          "notification:new": handleRequestNotification,
          "notification:updated": handleRequestNotification,
          "notification:deleted": handleRequestNotification,
        }
      : null,
    [handleRequestNotification, user?.id],
  );

  // Fetch teams when page or limit changes
  useEffect(() => {
    if (user?.id) {
      fetchUserTeams(currentPage, resultsPerPage);
    }
  }, [currentPage, resultsPerPage, user?.id, fetchUserTeams]);

  // Handle URL params for highlighting and auto-opening modals
  useEffect(() => {
    let openApplicationsTimer;

    // If we need to open applications modal for a specific team
    if (openTeamId && shouldOpenApplications) {
      setAutoOpenApplicationsTeamId(null);
      openApplicationsTimer = setTimeout(() => {
        setAutoOpenApplicationsTeamId(parseInt(openTeamId, 10));
      }, 900);
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

    // Scroll to highlighted member team after a short delay
    if (openTeamId && highlightedTeamRef.current) {
      setTimeout(() => {
        highlightedTeamRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 300);
    }

    // Clear URL params after 5 seconds (so refresh doesn't keep highlighting)
    if (highlightId || highlightApplicationId || highlightInvitationId || openTeamId) {
      const timer = setTimeout(() => {
        setSearchParams({});
      }, 5000);
      return () => {
        clearTimeout(timer);
        if (openApplicationsTimer) {
          clearTimeout(openApplicationsTimer);
        }
      };
    }

    return () => {
      if (openApplicationsTimer) {
        clearTimeout(openApplicationsTimer);
      }
    };
  }, [
    highlightApplicationId,
    highlightId,
    highlightInvitationId,
    openTeamId,
    shouldOpenApplications,
    setSearchParams,
  ]);

  // Auto-open application/invitation modal when navigated via notification
  useEffect(() => {
    if (openApplicationIdParam && !loadingApplications) {
      const found = pendingApplications.find(
        (a) => String(a.id) === openApplicationIdParam,
      );
      if (found) {
        setNotifApplicationModal(found);
        // Clear the param so a refresh doesn't re-open
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete("openApplication");
          return next;
        });
      }
    }
  }, [openApplicationIdParam, pendingApplications, loadingApplications, setSearchParams]);

  useEffect(() => {
    if (openInvitationIdParam && !loadingInvitations) {
      const found = pendingInvitations.find(
        (i) => String(i.id) === openInvitationIdParam,
      );
      if (found) {
        setNotifInvitationModal(found);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete("openInvitation");
          return next;
        });
      }
    }
  }, [openInvitationIdParam, pendingInvitations, loadingInvitations, setSearchParams]);

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
  const handleTeamLeave = () => {
    // Refetch to update pagination correctly
    fetchUserTeams(currentPage, resultsPerPage);
  };

  // Application handlers
  const handleApplicationCancel = async (applicationId) => {
    try {
      await teamService.cancelApplication(applicationId);
      refetchViewerPending();
    } catch (error) {
      console.error("Error canceling application:", error);
    }
  };

  const handleSendReminder = async () => {
    showToast("Reminder feature coming soon!", "violet");
  };

  // Invitation handlers
  const handleInvitationAccept = async (
    invitationId,
    responseMessage = "",
    fillRole = false,
    options = {},
  ) => {
    try {
      await teamService.respondToInvitation(
        invitationId,
        "accept",
        responseMessage,
        fillRole,
        options,
      );

      // Refresh the data
      refetchViewerPending();
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

      // Refresh the data
      refetchViewerPending();
    } catch (error) {
      console.error("Error declining invitation:", error);
    }
  };

  // Handler for when a new team is created
  const handleTeamCreated = () => {
    // Refresh the teams list
    fetchUserTeams(1, resultsPerPage);
    setCurrentPage(1);
  };

  const { sortBy, sortDir, handleSortChange, sortPendingItems, sortMemberTeams } =
    useMyTeamsSort({
      teams,
      onSortChange: () => {
        pendingPaginationResettersRef.current.resetInvitations();
        pendingPaginationResettersRef.current.resetApplications();
      },
    });

  const externalApplications = useMemo(
    () => pendingApplications.filter(
      (app) => !(app.isInternalRoleApplication ?? app.is_internal_role_application)
    ),
    [pendingApplications]
  );

  const internalRoleApplications = useMemo(
    () => pendingApplications.filter(
      (app) => app.isInternalRoleApplication ?? app.is_internal_role_application
    ),
    [pendingApplications]
  );

  const externalInvitations = useMemo(
    () => pendingInvitations.filter(
      (inv) => !(inv.isInternal ?? inv.is_internal)
    ),
    [pendingInvitations]
  );

  const internalRoleInvitations = useMemo(
    () => pendingInvitations.filter(
      (inv) => inv.isInternal ?? inv.is_internal
    ),
    [pendingInvitations]
  );

  const enrichedInvitations = useMemo(() => {
    if (!viewerMatchProfile) return externalInvitations;

    return externalInvitations.map((invitation) => {
      if (!invitation?.team?.tags?.length) return invitation;

      return {
        ...invitation,
        team: enrichTeamMatchData({
          team: invitation.team,
          viewerProfile: viewerMatchProfile,
        }),
      };
    });
  }, [externalInvitations, viewerMatchProfile]);

  const enrichedApplications = useMemo(() => {
    if (!viewerMatchProfile) return externalApplications;

    return externalApplications.map((application) => {
      if (!application?.team?.tags?.length) return application;

      return {
        ...application,
        team: enrichTeamMatchData({
          team: application.team,
          viewerProfile: viewerMatchProfile,
        }),
      };
    });
  }, [externalApplications, viewerMatchProfile]);

  const sortedPendingInvitations = sortPendingItems(
    enrichedInvitations.filter(Boolean),
  );
  const sortedPendingApplications = sortPendingItems(
    enrichedApplications.filter(Boolean),
  );
  const combinedPendingInvitations = sortPendingItems([
    ...enrichedInvitations.filter(Boolean),
    ...internalRoleInvitations.filter(Boolean),
  ]);
  const combinedPendingApplications = sortPendingItems([
    ...enrichedApplications.filter(Boolean),
    ...internalRoleApplications.filter(Boolean),
  ]);
  const sortedTeams = sortMemberTeams(teams.filter(Boolean));
  const invitationsPagination = useClientPagination({
    items: combinedPendingInvitations,
  });
  const applicationsPagination = useClientPagination({
    items: combinedPendingApplications,
  });

  useEffect(() => {
    pendingPaginationResettersRef.current = {
      resetInvitations: () => invitationsPagination.setCurrentPage(1),
      resetApplications: () => applicationsPagination.setCurrentPage(1),
    };
  }, [applicationsPagination.setCurrentPage, invitationsPagination.setCurrentPage]);

  const shouldShowTeamsPagination =
    pagination.totalTeams > DEFAULT_RESULTS_PER_PAGE;
  const formatCountLabel = (
    count,
    singularLabel,
    pluralLabel = `${singularLabel}s`,
  ) => `${count} ${count === 1 ? singularLabel : pluralLabel}`;
  const hasTeamInvitations = sortedPendingInvitations.length > 0;
  const hasRoleInvitations = internalRoleInvitations.length > 0;
  const hasTeamApplications = sortedPendingApplications.length > 0;
  const hasRoleApplications = internalRoleApplications.length > 0;
  const showPendingInvitationsSection =
    hasTeamInvitations || hasRoleInvitations;
  const showPendingApplicationsSection =
    hasTeamApplications || hasRoleApplications;
  const pendingInvitationsSubtitle = [
    hasTeamInvitations
      ? formatCountLabel(sortedPendingInvitations.length, "team invite")
      : null,
    hasRoleInvitations
      ? formatCountLabel(internalRoleInvitations.length, "role invite")
      : null,
  ]
    .filter(Boolean)
    .join(" and ");
  const pendingApplicationsSubtitle = [
    hasTeamApplications
      ? formatCountLabel(sortedPendingApplications.length, "team application")
      : null,
    hasRoleApplications
      ? formatCountLabel(internalRoleApplications.length, "role application")
      : null,
  ]
    .filter(Boolean)
    .join(" and ");

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
        <Alert type="error" message={error} className="w-full shadow-sm" />
      </PageContainer>
    );
  }

  const CreateTeamAction = (
    <div className="flex flex-col gap-2 mt-8">
      <div>
        <Button
          variant="primary"
          icon={<Plus size={16} />}
          onClick={() => setIsCreateTeamModalOpen(true)}
        >
          Create New Team
        </Button>
      </div>
      <Link to="/search?type=teams">
        <Button variant="primary" icon={<SearchIcon size={16} />}>
          Search for Teams
        </Button>
      </Link>
    </div>
  );

  return (
    <PageContainer title="My Teams" action={CreateTeamAction} variant="muted">
      <div className="flex flex-wrap items-center justify-between gap-y-0.5 mb-6">
        <div className="flex flex-wrap items-center gap-1 -ml-2">
          <FilterSortOptionButton
            onClick={() => handleSortChange("name")}
            icon={
              sortDir === "desc" && sortBy === "name"
                ? ArrowUpZA
                : ArrowDownAZ
            }
            label={sortBy === "name" && sortDir === "desc" ? "Z-A" : "A-Z"}
            active={sortBy === "name"}
          />
          <FilterSortOptionButton
            onClick={() => handleSortChange("recent")}
            icon={Clock}
            label={
              sortBy === "recent" && sortDir === "asc"
                ? "Inactive"
                : "Active"
            }
            active={sortBy === "recent"}
          />
          <FilterSortOptionButton
            onClick={() => handleSortChange("newest")}
            icon={Sparkles}
            label={
              sortBy === "newest" && sortDir === "asc" ? "Oldest" : "Newest"
            }
            active={sortBy === "newest"}
          />
        </div>

        <ResultViewToggle
          value={resultView}
          onChange={setResultView}
          align="responsive-start"
          className="-ml-2 sm:ml-0"
        />
      </div>

      {/* Pending Invitations Section */}
      {showPendingInvitationsSection && (
        <Section
          title="My Pending Invitations"
          subtitle={pendingInvitationsSubtitle}
          className="mb-10"
          icon={
            <Mail
              className="h-5 w-5 text-[var(--color-primary-focus)]"
              aria-hidden="true"
            />
          }
          collapsible
        >
          {loadingInvitations ? (
            <div className="flex justify-center py-8">
              <div className="loading loading-spinner loading-md"></div>
            </div>
          ) : (
            <>
              {invitationsPagination.paginatedItems.length > 0 && (
                <>
                  {resultView === "list" ? (
                    <div className="background-opacity bg-opacity-70 shadow-soft rounded-xl divide-y divide-base-200">
                      {invitationsPagination.paginatedItems.map((invitation, index) => (
                        <div
                          key={`${
                            invitation.isInternal ?? invitation.is_internal
                              ? "role-invitation"
                              : "invitation"
                          }-${invitation.id}`}
                          ref={
                            String(invitation.id) === highlightId
                              ? highlightedInvitationRef
                              : null
                          }
                          className={
                            String(invitation.id) === highlightId
                              ? "message-highlight"
                              : ""
                          }
                        >
                          <TeamCard
                            variant={
                              invitation.isInternal ?? invitation.is_internal
                                ? "role_invitation"
                                : "invitation"
                            }
                            invitation={invitation}
                            onAccept={handleInvitationAccept}
                            onDecline={handleInvitationDecline}
                            viewerDistanceSource={viewerDistanceSource}
                            disableListEdgeRounding={true}
                            listClassName={`${index === 0 ? "rounded-t-xl" : ""} ${
                              index ===
                              invitationsPagination.paginatedItems.length - 1
                                ? "rounded-b-xl"
                                : ""
                            }`}
                            listLocationWidthClassName={MY_TEAMS_LIST_LOCATION_WIDTH_CLASSNAME}
                            listLocationInsetClassName={MY_TEAMS_LIST_LOCATION_INSET_CLASSNAME}
                            listLocationVisibilityClassName={MY_TEAMS_LIST_LOCATION_VISIBILITY_CLASSNAME}
                            listTagsWidthClassName={MY_TEAMS_LIST_TAGS_WIDTH_CLASSNAME}
                            listBadgesWidthClassName={MY_TEAMS_LIST_BADGES_WIDTH_CLASSNAME}
                            listLocationShortBreakpoint="md"
                            viewMode="list"
                            activeFilters={{}}
                            showMatchScore={true}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Grid
                      cols={1}
                      md={2}
                      lg={3}
                      gap={resultView === "card" ? 6 : 4}
                    >
                      {invitationsPagination.paginatedItems.map((invitation) => (
                        <div
                          key={`${
                            invitation.isInternal ?? invitation.is_internal
                              ? "role-invitation"
                              : "invitation"
                          }-${invitation.id}`}
                          ref={
                            String(invitation.id) === highlightId
                              ? highlightedInvitationRef
                              : null
                          }
                          className={
                            String(invitation.id) === highlightId
                              ? "message-highlight rounded-xl"
                              : "contents"
                          }
                        >
                          <TeamCard
                            variant={
                              invitation.isInternal ?? invitation.is_internal
                                ? "role_invitation"
                                : "invitation"
                            }
                            invitation={invitation}
                            onAccept={handleInvitationAccept}
                            onDecline={handleInvitationDecline}
                            viewerDistanceSource={viewerDistanceSource}
                            viewMode={resultView}
                            activeFilters={{}}
                            showMatchScore={true}
                          />
                        </div>
                      ))}
                    </Grid>
                  )}
                  {invitationsPagination.shouldShowPagination && (
                    <Pagination
                      currentPage={invitationsPagination.clampedPage}
                      totalPages={invitationsPagination.totalPages}
                      totalItems={combinedPendingInvitations.length}
                      onPageChange={invitationsPagination.handlePageChange}
                      resultsPerPage={invitationsPagination.perPage}
                      onResultsPerPageChange={invitationsPagination.handlePerPageChange}
                      resultsPerPageOptions={RESULTS_PER_PAGE_OPTIONS}
                    />
                  )}
                </>
              )}
            </>
          )}
        </Section>
      )}

      {/* Pending Applications Section */}
      {showPendingApplicationsSection && (
        <Section
          title="My Pending Applications"
          subtitle={pendingApplicationsSubtitle}
          className="mb-10"
          icon={
            <SendHorizontal
              className="h-5 w-5 text-[var(--color-primary-focus)]"
              aria-hidden="true"
            />
          }
          collapsible
        >
          {loadingApplications ? (
            <div className="flex justify-center py-8">
              <div className="loading loading-spinner loading-md"></div>
            </div>
          ) : (
            <>
              {applicationsPagination.paginatedItems.length > 0 && (
                <>
                  {resultView === "list" ? (
                    <div className="background-opacity bg-opacity-70 shadow-soft rounded-xl divide-y divide-base-200">
                      {applicationsPagination.paginatedItems.map((application) => (
                        <TeamCard
                          key={`${
                            application.isInternalRoleApplication ??
                            application.is_internal_role_application
                              ? "role-application"
                              : "application"
                          }-${application.id}`}
                          variant={
                            application.isInternalRoleApplication ??
                            application.is_internal_role_application
                              ? "role_application"
                              : "application"
                          }
                          application={application}
                          onCancel={handleApplicationCancel}
                          onSendReminder={handleSendReminder}
                          viewerDistanceSource={viewerDistanceSource}
                          listLocationWidthClassName={MY_TEAMS_LIST_LOCATION_WIDTH_CLASSNAME}
                          listLocationInsetClassName={MY_TEAMS_LIST_LOCATION_INSET_CLASSNAME}
                          listLocationVisibilityClassName={MY_TEAMS_LIST_LOCATION_VISIBILITY_CLASSNAME}
                          listTagsWidthClassName={MY_TEAMS_LIST_TAGS_WIDTH_CLASSNAME}
                          listBadgesWidthClassName={MY_TEAMS_LIST_BADGES_WIDTH_CLASSNAME}
                          listLocationShortBreakpoint="md"
                          viewMode="list"
                          activeFilters={{}}
                          showMatchScore={true}
                        />
                      ))}
                    </div>
                  ) : (
                    <Grid
                      cols={1}
                      md={2}
                      lg={3}
                      gap={resultView === "card" ? 6 : 4}
                    >
                      {applicationsPagination.paginatedItems.map((application) => (
                        <TeamCard
                          key={`${
                            application.isInternalRoleApplication ??
                            application.is_internal_role_application
                              ? "role-application"
                              : "application"
                          }-${application.id}`}
                          variant={
                            application.isInternalRoleApplication ??
                            application.is_internal_role_application
                              ? "role_application"
                              : "application"
                          }
                          application={application}
                          onCancel={handleApplicationCancel}
                          onSendReminder={handleSendReminder}
                          viewerDistanceSource={viewerDistanceSource}
                          viewMode={resultView}
                          activeFilters={{}}
                          showMatchScore={true}
                        />
                      ))}
                    </Grid>
                  )}
                  {applicationsPagination.shouldShowPagination && (
                    <Pagination
                      currentPage={applicationsPagination.clampedPage}
                      totalPages={applicationsPagination.totalPages}
                      totalItems={combinedPendingApplications.length}
                      onPageChange={applicationsPagination.handlePageChange}
                      resultsPerPage={applicationsPagination.perPage}
                      onResultsPerPageChange={applicationsPagination.handlePerPageChange}
                      resultsPerPageOptions={RESULTS_PER_PAGE_OPTIONS}
                    />
                  )}
                </>
              )}
            </>
          )}
        </Section>
      )}

      {/* My Teams Section */}
      <Section
        id="my-teams-section"
        title="Teams You're A Part Of"
        subtitle={`${pagination.totalTeams} ${pagination.totalTeams === 1 ? 'Team' : 'Teams'} you've created or joined as a member`}
        icon={
          <Users
            className="h-5 w-5 text-[var(--color-primary-focus)]"
            aria-hidden="true"
          />
        }
        subtitleAction={
          <button
            type="button"
            onClick={() => handleSortChange("requests")}
            className={`flex items-center gap-1 pr-1 text-xs rounded transition-colors shrink-0 ${
              sortBy === "requests"
                ? "text-[var(--color-primary)] font-bold"
                : "text-[var(--color-primary-focus)]/70 hover:text-[var(--color-primary-focus)] hover:font-medium"
            }`}
          >
            <Inbox className="w-3.5 h-3.5 shrink-0" />
            {sortBy === "requests"
              ? sortDir === "asc"
                ? "Sorted by least requests"
                : "Sorted by most requests"
              : "Sort by most requests"}
          </button>
        }
        collapsible
      >
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="loading loading-spinner loading-md"></div>
          </div>
        ) : sortedTeams.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-base-content/70 mb-4">
              You haven't joined any teams yet.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                variant="primary"
                onClick={() => setIsCreateTeamModalOpen(true)}
              >
                Create Your First Team
              </Button>
              <Link to="/search?type=teams">
                <Button variant="primary" icon={<SearchIcon size={16} />}>
                  Find Teams
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {resultView === "list" ? (
              <div className="background-opacity bg-opacity-70 shadow-soft rounded-xl divide-y divide-base-200">
                {sortedTeams.map((team, index) => (
                  <div
                    key={team.id}
                    ref={
                      String(team.id) === openTeamId ? highlightedTeamRef : null
                    }
                    className={
                      String(team.id) === openTeamId ? "message-highlight" : ""
                    }
                  >
                    <TeamCard
                      variant="member"
                      team={{
                        ...team,
                        is_public:
                          team.is_public === true || team.isPublic === true,
                      }}
                      teamMemberBadges={
                        teamMemberBadgesById === null
                          ? null
                          : teamMemberBadgesById[team.id] || []
                      }
                      onUpdate={handleTeamUpdate}
                      onDelete={handleTeamDelete}
                      onLeave={handleTeamLeave}
                      viewerDistanceSource={viewerDistanceSource}
                      hideDistanceInfo={true}
                      hideMemberRoleIcon={true}
                      disableListEdgeRounding={true}
                      listClassName={`${index === 0 ? "rounded-t-xl" : ""} ${
                        index === sortedTeams.length - 1 ? "rounded-b-xl" : ""
                      }`}
                      listLocationWidthClassName={MY_TEAMS_LIST_LOCATION_WIDTH_CLASSNAME}
                      listLocationInsetClassName={MY_TEAMS_LIST_LOCATION_INSET_CLASSNAME}
                      listLocationVisibilityClassName={MY_TEAMS_LIST_LOCATION_VISIBILITY_CLASSNAME}
                      listTagsWidthClassName={MY_TEAMS_LIST_TAGS_WIDTH_CLASSNAME}
                      listBadgesWidthClassName={MY_TEAMS_LIST_BADGES_WIDTH_CLASSNAME}
                      listLocationShortBreakpoint="md"
                      autoOpenApplications={
                        team.id === autoOpenApplicationsTeamId
                      }
                      highlightApplicantId={
                        team.id === autoOpenApplicationsTeamId
                          ? highlightApplicantId
                          : null
                      }
                      highlightApplicationId={
                        team.id === autoOpenApplicationsTeamId
                          ? highlightApplicationId
                          : null
                      }
                      highlightInvitationId={highlightInvitationId}
                      onApplicationsModalClosed={() =>
                        setAutoOpenApplicationsTeamId(null)
                      }
                      viewMode="list"
                      activeFilters={{}}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Grid cols={1} md={2} lg={3} gap={resultView === "card" ? 6 : 4}>
                {sortedTeams.map((team) => (
                  <div
                    key={team.id}
                    ref={
                      String(team.id) === openTeamId ? highlightedTeamRef : null
                    }
                    className={
                      String(team.id) === openTeamId
                        ? "message-highlight rounded-xl"
                        : "contents"
                    }
                  >
                    <TeamCard
                      variant="member"
                      team={{
                        ...team,
                        is_public:
                          team.is_public === true || team.isPublic === true,
                      }}
                      teamMemberBadges={
                        teamMemberBadgesById === null
                          ? null
                          : teamMemberBadgesById[team.id] || []
                      }
                      onUpdate={handleTeamUpdate}
                      onDelete={handleTeamDelete}
                      onLeave={handleTeamLeave}
                      viewerDistanceSource={viewerDistanceSource}
                      hideDistanceInfo={true}
                      hideMemberRoleIcon={true}
                      autoOpenApplications={
                        team.id === autoOpenApplicationsTeamId
                      }
                      highlightApplicantId={
                        team.id === autoOpenApplicationsTeamId
                          ? highlightApplicantId
                          : null
                      }
                      highlightApplicationId={
                        team.id === autoOpenApplicationsTeamId
                          ? highlightApplicationId
                          : null
                      }
                      highlightInvitationId={highlightInvitationId}
                      onApplicationsModalClosed={() =>
                        setAutoOpenApplicationsTeamId(null)
                      }
                      viewMode={resultView}
                      activeFilters={{}}
                    />
                  </div>
                ))}
              </Grid>
            )}

            {/* Pagination for My Teams */}
            {shouldShowTeamsPagination && (
              <Pagination
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalTeams}
                onPageChange={handlePageChange}
                resultsPerPage={resultsPerPage}
                onResultsPerPageChange={handleResultsPerPageChange}
                resultsPerPageOptions={RESULTS_PER_PAGE_OPTIONS}
              />
            )}
          </>
        )}
      </Section>

      {/* Create Team Modal */}
      <CreateTeamModal
        isOpen={isCreateTeamModalOpen}
        onClose={() => setIsCreateTeamModalOpen(false)}
        onTeamCreated={handleTeamCreated}
      />

      {/* Notification click-through: application details modal */}
      {notifApplicationModal && (
        <TeamApplicationDetailsModal
          isOpen={true}
          application={notifApplicationModal}
          onClose={() => setNotifApplicationModal(null)}
          onCancel={async (applicationId) => {
            await handleApplicationCancel(applicationId);
            setNotifApplicationModal(null);
          }}
          onSendReminder={handleSendReminder}
          notificationHighlight={true}
        />
      )}

      {/* Notification click-through: invitation details modal */}
      {notifInvitationModal && (
        <TeamInvitationDetailsModal
          isOpen={true}
          invitation={notifInvitationModal}
          onClose={() => setNotifInvitationModal(null)}
          onAccept={async (invitationId, responseMessage, fillRole, options) => {
            await handleInvitationAccept(invitationId, responseMessage, fillRole, options);
            setNotifInvitationModal(null);
          }}
          onDecline={async (invitationId, responseMessage) => {
            await handleInvitationDecline(invitationId, responseMessage);
            setNotifInvitationModal(null);
          }}
          notificationHighlight={true}
        />
      )}

    </PageContainer>
  );
};

export default MyTeams;
