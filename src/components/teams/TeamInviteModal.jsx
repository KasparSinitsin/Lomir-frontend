import React, { useState, useEffect } from "react";
import {
  Users,
  Send,
  UserPlus,
  AlertCircle,
  SendHorizontal,
  Mail,
  Check,
} from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Alert from "../common/Alert";
import UserDetailsModal from "../users/UserDetailsModal";
import TeamDetailsModal from "../teams/TeamDetailsModal";
import TeamInvitesModal from "../teams/TeamInvitesModal";
import TeamApplicationsModal from "../teams/TeamApplicationsModal";
import { getUserInitials } from "../../utils/userHelpers";
import { teamService } from "../../services/teamService";

/**
 * TeamInviteModal Component
 *
 * Modal for inviting a user to join one of the current user's teams.
 * Displays invitee information and allows team selection with optional message.
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Function} onClose - Callback to close the modal
 * @param {string|number} inviteeId - ID of the user being invited
 * @param {string} inviteeName - Display name (deprecated, use firstName/lastName)
 * @param {string} inviteeFirstName - First name of the invitee
 * @param {string} inviteeLastName - Last name of the invitee
 * @param {string} inviteeUsername - Username of the invitee
 * @param {string} inviteeAvatar - Avatar URL of the invitee
 * @param {string} inviteeBio - Bio/description of the invitee
 */
const TeamInviteModal = ({
  isOpen,
  onClose,
  inviteeId,
  inviteeName,
  inviteeFirstName,
  inviteeLastName,
  inviteeUsername,
  inviteeAvatar,
  inviteeBio,
}) => {
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Team details modal state
  const [selectedTeamForDetails, setSelectedTeamForDetails] = useState(null);
  const [isTeamDetailsOpen, setIsTeamDetailsOpen] = useState(false);

  // Store invitation/application data per team
  // { teamId: { hasInviteForUser: bool, hasApplicationFromUser: bool, allInvitations: [], allApplications: [] } }
  const [teamStatusData, setTeamStatusData] = useState({});

  // Invites and Applications modal state
  const [isInvitesModalOpen, setIsInvitesModalOpen] = useState(false);
  const [isApplicationsModalOpen, setIsApplicationsModalOpen] = useState(false);
  const [selectedTeamForModal, setSelectedTeamForModal] = useState(null);
  const [selectedTeamInvitations, setSelectedTeamInvitations] = useState([]);
  const [selectedTeamApplications, setSelectedTeamApplications] = useState([]);

  // Fetch teams where user can invite
  useEffect(() => {
    const fetchTeamsAndStatus = async () => {
      if (!isOpen || !inviteeId) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch teams where current user can invite
        const teamsResponse = await teamService.getTeamsWhereUserCanInvite();
        const teamsData = teamsResponse.data || [];
        setTeams(teamsData);

        // Fetch pending invitations and applications for each team
        const statusData = {};

        await Promise.all(
          teamsData.map(async (team) => {
            try {
              // Fetch all sent invitations for this team
              const invitationsResponse =
                await teamService.getTeamSentInvitations(team.id);
              const allInvitations = invitationsResponse.data || [];

              // Check if invitee has a pending invitation
              const hasInviteForUser = allInvitations.some(
                (inv) =>
                  (inv.invitee?.id === inviteeId ||
                    inv.invitee_id === inviteeId) &&
                  inv.status === "pending"
              );

              // Fetch all applications for this team
              const applicationsResponse =
                await teamService.getTeamApplications(team.id);
              const allApplications = applicationsResponse.data || [];

              // Check if invitee has a pending application
              const hasApplicationFromUser = allApplications.some(
                (app) =>
                  (app.applicant?.id === inviteeId ||
                    app.applicant_id === inviteeId) &&
                  app.status === "pending"
              );

              statusData[team.id] = {
                hasInviteForUser,
                hasApplicationFromUser,
                allInvitations,
                allApplications,
              };
            } catch (err) {
              console.warn(`Could not fetch status for team ${team.id}:`, err);
              statusData[team.id] = {
                hasInviteForUser: false,
                hasApplicationFromUser: false,
                allInvitations: [],
                allApplications: [],
              };
            }
          })
        );

        setTeamStatusData(statusData);
      } catch (err) {
        console.error("Error fetching teams:", err);
        setError("Failed to load your teams. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchTeamsAndStatus();
  }, [isOpen, inviteeId]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTeamId(null);
      setMessage("");
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  // ============ Helper Functions ============

  // Get full display name from first/last name or fallback to inviteeName
  const getInviteeDisplayName = () => {
    const first = inviteeFirstName || "";
    const last = inviteeLastName || "";
    const fullName = `${first} ${last}`.trim();

    if (fullName.length > 0) {
      return fullName;
    }

    return inviteeName || inviteeUsername || "Unknown User";
  };

  // Get username
  const getUsername = () => {
    return inviteeUsername || "unknown";
  };

  // Build a user-like object for getUserInitials utility
  const getInviteeUserObject = () => {
    return {
      first_name: inviteeFirstName,
      last_name: inviteeLastName,
      username: inviteeUsername || inviteeName,
    };
  };

  // Get team avatar URL
  const getTeamAvatarUrl = (team) => {
    return team.teamavatar_url || team.teamavatarUrl || null;
  };

  // Get current member count
  const getMemberCount = (team) => {
    return (
      team.current_members_count ??
      team.currentMembersCount ??
      team.member_count ??
      team.memberCount ??
      0
    );
  };

  // Get max members
  const getMaxMembers = (team) => {
    const max = team.max_members ?? team.maxMembers;
    return max === null || max === undefined ? "∞" : max;
  };

  // Check if team has capacity
  const hasCapacity = (team) => {
    const max = team.max_members ?? team.maxMembers;
    if (max === null || max === undefined) return true;
    const current = getMemberCount(team);
    return current < max;
  };

  // Get team initials
  const getTeamInitials = (teamName) => {
    if (!teamName || typeof teamName !== "string") return "?";

    const words = teamName.trim().split(/\s+/);

    if (words.length === 1) {
      return teamName.slice(0, 2).toUpperCase();
    }

    return words
      .slice(0, 3)
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase();
  };

  // Get the status badge for a team
  const getTeamStatusBadge = (teamId, team) => {
    const isSelected = selectedTeamId === teamId;
    const status = teamStatusData[teamId] || {};
    const hasPendingInvite = status.hasInviteForUser;
    const hasPendingApplication = status.hasApplicationFromUser;
    const teamHasCapacity = hasCapacity(team);

    if (hasPendingInvite) {
      return {
        type: "pending-invite",
        label: "Invited",
        icon: SendHorizontal,
        badgeClass: "badge-role-admin",
        clickable: true,
      };
    }

    if (hasPendingApplication) {
      return {
        type: "pending-application",
        label: "Applied",
        icon: Mail,
        badgeClass: "badge-role-owner",
        clickable: true,
      };
    }

    if (teamHasCapacity) {
      if (isSelected) {
        return {
          type: "selected",
          label: "Invite",
          icon: Check,
          customStyle: {
            backgroundColor: "var(--color-primary-focus)",
            color: "#ffffff",
          },
          clickable: true,
        };
      } else {
        return {
          type: "available",
          label: "Invite",
          icon: UserPlus,
          badgeClass: "badge-role-member",
          clickable: true,
        };
      }
    }

    return null;
  };

  // Check if team is selectable for new invite
  const isTeamSelectable = (teamId, team) => {
    const status = teamStatusData[teamId] || {};
    return (
      !status.hasInviteForUser &&
      !status.hasApplicationFromUser &&
      hasCapacity(team)
    );
  };

  // ============ Handlers ============

  const handleSendInvitation = async () => {
    if (!selectedTeamId) {
      setError("Please select a team");
      return;
    }

    try {
      setSending(true);
      setError(null);

      await teamService.sendInvitation(selectedTeamId, inviteeId, message);

      setSuccess(`Invitation sent to ${getInviteeDisplayName()}!`);

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Error sending invitation:", err);
      setError(
        err.response?.data?.message ||
          "Failed to send invitation. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  // Handle badge click
  const handleBadgeClick = (e, teamId, team, statusBadge) => {
    e.stopPropagation();

    const status = teamStatusData[teamId] || {};

    if (statusBadge.type === "pending-invite") {
      // Open TeamInvitesModal with this team's invitations
      setSelectedTeamForModal(team);
      setSelectedTeamInvitations(status.allInvitations || []);
      setIsInvitesModalOpen(true);
    } else if (statusBadge.type === "pending-application") {
      // Open TeamApplicationsModal with this team's applications
      setSelectedTeamForModal(team);
      setSelectedTeamApplications(status.allApplications || []);
      setIsApplicationsModalOpen(true);
    } else if (
      statusBadge.type === "available" ||
      statusBadge.type === "selected"
    ) {
      if (isTeamSelectable(teamId, team)) {
        setSelectedTeamId(selectedTeamId === teamId ? null : teamId);
        setError(null);
      }
    }
  };

  // Handle card click
  const handleCardClick = (team) => {
    setSelectedTeamForDetails(team);
    setIsTeamDetailsOpen(true);
  };

  // Handle team details modal close
  const handleTeamDetailsClose = () => {
    setIsTeamDetailsOpen(false);
    setSelectedTeamForDetails(null);
  };

  // Handle user click
  const handleUserClick = (userId) => {
    if (userId) {
      setSelectedUserId(userId);
    }
  };

  // Handle user modal close
  const handleUserModalClose = () => {
    setSelectedUserId(null);
  };

  // Handle cancel invitation (called from TeamInvitesModal)
  const handleCancelInvitation = async (invitationId) => {
    try {
      await teamService.cancelInvitation(invitationId);

      // Update local state - remove the cancelled invitation
      if (selectedTeamForModal) {
        const teamId = selectedTeamForModal.id;
        const updatedInvitations = selectedTeamInvitations.filter(
          (inv) => inv.id !== invitationId
        );
        setSelectedTeamInvitations(updatedInvitations);

        // Update teamStatusData
        setTeamStatusData((prev) => ({
          ...prev,
          [teamId]: {
            ...prev[teamId],
            allInvitations: updatedInvitations,
            hasInviteForUser: updatedInvitations.some(
              (inv) =>
                (inv.invitee?.id === inviteeId ||
                  inv.invitee_id === inviteeId) &&
                inv.status === "pending"
            ),
          },
        }));
      }
    } catch (err) {
      console.error("Error canceling invitation:", err);
      throw err;
    }
  };

  // Handle application action (called from TeamApplicationsModal)
  const handleApplicationAction = async (
    applicationId,
    action,
    response = ""
  ) => {
    try {
      if (action === "approve") {
        await teamService.acceptApplication(applicationId, response);
      } else {
        await teamService.declineApplication(applicationId, response);
      }

      // Update local state - remove the processed application
      if (selectedTeamForModal) {
        const teamId = selectedTeamForModal.id;
        const updatedApplications = selectedTeamApplications.filter(
          (app) => app.id !== applicationId
        );
        setSelectedTeamApplications(updatedApplications);

        // Update teamStatusData
        setTeamStatusData((prev) => ({
          ...prev,
          [teamId]: {
            ...prev[teamId],
            allApplications: updatedApplications,
            hasApplicationFromUser: updatedApplications.some(
              (app) =>
                (app.applicant?.id === inviteeId ||
                  app.applicant_id === inviteeId) &&
                app.status === "pending"
            ),
          },
        }));
      }
    } catch (err) {
      console.error(`Error ${action}ing application:`, err);
      throw err;
    }
  };

  // Close invites modal
  const handleInvitesModalClose = () => {
    setIsInvitesModalOpen(false);
    setSelectedTeamForModal(null);
    setSelectedTeamInvitations([]);
  };

  // Close applications modal
  const handleApplicationsModalClose = () => {
    setIsApplicationsModalOpen(false);
    setSelectedTeamForModal(null);
    setSelectedTeamApplications([]);
  };

  // ============ Render ============

  const customHeader = (
    <div className="flex items-center gap-3">
      <UserPlus className="text-primary" size={24} />
      <div>
        <h2 className="text-xl font-medium text-primary">Invite {getInviteeDisplayName()} to a Team</h2>
        {/* <p className="text-sm text-base-content/70">
          Invite {getInviteeDisplayName()} to join your team
        </p> */}
      </div>
    </div>
  );

  const footer = (
    <div className="flex justify-end gap-3">
      <Button variant="errorOutline" onClick={onClose} disabled={sending}>
        Cancel
      </Button>
      <Button
        variant="successOutline"
        onClick={handleSendInvitation}
        disabled={!selectedTeamId || sending || success}
        icon={<Send size={16} />}
      >
        {sending ? "Sending..." : "Send Invitation"}
      </Button>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={customHeader}
        footer={footer}
        position="center"
        size="default"
        closeOnBackdrop={!sending}
        closeOnEscape={!sending}
        showCloseButton={true}
      >
        <div className="space-y-5">
          {/* Success message */}
          {success && <Alert type="success" message={success} />}

          {/* Error message */}
          {error && (
            <Alert
              type="error"
              message={error}
              onClose={() => setError(null)}
            />
          )}

          {/* Invitee info */}
          <div className="flex items-start space-x-3 mb-3">
            <div
              className="avatar cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => handleUserClick(inviteeId)}
              title="View profile"
            >
              <div className="w-12 h-12 rounded-full relative">
                {inviteeAvatar ? (
                  <img
                    src={inviteeAvatar}
                    alt={getUsername()}
                    className="object-cover w-full h-full rounded-full"
                    onError={(e) => {
                      e.target.style.display = "none";
                      const fallback =
                        e.target.parentElement.querySelector(
                          ".avatar-fallback"
                        );
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className="avatar-fallback bg-primary text-primary-content flex items-center justify-center w-full h-full rounded-full absolute inset-0"
                  style={{
                    display: inviteeAvatar ? "none" : "flex",
                  }}
                >
                  <span className="text-lg font-medium">
                    {getUserInitials(getInviteeUserObject())}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h4
                className="font-medium text-base-content cursor-pointer hover:text-primary transition-colors leading-[120%] mb-[0.2em]"
                onClick={() => handleUserClick(inviteeId)}
                title="View profile"
              >
                {getInviteeDisplayName()}
              </h4>

              <p
                className="text-sm text-base-content/70 cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleUserClick(inviteeId)}
                title="View profile"
              >
                @{getUsername()}
              </p>
            </div>
          </div>

          {/* Bio if available */}
          {inviteeBio && (
            <div className="text-sm text-base-content/80 mb-5">
              <p className="line-clamp-2">{inviteeBio}</p>
            </div>
          )}

          {/* Team selection */}
          <div>
            <p className="text-xs text-base-content/60 mb-2 flex items-center">
              <Users size={12} className="text-primary mr-1" />
              Select a team to invite them to:
            </p>

            {loading ? (
              <div className="flex justify-center py-6">
                <div className="loading loading-spinner loading-md text-primary"></div>
              </div>
            ) : teams.length === 0 ? (
              <div className="text-center py-6 bg-base-200/30 rounded-lg border border-base-300">
                <AlertCircle className="mx-auto mb-2 text-warning" size={28} />
                <p className="text-sm text-base-content/70">
                  You don't have any teams where you can invite members.
                </p>
                <p className="text-xs text-base-content/50 mt-1">
                  Create a team or become an admin to send invitations.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                {teams.map((team) => {
                  const statusBadge = getTeamStatusBadge(team.id, team);
                  const BadgeIcon = statusBadge?.icon;

                  return (
                    <div
                      key={team.id}
                      onClick={() => handleCardClick(team)}
                      className={`relative flex items-center gap-3 p-3 rounded-xl shadow cursor-pointer transition-all duration-200 
                        ${
                          selectedTeamId === team.id
                            ? "bg-green-100 ring-2 ring-primary shadow-md"
                            : "bg-green-50 hover:bg-green-100 hover:shadow-md"
                        }`}
                    >
                      {/* Status badge */}
                      {statusBadge && (
                        <div
                          className="absolute top-2 right-2"
                          onClick={(e) =>
                            handleBadgeClick(e, team.id, team, statusBadge)
                          }
                        >
                          <span
                            className={`badge badge-sm gap-1 ${
                              statusBadge.badgeClass || ""
                            } ${
                              statusBadge.clickable
                                ? "cursor-pointer hover:shadow-md transition-all duration-200"
                                : ""
                            }`}
                            style={statusBadge.customStyle || {}}
                          >
                            <BadgeIcon className="w-3 h-3" />
                            {statusBadge.label}
                          </span>
                        </div>
                      )}

                      {/* Team avatar */}
                      <div className="avatar flex-shrink-0">
                        <div className="w-10 h-10 rounded-full relative">
                          {getTeamAvatarUrl(team) ? (
                            <img
                              src={getTeamAvatarUrl(team)}
                              alt={team.name}
                              className="object-cover w-full h-full rounded-full"
                              onError={(e) => {
                                e.target.style.display = "none";
                                const fallback =
                                  e.target.parentElement.querySelector(
                                    ".avatar-fallback"
                                  );
                                if (fallback) fallback.style.display = "flex";
                              }}
                            />
                          ) : null}
                          <div
                            className="avatar-fallback bg-primary text-primary-content flex items-center justify-center w-full h-full rounded-full absolute inset-0"
                            style={{
                              display: getTeamAvatarUrl(team) ? "none" : "flex",
                            }}
                          >
                            <span className="text-sm font-medium">
                              {getTeamInitials(team.name)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Team info */}
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-medium truncate leading-tight pr-16">
                          {team.name}
                        </p>
                        <p className="text-xs text-base-content/70">
                          <Users size={12} className="inline mr-1" />
                          {getMemberCount(team)}/{getMaxMembers(team)} members
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Optional message */}
          {teams.length > 0 && (
            <div>
              <p className="text-xs text-base-content/60 mb-1 flex items-center">
                <Send size={12} className="text-info mr-1" />
                Add a message (optional):
              </p>
              <div className="relative">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Hi ${getInviteeDisplayName()}, I'd like to invite you to join our team...`}
                  className="textarea textarea-bordered w-full h-24 resize-none text-sm pb-6"
                  maxLength={500}
                />
                <span className="absolute bottom-2 left-3 text-xs text-base-content/40 pointer-events-none">
                  {message.length}/500 characters
                </span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* User Details Modal */}
      <UserDetailsModal
        isOpen={!!selectedUserId}
        userId={selectedUserId}
        onClose={handleUserModalClose}
      />

      {/* Team Details Modal */}
      <TeamDetailsModal
        isOpen={isTeamDetailsOpen}
        teamId={selectedTeamForDetails?.id}
        initialTeamData={selectedTeamForDetails}
        onClose={handleTeamDetailsClose}
      />

      {/* Team Invites Modal */}
      <TeamInvitesModal
        isOpen={isInvitesModalOpen}
        onClose={handleInvitesModalClose}
        invitations={selectedTeamInvitations}
        onCancelInvitation={handleCancelInvitation}
        teamName={selectedTeamForModal?.name}
        highlightUserId={inviteeId}
      />

      {/* Team Applications Modal */}
      <TeamApplicationsModal
        isOpen={isApplicationsModalOpen}
        onClose={handleApplicationsModalClose}
        applications={selectedTeamApplications}
        onApplicationAction={handleApplicationAction}
        teamName={selectedTeamForModal?.name}
        highlightUserId={inviteeId}
      />
    </>
  );
};

export default TeamInviteModal;
