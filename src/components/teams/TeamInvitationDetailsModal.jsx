import React, { useState } from "react";
import {
  Calendar,
  MessageSquare,
  Users,
  Check,
  X,
  MailOpen,
} from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import UserDetailsModal from "../users/UserDetailsModal";
import TeamDetailsModal from "./TeamDetailsModal";
import Alert from "../common/Alert";
import { format } from "date-fns";

/**
 * TeamInvitationDetailsModal Component
 *
 * Displays invitation details and allows user to accept or decline.
 * Similar structure to TeamApplicationDetailsModal.
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Object} invitation - Invitation data object
 * @param {Function} onClose - Callback to close the modal
 * @param {Function} onAccept - Callback to accept invitation
 * @param {Function} onDecline - Callback to decline invitation
 */
const TeamInvitationDetailsModal = ({
  isOpen,
  invitation,
  onClose,
  onAccept,
  onDecline,
}) => {
  // ============ State ============
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // "accept" | "decline" | null
  const [error, setError] = useState(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isTeamDetailsOpen, setIsTeamDetailsOpen] = useState(false);

  // ============ Helpers ============

  // Get team data from invitation
  const team = invitation?.team || {};
  const inviter = invitation?.inviter || {};

  // Format invitation date
  const getInvitationDate = () => {
    const date =
      invitation?.created_at ||
      invitation?.createdAt ||
      invitation?.date ||
      invitation?.sent_at;

    if (!date) return "Unknown date";

    try {
      return format(new Date(date), "MMM d, yyyy");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Unknown date";
    }
  };

  // Get inviter display name
  const getInviterName = () => {
    const firstName = inviter.first_name || inviter.firstName;
    const lastName = inviter.last_name || inviter.lastName;

    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return inviter.username || invitation?.inviter_username || "Unknown";
  };

  // Get inviter initials
  const getInviterInitials = () => {
    const firstName = inviter.first_name || inviter.firstName;
    const lastName = inviter.last_name || inviter.lastName;

    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    if (firstName) return firstName.charAt(0).toUpperCase();
    if (inviter.username) return inviter.username.charAt(0).toUpperCase();
    return "?";
  };

  // Get inviter avatar
  const getInviterAvatar = () => {
    return inviter.avatar_url || inviter.avatarUrl || null;
  };

  const getTeamAvatar = () => {
    return (
      team.teamavatar_url ||
      team.teamavatarUrl ||
      team.avatar_url ||
      team.avatarUrl ||
      null
    );
  };

  const getTeamInitial = () =>
    team.name ? team.name.charAt(0).toUpperCase() : "?";

  const getMemberCount = () => {
    return (
      team.current_members_count ??
      team.currentMembersCount ??
      team.member_count ??
      team.memberCount ??
      team.members?.length ??
      0
    );
  };

  const getMaxMembers = () => {
    const max = team.max_members ?? team.maxMembers;
    return max === null || max === undefined ? "∞" : max;
  };

  const handleTeamClick = () => {
    if (team?.id) setIsTeamDetailsOpen(true);
  };

  // ============ Handlers ============

  const handleAccept = async () => {
    try {
      setActionLoading("accept");
      setError(null);
      await onAccept(invitation.id, responseMessage);
      setResponseMessage("");
      onClose();
    } catch (err) {
      setError(err.message || "Failed to accept invitation");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async () => {
    try {
      setActionLoading("decline");
      setError(null);
      await onDecline(invitation.id, responseMessage);
      setResponseMessage("");
      onClose();
    } catch (err) {
      setError(err.message || "Failed to decline invitation");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUserClick = (userId) => {
    if (userId) {
      setSelectedUserId(userId);
    }
  };

  // ============ Render ============

  // Custom header
  const customHeader = (
    <div>
      <h2 className="text-xl font-medium text-primary">
        {team.name || "Unknown Team"}
      </h2>
      <p className="text-sm text-base-content/70 flex items-center">
        <MailOpen size={14} className="mr-1.5" />
        You are invited
      </p>
    </div>
  );

  // Footer with action buttons + "Sent by" (left)
  const footer = (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        {/* Sent by (left) */}
        <div className="flex items-center text-xs text-base-content/60">
          <span className="mr-1">Invite sent by</span>

          {/* Inviter Avatar */}
          <div
            className="avatar cursor-pointer hover:opacity-80 transition-opacity mr-1"
            onClick={() => handleUserClick(inviter?.id)}
            title="View profile"
          >
            <div className="w-4 h-4 rounded-full relative">
              {getInviterAvatar() ? (
                <img
                  src={getInviterAvatar()}
                  alt={getInviterName()}
                  className="object-cover w-full h-full rounded-full"
                  onError={(e) => {
                    e.target.style.display = "none";
                    const fallback =
                      e.target.parentElement.querySelector(".avatar-fallback");
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
              ) : null}

              {/* Fallback initials */}
              <div
                className="avatar-fallback bg-primary text-primary-content flex items-center justify-center w-full h-full rounded-full absolute inset-0"
                style={{
                  display: getInviterAvatar() ? "none" : "flex",
                  fontSize: "8px",
                }}
              >
                <span className="font-medium">{getInviterInitials()}</span>
              </div>
            </div>
          </div>

          {/* Full name only (no username) */}
          <span
            className="font-medium text-base-content/80 cursor-pointer hover:text-primary transition-colors"
            onClick={() => handleUserClick(inviter?.id)}
            title="View profile"
          >
            {(() => {
              const firstName = inviter.first_name || inviter.firstName;
              const lastName = inviter.last_name || inviter.lastName;
              const full = `${firstName || ""} ${lastName || ""}`.trim();
              return full.length > 0 ? full : "Unknown";
            })()}
          </span>
        </div>

        {/* Buttons (right) */}
        <div className="flex justify-end gap-2">
          <Button
            variant="errorOutline"
            size="sm"
            onClick={handleDecline}
            disabled={loading || actionLoading !== null}
            icon={<X size={16} />}
          >
            {actionLoading === "decline" ? "Declining..." : "Decline"}
          </Button>
          <Button
            variant="successOutline"
            size="sm"
            onClick={handleAccept}
            disabled={loading || actionLoading !== null}
            icon={<Check size={16} />}
          >
            {actionLoading === "accept" ? "Accepting..." : "Accept & Join Team"}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen && !!invitation}
        onClose={onClose}
        title={customHeader}
        footer={footer}
        position="center"
        size="default"
        maxHeight="max-h-[90vh]"
        closeOnBackdrop={true}
        closeOnEscape={true}
        showCloseButton={true}
      >
        {/* Error Alert */}
        {error && (
          <Alert
            type="error"
            message={error}
            onClose={() => setError(null)}
            className="mb-4"
          />
        )}

        {/* Top row: Team info (left, clickable) + Date (right) */}
        <div className="flex items-start justify-between gap-4 mb-5">
          {/* Team info (hover + onClick like in TeamInvitesModal) */}
          <div
            className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleTeamClick}
            title="View team details"
          >
            <div className="avatar">
              <div className="w-12 h-12 rounded-full relative">
                {getTeamAvatar() ? (
                  <img
                    src={getTeamAvatar()}
                    alt={team.name || "Team"}
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

                {/* Fallback initials */}
                <div
                  className="avatar-fallback bg-primary text-primary-content flex items-center justify-center w-full h-full rounded-full absolute inset-0"
                  style={{ display: getTeamAvatar() ? "none" : "flex" }}
                >
                  <span className="text-lg font-medium">
                    {getTeamInitial()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-base-content hover:text-primary transition-colors">
                {team.name || "Unknown Team"}
              </h4>
              <p className="text-sm text-base-content/70 flex items-center">
                <Users size={14} className="mr-1 text-primary" />
                {getMemberCount()}/{getMaxMembers()}
              </p>
            </div>
          </div>

          {/* Date - top right */}
          <div className="flex items-center text-xs text-base-content/60 whitespace-nowrap">
            <Calendar size={12} className="mr-1" />
            <span>{getInvitationDate()}</span>
          </div>
        </div>

        {/* Team description */}
        {team.description && (
          <p className="text-sm text-base-content/80 mb-5">
            {team.description}
          </p>
        )}

        {/* Invitation Message */}
        {invitation?.message && (
          <div className="mb-4">
            <p className="text-xs text-base-content/60 mb-0.5 flex items-center">
              <MailOpen size={12} className="text-info mr-1" />
              Invitation message:
            </p>

            {/* left-aligned with other content (no extra padding box) */}
            <p className="text-sm text-base-content/90 leading-relaxed">
              {invitation.message}
            </p>
          </div>
        )}

        {/* Response Textarea */}
        <div className="mt-2">
          <p className="text-xs text-base-content/60 mb-1 flex items-center">
            <MessageSquare size={12} className="text-primary mr-1" />
            Your response message (optional):
          </p>
          <textarea
            value={responseMessage}
            onChange={(e) => setResponseMessage(e.target.value)}
            className="textarea textarea-bordered textarea-sm w-full h-20 resize-none text-sm"
            placeholder="Add a personal message to your decision. Decline messages will be sent as DM to the inviter only. Acceptance messages will be sent to the team chat."
            disabled={loading || actionLoading !== null}
          />
        </div>
      </Modal>

      <TeamDetailsModal
        isOpen={isTeamDetailsOpen}
        teamId={team?.id}
        initialTeamData={team}
        onClose={() => setIsTeamDetailsOpen(false)}
        isFromSearch={true}
        hasPendingInvitation={true}
      />

      {/* User Details Modal */}
      <UserDetailsModal
        isOpen={!!selectedUserId}
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
    </>
  );
};

export default TeamInvitationDetailsModal;
