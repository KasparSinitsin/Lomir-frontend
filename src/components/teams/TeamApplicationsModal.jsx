import React, { useState } from "react";
import { Check, X as Decline, User, Mail, MessageSquare } from "lucide-react";
import RequestListModal from "../common/RequestListModal";
import PersonRequestCard from "../common/PersonRequestCard";
import Button from "../common/Button";
import UserDetailsModal from "../users/UserDetailsModal";

/**
 * TeamApplicationsModal Component
 *
 * Displays pending applications for a team.
 * Allows team owners and admins to approve or decline applications.
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Function} onClose - Callback to close the modal
 * @param {Array} applications - Array of pending application objects
 * @param {Function} onApplicationAction - Callback to handle approve/decline
 * @param {string} teamName - Name of the team (for display)
 */
const TeamApplicationsModal = ({
  isOpen,
  onClose,
  applications = [],
  onApplicationAction,
  teamName,
}) => {
  // ============ State ============
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [responses, setResponses] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);

  // ============ Handlers ============

  const handleResponseChange = (applicationId, response) => {
    setResponses((prev) => ({
      ...prev,
      [applicationId]: response,
    }));
  };

  const handleApplicationAction = async (
    applicationId,
    action,
    response = ""
  ) => {
    try {
      setLoading(true);
      setError(null);

      await onApplicationAction(applicationId, action, response);

      setSuccess(
        `Application ${
          action === "approve" ? "approved" : "declined"
        } successfully!`
      );

      // Clear the response for this application
      setResponses((prev) => {
        const newResponses = { ...prev };
        delete newResponses[applicationId];
        return newResponses;
      });
    } catch (err) {
      setError(err.message || `Failed to ${action} application`);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (userId) => {
    if (userId) {
      setSelectedUserId(userId);
    }
  };

  // ============ Helper Functions ============

  // Get the date from application (handles multiple field names)
  const getApplicationDate = (application) => {
    return (
      application?.created_at ||
      application?.createdAt ||
      application?.date ||
      application?.applied_at
    );
  };

  // ============ Render ============

  return (
    <RequestListModal
      isOpen={isOpen}
      onClose={onClose}
      title="Applications received for"
      subtitle={teamName}
      itemCount={applications.length}
      itemName="application"
      footerText="Review each application carefully before making decisions."
      error={error}
      onErrorClose={() => setError(null)}
      success={success}
      onSuccessClose={() => setSuccess(null)}
      emptyIcon={User}
      emptyTitle="No pending applications"
      emptyMessage="When users apply to join your team, they'll appear here."
      extraModals={
        <UserDetailsModal
          isOpen={!!selectedUserId}
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      }
    >
      {applications.map((application) => (
        <PersonRequestCard
          key={application.id}
          user={application.applicant}
          date={getApplicationDate(application)}
          message={application.message || "No message provided."}
          messageLabel="Application message:"
          messageIcon={<Mail size={12} className="text-pink-500 mr-1" />}
          onUserClick={handleUserClick}
          showLocation={false}
          extraContent={
            <>
              {/* User Tags/Skills if available */}
              {application.applicant?.tags &&
                application.applicant.tags.length > 0 && (
                  <div className="mb-4">
                    <h5 className="font-medium text-sm text-base-content/80 mb-2">
                      Skills & Interests:
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {application.applicant.tags.slice(0, 6).map((tag) => (
                        <span
                          key={tag.id}
                          className="badge badge-outline badge-sm text-xs"
                        >
                          {tag.name}
                        </span>
                      ))}
                      {application.applicant.tags.length > 6 && (
                        <span className="badge badge-ghost badge-sm text-xs">
                          +{application.applicant.tags.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

              {/* Response Textarea */}
              <div className="mb-5">
                <p className="text-xs text-base-content/60 mb-1 flex items-center">
                  <MessageSquare size={12} className="text-primary mr-1" />
                  Your response message (optional):
                </p>
                <textarea
                  value={responses[application.id] || ""}
                  onChange={(e) =>
                    handleResponseChange(application.id, e.target.value)
                  }
                  className="textarea textarea-bordered textarea-sm w-full h-20 resize-none text-sm"
                  placeholder="Add a personal message to your decision..."
                  disabled={loading}
                />
              </div>
            </>
          }
          actions={
            <div className="flex justify-end space-x-2">
              <Button
                variant="error"
                size="sm"
                onClick={() =>
                  handleApplicationAction(
                    application.id,
                    "decline",
                    responses[application.id] || ""
                  )
                }
                disabled={loading}
                icon={<Decline size={16} />}
              >
                Decline
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={() =>
                  handleApplicationAction(
                    application.id,
                    "approve",
                    responses[application.id] || ""
                  )
                }
                disabled={loading}
                icon={<Check size={16} />}
              >
                Accept & Add to Team
              </Button>
            </div>
          }
        />
      ))}
    </RequestListModal>
  );
};

export default TeamApplicationsModal;
