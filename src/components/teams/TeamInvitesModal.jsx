import React, { useState, useEffect, useRef } from "react";
import { User, MapPin, Calendar, SendHorizontal } from "lucide-react";
import RequestListModal from "../common/RequestListModal";
import PersonRequestCard from "../common/PersonRequestCard";
import Button from "../common/Button";
import UserDetailsModal from "../users/UserDetailsModal";
import { getUserInitials, getDisplayName } from "../../utils/userHelpers";
import { format } from "date-fns";

/**
 * TeamInvitesModal Component
 *
 * Displays pending invitations sent by a team.
 * Allows team owners and admins to view and cancel pending invitations.
 * Consistent design with TeamApplicationsModal.
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Function} onClose - Callback to close the modal
 * @param {Array} invitations - Array of pending invitation objects
 * @param {Function} onCancelInvitation - Callback to cancel an invitation
 * @param {string} teamName - Name of the team (for display)
 * @param {string|number|null} highlightUserId - User ID to scroll to + highlight (optional)
 */
const TeamInvitesModal = ({
  isOpen,
  onClose,
  invitations = [],
  onCancelInvitation,
  teamName,
  highlightUserId = null,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // ============ Refs ============
  const highlightedRef = useRef(null);

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

  // Debug: Log invitation data to check structure
  useEffect(() => {
    if (invitations && invitations.length > 0) {
      console.log("TeamInvitesModal - Invitations data:", invitations);
      console.log("First invitation date fields:", {
        created_at: invitations[0]?.created_at,
        createdAt: invitations[0]?.createdAt,
        date: invitations[0]?.date,
        sent_at: invitations[0]?.sent_at,
      });
      console.log("First invitation invitee avatar fields:", {
        avatar_url: invitations[0]?.invitee?.avatar_url,
        avatarUrl: invitations[0]?.invitee?.avatarUrl,
        first_name: invitations[0]?.invitee?.first_name,
        last_name: invitations[0]?.invitee?.last_name,
      });
      console.log("First invitation inviter fields:", {
        inviter: invitations[0]?.inviter,
        inviter_username: invitations[0]?.inviter_username,
      });
    }
  }, [invitations]);

  // ============ Scroll to highlighted invitation ============
  useEffect(() => {
    if (isOpen && highlightUserId && highlightedRef.current) {
      // Small delay to ensure modal is rendered
      const t = setTimeout(() => {
        highlightedRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);

      return () => clearTimeout(t);
    }
  }, [isOpen, highlightUserId]);

  const handleCancelInvitation = async (invitationId) => {
    if (!window.confirm("Are you sure you want to cancel this invitation?")) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await onCancelInvitation(invitationId);

      setSuccess("Invitation canceled successfully!");

      // Clear success after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || "Failed to cancel invitation");
    } finally {
      setLoading(false);
    }
  };

  // Helper to get avatar URL
  const getAvatarUrl = (user) => {
    return user?.avatar_url || user?.avatarUrl || null;
  };

  // Format invitation date
  const getInvitationDate = (invitation) => {
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

  // ============ Render ============
  return (
    <RequestListModal
      isOpen={isOpen}
      onClose={onClose}
      title="Invitations sent out to"
      subtitle={teamName}
      itemCount={invitations.length}
      itemName="invitation"
      footerText="You can cancel invitations that haven't been responded to."
      error={error}
      onErrorClose={() => setError(null)}
      success={success}
      onSuccessClose={() => setSuccess(null)}
      emptyIcon={User}
      emptyTitle="No pending invitations"
      emptyMessage="Invitations you send to users will appear here."
      extraModals={
        <UserDetailsModal
          isOpen={!!selectedUserId}
          userId={selectedUserId}
          onClose={handleUserModalClose}
        />
      }
    >
      {invitations.map((invitation) => {
        // Get invitee ID for highlighting comparison
        const inviteeId =
          invitation?.invitee?.id ?? invitation?.invitee_id ?? null;

        // Normalize types to avoid "1" vs 1 mismatches (same as TeamApplicationsModal)
        const isHighlighted =
          highlightUserId != null &&
          inviteeId != null &&
          String(inviteeId) === String(highlightUserId);

        return (
          <div
            key={invitation.id}
            ref={isHighlighted ? highlightedRef : null}
            className={`bg-base-200/30 rounded-lg border border-base-300 p-4 transition-all duration-300 ${
              isHighlighted
                ? "ring-2 ring-primary/30 rounded-xl bg-primary/5"
                : ""
            }`}
          >
            {/* Invitee Info Header */}
            <div className="flex items-start space-x-3 mb-3">
              {/* Avatar - Clickable */}
              <div
                className="avatar cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => handleUserClick(invitation.invitee?.id)}
                title="View profile"
              >
                <div className="w-12 h-12 rounded-full relative">
                  {getAvatarUrl(invitation.invitee) ? (
                    <img
                      src={getAvatarUrl(invitation.invitee)}
                      alt={invitation.invitee?.username || "User"}
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
                      display: getAvatarUrl(invitation.invitee)
                        ? "none"
                        : "flex",
                    }}
                  >
                    <span className="text-sm font-medium">
                      {getUserInitials(invitation.invitee)}
                    </span>
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                {/* Name - Clickable */}
                <h4
                  className="font-medium text-base-content cursor-pointer hover:text-primary transition-colors leading-[120%] mb-[0.2em]"
                  onClick={() => handleUserClick(invitation.invitee?.id)}
                  title="View profile"
                >
                  {getDisplayName(invitation.invitee)}
                </h4>
                {/* Username */}
                {invitation.invitee?.username && (
                  <p className="text-sm text-base-content/70">
                    @{invitation.invitee.username}
                  </p>
                )}
              </div>

              {/* Date - top right */}
              <div className="flex items-center text-xs text-base-content/60 whitespace-nowrap">
                <Calendar size={12} className="mr-1" />
                <span>{getInvitationDate(invitation)}</span>
              </div>
            </div>

            {/* Invitation Message (if any) */}
            {invitation.message && (
              <div className="mb-3">
                <p className="text-xs text-base-content/60 mb-0.5 flex items-center">
                  <SendHorizontal size={12} className="text-info mr-1" />
                  Invitation message:
                </p>
                <p className="text-sm text-base-content/90 leading-relaxed">
                  {invitation.message}
                </p>
              </div>
            )}

            {/* Location (if available) */}
            {(invitation.invitee?.location ||
              invitation.invitee?.postal_code) && (
              <div className="flex items-center text-xs text-base-content/60 mb-3">
                <MapPin size={12} className="mr-1" />
                <span>
                  {invitation.invitee?.location ||
                    invitation.invitee?.postal_code}
                </span>
              </div>
            )}

            {/* Inviter info (if available) */}
            {(invitation.inviter || invitation.inviter_username) && (
              <div className="text-xs text-base-content/50 mb-3">
                Invited by{" "}
                {invitation.inviter?.username ||
                  invitation.inviter_username ||
                  "team admin"}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end">
              <Button
                variant="errorOutline"
                size="sm"
                onClick={() => handleCancelInvitation(invitation.id)}
                disabled={loading}
              >
                {loading ? "Canceling..." : "Cancel Invitation"}
              </Button>
            </div>
          </div>
        );
      })}
    </RequestListModal>
  );
};

export default TeamInvitesModal;
