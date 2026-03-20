import React, { useState, useEffect, useCallback } from "react";
import Card from "../common/Card";
import Button from "../common/Button";
import Tooltip from "../common/Tooltip";
import {
  Users,
  UserSearch,
  EyeClosed,
  EyeIcon,
  Tag,
  Award,
  User,
  Crown,
  ShieldCheck,
  SendHorizontal,
  Mail,
  Globe,
  MapPin,
  Ruler,
} from "lucide-react";
import TeamDetailsModal from "./TeamDetailsModal";
import UserDetailsModal from "../users/UserDetailsModal";
import TeamApplicationDetailsModal from "./TeamApplicationDetailsModal";
import TeamInvitesModal from "./TeamInvitesModal";
import TeamInvitationDetailsModal from "./TeamInvitationDetailsModal";
import { SentByLink } from "../users/InlineUserLink";
import { teamService } from "../../services/teamService";
import { useAuth } from "../../contexts/AuthContext";
import Alert from "../common/Alert";
import NotificationBadge from "../common/NotificationBadge";
import TeamApplicationsModal from "./TeamApplicationsModal";
// import { getUserInitials, getDisplayName } from "../../utils/userHelpers";
import { format } from "date-fns";
import LocationDistanceTagsRow from "../common/LocationDistanceTagsRow";
import { getMatchTier } from "../../utils/matchScoreUtils";

/**
 * Unified TeamCard Component
 *
 * Handles three variants:
 * - "member" (default): Teams you're part of
 * - "application": Your pending applications to join teams
 * - "invitation": Invitations you've received from teams
 *
 * @param {Object} props
 * @param {Object} props.team - Team data (for member variant)
 * @param {Object} props.application - Application data (for application variant)
 * @param {Object} props.invitation - Invitation data (for invitation variant)
 * @param {string} props.variant - "member" | "application" | "invitation"
 * @param {Function} props.onUpdate - Callback when team is updated
 * @param {Function} props.onDelete - Callback when team is deleted
 * @param {Function} props.onLeave - Callback when user leaves a team
 * @param {Function} props.onCancel - Callback to cancel application
 * @param {Function} props.onSendReminder - Callback to send reminder for application
 * @param {Function} props.onAccept - Callback to accept invitation
 * @param {Function} props.onDecline - Callback to decline invitation
 * @param {boolean} props.isSearchResult - Whether this card is shown in search results
 */
const TeamCard = ({
  // Data props - use the appropriate one based on variant
  team,
  application,
  invitation,

  // Variant control
  variant = "member", // "member" | "application" | "invitation"

  // Legacy prop support (maps to variant="application")
  isPendingApplication = false,

  // Common handlers
  onUpdate,
  onDelete,
  onLeave,
  isSearchResult = false,

  // Application-specific handlers
  onCancel,
  onCancelApplication, // Legacy prop name
  onSendReminder,

  // Invitation-specific handlers
  onAccept,
  onDecline,

  showMatchHighlights = false,
  showMatchScore = false,
  roleMatchBadgeNames = null,

  // View mode
  viewMode = "card",
  activeFilters = {},

  // Loading state
  loading = false,

  autoOpenApplications = false,
  highlightApplicantId = null,
  onApplicationsModalClosed,
}) => {
  // Determine effective variant (support legacy isPendingApplication prop)
  const effectiveVariant = isPendingApplication ? "application" : variant;

  // Normalize data based on variant
  const getNormalizedData = () => {
    if (effectiveVariant === "invitation" && invitation) {
      return {
        team: invitation.team || {},
        id: invitation.id,
        message: invitation.message,
        date: invitation.created_at || invitation.createdAt,
        inviter: invitation.inviter,
      };
    }
    if (effectiveVariant === "application" && application) {
      return {
        team: application.team || {},
        id: application.id,
        message: application.message,
        date: application.created_at || application.createdAt,
      };
    }
    // For legacy application support via team prop with application data
    if (effectiveVariant === "application" && team) {
      return {
        team: team,
        id: team.applicationId,
        message: team.applicationMessage,
        date: team.applicationDate || team.created_at || team.createdAt,
      };
    }
    // Default: member variant
    return {
      team: team || {},
      id: null,
      message: null,
      date: null,
    };
  };

  const normalizedData = getNormalizedData();

  // ========= ALL HOOKS (useState, useAuth, useCallback, useEffect) =========

  // State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [teamData, setTeamData] = useState(normalizedData.team);
  const { user, isAuthenticated } = useAuth();
  const [pendingApplications, setPendingApplications] = useState([]);
  const [isApplicationsModalOpen, setIsApplicationsModalOpen] = useState(false);
  const [pendingSentInvitations, setPendingSentInvitations] = useState([]);
  const [isInvitesModalOpen, setIsInvitesModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [responses, setResponses] = useState({});
  const [isInvitationDetailsModalOpen, setIsInvitationDetailsModalOpen] =
    useState(false);
  const [pendingInvitationForTeam, setPendingInvitationForTeam] =
    useState(null);
  const [pendingApplicationForTeam, setPendingApplicationForTeam] =
    useState(null);

  // Check if current user is the owner of the team
  const isOwner =
    user && (teamData?.owner_id === user.id || teamData?.ownerId === user.id);

  // Check if user is admin (owner or admin role can manage invitations)
  const isAdmin = userRole === "admin";
  const canManageInvitations = isOwner || isAdmin;

  // Update local team data when props change
  useEffect(() => {
    const incoming = getNormalizedData().team;

    setTeamData((prev) => {
      // If we already have the same team loaded, merge so we don't lose `members`, etc.
      if (prev?.id && incoming?.id && prev.id === incoming.id) {
        return { ...prev, ...incoming };
      }
      return incoming;
    });
  }, [team, application, invitation]);

  //   // Fetch user's role in this team (only for member variant)
  //   useEffect(() => {
  //     const fetchUserRole = async () => {
  //       if (user && teamData?.id && effectiveVariant === "member") {
  //         try {
  //           const response = await teamService.getUserRoleInTeam(
  //             teamData.id,
  //             user.id
  //           );

  // const payload = response?.data;
  // const data = payload?.data ?? payload; // supports {success,data:{...}} and {...}

  // const isMember = data?.isMember ?? payload?.isMember; // supports both shapes
  // const role = data?.role ?? payload?.role ?? null;

  // if (isMember === false) {
  //   setUserRole(null);
  // } else {
  //   setUserRole(role);
  // }

  //         } catch (err) {
  //           console.error("Error fetching user role:", err);
  //           setUserRole(null); // optional: keeps UI clean on errors
  //         }
  //       }
  //     };
  //     fetchUserRole();
  //   }, [user, teamData?.id, effectiveVariant]);

  // Fetch user's role in this team (member cards only)
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.id || !teamData?.id) return;
      if (effectiveVariant !== "member") return;
      if (userRole) return;

      // Owner shortcut (no request needed)
      if (teamData.owner_id === user.id || teamData.ownerId === user.id) {
        setUserRole("owner");
        return;
      }

      try {
        const response = await teamService.getUserRoleInTeam(
          teamData.id,
          user.id,
        );

        const payload = response?.data;
        const data = payload?.data ?? payload; // supports both shapes

        const isMember = data?.isMember ?? payload?.isMember;
        const role = data?.role ?? payload?.role ?? null;

        if (isMember === false) {
          setUserRole(null);
        } else {
          setUserRole(role);
        }
      } catch (err) {
        console.error("Error fetching user role:", err);
        setUserRole(null);
      }
    };

    fetchUserRole();
  }, [
    user?.id,
    teamData?.id,
    teamData?.owner_id,
    teamData?.ownerId,
    effectiveVariant,
  ]);

  // Fetch pending applications (for team owners and admins)
  const fetchPendingApplications = useCallback(async () => {
    if (canManageInvitations && teamData?.id && effectiveVariant === "member") {
      try {
        const response = await teamService.getTeamApplications(teamData.id);
        setPendingApplications(response.data || []);
      } catch (error) {
        console.error("Error fetching applications:", error);
      }
    }
  }, [canManageInvitations, teamData?.id, effectiveVariant]);

  // Fetch sent invitations (for team owners and admins)
  const fetchSentInvitations = useCallback(async () => {
    if (canManageInvitations && teamData?.id && effectiveVariant === "member") {
      try {
        const response = await teamService.getTeamSentInvitations(teamData.id);
        setPendingSentInvitations(response.data || []);
      } catch (error) {
        console.error("Error fetching sent invitations:", error);
        setPendingSentInvitations([]);
      }
    }
  }, [canManageInvitations, teamData?.id, effectiveVariant]);

  useEffect(() => {
    fetchPendingApplications();
  }, [fetchPendingApplications]);

  // Fetch sent invitations
  useEffect(() => {
    fetchSentInvitations();
  }, [fetchSentInvitations]);

  useEffect(() => {
    const fetchCompleteTeamData = async () => {
      if (
        teamData &&
        teamData.id &&
        (effectiveVariant === "member" ||
          effectiveVariant === "invitation" ||
          effectiveVariant === "application")
      ) {
        try {
          // if (
          //   teamData.tags &&
          //   Array.isArray(teamData.tags) &&
          //   teamData.tags.length > 0 &&
          //   teamData.tags.every((tag) => tag.name || typeof tag === "string")
          // ) {
          //   return;
          // }

          const response = await teamService.getTeamById(teamData.id);
          const fullTeam = response?.data?.data ?? response?.data;

          console.log("DEBUG is_public:", {
            teamId: fullTeam?.id,
            teamName: fullTeam?.name,
            is_public_raw: fullTeam?.is_public,
            is_public_type: typeof fullTeam?.is_public,
            is_public_normalized: fullTeam?.is_public === true,
          });

          if (fullTeam) {
            setTeamData((prev) => ({
              ...prev,
              ...fullTeam,
              is_public:
                fullTeam.is_public === true || fullTeam.is_public === "true",
              tags: Array.isArray(fullTeam.tags) ? fullTeam.tags : prev.tags,
            }));

            // Compute role from members list
            if (user?.id && Array.isArray(fullTeam.members)) {
              const me = fullTeam.members.find(
                (m) => (m.user_id ?? m.userId) === user.id,
              );
              setUserRole(me?.role ?? null);
            }
          }
        } catch (error) {
          console.error("Error fetching complete team data:", error);
        }
      }
    };

    fetchCompleteTeamData();
  }, [teamData?.id, effectiveVariant, user?.id]);

  // Check if user has a pending application for this team (for search results)
  useEffect(() => {
    const checkPendingApplication = async () => {
      if (!isSearchResult || !isAuthenticated || !teamData?.id) {
        return;
      }

      try {
        const response = await teamService.getUserPendingApplications();
        const pendingApplications = response.data || [];

        // Find the application for this team (if any)
        const foundApplication = pendingApplications.find(
          (app) => app.team?.id === teamData.id || app.team_id === teamData.id,
        );

        setPendingApplicationForTeam(foundApplication || null);
      } catch (error) {
        console.error("Error checking pending applications:", error);
      }
    };

    checkPendingApplication();
  }, [isSearchResult, isAuthenticated, teamData?.id]);

  // Check if user has a pending invitation for this team (for search results)
  useEffect(() => {
    const checkPendingInvitation = async () => {
      if (!isSearchResult || !isAuthenticated || !teamData?.id) return;

      try {
        // IMPORTANT: use whatever your actual service method is called
        // Common naming pattern (matching getUserPendingApplications):
        const response = await teamService.getUserReceivedInvitations();
        const pendingInvitations = response.data || [];

        const foundInvitation = pendingInvitations.find(
          (inv) => inv.team?.id === teamData.id || inv.team_id === teamData.id,
        );

        setPendingInvitationForTeam(foundInvitation || null);
      } catch (error) {
        console.error("Error checking pending invitations:", error);
        setPendingInvitationForTeam(null);
      }
    };

    checkPendingInvitation();
  }, [isSearchResult, isAuthenticated, teamData?.id]);

  // useEffect(() => {
  //   if (effectiveVariant !== "member") return;

  //   // Owner shortcut (works even if members are missing)
  //   if (user?.id && (teamData?.owner_id === user.id || teamData?.ownerId === user.id)) {
  //     setUserRole("owner");
  //     return;
  //   }

  //   if (!user?.id || !Array.isArray(teamData?.members)) {
  //     setUserRole(null);
  //     return;
  //   }

  //   const me = teamData.members.find(
  //     (m) => m.user_id === user.id || m.userId === user.id
  //   );

  //   setUserRole(me?.role ?? null);
  // }, [effectiveVariant, user?.id, teamData?.owner_id, teamData?.ownerId, teamData?.members]);

  // Auto-open applications modal if triggered from URL params
  useEffect(() => {
    if (autoOpenApplications && effectiveVariant === "member") {
      setIsApplicationsModalOpen(true);
    }
  }, [autoOpenApplications, effectiveVariant]);

  // ================= GUARD CLAUSE – AFTER ALL HOOKS =================

  if (!teamData) {
    return null;
  }

  // ============ Helper Functions ============

  // Get team initials from name (e.g., "Urban Gardeners Berlin" → "UGB")
  const getTeamInitials = () => {
    const name = teamData.name;
    if (!name || typeof name !== "string") return "?";

    const words = name.trim().split(/\s+/);

    if (words.length === 1) {
      // Single word: take first 2 characters
      return name.slice(0, 2).toUpperCase();
    }

    // Multiple words: take first letter of each word (max 3)
    return words
      .slice(0, 3)
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase();
  };

  // Get team image URL (return null for fallback)
  const getTeamImage = () => {
    // Add this debug line
    console.log("Team avatar debug:", {
      name: teamData.name,
      teamavatar_url: teamData.teamavatar_url,
      teamavatarUrl: teamData.teamavatarUrl,
    });

    if (teamData.teamavatar_url) return teamData.teamavatar_url;
    if (teamData.teamavatarUrl) return teamData.teamavatarUrl;
    return null;
  };

  const getTeamId = () => {
    return teamData.id || normalizedData.team?.id;
  };

  const getMemberCount = () => {
    return (
      teamData.current_members_count ??
      teamData.currentMembersCount ??
      teamData.members?.length ??
      0
    );
  };

  const getMaxMembers = () => {
    const maxMembers = teamData.max_members ?? teamData.maxMembers;
    return maxMembers === null || maxMembers === undefined ? "∞" : maxMembers;
  };

  const openRoleCount = teamData.open_role_count ?? teamData.openRoleCount ?? 0;

  const getFormattedDate = () => {
    const date = normalizedData.date;
    if (!date) return null;
    try {
      return format(new Date(date), "MM/dd/yy");
    } catch (e) {
      return null;
    }
  };

  const getDisplayTags = () => {
    let displayTags = [];
    try {
      if (teamData.tags_json) {
        const tagStrings = teamData.tags_json.split(",");
        displayTags = tagStrings
          .filter((tagStr) => tagStr && tagStr.trim() !== "null")
          .map((tagStr) => {
            try {
              return JSON.parse(tagStr.trim());
            } catch (e) {
              return null;
            }
          })
          .filter((tag) => tag !== null);
      } else if (teamData.tags) {
        if (Array.isArray(teamData.tags)) {
          displayTags = teamData.tags.map((tag) => {
            if (typeof tag === "string") return { name: tag };
            if (tag && typeof tag === "object") {
              return {
                id: tag.id || tag.tag_id || tag.tagId,
                name: tag.name || (typeof tag.tag === "string" ? tag.tag : ""),
                category: tag.category || tag.supercategory || "",
              };
            }
            return tag;
          });
        } else if (typeof teamData.tags === "string") {
          try {
            displayTags = JSON.parse(teamData.tags);
          } catch (e) {
            displayTags = teamData.tags
              .split(",")
              .map((name) => ({ name: name.trim() }));
          }
        }
      }
    } catch (e) {
      displayTags = [];
    }
    return displayTags.filter(
      (tag) => tag && (tag.name || typeof tag === "string"),
    );
  };

  const shouldShowVisibilityIcon = () => {
    if (!isAuthenticated || !user) return false;
    if (effectiveVariant !== "member") return false;
    if (isOwner) return true;
    if (teamData.owner_id === user.id || teamData.ownerId === user.id)
      return true;
    if (teamData.members && Array.isArray(teamData.members)) {
      const foundInMembers = teamData.members.some(
        (member) => member.user_id === user.id || member.userId === user.id,
      );
      if (foundInMembers) return true;
    }
    if (userRole && userRole !== null) return true;
    return false;
  };

  // ============ Event Handlers ============

  const handleUserClick = (userId) => {
    if (userId) {
      setSelectedUserId(userId);
    }
  };

  const handleCardClick = () => {
    setIsModalOpen(true);
  };

  const handleResponseChange = (id, response) => {
    setResponses((prev) => ({
      ...prev,
      [id]: response,
    }));
  };

  const handleModalClose = async () => {
    if (effectiveVariant === "member") {
      try {
        const response = await teamService.getTeamById(teamData.id);
        if (response && response.data) {
          const fullTeam = response?.data?.data ?? response?.data;
          // Normalize is_public to ensure it's a boolean
          const normalizedTeam = {
            ...fullTeam,
            is_public:
              fullTeam.is_public === true || fullTeam.is_public === "true",
          };
          setTeamData(normalizedTeam);
          if (onUpdate) onUpdate(normalizedTeam);
        }
      } catch (error) {
        console.error("Error refreshing team data:", error);
      }
    }
    setIsModalOpen(false);
    setIsApplicationModalOpen(false);
  };

  const handleTeamUpdate = (updatedTeam) => {
    setTeamData(updatedTeam);
    if (onUpdate) onUpdate(updatedTeam);
  };

  const handleApplicationAction = async (applicationId, action, response) => {
    try {
      await teamService.handleTeamApplication(applicationId, action, response);
      await fetchPendingApplications();
      if (onUpdate) {
        const updatedTeam = await teamService.getTeamById(teamData.id);
        onUpdate(updatedTeam.data);
      }
    } catch (error) {
      throw error;
    }
  };

  // Handler for canceling a sent invitation
  const handleCancelInvitation = async (invitationId) => {
    try {
      await teamService.cancelInvitation(invitationId);
      // Refresh the invitations list
      await fetchSentInvitations();
    } catch (error) {
      console.error("Error canceling invitation:", error);
      throw error;
    }
  };

  // Member variant handlers
  const handleDeleteClick = async (e) => {
    e.stopPropagation();
    if (
      !window.confirm(
        "Are you sure you want to delete this team? This action cannot be undone.",
      )
    ) {
      return;
    }
    try {
      setIsDeleting(true);
      await teamService.deleteTeam(teamData.id);
      if (onDelete) onDelete(teamData.id);
    } catch (err) {
      console.error("Error deleting team:", err);
      setError("Failed to delete team. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handler for when user leaves a team (called from TeamDetailsModal)
  const handleLeaveTeam = (teamId) => {
    console.log("TeamCard handleLeaveTeam called with teamId:", teamId);
    if (onLeave) onLeave(teamId);
  };

  // Application variant handlers
  const handleCancelApplication = async (e) => {
    e.stopPropagation();
    if (
      !window.confirm(
        "Are you sure you want to cancel your application to this team?",
      )
    ) {
      return;
    }
    setActionLoading("cancel");
    try {
      const cancelHandler = onCancel || onCancelApplication;
      if (cancelHandler) {
        await cancelHandler(normalizedData.id);
      }
    } catch (err) {
      console.error("Error canceling application:", err);
      setError("Failed to cancel application. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendReminder = async (e) => {
    e.stopPropagation();
    setActionLoading("reminder");
    try {
      if (onSendReminder) {
        await onSendReminder(normalizedData.id);
      } else {
        alert("Reminder feature coming soon!");
      }
    } catch (err) {
      console.error("Error sending reminder:", err);
      setError("Failed to send reminder. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  // Invitation variant handlers
  const handleAccept = async () => {
    if (!onAccept) return;
    try {
      setActionLoading("accept");
      const invitationId = invitation?.id;
      const responseMessage = responses[invitationId] || "";
      await onAccept(invitationId, responseMessage);
      // Clear the response after successful action
      setResponses((prev) => {
        const newResponses = { ...prev };
        delete newResponses[invitationId];
        return newResponses;
      });
    } catch (error) {
      console.error("Error accepting invitation:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async () => {
    if (!onDecline) return;
    try {
      setActionLoading("decline");
      const invitationId = invitation?.id;
      const responseMessage = responses[invitationId] || "";
      await onDecline(invitationId, responseMessage);
      // Clear the response after successful action
      setResponses((prev) => {
        const newResponses = { ...prev };
        delete newResponses[invitationId];
        return newResponses;
      });
    } catch (error) {
      console.error("Error declining invitation:", error);
    } finally {
      setActionLoading(null);
    }
  };

  // ============ Render Helpers ============

  const renderBadges = () => {
    const formattedDate = getFormattedDate();
    const displayTags = getDisplayTags();
    const isPublic = teamData.is_public === true || teamData.isPublic === true;

    return (
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Tags display (member / invitation / application) */}
        {(effectiveVariant === "member" ||
          effectiveVariant === "invitation" ||
          effectiveVariant === "application") &&
          displayTags.length > 0 && (
            <div className="flex items-start text-sm text-base-content/70">
              <Tag size={16} className="mr-1 flex-shrink-0 mt-0.5" />
              <span>
                {(() => {
                  const maxVisible = 5;
                  const visibleTags = displayTags.slice(0, maxVisible);
                  const remainingCount = displayTags.length - maxVisible;

                  return (
                    <>
                      {visibleTags.map((tag, index) => {
                        const tagName =
                          typeof tag === "string"
                            ? tag
                            : tag.name || tag.tag || "";
                        return (
                          <span key={index}>
                            {index > 0 ? ", " : ""}
                            {tagName}
                          </span>
                        );
                      })}
                      {remainingCount > 0 && ` +${remainingCount}`}
                    </>
                  );
                })()}
              </span>
            </div>
          )}
      </div>
    );
  };

  const renderInviterInfo = () => {
    if (effectiveVariant !== "invitation" || !normalizedData.inviter)
      return null;

    return (
      <div className="mb-4">
        <SentByLink user={normalizedData.inviter} />
      </div>
    );
  };

  const renderMessage = () => {
    if (!normalizedData.message) return null;
    // Only show message preview for application variant (invitation message is in modal now)
    if (effectiveVariant !== "application") return null;

    return <div className="mb-4"></div>;
  };

  const renderActionButtons = () => {
    // If user has a pending invitation (search or invitation variant)

    // Search page: always show View Details button on the card
    if (isSearchResult) {
      return null;
      // return (
      //   <div className="mt-auto">
      //     <Button
      //       variant="primary"
      //       size={viewMode === "mini" ? "xs" : "sm"}
      //       className="w-full"
      //       onClick={(e) => {
      //         e.stopPropagation();
      //         setIsModalOpen(true);
      //       }}
      //     >
      //       View Details
      //     </Button>
      //   </div>
      // );
    }

    if (effectiveVariant === "invitation" || pendingInvitationForTeam) {
      return (
        <div className="mt-auto pt-4">
          {" "}
          {/* pt-4: spacing from tags row — TODO: revert to pt-0 when LocationDistanceTagsRow mb-4 is restored */}
          <Button
            variant="primary"
            className="w-full"
            icon={<Mail size={16} />}
            suppressCardTooltip={true}
            onClick={(e) => {
              e.stopPropagation();
              setIsInvitationDetailsModalOpen(true);
            }}
          >
            Open Invite to Respond
          </Button>
        </div>
      );
    }

    // If user has a pending application (search or application variant)
    if (effectiveVariant === "application" || pendingApplicationForTeam) {
      return (
        <div className="mt-auto pt-4">
          {" "}
          {/* pt-4: spacing from tags row — TODO: revert to pt-0 when LocationDistanceTagsRow mb-4 is restored */}
          <Button
            variant="primary"
            className="w-full"
            icon={<SendHorizontal size={16} />}
            suppressCardTooltip={true}
            onClick={(e) => {
              e.stopPropagation();
              setIsApplicationModalOpen(true);
            }}
          >
            View Application Details
          </Button>
        </div>
      );
    }

    // Member variant: View Details + management actions
    return (
      <div className="mt-auto pt-4 flex justify-between items-center">
        {" "}
        {/* pt-4: spacing from tags row — TODO: revert to pt-0 when LocationDistanceTagsRow mb-4 is restored */}
        <Button
          variant="primary"
          suppressCardTooltip={true}
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
          className="flex-grow"
        >
          View Details
        </Button>
        {/* Team Management Actions (owner and admin) */}
        {isAuthenticated && !isSearchResult && (
          <div className="flex items-center space-x-2 ml-2">
            {/* Application badge - owners and admins */}
            {canManageInvitations && (
              <NotificationBadge
                variant="application"
                count={pendingApplications.length}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsApplicationsModalOpen(true);
                }}
              />
            )}

            {/* Sent invitations badge - owners and admins */}
            {canManageInvitations && (
              <NotificationBadge
                variant="invitation"
                count={pendingSentInvitations.length}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsInvitesModalOpen(true);
                }}
              />
            )}
          </div>
        )}
      </div>
    );
  };

  console.log("TeamCard data:", teamData, "distance_km:", teamData.distance_km);

  // ============ MATCH SCORE ============
  // Read from normalizedData.team (original prop) so API refetches don't overwrite it
  const rawScore =
    normalizedData.team?.bestMatchScore ?? normalizedData.team?.best_match_score;
  const showScore = showMatchScore && rawScore != null && rawScore > 0;

  let matchTier = null;
  let matchOverlay = null;
  let scoreSubtitleItem = null;

  if (showScore) {
    matchTier = getMatchTier(rawScore);

    const matchDetails =
      normalizedData.team?.matchDetails ?? normalizedData.team?.match_details;
    const sharedTagCount =
      normalizedData.team?.sharedTagCount ??
      normalizedData.team?.shared_tag_count ??
      (matchDetails?.sharedTagCount ?? matchDetails?.shared_tag_count ?? 0);

    const tooltipText =
      sharedTagCount > 0
        ? `${matchTier.pct}% profile match — ${sharedTagCount} shared focus areas`
        : `${matchTier.pct}% profile match`;

    const iconSizeSubtitle =
      viewMode === "list" ? 10 : viewMode === "mini" ? 11 : 12;
    scoreSubtitleItem = (
      <Tooltip content={tooltipText}>
        <span className="flex items-center gap-0.5">
          <matchTier.Icon size={iconSizeSubtitle} className={matchTier.text} />
          <span className="text-base-content">{matchTier.pct}%</span>
        </span>
      </Tooltip>
    );

    const badgeSize =
      viewMode === "list"
        ? "w-[14px] h-[14px]"
        : "w-5 h-5";
    const badgeIconSize =
      viewMode === "list" ? 7 : 10;
    matchOverlay = (
      <div
        className={`absolute -top-0.5 -left-0.5 rounded-full ring-2 ring-white flex items-center justify-center ${matchTier.bg} ${badgeSize}`}
      >
        <matchTier.Icon
          size={badgeIconSize}
          className="text-white"
          strokeWidth={2.5}
        />
      </div>
    );
  }

  // ============ LIST VIEW ============

  if (viewMode === "list") {
    const locationText =
      teamData.is_remote || teamData.isRemote
        ? "Remote"
        : [teamData.city, teamData.country].filter(Boolean).join(", ");
    const distance = teamData.distance_km ?? teamData.distanceKm;
    const showDistance = distance != null && distance < 999999 && !(teamData.is_remote || teamData.isRemote);

    const tagNames = (teamData.tags || [])
      .map((t) => (typeof t === "string" ? t : t.name || t.tag || ""))
      .filter(Boolean);
    const maxInlineTags = 3;
    const visibleTags = tagNames.slice(0, maxInlineTags);
    const remainingTags = tagNames.length - maxInlineTags;
    const tagsSummary =
      visibleTags.length > 0
        ? visibleTags.join(", ") +
          (remainingTags > 0 ? ` +${remainingTags}` : "")
        : "";

    const badgeNames = (teamData.badges || [])
      .map((b) => b.name || "")
      .filter(Boolean);
    const maxInlineBadges = 3;
    const visibleBadges = badgeNames.slice(0, maxInlineBadges);
    const remainingBadges = badgeNames.length - maxInlineBadges;
    const badgesSummary =
      visibleBadges.length > 0
        ? visibleBadges.join(", ") + (remainingBadges > 0 ? ` +${remainingBadges}` : "")
        : "";

    const memberCount = getMemberCount();
    const maxMembers = getMaxMembers();
    const shouldReserveMyTeamsActionSlot = !isSearchResult;

    const subtitleContent = (
      <span className="flex items-center gap-1 text-base-content/60">
        {scoreSubtitleItem}
        <Users size={11} />
        <span>{memberCount}/{maxMembers}</span>
        {openRoleCount > 0 && (
          <Tooltip content={`${openRoleCount} open ${openRoleCount === 1 ? 'role' : 'roles'} posted in this team`}>
            <span className="flex items-center">
              <UserSearch size={12} className="text-amber-500 mr-0.5" />
              <span>{openRoleCount}</span>
            </span>
          </Tooltip>
        )}
        {(effectiveVariant === "invitation" || pendingInvitationForTeam) && (
          <Tooltip
            content={`You were invited to this team${
              getFormattedDate()
                ? `\non ${format(new Date(normalizedData.date), "MMM d, yyyy")}`
                : ""
            }`}
          >
            <span className="flex items-center gap-0.5">
              <Mail size={11} className="text-pink-500" />
              {getFormattedDate() && <span>{getFormattedDate()}</span>}
            </span>
          </Tooltip>
        )}
        {(effectiveVariant === "application" || pendingApplicationForTeam) && (
          <Tooltip
            content={`You applied to join this team${
              getFormattedDate()
                ? `\non ${format(new Date(normalizedData.date), "MMM d, yyyy")}`
                : ""
            }`}
          >
            <span className="flex items-center gap-0.5">
              <SendHorizontal size={11} className="text-info" />
              {getFormattedDate() && <span>{getFormattedDate()}</span>}
            </span>
          </Tooltip>
        )}
        {userRole && effectiveVariant === "member" && (
          <>
            {userRole === "owner" && (
              <Tooltip content="You are the owner of this team">
                <Crown size={11} className="text-[var(--color-role-owner-bg)]" />
              </Tooltip>
            )}
            {userRole === "admin" && (
              <Tooltip content="You are an admin of this team">
                <ShieldCheck size={11} className="text-[var(--color-role-admin-bg)]" />
              </Tooltip>
            )}
            {userRole === "member" && (
              <Tooltip content="You are a member of this team">
                <User size={11} className="text-[var(--color-role-member-bg)]" />
              </Tooltip>
            )}
          </>
        )}
        {shouldShowVisibilityIcon() && (
          <Tooltip content={teamData.is_public === true || teamData.isPublic === true ? "Public Team - visible for everyone" : "Private Team - only visible for Members"}>
            {teamData.is_public === true || teamData.isPublic === true ? (
              <EyeIcon size={11} className="text-green-600" />
            ) : (
              <EyeClosed size={11} className="text-gray-500" />
            )}
          </Tooltip>
        )}
      </span>
    );

    return (
      <>
        <Card
          title={teamData.name || "Unknown Team"}
          subtitle={subtitleContent}
          image={getTeamImage()}
          imageFallback={getTeamInitials()}
          imageAlt={`${teamData.name} team`}
          onClick={handleCardClick}
          viewMode="list"
          className=""
          clickTooltip="Click to view Team details"
          imageOverlay={matchOverlay}
        >
          <div className="w-36 flex-shrink-0 text-xs text-base-content/60 flex items-center gap-1 overflow-hidden">
            {locationText && (
              <Tooltip content={locationText}>
                <div className="flex items-center gap-1 overflow-hidden">
                  {teamData.is_remote || teamData.isRemote ? (
                    <Globe size={11} className="flex-shrink-0" />
                  ) : (
                    <MapPin size={11} className="flex-shrink-0" />
                  )}
                  <span className="truncate">{locationText}</span>
                </div>
              </Tooltip>
            )}
          </div>
          {showDistance && (
            <div className="w-16 flex-shrink-0 text-xs text-base-content/60 flex items-center gap-1 overflow-hidden">
              <Tooltip content={`${Math.round(distance)} km away from you`}>
                <div className="flex items-center gap-1">
                  <Ruler size={11} className="flex-shrink-0" />
                  <span className="whitespace-nowrap">{Math.round(distance)} km</span>
                </div>
              </Tooltip>
            </div>
          )}
          <div className="w-52 flex-shrink-0 text-xs text-base-content/60 hidden sm:flex items-center gap-1 overflow-hidden">
            {tagsSummary && (
              <Tooltip content={tagNames.join(", ")} wrapperClassName="flex items-center gap-1 min-w-0 overflow-hidden w-full">
                <Tag size={11} className="flex-shrink-0" />
                <span className="truncate">{tagsSummary}</span>
              </Tooltip>
            )}
          </div>
          <div className="w-48 flex-shrink-0 text-xs text-base-content/60 hidden sm:flex items-center gap-1 overflow-hidden">
            {badgesSummary && (
              <Tooltip content={badgeNames.join(", ")} wrapperClassName="flex items-center gap-1 min-w-0 overflow-hidden w-full">
                <Award size={11} className="flex-shrink-0" />
                <span className="truncate">{badgesSummary}</span>
              </Tooltip>
            )}
          </div>
          {shouldReserveMyTeamsActionSlot && (
            <div className="w-20 flex-shrink-0 flex items-center justify-end gap-2">
              {effectiveVariant === "invitation" && (
                <Tooltip content="Open Invite to Respond">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-shrink-0 !min-h-8 !h-8 !w-8 !min-w-8 !px-0"
                    icon={<Mail size={16} />}
                    suppressCardTooltip={true}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsInvitationDetailsModalOpen(true);
                    }}
                  />
                </Tooltip>
              )}
              {effectiveVariant === "application" && (
                <Tooltip content="View Application Details">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-shrink-0 !min-h-8 !h-8 !w-8 !min-w-8 !px-0"
                    icon={<SendHorizontal size={16} />}
                    suppressCardTooltip={true}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsApplicationModalOpen(true);
                    }}
                  />
                </Tooltip>
              )}
              {effectiveVariant === "member" && canManageInvitations && (
                <>
                  <NotificationBadge
                    variant="application"
                    count={pendingApplications.length}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsApplicationsModalOpen(true);
                    }}
                  />
                  <NotificationBadge
                    variant="invitation"
                    count={pendingSentInvitations.length}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsInvitesModalOpen(true);
                    }}
                  />
                </>
              )}
            </div>
          )}
        </Card>

        <TeamDetailsModal
          isOpen={isModalOpen}
          teamId={getTeamId()}
          initialTeamData={teamData}
          onClose={handleModalClose}
          onUpdate={handleTeamUpdate}
          onDelete={onDelete}
          onLeave={handleLeaveTeam}
          userRole={userRole}
          isFromSearch={isSearchResult || effectiveVariant !== "member"}
          hasPendingInvitation={
            effectiveVariant === "invitation" || !!pendingInvitationForTeam
          }
          pendingInvitation={
            effectiveVariant === "invitation"
              ? invitation
              : pendingInvitationForTeam
          }
          hasPendingApplication={
            effectiveVariant === "application" || !!pendingApplicationForTeam
          }
          pendingApplication={
            effectiveVariant === "application"
              ? application
              : pendingApplicationForTeam
          }
          onViewApplicationDetails={() => setIsApplicationModalOpen(true)}
          showMatchHighlights={showMatchHighlights}
        />

        {/* Applications Modal (for team owners and admins) */}
        {effectiveVariant === "member" && (
          <TeamApplicationsModal
            isOpen={isApplicationsModalOpen}
            onClose={() => {
              setIsApplicationsModalOpen(false);
              if (onApplicationsModalClosed) {
                onApplicationsModalClosed();
              }
            }}
            teamId={teamData.id}
            applications={pendingApplications}
            onApplicationAction={handleApplicationAction}
            teamName={teamData.name}
            highlightUserId={highlightApplicantId}
          />
        )}

        {/* Invites Modal (for team owners and admins) */}
        {effectiveVariant === "member" && (
          <TeamInvitesModal
            isOpen={isInvitesModalOpen}
            onClose={() => {
              setIsInvitesModalOpen(false);
              fetchSentInvitations();
            }}
            invitations={pendingSentInvitations}
            onCancelInvitation={handleCancelInvitation}
            teamName={teamData.name}
          />
        )}

        {isInvitationDetailsModalOpen &&
          (invitation || pendingInvitationForTeam) && (
            <TeamInvitationDetailsModal
              isOpen={isInvitationDetailsModalOpen}
              invitation={
                effectiveVariant === "invitation"
                  ? invitation
                  : pendingInvitationForTeam
              }
              onClose={() => setIsInvitationDetailsModalOpen(false)}
              onAccept={onAccept}
              onDecline={onDecline}
            />
          )}

        {isApplicationModalOpen &&
          (application || pendingApplicationForTeam) && (
            <TeamApplicationDetailsModal
              isOpen={isApplicationModalOpen}
              application={
                effectiveVariant === "application"
                  ? application
                  : pendingApplicationForTeam
              }
              onClose={() => setIsApplicationModalOpen(false)}
              onCancel={onCancel || onCancelApplication}
              onSendReminder={onSendReminder}
            />
          )}

        <UserDetailsModal
          isOpen={!!selectedUserId}
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      </>
    );
  }

  // ============ Main Render ============

  return (
    <>
      <Card
        title={teamData.name || "Unknown Team"}
        subtitle={
          <span
            className={`flex items-center flex-wrap text-base-content/70 ${viewMode === "mini" ? "text-xs gap-x-1 gap-y-0.5 w-full" : "text-sm gap-1.5"}`}
          >
            {scoreSubtitleItem}
            {/* Members count */}
            <span className="flex items-center">
              <Users
                size={viewMode === "mini" ? 12 : 14}
                className="text-primary mr-0.5"
              />
              <span>
                {getMemberCount()}/{getMaxMembers()}
              </span>
            </span>

            {/* Open roles count */}
            {openRoleCount > 0 && (
              <Tooltip content={`${openRoleCount} open ${openRoleCount === 1 ? 'role' : 'roles'} posted in this team`}>
                <span className="flex items-center">
                  <UserSearch
                    size={viewMode === "mini" ? 12 : 14}
                    className="text-amber-500 mr-0.5"
                  />
                  <span>{openRoleCount}</span>
                </span>
              </Tooltip>
            )}

            {/* Privacy status */}
            {shouldShowVisibilityIcon() && (
              <Tooltip
                content={
                  teamData.is_public === true || teamData.isPublic === true
                    ? "Public Team - visible for everyone"
                    : "Private Team - only visible for Members"
                }
              >
                {teamData.is_public === true || teamData.isPublic === true ? (
                  <EyeIcon
                    size={viewMode === "mini" ? 12 : 14}
                    className="text-green-600"
                  />
                ) : (
                  <EyeClosed
                    size={viewMode === "mini" ? 12 : 14}
                    className="text-gray-500"
                  />
                )}
              </Tooltip>
            )}

            {/* Pending invitation indicator with date */}
            {(effectiveVariant === "invitation" ||
              pendingInvitationForTeam) && (
              <Tooltip
                content={`You were invited to this team${
                  getFormattedDate()
                    ? `\non ${format(
                        new Date(normalizedData.date),
                        "MMM d, yyyy",
                      )}`
                    : ""
                }`}
              >
                <span className="flex items-center">
                  <Mail
                    size={viewMode === "mini" ? 12 : 14}
                    className="text-pink-500"
                  />
                  {getFormattedDate() && (
                    <span className="ml-0.5">{getFormattedDate()}</span>
                  )}
                </span>
              </Tooltip>
            )}

            {/* Pending application indicator with date */}
            {(effectiveVariant === "application" ||
              pendingApplicationForTeam) && (
              <Tooltip
                content={`You applied to join this team${
                  getFormattedDate()
                    ? `\non ${format(
                        new Date(normalizedData.date),
                        "MMM d, yyyy",
                      )}`
                    : ""
                }`}
              >
                <span className="flex items-center">
                  <SendHorizontal
                    size={viewMode === "mini" ? 12 : 14}
                    className="text-info"
                  />
                  {getFormattedDate() && (
                    <span className="ml-0.5">{getFormattedDate()}</span>
                  )}
                </span>
              </Tooltip>
            )}

            {/* User role - show for member variant when user has a role */}
            {userRole && effectiveVariant === "member" && (
              <span className="flex items-center text-base-content/70">
                {userRole === "owner" && (
                  <Tooltip content="You are the owner of this team">
                    <Crown
                      size={viewMode === "mini" ? 12 : 14}
                      className="text-[var(--color-role-owner-bg)]"
                    />
                  </Tooltip>
                )}
                {userRole === "admin" && (
                  <Tooltip content="You are an admin of this team">
                    <ShieldCheck
                      size={viewMode === "mini" ? 12 : 14}
                      className="text-[var(--color-role-admin-bg)]"
                    />
                  </Tooltip>
                )}
                {userRole === "member" && (
                  <Tooltip content="You are a member of this team">
                    <User
                      size={viewMode === "mini" ? 12 : 14}
                      className="text-[var(--color-role-member-bg)]"
                    />
                  </Tooltip>
                )}
              </span>
            )}

            {/* Compact location in subtitle for mini cards */}
            {viewMode === "mini" &&
              !activeFilters.showLocation &&
              (teamData.city ||
                teamData.country ||
                teamData.is_remote ||
                teamData.isRemote) && (
                <span className="flex items-center">
                  {teamData.is_remote || teamData.isRemote ? (
                    <>
                      <Globe size={12} className="mr-0.5 flex-shrink-0" />
                      <span>Remote</span>
                    </>
                  ) : (
                    <>
                      <MapPin size={12} className="mr-0.5 flex-shrink-0" />
                      <span>
                        {[teamData.city, teamData.country]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </>
                  )}
                </span>
              )}
          </span>
        }
        hoverable
        image={getTeamImage()}
        imageFallback={getTeamInitials()}
        imageAlt={`${teamData.name} team`}
        imageSize="medium"
        imageShape="circle"
        onClick={handleCardClick}
        truncateContent={true}
        clickTooltip="Click to view Team details"
        contentClassName={
          viewMode === "mini"
            ? `!pt-0 !px-4 sm:!px-5 ${activeFilters.showLocation || activeFilters.showTags || activeFilters.showBadges || !isSearchResult ? "!pb-4 sm:!pb-5" : "!pb-0"}`
            : ""
        }
        headerClassName={
          viewMode === "mini"
            ? `!p-4 sm:!p-5 ${activeFilters.showLocation || activeFilters.showTags || activeFilters.showBadges ? "!pb-4" : "!pb-0"}`
            : ""
        }
        imageWrapperClassName={viewMode === "mini" ? "mb-0 pb-0" : ""}
        titleClassName={
          viewMode === "mini" ? "text-base mb-0.5 leading-[110%]" : ""
        }
        marginClassName={viewMode === "mini" ? "mb-2" : ""}
        imageOverlay={matchOverlay}
      >
        {error && (
          <Alert
            type="error"
            message={error}
            onClose={() => setError(null)}
            className="mb-4"
          />
        )}
        {/* Team description */}
        {viewMode !== "mini" && (
          <p className="text-base-content/80 mb-4">
            {teamData.description || "No description"}
          </p>
        )}

        <LocationDistanceTagsRow
          entity={teamData}
          entityType="team"
          distance={teamData.distance_km ?? teamData.distanceKm}
          getDisplayTags={
            viewMode === "mini" && !activeFilters.showTags
              ? null
              : getDisplayTags
          }
          hideLocation={viewMode === "mini" && !activeFilters.showLocation}
          compact={viewMode === "mini"}
        />

        {/* Message preview (invitation/application variants) */}
        {renderMessage()}

        {/* Action buttons */}
        {renderActionButtons()}
      </Card>

      <TeamDetailsModal
        isOpen={isModalOpen}
        teamId={getTeamId()}
        initialTeamData={teamData}
        onClose={handleModalClose}
        onUpdate={handleTeamUpdate}
        onDelete={onDelete}
        onLeave={handleLeaveTeam}
        userRole={userRole}
        isFromSearch={isSearchResult || effectiveVariant !== "member"}
        hasPendingInvitation={
          effectiveVariant === "invitation" || !!pendingInvitationForTeam
        }
        pendingInvitation={
          effectiveVariant === "invitation"
            ? invitation
            : pendingInvitationForTeam
        }
        hasPendingApplication={
          effectiveVariant === "application" || !!pendingApplicationForTeam
        }
        pendingApplication={
          effectiveVariant === "application"
            ? application
            : pendingApplicationForTeam
        }
        onViewApplicationDetails={() => setIsApplicationModalOpen(true)}
        showMatchHighlights={showMatchHighlights}
        roleMatchBadgeNames={roleMatchBadgeNames}
      />

      {/* Applications Modal (for team owners and admins) */}
      {effectiveVariant === "member" && (
        <TeamApplicationsModal
          isOpen={isApplicationsModalOpen}
          onClose={() => {
            setIsApplicationsModalOpen(false);
            if (onApplicationsModalClosed) {
              onApplicationsModalClosed();
            }
          }}
          teamId={teamData.id}
          applications={pendingApplications}
          onApplicationAction={handleApplicationAction}
          teamName={teamData.name}
          highlightUserId={highlightApplicantId}
        />
      )}

      {/* Invites Modal (for team owners and admins) */}
      {effectiveVariant === "member" && (
        <TeamInvitesModal
          isOpen={isInvitesModalOpen}
          onClose={() => {
            setIsInvitesModalOpen(false);
            // Optionally refresh the list when closing
            fetchSentInvitations();
          }}
          invitations={pendingSentInvitations}
          onCancelInvitation={handleCancelInvitation}
          teamName={teamData.name}
        />
      )}

      {isInvitationDetailsModalOpen &&
        (invitation || pendingInvitationForTeam) && (
          <TeamInvitationDetailsModal
            isOpen={isInvitationDetailsModalOpen}
            invitation={
              effectiveVariant === "invitation"
                ? invitation
                : pendingInvitationForTeam
            }
            onClose={() => setIsInvitationDetailsModalOpen(false)}
            onAccept={onAccept}
            onDecline={onDecline}
          />
        )}

      {/* Application Details Modal (works for application-variant AND search results with pendingApplicationForTeam) */}
      {isApplicationModalOpen && (application || pendingApplicationForTeam) && (
        <TeamApplicationDetailsModal
          isOpen={isApplicationModalOpen}
          application={
            effectiveVariant === "application"
              ? application
              : pendingApplicationForTeam
          }
          onClose={() => setIsApplicationModalOpen(false)}
          onCancel={onCancel || onCancelApplication}
          onSendReminder={onSendReminder}
        />
      )}

      {/* User Details Modal (for viewing inviter profile) */}
      <UserDetailsModal
        isOpen={!!selectedUserId}
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
    </>
  );
};

export default TeamCard;
