import React, { useState, useEffect } from "react";
import { X, User, MapPin, Calendar, MessageSquare } from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Alert from "../common/Alert";
import LocationDisplay from "../common/LocationDisplay";
import UserDetailsModal from "../users/UserDetailsModal";
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
 */
const TeamInvitesModal = ({
  isOpen,
  onClose,
  invitations = [],
  onCancelInvitation,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);

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

  const handleCancelInvitation = async (invitationId) => {
    if (!window.confirm("Are you sure you want to cancel this invitation?")) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await onCancelInvitation(invitationId);

      setSuccess("Invitation canceled successfully!");
    } catch (err) {
      setError(err.message || "Failed to cancel invitation");
    } finally {
      setLoading(false);
    }
  };

  // Format date helper - handles multiple possible property names
  const getInvitationDate = (invitation) => {
    // Check multiple possible date field names
    const dateValue =
      invitation?.created_at ||
      invitation?.createdAt ||
      invitation?.date ||
      invitation?.sent_at ||
      invitation?.sentAt;

    if (!dateValue) {
      console.log("No date found for invitation:", invitation);
      return "Unknown date";
    }

    try {
      return format(new Date(dateValue), "MMM d, yyyy");
    } catch (error) {
      console.error("Error formatting date:", error, "Date value:", dateValue);
      return "Unknown date";
    }
  };

  // Helper to get avatar URL - handles both snake_case and camelCase
  const getAvatarUrl = (user) => {
    if (!user) return null;
    return user.avatar_url || user.avatarUrl || null;
  };

  // Helper to get user initials for avatar fallback
  const getUserInitials = (user) => {
    if (!user) return "?";

    const firstName = user.first_name || user.firstName;
    const lastName = user.last_name || user.lastName;
    const username = user.username;

    // If we have both first and last name, use both initials
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }

    // If we only have first name, use that
    if (firstName) {
      return firstName.charAt(0).toUpperCase();
    }

    // Fall back to username initial
    if (username) {
      return username.charAt(0).toUpperCase();
    }

    return "?";
  };

  // Custom header with invitation count
  const customHeader = (
    <div>
      <h2 className="text-xl font-medium text-primary">Sent Invitations</h2>
      <p className="text-sm text-base-content/70 mt-1">
        {invitations.length} pending invitation
        {invitations.length !== 1 ? "s" : ""}
      </p>
    </div>
  );

  // Optional footer with summary
  const footer =
    invitations.length > 0 ? (
      <div className="flex justify-between items-center text-sm text-base-content/70">
        <span>Users will be notified when they receive an invitation.</span>
        <span>
          Total: {invitations.length} invitation
          {invitations.length !== 1 ? "s" : ""}
        </span>
      </div>
    ) : null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={customHeader}
        footer={footer}
        position="center"
        size="lg"
        maxHeight="max-h-[90vh]"
        minHeight="min-h-[300px]"
        closeOnBackdrop={true}
        closeOnEscape={true}
        showCloseButton={true}
      >
        {/* Alerts */}
        {error && (
          <Alert
            type="error"
            message={error}
            onClose={() => setError(null)}
            className="mb-4"
          />
        )}
        {success && (
          <Alert
            type="success"
            message={success}
            onClose={() => setSuccess(null)}
            className="mb-4"
          />
        )}

        {/* Empty State */}
        {invitations.length === 0 ? (
          <div className="text-center py-8 text-base-content/70">
            <User size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No pending invitations</p>
            <p className="text-sm mt-2">
              Invitations you send to users will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="bg-base-200/30 rounded-lg border border-base-300 p-4"
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
                        <span className="text-lg font-medium">
                          {getUserInitials(invitation.invitee)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Name and Details */}
                  <div className="flex-1 min-w-0">
                    <h4
                      className="font-medium text-base-content cursor-pointer hover:text-primary transition-colors"
                      onClick={() => handleUserClick(invitation.invitee?.id)}
                      title="View profile"
                    >
                      {invitation.invitee?.first_name &&
                      invitation.invitee?.last_name
                        ? `${invitation.invitee.first_name} ${invitation.invitee.last_name}`
                        : invitation.invitee?.username || "Unknown User"}
                    </h4>
                    <p
                      className="text-sm text-base-content/70 cursor-pointer hover:text-primary transition-colors"
                      onClick={() => handleUserClick(invitation.invitee?.id)}
                      title="View profile"
                    >
                      @{invitation.invitee?.username || "unknown"}
                    </p>

                    {/* Location if available */}
                    {invitation.invitee?.postal_code && (
                      <div className="flex items-center text-sm text-base-content/60 mt-1">
                        <MapPin size={14} className="mr-1" />
                        <LocationDisplay
                          postalCode={invitation.invitee.postal_code}
                        />
                      </div>
                    )}
                  </div>

                  {/* Invite Date - top right */}
                  <div className="flex items-center text-xs text-base-content/60">
                    <Calendar size={12} className="mr-1" />
                    <span>{getInvitationDate(invitation)}</span>
                  </div>
                </div>

                {/* Bio if available */}
                {invitation.invitee?.bio && (
                  <div className="mb-5 text-sm text-base-content/80">
                    <p className="line-clamp-2">{invitation.invitee.bio}</p>
                  </div>
                )}

                {/* Invitation Message if present */}
                {invitation.message && (
                  <div className="mb-5">
                    <p className="text-xs text-base-content/60 mb-1 flex items-center">
                      <MessageSquare size={12} className="text-info mr-1" />
                      Invitation message:
                    </p>
                    <p className="text-sm text-base-content/90">
                      {invitation.message}
                    </p>
                  </div>
                )}

                {/* Bottom row: Inviter info (left) + Cancel button (right) */}
                <div className="flex items-center justify-between">
                  {/* Inviter info - left side */}
                  {invitation.inviter || invitation.inviter_username ? (
                    <div className="flex items-center text-xs text-base-content/60">
                      <span className="mr-1">Sent by</span>
                      {/* Inviter Avatar */}
                      <div
                        className="avatar cursor-pointer hover:opacity-80 transition-opacity mr-1"
                        onClick={() => handleUserClick(invitation.inviter?.id)}
                        title="View profile"
                      >
                        <div className="w-4 h-4 rounded-full relative">
                          {getAvatarUrl(invitation.inviter) ? (
                            <img
                              src={getAvatarUrl(invitation.inviter)}
                              alt={invitation.inviter?.username || "Inviter"}
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
                              display: getAvatarUrl(invitation.inviter)
                                ? "none"
                                : "flex",
                              fontSize: "8px",
                            }}
                          >
                            <span className="font-medium">
                              {getUserInitials(invitation.inviter) ||
                                invitation.inviter_username
                                  ?.charAt(0)
                                  ?.toUpperCase() ||
                                "?"}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Inviter Name */}
                      <span
                        className="font-medium text-base-content/80 cursor-pointer hover:text-primary transition-colors"
                        onClick={() => handleUserClick(invitation.inviter?.id)}
                        title="View profile"
                      >
                        {invitation.inviter?.first_name &&
                        invitation.inviter?.last_name
                          ? `${invitation.inviter.first_name} ${invitation.inviter.last_name}`
                          : invitation.inviter?.username ||
                            invitation.inviter_username ||
                            "Unknown"}
                      </span>
                    </div>
                  ) : (
                    <div /> /* Empty div to maintain flex spacing */
                  )}

                  {/* Action Button - right side */}
                  <Button
                    variant="error"
                    size="sm"
                    onClick={() => handleCancelInvitation(invitation.id)}
                    disabled={loading}
                    icon={<X size={16} />}
                  >
                    {loading ? "Canceling..." : "Cancel Invitation"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
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

export default TeamInvitesModal;
