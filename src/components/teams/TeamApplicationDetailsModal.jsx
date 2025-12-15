import React, { useState } from "react";
import { Calendar, Users, X, SendHorizontal } from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import TeamDetailsModal from "./TeamDetailsModal";
import UserDetailsModal from "../users/UserDetailsModal";
import Alert from "../common/Alert";
import { format } from "date-fns";

/**
 * TeamApplicationDetailsModal Component
 *
 * Displays application details and allows user to cancel their application.
 * Design matches TeamInvitationDetailsModal for consistency.
 */
const TeamApplicationDetailsModal = ({
  isOpen,
  application,
  onClose,
  onCancel,
  onSendReminder,
}) => {
  // ============ State ============
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [isTeamDetailsOpen, setIsTeamDetailsOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // ============ Helpers ============

  // Get team data from application
  const team = application?.team || {};
  const owner = application?.owner || {};

  // Format application date
  const getApplicationDate = () => {
    const date =
      application?.created_at ||
      application?.createdAt ||
      application?.date ||
      application?.applied_at;

    if (!date) return "Unknown date";

    try {
      return format(new Date(date), "MMM d, yyyy");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Unknown date";
    }
  };

  // Get team avatar
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

  // Get owner (receiver) initials - consistent with inviter pattern
  const getOwnerInitials = () => {
    const firstName = owner.first_name || owner.firstName;
    const lastName = owner.last_name || owner.lastName;

    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    if (firstName) return firstName.charAt(0).toUpperCase();
    if (owner.username) return owner.username.charAt(0).toUpperCase();
    return "?";
  };

  const getOwnerAvatar = () => {
    return owner.avatar_url || owner.avatarUrl || null;
  };

  const handleTeamClick = () => {
    if (team?.id) setIsTeamDetailsOpen(true);
  };

  const handleUserClick = (userId) => {
    if (userId) {
      setSelectedUserId(userId);
    }
  };

  // ============ Handlers ============

  const handleCancelApplication = async () => {
    if (
      !window.confirm(
        "Are you sure you want to cancel your application to this team?"
      )
    ) {
      return;
    }

    try {
      setActionLoading("cancel");
      setError(null);
      await onCancel(application.id);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to cancel application");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendReminder = async () => {
    try {
      setActionLoading("reminder");
      setError(null);

      if (!onSendReminder) {
        throw new Error("onSendReminder is not provided");
      }

      await onSendReminder(application.id);
    } catch (err) {
      setError(err.message || "Failed to send reminder");
    } finally {
      setActionLoading(null);
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
        <SendHorizontal size={14} className="mr-1.5" />
        You applied
      </p>
    </div>
  );

  // Footer with "Received by" (left) and buttons (right)
  // Owner display now matches the inviter display pattern in TeamInvitationDetailsModal
  const footer = (
    <div className="flex items-center justify-between gap-3">
      {/* Received by (left) */}
      <div className="flex items-center text-xs text-base-content/60">
        <span className="mr-1">Received by</span>

        {/* Owner Avatar */}
        <div
          className="avatar cursor-pointer hover:opacity-80 transition-opacity mr-1"
          onClick={() => handleUserClick(owner?.id)}
          title="View profile"
        >
          <div className="w-4 h-4 rounded-full relative">
            {getOwnerAvatar() ? (
              <img
                src={getOwnerAvatar()}
                alt="Owner"
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
                display: getOwnerAvatar() ? "none" : "flex",
                fontSize: "8px",
              }}
            >
              <span className="font-medium">{getOwnerInitials()}</span>
            </div>
          </div>
        </div>

        {/* Owner Name - consistent with TeamInvitationDetailsModal pattern */}
        <span
          className="font-medium text-base-content/80 cursor-pointer hover:text-primary transition-colors"
          onClick={() => handleUserClick(owner?.id)}
          title="View profile"
        >
          {(() => {
            const firstName = owner.first_name || owner.firstName;
            const lastName = owner.last_name || owner.lastName;
            const full = `${firstName || ""} ${lastName || ""}`.trim();
            return full.length > 0 ? full : "Unknown";
          })()}
        </span>
      </div>

      {/* Buttons (right) */}
      <div className="flex justify-end gap-2">
        <Button
          variant="successOutline"
          size="sm"
          onClick={handleSendReminder}
          disabled={loading || actionLoading !== null}
          icon={<SendHorizontal size={16} />}
        >
          {actionLoading === "reminder" ? "Sending..." : "Send Reminder"}
        </Button>

        <Button
          variant="errorOutline"
          size="sm"
          onClick={handleCancelApplication}
          disabled={loading || actionLoading !== null}
          icon={<X size={16} />}
        >
          {actionLoading === "cancel" ? "Canceling..." : "Cancel Application"}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen && !!application}
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
          {/* Team info */}
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
            <span>{getApplicationDate()}</span>
          </div>
        </div>

        {/* Team description */}
        {team.description && (
          <p className="text-sm text-base-content/80 mb-5">
            {team.description}
          </p>
        )}

        {/* Application Message */}
        {application?.message && (
          <div className="mb-4">
            <p className="text-xs text-base-content/60 mb-0.5 flex items-center">
              <SendHorizontal size={12} className="text-info mr-1" />
              Your application message:
            </p>
            <p className="text-sm text-base-content/90 leading-relaxed">
              {application.message}
            </p>
          </div>
        )}

        {/* No message fallback */}
        {!application?.message && (
          <div className="mb-4">
            <p className="text-xs text-base-content/60 mb-0.5 flex items-center">
              <SendHorizontal size={12} className="text-info mr-1" />
              Your application message:
            </p>
            <p className="text-sm text-base-content/50 italic leading-relaxed">
              No message provided.
            </p>
          </div>
        )}
      </Modal>

      {/* Team Details Modal */}
      <TeamDetailsModal
        isOpen={isTeamDetailsOpen}
        teamId={team?.id}
        initialTeamData={team}
        onClose={() => setIsTeamDetailsOpen(false)}
        isFromSearch={true}
      />

      {/* User Details Modal (for viewing owner profile) */}
      <UserDetailsModal
        isOpen={!!selectedUserId}
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
    </>
  );
};

export default TeamApplicationDetailsModal;
