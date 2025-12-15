import React, { useState, useEffect, useCallback } from "react";
import Card from "../common/Card";
import Button from "../common/Button";
import {
  Users,
  MapPin,
  Trash2,
  EyeClosed,
  EyeIcon,
  Tag,
  Calendar,
  AlertCircle,
  Check,
  X,
  Send,
  MessageSquare,
  User,
  Crown,
  ShieldCheck,
  SendHorizontal,
  Mail,
} from "lucide-react";
import TeamDetailsModal from "./TeamDetailsModal";
import UserDetailsModal from "../users/UserDetailsModal";
import TeamApplicationDetailsModal from "./TeamApplicationDetailsModal";
import InvitationNotificationBadge from "./InvitationNotificationBadge";
import TeamInvitesModal from "./TeamInvitesModal";
import TeamInvitationDetailsModal from "./TeamInvitationDetailsModal";
import { teamService } from "../../services/teamService";
import { useAuth } from "../../contexts/AuthContext";
import Alert from "../common/Alert";
import ApplicationNotificationBadge from "./ApplicationNotificationBadge";
import TeamApplicationsModal from "./TeamApplicationsModal";
import { format } from "date-fns";

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

  // Loading state
  loading = false,
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
    setTeamData(getNormalizedData().team);
  }, [team, application, invitation]);

  // Fetch user's role in this team (only for member variant)
  useEffect(() => {
    const fetchUserRole = async () => {
      if (user && teamData?.id && effectiveVariant === "member") {
        try {
          const response = await teamService.getUserRoleInTeam(
            teamData.id,
            user.id
          );
          setUserRole(response.data.role);
        } catch (err) {
          console.error("Error fetching user role:", err);
        }
      }
    };
    fetchUserRole();
  }, [user, teamData?.id, isSearchResult, effectiveVariant]);

  // Fetch pending applications (only for team owners)
  const fetchPendingApplications = useCallback(async () => {
    if (isOwner && teamData?.id && effectiveVariant === "member") {
      try {
        const response = await teamService.getTeamApplications(teamData.id);
        setPendingApplications(response.data || []);
      } catch (error) {
        console.error("Error fetching applications:", error);
      }
    }
  }, [isOwner, teamData?.id, effectiveVariant]);

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

  // Fetch complete team data for tags (only for member variant)
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
          if (
            teamData.tags &&
            Array.isArray(teamData.tags) &&
            teamData.tags.length > 0 &&
            teamData.tags.every((tag) => tag.name || typeof tag === "string")
          ) {
            return;
          }

          const response = await teamService.getTeamById(teamData.id);
          if (response && response.data) {
            if (response.data.tags && Array.isArray(response.data.tags)) {
              setTeamData((prev) => ({
                ...prev,
                tags: response.data.tags,
              }));
            }
          }
        } catch (error) {
          console.error("Error fetching complete team data:", error);
        }
      }
    };

    fetchCompleteTeamData();
  }, [teamData?.id, effectiveVariant]);

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
          (app) => app.team?.id === teamData.id || app.team_id === teamData.id
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
          (inv) => inv.team?.id === teamData.id || inv.team_id === teamData.id
        );

        setPendingInvitationForTeam(foundInvitation || null);
      } catch (error) {
        console.error("Error checking pending invitations:", error);
        setPendingInvitationForTeam(null);
      }
    };

    checkPendingInvitation();
  }, [isSearchResult, isAuthenticated, teamData?.id]);

  // ================= GUARD CLAUSE – AFTER ALL HOOKS =================

  if (!teamData) {
    return null;
  }

  // ============ Helper Functions ============

  const getTeamImage = () => {
    if (teamData.teamavatar_url) return teamData.teamavatar_url;
    if (teamData.teamavatarUrl) return teamData.teamavatarUrl;
    return teamData.name?.charAt(0) || "?";
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

  const getFormattedDate = () => {
    const date = normalizedData.date;
    if (!date) return null;
    try {
      return format(new Date(date), "MMM d, yyyy");
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
      (tag) => tag && (tag.name || typeof tag === "string")
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
        (member) => member.user_id === user.id || member.userId === user.id
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
          setTeamData(response.data);
          if (onUpdate) onUpdate(response.data);
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
        "Are you sure you want to delete this team? This action cannot be undone."
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
        "Are you sure you want to cancel your application to this team?"
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

        {/* Date badge - application variant only */}
        {formattedDate && effectiveVariant === "application" && (
          <div className="flex items-center text-sm text-base-content/70">
            <Calendar size={14} className="mr-1" />
            <span>Applied {formattedDate}</span>
          </div>
        )}

        {/* Date badge with inviter - invitation variant */}
        {formattedDate && effectiveVariant === "invitation" && (
          <div className="flex items-center text-sm text-base-content/70">
            <Calendar size={14} className="mr-1" />
            <span>
              Invited {formattedDate}
              {normalizedData.inviter && <></>}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderInviterInfo = () => {
    if (effectiveVariant !== "invitation" || !normalizedData.inviter)
      return null;

    const inviter = normalizedData.inviter;
    const avatarUrl = inviter.avatar_url || inviter.avatarUrl;
    const firstName = inviter.first_name || inviter.firstName;
    const lastName = inviter.last_name || inviter.lastName;
    const displayName =
      firstName && lastName
        ? `${firstName} ${lastName}`
        : inviter.username || "Unknown";

    // Get initials for avatar fallback
    const getInitials = () => {
      if (firstName && lastName) {
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
      }
      if (firstName) return firstName.charAt(0).toUpperCase();
      if (inviter.username) return inviter.username.charAt(0).toUpperCase();
      return "?";
    };

    return (
      <div className="flex items-center text-xs text-base-content/60 mb-4">
        <span className="mr-1">Sent by</span>
        <div className="avatar mr-1">
          <div className="w-4 h-4 rounded-full relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={inviter.username || "Inviter"}
                className="object-cover w-full h-full rounded-full"
              />
            ) : (
              <div
                className="bg-primary text-primary-content flex items-center justify-center w-full h-full rounded-full"
                style={{ fontSize: "8px" }}
              >
                <span className="font-medium">{getInitials()}</span>
              </div>
            )}
          </div>
        </div>
        <span className="font-medium text-base-content/80">{displayName}</span>
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
      return (
        <div className="mt-auto">
          <Button
            variant="primary"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              setIsModalOpen(true);
            }}
          >
            View Details
          </Button>
        </div>
      );
    }

    if (effectiveVariant === "invitation" || pendingInvitationForTeam) {
      return (
        <div className="mt-auto">
          <Button
            variant="primary"
            className="w-full"
            icon={<Mail size={16} />}
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
        <div className="mt-auto">
          <Button
            variant="primary"
            className="w-full"
            icon={<SendHorizontal size={16} />}
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
      <div className="mt-auto flex justify-between items-center">
        <Button
          variant="primary"
          size="sm"
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
            {/* Application badge - owners only */}
            {isOwner && (
              <ApplicationNotificationBadge
                count={pendingApplications.length}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsApplicationsModalOpen(true);
                }}
              />
            )}

            {/* Sent invitations badge - owners and admins */}
            {canManageInvitations && (
              <InvitationNotificationBadge
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

  // ============ Main Render ============

  return (
    <>
      <Card
        title={teamData.name || "Unknown Team"}
        subtitle={
          <span className="flex items-center text-base-content/70 text-sm gap-1.5">
            {/* Members count */}
            <span className="flex items-center">
              <Users size={14} className="text-primary mr-0.5" />
              <span>
                {getMemberCount()}/{getMaxMembers()}
              </span>
            </span>

            {/* Privacy status */}
            {shouldShowVisibilityIcon() && (
              <span
                className="tooltip tooltip-bottom tooltip-lomir"
                data-tip={
                  teamData.is_public ?? teamData.isPublic
                    ? "Public Team - visible for everyone"
                    : "Private Team - only visible for Members"
                }
              >
                {teamData.is_public ?? teamData.isPublic ? (
                  <EyeIcon size={14} className="text-green-600" />
                ) : (
                  <EyeClosed size={14} className="text-gray-500" />
                )}
              </span>
            )}

            {/* Pending invitation indicator */}
            {(effectiveVariant === "invitation" ||
              pendingInvitationForTeam) && (
              <span
                className="tooltip tooltip-bottom tooltip-lomir"
                data-tip="You are invited to this team"
              >
                <Mail size={14} className="text-pink-500" />
              </span>
            )}

            {/* Pending application indicator */}
            {(effectiveVariant === "application" ||
              pendingApplicationForTeam) && (
              <span
                className="tooltip tooltip-bottom tooltip-lomir"
                data-tip="You applied to join this team"
              >
                <SendHorizontal size={14} className="text-info" />
              </span>
            )}

            {/* User role - show for member variant when user has a role */}
            {userRole && effectiveVariant === "member" && (
              <span className="flex items-center text-base-content/70">
                {userRole === "owner" && (
                  <span
                    className="tooltip tooltip-bottom tooltip-lomir"
                    data-tip="You are the owner of this team"
                  >
                    <Crown
                      size={14}
                      className="text-[var(--color-role-owner-bg)]"
                    />
                  </span>
                )}
                {userRole === "admin" && (
                  <span
                    className="tooltip tooltip-bottom tooltip-lomir"
                    data-tip="You are an admin of this team"
                  >
                    <ShieldCheck
                      size={14}
                      className="text-[var(--color-role-admin-bg)]"
                    />
                  </span>
                )}
                {userRole === "member" && (
                  <span
                    className="tooltip tooltip-bottom tooltip-lomir"
                    data-tip="You are a member of this team"
                  >
                    <User
                      size={14}
                      className="text-[var(--color-role-member-bg)]"
                    />
                  </span>
                )}
              </span>
            )}
          </span>
        }
        hoverable
        image={getTeamImage()}
        imageAlt={`${teamData.name} team`}
        imageSize="medium"
        imageShape="circle"
        onClick={handleCardClick}
        truncateContent={true}
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
        <p className="text-base-content/80 mb-4">
          {teamData.description || "No description"}
        </p>

        {/* Badges (status, date, tags, etc.) */}
        {renderBadges()}

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
      />

      {/* Applications Modal (for team owners) */}
      {effectiveVariant === "member" && (
        <TeamApplicationsModal
          isOpen={isApplicationsModalOpen}
          onClose={() => setIsApplicationsModalOpen(false)}
          teamId={teamData.id}
          applications={pendingApplications}
          onApplicationAction={handleApplicationAction}
          teamName={teamData.name}
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
