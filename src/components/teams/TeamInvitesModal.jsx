import React, { useState } from "react";
import { X, User, MapPin, Calendar, MessageSquare } from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Alert from "../common/Alert";
import LocationDisplay from "../common/LocationDisplay";
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

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown date";
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (error) {
      return "Unknown date";
    }
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
                {/* Avatar */}
                <div className="avatar">
                  <div className="w-12 h-12 rounded-full bg-base-300 flex items-center justify-center overflow-hidden">
                    {invitation.invitee?.avatar_url ? (
                      <img
                        src={invitation.invitee.avatar_url}
                        alt={invitation.invitee.username}
                        className="rounded-full object-cover w-full h-full"
                      />
                    ) : (
                      <User size={24} className="text-base-content/50" />
                    )}
                  </div>
                </div>

                {/* Name and Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-base-content">
                    {invitation.invitee?.first_name && invitation.invitee?.last_name
                      ? `${invitation.invitee.first_name} ${invitation.invitee.last_name}`
                      : invitation.invitee?.username || "Unknown User"}
                  </h4>
                  <p className="text-sm text-base-content/70">
                    @{invitation.invitee?.username || "unknown"}
                  </p>
                  
                  {/* Location if available */}
                  {invitation.invitee?.postal_code && (
                    <div className="flex items-center text-sm text-base-content/60 mt-1">
                      <MapPin size={14} className="mr-1" />
                      <LocationDisplay postalCode={invitation.invitee.postal_code} />
                    </div>
                  )}
                </div>

                {/* Invite Date */}
                <div className="flex items-center text-sm text-base-content/60">
                  <Calendar size={14} className="mr-1" />
                  <span>{formatDate(invitation.created_at)}</span>
                </div>
              </div>

              {/* Bio if available */}
              {invitation.invitee?.bio && (
                <div className="mb-3 text-sm text-base-content/80 bg-base-200/50 rounded-lg p-3">
                  <p className="line-clamp-2">{invitation.invitee.bio}</p>
                </div>
              )}

              {/* Invitation Message if present */}
              {invitation.message && (
                <div className="mb-3 bg-info/10 rounded-lg p-3">
                  <div className="flex items-start">
                    <MessageSquare
                      size={16}
                      className="text-info mt-0.5 mr-2 flex-shrink-0"
                    />
                    <div>
                      <p className="text-xs text-base-content/60 mb-1">
                        Invitation message:
                      </p>
                      <p className="text-sm text-base-content/90">
                        {invitation.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Invited By info */}
              {invitation.inviter_username && (
                <p className="text-xs text-base-content/60 mb-3">
                  Invited by @{invitation.inviter_username}
                </p>
              )}

              {/* Action Button */}
              <div className="flex justify-end">
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
  );
};

export default TeamInvitesModal;