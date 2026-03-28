import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageContainer from "../components/layout/PageContainer";
import Grid from "../components/layout/Grid";
import Button from "../components/common/Button";
import TeamCard from "../components/teams/TeamCard";
import Section from "../components/layout/Section";
import Pagination from "../components/common/Pagination";
import { teamService } from "../services/teamService";
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
import Alert from "../components/common/Alert";
import CreateTeamModal from "../components/teams/CreateTeamModal";
import { enrichTeamMatchData } from "../utils/teamMatchUtils";
import useViewerMatchProfile from "../hooks/useViewerMatchProfile";

import {
  RESULTS_PER_PAGE_OPTIONS,
  DEFAULT_RESULTS_PER_PAGE,
} from "../constants/pagination";

const parseSortableTimestamp = (value) => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

const getFirstValidTimestamp = (sources, keys) => {
  for (const source of sources) {
    if (!source) continue;
    for (const key of keys) {
      const timestamp = parseSortableTimestamp(source[key]);
      if (timestamp !== null) return timestamp;
    }
  }
  return 0;
};

const getComparableName = (item) => {
  const isRolePendingItem =
    item?.role &&
    (item?.isInternal ??
      item?.is_internal ??
      item?.isInternalRoleApplication ??
      item?.is_internal_role_application);
  const displayTarget = isRolePendingItem
    ? {
        ...item.role,
        name:
          item.role?.roleName ??
          item.role?.role_name ??
          item.role?.name ??
          item?.team?.name ??
          "",
      }
    : (item?.team || item);

  return (displayTarget?.name || "").trim().toLowerCase();
};

const getActivityTimestamp = (item) => {
  const isRolePendingItem =
    item?.role &&
    (item?.isInternal ??
      item?.is_internal ??
      item?.isInternalRoleApplication ??
      item?.is_internal_role_application);
  const team = isRolePendingItem
    ? {
        ...item.role,
        name:
          item.role?.roleName ??
          item.role?.role_name ??
          item.role?.name ??
          item?.team?.name ??
          "",
      }
    : (item?.team || item);

  return getFirstValidTimestamp(
    [team, item?.team, item],
    [
      "last_active_at",
      "lastActiveAt",
      "last_active",
      "lastActive",
      "updated_at",
      "updatedAt",
      "created_at",
      "createdAt",
    ],
  );
};

const getRequestTimestamp = (item) => {
  return getFirstValidTimestamp(
    [item],
    [
      "received_at",
      "receivedAt",
      "sent_at",
      "sentAt",
      "applied_at",
      "appliedAt",
      "created_at",
      "createdAt",
      "date",
    ],
  );
};

const MY_TEAMS_LIST_LOCATION_WIDTH_CLASSNAME = "sm:w-40";
const MY_TEAMS_LIST_LOCATION_INSET_CLASSNAME = "sm:pl-[24px]";
const MY_TEAMS_LIST_TAGS_WIDTH_CLASSNAME = "sm:w-36";
const MY_TEAMS_LIST_BADGES_WIDTH_CLASSNAME = "sm:w-32";

const MyTeams = () => {
  const [teams, setTeams] = useState([]);
  const [pendingApplications, setPendingApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const { viewerMatchProfile, viewerDistanceSource } = useViewerMatchProfile({
    userId: user?.id,
  });

  // ===== VIEW MODE STATE =====
  const [resultView, setResultView] = useState("list");

  // ===== SORT STATE =====
  const [sortBy, setSortBy] = useState("newest");
  const [sortDir, setSortDir] = useState("desc");
  const [teamNotificationMetrics, setTeamNotificationMetrics] = useState({});

  // ===== CREATE TEAM MODAL STATE =====
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);


  // ===== PAGINATION STATE =====
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage, setResultsPerPage] = useState(DEFAULT_RESULTS_PER_PAGE);
  const [invitationsPage, setInvitationsPage] = useState(1);
  const [invitationsPerPage, setInvitationsPerPage] = useState(DEFAULT_RESULTS_PER_PAGE);
  const [applicationsPage, setApplicationsPage] = useState(1);
  const [applicationsPerPage, setApplicationsPerPage] = useState(DEFAULT_RESULTS_PER_PAGE);
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
  const highlightedTeamRef = useRef(null);

  // State to track which team should auto-open its applications modal
  const [autoOpenApplicationsTeamId, setAutoOpenApplicationsTeamId] =
    useState(null);

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

  // Fetch pending applications
  const fetchPendingApplications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoadingApplications(true);
      const response = await teamService.getUserPendingApplications();

      if (response.success) {
        setPendingApplications(response.data || []);
      }
    } catch (err) {
      console.error("Error fetching pending applications:", err);
    } finally {
      setLoadingApplications(false);
    }
  }, [user?.id]);

  // Fetch pending invitations
  const fetchPendingInvitations = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoadingInvitations(true);
      const response = await teamService.getUserPendingInvitations();

      if (response.success) {
        setPendingInvitations(response.data || []);
      }
    } catch (err) {
      console.error("Error fetching pending invitations:", err);
    } finally {
      setLoadingInvitations(false);
    }
  }, [user?.id]);

  // Initial data fetch
  useEffect(() => {
    fetchPendingApplications();
    fetchPendingInvitations();
  }, [fetchPendingApplications, fetchPendingInvitations]);

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
    if (highlightId || openTeamId) {
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
    alert("Reminder feature coming soon!");
  };

  // Invitation handlers
  const handleInvitationAccept = async (invitationId, responseMessage = "", fillRole = false) => {
    try {
      await teamService.respondToInvitation(
        invitationId,
        "accept",
        responseMessage,
        fillRole,
      );

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

      // Refresh the data
      fetchPendingInvitations();
    } catch (error) {
      console.error("Error declining invitation:", error);
    }
  };

  // Handler for when a new team is created
  const handleTeamCreated = (newTeam) => {
    // Refresh the teams list
    fetchUserTeams(1, resultsPerPage);
    setCurrentPage(1);
  };

  const handleSortChange = (nextSortBy) => {
    setInvitationsPage(1);
    setApplicationsPage(1);

    if (nextSortBy === sortBy) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(nextSortBy);

    switch (nextSortBy) {
      case "recent":
      case "newest":
      case "requests":
        setSortDir("desc");
        break;
      case "name":
      default:
        setSortDir("asc");
        break;
    }
  };

  useEffect(() => {
    if (!["newest", "requests"].includes(sortBy) || teams.length === 0) {
      return;
    }

    let isCancelled = false;

    const fetchTeamNotificationTimestamps = async () => {
      const entries = await Promise.all(
        teams.filter(Boolean).map(async (team) => {
          if (!team?.id) return null;

          const [applicationsResponse, invitationsResponse] = await Promise.all(
            [
              teamService
                .getTeamApplications(team.id, { skipAuthRedirect: true })
                .catch(() => ({ data: [] })),
              teamService
                .getTeamSentInvitations(team.id, { skipAuthRedirect: true })
                .catch(() => ({ data: [] })),
            ],
          );

          const applications = applicationsResponse?.data || [];
          const invitations = invitationsResponse?.data || [];

          const latestApplicationTimestamp = applications.reduce(
            (max, application) =>
              Math.max(max, getRequestTimestamp(application)),
            0,
          );
          const latestInvitationTimestamp = invitations.reduce(
            (max, invitation) => Math.max(max, getRequestTimestamp(invitation)),
            0,
          );
          const totalRequestCount = applications.length + invitations.length;

          return [
            team.id,
            {
              latestTimestamp:
                Math.max(
                  latestApplicationTimestamp,
                  latestInvitationTimestamp,
                ) || null,
              totalRequestCount,
            },
          ];
        }),
      );

      if (isCancelled) return;

      setTeamNotificationMetrics((prev) => ({
        ...prev,
        ...Object.fromEntries(entries.filter(Boolean)),
      }));
    };

    fetchTeamNotificationTimestamps();

    return () => {
      isCancelled = true;
    };
  }, [sortBy, teams]);

  const sortPendingItems = (items) => {
    if (sortBy === "requests") {
      return [...items];
    }

    return [...items].sort((a, b) => {
      if (sortBy === "name") {
        const direction = sortDir === "desc" ? -1 : 1;
        return (
          getComparableName(a).localeCompare(getComparableName(b)) * direction
        );
      }

      if (sortBy === "recent") {
        const diff =
          sortDir === "desc"
            ? getActivityTimestamp(b) - getActivityTimestamp(a)
            : getActivityTimestamp(a) - getActivityTimestamp(b);
        if (diff !== 0) return diff;
      } else if (sortBy === "newest") {
        const diff =
          sortDir === "desc"
            ? getRequestTimestamp(b) - getRequestTimestamp(a)
            : getRequestTimestamp(a) - getRequestTimestamp(b);
        if (diff !== 0) return diff;
      }

      return getComparableName(a).localeCompare(getComparableName(b));
    });
  };

  const sortMemberTeams = (items) => {
    return [...items].sort((a, b) => {
      if (sortBy === "name") {
        const direction = sortDir === "desc" ? -1 : 1;
        return (
          getComparableName(a).localeCompare(getComparableName(b)) * direction
        );
      }

      if (sortBy === "recent") {
        const diff =
          sortDir === "desc"
            ? getActivityTimestamp(b) - getActivityTimestamp(a)
            : getActivityTimestamp(a) - getActivityTimestamp(b);
        if (diff !== 0) return diff;
      } else if (sortBy === "newest") {
        const timestampA =
          teamNotificationMetrics[a.id]?.latestTimestamp ?? null;
        const timestampB =
          teamNotificationMetrics[b.id]?.latestTimestamp ?? null;

        if (timestampA !== null || timestampB !== null) {
          if (timestampA === null) return 1;
          if (timestampB === null) return -1;

          const diff =
            sortDir === "desc"
              ? timestampB - timestampA
              : timestampA - timestampB;
          if (diff !== 0) return diff;
        }
      } else if (sortBy === "requests") {
        const countA = teamNotificationMetrics[a.id]?.totalRequestCount ?? 0;
        const countB = teamNotificationMetrics[b.id]?.totalRequestCount ?? 0;
        const diff = sortDir === "desc" ? countB - countA : countA - countB;
        if (diff !== 0) return diff;
      }

      return getComparableName(a).localeCompare(getComparableName(b));
    });
  };

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

  const invitationsTotalPages = Math.max(
    1,
    Math.ceil(combinedPendingInvitations.length / invitationsPerPage),
  );
  const clampedInvitationsPage = Math.min(invitationsPage, invitationsTotalPages);
  const paginatedInvitations = combinedPendingInvitations.slice(
    (clampedInvitationsPage - 1) * invitationsPerPage,
    clampedInvitationsPage * invitationsPerPage,
  );

  const applicationsTotalPages = Math.max(
    1,
    Math.ceil(combinedPendingApplications.length / applicationsPerPage),
  );
  const clampedApplicationsPage = Math.min(applicationsPage, applicationsTotalPages);
  const paginatedApplications = combinedPendingApplications.slice(
    (clampedApplicationsPage - 1) * applicationsPerPage,
    clampedApplicationsPage * applicationsPerPage,
  );
  const shouldShowInvitationsPagination =
    combinedPendingInvitations.length > DEFAULT_RESULTS_PER_PAGE;
  const shouldShowApplicationsPagination =
    combinedPendingApplications.length > DEFAULT_RESULTS_PER_PAGE;
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
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
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
      <div className="flex flex-wrap items-center justify-between gap-y-2 mb-6">
        <div className="flex flex-wrap items-center gap-1 -ml-2">
          <button
            type="button"
            onClick={() => handleSortChange("name")}
            className={`flex items-center gap-1 px-1 text-xs rounded transition-colors shrink-0 ${
              sortBy === "name"
                ? "text-[var(--color-primary)] font-bold"
                : "text-[var(--color-primary-focus)]/70 hover:text-[var(--color-primary-focus)] hover:font-medium"
            }`}
          >
            {sortDir === "desc" && sortBy === "name" ? (
              <ArrowUpZA className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <ArrowDownAZ className="w-3.5 h-3.5 shrink-0" />
            )}
            {sortBy === "name" && sortDir === "desc" ? "Z-A" : "A-Z"}
          </button>
          <button
            type="button"
            onClick={() => handleSortChange("recent")}
            className={`flex items-center gap-1 px-1 text-xs rounded transition-colors shrink-0 ${
              sortBy === "recent"
                ? "text-[var(--color-primary)] font-bold"
                : "text-[var(--color-primary-focus)]/70 hover:text-[var(--color-primary-focus)] hover:font-medium"
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            {sortBy === "recent" && sortDir === "asc" ? "Inactive" : "Active"}
          </button>
          <button
            type="button"
            onClick={() => handleSortChange("newest")}
            className={`flex items-center gap-1 px-1 text-xs rounded transition-colors shrink-0 ${
              sortBy === "newest"
                ? "text-[var(--color-primary)] font-bold"
                : "text-[var(--color-primary-focus)]/70 hover:text-[var(--color-primary-focus)] hover:font-medium"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            {sortBy === "newest" && sortDir === "asc" ? "Oldest" : "Newest"}
          </button>
        </div>

        <div className="flex items-center text-sm font-normal text-base-content/60 gap-1 -ml-2">
          <button
            type="button"
            onClick={() => setResultView("card")}
            className={`px-2 py-1 rounded hover:text-base-content transition-colors ${
              resultView === "card" ? "font-bold text-base-content" : ""
            }`}
          >
            Card
          </button>
          <span className="text-base-content/30">|</span>
          <button
            type="button"
            onClick={() => setResultView("mini")}
            className={`px-2 py-1 rounded hover:text-base-content transition-colors ${
              resultView === "mini" ? "font-bold text-base-content" : ""
            }`}
          >
            Mini Card
          </button>
          <span className="text-base-content/30">|</span>
          <button
            type="button"
            onClick={() => setResultView("list")}
            className={`px-2 py-1 rounded hover:text-base-content transition-colors ${
              resultView === "list" ? "font-bold text-base-content" : ""
            }`}
          >
            List
          </button>
        </div>
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
              {paginatedInvitations.length > 0 && (
                <>
                  {resultView === "list" ? (
                    <div className="background-opacity bg-opacity-70 shadow-soft rounded-xl divide-y divide-base-200">
                      {paginatedInvitations.map((invitation, index) => (
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
                            hideDistanceInfo={true}
                            disableListEdgeRounding={true}
                            listClassName={`${index === 0 ? "rounded-t-xl" : ""} ${
                              index === paginatedInvitations.length - 1
                                ? "rounded-b-xl"
                                : ""
                            }`}
                            listLocationWidthClassName={MY_TEAMS_LIST_LOCATION_WIDTH_CLASSNAME}
                            listLocationInsetClassName={MY_TEAMS_LIST_LOCATION_INSET_CLASSNAME}
                            listTagsWidthClassName={MY_TEAMS_LIST_TAGS_WIDTH_CLASSNAME}
                            listBadgesWidthClassName={MY_TEAMS_LIST_BADGES_WIDTH_CLASSNAME}
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
                      {paginatedInvitations.map((invitation) => (
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
                            hideDistanceInfo={true}
                            viewMode={resultView}
                            activeFilters={{}}
                            showMatchScore={true}
                          />
                        </div>
                      ))}
                    </Grid>
                  )}
                  {shouldShowInvitationsPagination && (
                    <Pagination
                      currentPage={clampedInvitationsPage}
                      totalPages={invitationsTotalPages}
                      totalItems={combinedPendingInvitations.length}
                      onPageChange={setInvitationsPage}
                      resultsPerPage={invitationsPerPage}
                      onResultsPerPageChange={(newLimit) => {
                        setInvitationsPerPage(newLimit);
                        setInvitationsPage(1);
                      }}
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
              {paginatedApplications.length > 0 && (
                <>
                  {resultView === "list" ? (
                    <div className="background-opacity bg-opacity-70 shadow-soft rounded-xl divide-y divide-base-200">
                      {paginatedApplications.map((application) => (
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
                          hideDistanceInfo={true}
                          listLocationWidthClassName={MY_TEAMS_LIST_LOCATION_WIDTH_CLASSNAME}
                          listLocationInsetClassName={MY_TEAMS_LIST_LOCATION_INSET_CLASSNAME}
                          listTagsWidthClassName={MY_TEAMS_LIST_TAGS_WIDTH_CLASSNAME}
                          listBadgesWidthClassName={MY_TEAMS_LIST_BADGES_WIDTH_CLASSNAME}
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
                      {paginatedApplications.map((application) => (
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
                          hideDistanceInfo={true}
                          viewMode={resultView}
                          activeFilters={{}}
                          showMatchScore={true}
                        />
                      ))}
                    </Grid>
                  )}
                  {shouldShowApplicationsPagination && (
                    <Pagination
                      currentPage={clampedApplicationsPage}
                      totalPages={applicationsTotalPages}
                      totalItems={combinedPendingApplications.length}
                      onPageChange={setApplicationsPage}
                      resultsPerPage={applicationsPerPage}
                      onResultsPerPageChange={(newLimit) => {
                        setApplicationsPerPage(newLimit);
                        setApplicationsPage(1);
                      }}
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
            className={`flex items-center gap-1 px-1 text-xs rounded transition-colors shrink-0 ${
              sortBy === "requests"
                ? "text-[var(--color-primary)] font-bold"
                : "text-[var(--color-primary-focus)]/70 hover:text-[var(--color-primary-focus)] hover:font-medium"
            }`}
          >
            <Inbox className="w-3.5 h-3.5 shrink-0" />
            {sortBy === "requests" && sortDir === "asc"
              ? "Least Requests"
              : "Most Requests"}
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
            <Button
              variant="primary"
              onClick={() => setIsCreateTeamModalOpen(true)}
            >
              Create Your First Team
            </Button>
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
                      listTagsWidthClassName={MY_TEAMS_LIST_TAGS_WIDTH_CLASSNAME}
                      listBadgesWidthClassName={MY_TEAMS_LIST_BADGES_WIDTH_CLASSNAME}
                      autoOpenApplications={
                        team.id === autoOpenApplicationsTeamId
                      }
                      highlightApplicantId={
                        team.id === autoOpenApplicationsTeamId
                          ? highlightId
                          : null
                      }
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
                          ? highlightId
                          : null
                      }
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


    </PageContainer>
  );
};

export default MyTeams;
