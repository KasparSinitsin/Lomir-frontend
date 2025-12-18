import React, { useState, useEffect } from "react";
import { Users, Send, UserPlus, AlertCircle } from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Alert from "../common/Alert";
import UserDetailsModal from "../users/UserDetailsModal";
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

  // Fetch teams where user can invite
  useEffect(() => {
    const fetchTeams = async () => {
      if (!isOpen) return;

      try {
        setLoading(true);
        setError(null);
        const response = await teamService.getTeamsWhereUserCanInvite();
        setTeams(response.data || []);
      } catch (err) {
        console.error("Error fetching teams:", err);
        setError("Failed to load your teams. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [isOpen]);

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
  const getDisplayName = () => {
    const first = inviteeFirstName || "";
    const last = inviteeLastName || "";
    const fullName = `${first} ${last}`.trim();

    if (fullName.length > 0) {
      return fullName;
    }

    // Fallback to inviteeName prop, then username, then "Unknown User"
    return inviteeName || inviteeUsername || "Unknown User";
  };

  // Get username with @ prefix
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

  // Get team avatar URL - handles both snake_case and camelCase
  const getTeamAvatarUrl = (team) => {
    return team.teamavatar_url || team.teamavatarUrl || null;
  };

  // Get current member count - handles both snake_case and camelCase
  const getMemberCount = (team) => {
    return (
      team.current_members_count ??
      team.currentMembersCount ??
      team.member_count ??
      team.memberCount ??
      0
    );
  };

  // Get max members - handles both snake_case and camelCase, returns "∞" for unlimited
  const getMaxMembers = (team) => {
    const max = team.max_members ?? team.maxMembers;
    return max === null || max === undefined ? "∞" : max;
  };

  // Get team initials from name (e.g., "Urban Gardeners Berlin" → "UGB")
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

  const handleSendInvitation = async () => {
    if (!selectedTeamId) {
      setError("Please select a team");
      return;
    }

    try {
      setSending(true);
      setError(null);

      await teamService.sendInvitation(selectedTeamId, inviteeId, message);

      setSuccess(`Invitation sent to ${getDisplayName()}!`);

      // Close modal after a short delay
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

  const handleTeamSelect = (teamId) => {
    setSelectedTeamId(teamId);
    setError(null);
  };

  // Handler to open user profile modal
  const handleUserClick = (userId) => {
    if (userId) {
      setSelectedUserId(userId);
    }
  };

  // Handler to close user profile modal
  const handleUserModalClose = () => {
    setSelectedUserId(null);
  };

  // Custom header
  const customHeader = (
    <div className="flex items-center gap-3">
      <UserPlus className="text-primary" size={24} />
      <div>
        <h2 className="text-xl font-medium text-primary">Invite to Team</h2>
        <p className="text-sm text-base-content/70">
          Invite {getDisplayName()} to join your team
        </p>
      </div>
    </div>
  );

  // Footer with action buttons
  const footer = (
    <div className="flex justify-end gap-3">
      <Button variant="ghost" onClick={onClose} disabled={sending}>
        Cancel
      </Button>
      <Button
        variant="primary"
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

          {/* Invitee info - No box, matching TeamInvitationDetailsModal style */}
          <div className="flex items-start space-x-3 mb-3">
            {/* Avatar - Clickable */}
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
                      // If image fails to load, hide it and show fallback
                      e.target.style.display = "none";
                      const fallback =
                        e.target.parentElement.querySelector(
                          ".avatar-fallback"
                        );
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                ) : null}
                {/* Fallback initials */}
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

            {/* Name and Details */}
            <div className="flex-1 min-w-0">
              <h4
                className="font-medium text-base-content cursor-pointer hover:text-primary transition-colors leading-[120%] mb-[0.2em]"
                onClick={() => handleUserClick(inviteeId)}
                title="View profile"
              >
                {getDisplayName()}
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
            {/* Label outside the box */}
            <p className="text-xs text-base-content/60 mb-1 flex items-center">
              <Users size={12} className="text-primary mr-1" />
              Select a team to invite them to:
            </p>

            {/* Team list inside grey box */}
            <div className="p-3 bg-base-200/30 rounded-lg border border-base-300">
              {loading ? (
                <div className="flex justify-center py-6">
                  <div className="loading loading-spinner loading-md text-primary"></div>
                </div>
              ) : teams.length === 0 ? (
                <div className="text-center py-6">
                  <AlertCircle
                    className="mx-auto mb-2 text-warning"
                    size={28}
                  />
                  <p className="text-sm text-base-content/70">
                    You don't have any teams where you can invite members.
                  </p>
                  <p className="text-xs text-base-content/50 mt-1">
                    Create a team or become an admin to send invitations.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      onClick={() => handleTeamSelect(team.id)}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200 
                        ${
                          selectedTeamId === team.id
                            ? "bg-primary/10 border border-primary"
                            : "bg-base-100 border border-transparent hover:bg-base-200"
                        }`}
                    >
                      {/* Team avatar */}
                      <div className="avatar">
                        <div className="w-10 h-10 rounded-full relative">
                          {getTeamAvatarUrl(team) ? (
                            <img
                              src={getTeamAvatarUrl(team)}
                              alt={team.name}
                              className="object-cover w-full h-full rounded-full"
                              onError={(e) => {
                                // If image fails to load, hide it and show fallback
                                e.target.style.display = "none";
                                const fallback =
                                  e.target.parentElement.querySelector(
                                    ".avatar-fallback"
                                  );
                                if (fallback) fallback.style.display = "flex";
                              }}
                            />
                          ) : null}
                          {/* Fallback initials */}
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
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{team.name}</p>
                        <p className="text-xs text-base-content/70">
                          <Users size={12} className="inline mr-1" />
                          {getMemberCount(team)}/{getMaxMembers(team)} members
                          {team.available_spots !== null &&
                            team.available_spots !== undefined && (
                              <span className="ml-2 text-success">
                                ({team.available_spots} spots available)
                              </span>
                            )}
                        </p>
                      </div>

                      {/* Selection indicator */}
                      {selectedTeamId === team.id && (
                        <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-primary-content"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Optional message */}
          {teams.length > 0 && (
            <div>
              <p className="text-xs text-base-content/60 mb-1 flex items-center">
                <Send size={12} className="text-info mr-1" />
                Add a message (optional):
              </p>
              {/* Textarea wrapper with character count inside */}
              <div className="relative">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Hi ${getDisplayName()}, I'd like to invite you to join our team...`}
                  className="textarea textarea-bordered w-full h-24 resize-none text-sm pb-6"
                  maxLength={500}
                />
                {/* Character count positioned inside textarea at bottom-left */}
                <span className="absolute bottom-2 left-3 text-sm text-base-content/40 pointer-events-none">
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
    </>
  );
};

export default TeamInviteModal;
