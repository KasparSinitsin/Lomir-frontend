import React, { useState } from "react";
import {
  Check,
  X as Decline,
  User,
  Calendar,
  Mail,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Alert from "../common/Alert";
import LocationDisplay from "../common/LocationDisplay";

const TeamApplicationsModal = ({
  isOpen,
  onClose,
  applications = [],
  onApplicationAction,
  teamName,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [responses, setResponses] = useState({});

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

  // Format date helper - handles multiple possible property names
  const getApplicationDate = (application) => {
    const dateValue =
      application?.created_at ||
      application?.createdAt ||
      application?.date ||
      application?.applied_at;

    if (!dateValue) {
      return "Unknown date";
    }

    try {
      return format(new Date(dateValue), "MMM d, yyyy");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Unknown date";
    }
  };

  // Custom header with application count
  const customHeader = (
    <div>
      <h2 className="text-xl font-medium text-primary">
        {teamName
          ? `Applications received for ${teamName}`
          : "Team Applications"}
      </h2>
      <p className="text-sm text-base-content/70 mt-1">
        {applications.length} pending application
        {applications.length !== 1 ? "s" : ""}
      </p>
    </div>
  );

  // Optional footer with summary
  const footer =
    applications.length > 0 ? (
      <div className="flex justify-between items-center text-sm text-base-content/70">
        <span>Review each application carefully before making decisions.</span>
        <span>
          Total: {applications.length} application
          {applications.length !== 1 ? "s" : ""}
        </span>
      </div>
    ) : null;

  React.useEffect(() => {
    if (applications.length > 0) {
      console.log(
        "Applications data for avatar debug:",
        applications.map((app) => ({
          id: app.id,
          applicant_id: app.applicant?.id,
          avatar_url: app.applicant?.avatar_url,
          username: app.applicant?.username,
        }))
      );
    }
  }, [applications]);

  if (applications.length > 0 && applications[0].applicant) {
    console.log(
      "First applicant avatar_url:",
      applications[0].applicant.avatar_url
    );
    console.log("Full first applicant data:", applications[0].applicant);
  }

  // Debug avatar data - add this before the return statement
  console.log("=== AVATAR DEBUG ===");
  if (applications.length > 0) {
    applications.forEach((app, index) => {
      console.log(`Application ${index + 1}:`, {
        applicant_id: app.applicant?.id,
        username: app.applicant?.username,
        avatar_url: app.applicant?.avatar_url,
        avatar_url_type: typeof app.applicant?.avatar_url,
        full_applicant: app.applicant,
      });
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customHeader}
      footer={footer}
      // PRESERVE ORIGINAL STYLING: Large size for multiple applications
      position="center"
      size="lg"
      zIndex="z-50"
      closeOnBackdrop={true}
      maxHeight="max-h-[90vh]"
      minHeight="min-h-[400px]"
      footerClassName="bg-base-50"
    >
      {/* Content */}
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

      {applications.length === 0 ? (
        <div className="text-center py-12">
          <User size={48} className="mx-auto text-base-content/30 mb-4" />
          <h3 className="text-lg font-medium text-base-content/70 mb-2">
            No pending applications
          </h3>
          <p className="text-base-content/50">
            When users apply to join your team, they'll appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {applications.map((application) => (
            <div
              key={application.id}
              className="bg-base-200/30 rounded-lg border border-base-300 p-4"
            >
              {/* Applicant Info */}
              <div className="flex items-start space-x-4 mb-4">
                {/* Avatar */}
                <div className="avatar">
                  <div className="w-12 h-12 rounded-full">
                    {application.applicant?.avatarUrl ? (
                      <img
                        src={application.applicant.avatarUrl}
                        alt={
                          application.applicant.firstName ||
                          application.applicant.username
                        }
                        className="object-cover w-full h-full rounded-full"
                        onError={(e) => {
                          console.log(
                            "Avatar failed to load:",
                            application.applicant.avatarUrl
                          );
                          // If image fails to load, hide it and show the fallback
                          e.target.style.display = "none";
                          const fallback =
                            e.target.parentElement.querySelector(
                              ".avatar-fallback"
                            );
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                    ) : null}

                    {/* Fallback initial */}
                    <div
                      className="avatar-fallback bg-primary text-primary-content flex items-center justify-center w-full h-full rounded-full absolute inset-0"
                      style={{
                        display: application.applicant?.avatarUrl
                          ? "none"
                          : "flex",
                      }}
                    >
                      <span className="text-lg font-medium">
                        {(
                          application.applicant?.firstName ||
                          application.applicant?.username
                        )
                          ?.charAt(0)
                          ?.toUpperCase() || "?"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-base-content">
                    {application.applicant?.firstName &&
                    application.applicant?.lastName
                      ? `${application.applicant.firstName} ${application.applicant.lastName}`
                      : application.applicant?.username || "Unknown User"}
                  </h4>

                  {application.applicant?.username &&
                    application.applicant?.firstName &&
                    application.applicant?.lastName && (
                      <p className="text-sm text-base-content/70">
                        @{application.applicant.username}
                      </p>
                    )}
                </div>

                {/* Application Date - top right */}
                <div className="flex items-center text-xs text-base-content/60 flex-shrink-0">
                  <Calendar size={12} className="mr-1" />
                  <span>{getApplicationDate(application)}</span>
                </div>
              </div>

              {/* Bio if available */}
              {application.applicant?.bio && (
                <div className="mb-5 text-sm text-base-content/80">
                  <p className="line-clamp-2">{application.applicant.bio}</p>
                </div>
              )}

              {/* Application Message */}
              <div className="mb-5">
                <p className="text-xs text-base-content/60 mb-1 flex items-center">
                  <Mail size={12} className="text-pink-500 mr-1" />
                  Application message:
                </p>
                <p className="text-sm text-base-content/90">
                  {application.message || "No message provided."}
                </p>
              </div>

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

              {/* Action Buttons */}
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
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

export default TeamApplicationsModal;
