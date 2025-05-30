import React, { useState, useEffect } from "react";
import { X, Check, X as Decline, User } from "lucide-react";
import Button from "../common/Button";
import Alert from "../common/Alert";
import LocationDisplay from "../common/LocationDisplay";

const TeamApplicationsModal = ({
  isOpen,
  onClose,
  teamId,
  applications = [],
  onApplicationAction,
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-40"
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-4xl max-h-[90vh] rounded-xl overflow-hidden bg-base-100 shadow-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-base-300 flex justify-between items-center">
          <h2 className="text-xl font-medium text-primary">
            Team Applications
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
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
              <User size={48} className="mx-auto mb-4 text-base-content/40" />
              <p className="text-base-content/60">No pending applications</p>
            </div>
          ) : (
            <div className="space-y-6">
              {applications.map((application) => (
                <div
                  key={application.id}
                  className="border border-base-300 rounded-lg p-6"
                >
                  {/* Applicant Profile Card */}
                  <div className="flex items-start bg-base-200/30 rounded-lg p-4 mb-4">
                    <div className="avatar mr-4">
                      <div className="w-12 h-12 rounded-full">
                        {application.applicant?.avatar_url ? (
                          <img
                            src={application.applicant.avatar_url}
                            alt={application.applicant.username}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="placeholder bg-primary text-primary-content rounded-full w-12 h-12 flex items-center justify-center">
                            <span className="text-lg">
                              {application.applicant?.first_name?.charAt(0) ||
                                application.applicant?.username?.charAt(0) ||
                                "?"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-grow">
                      <h3 className="font-medium text-primary mb-1">
                        {application.applicant?.first_name &&
                        application.applicant?.last_name
                          ? `${application.applicant.first_name} ${application.applicant.last_name}`
                          : application.applicant?.username}
                      </h3>
                      <p className="text-sm text-base-content/70 mb-2">
                        @{application.applicant?.username}
                      </p>

                      {application.applicant?.postal_code && (
                        <LocationDisplay
                          postalCode={application.applicant.postal_code}
                          className="text-sm text-base-content/70"
                          showIcon={true}
                          displayType="short"
                        />
                      )}

                      {application.applicant?.bio && (
                        <p className="text-sm text-base-content/80 mt-2">
                          {application.applicant.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Application Message */}
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Application Message:</h4>
                    <div className="bg-base-200/50 rounded-lg p-3">
                      <p className="text-base-content/90">
                        {application.message}
                      </p>
                    </div>
                  </div>

                  {/* Response Input */}
                  <div className="mb-4">
                    <label className="label">
                      <span className="label-text font-medium">
                        Your response (optional):
                      </span>
                    </label>
                    <textarea
                      value={responses[application.id] || ""}
                      onChange={(e) =>
                        handleResponseChange(application.id, e.target.value)
                      }
                      className="textarea textarea-bordered w-full h-20"
                      placeholder="Write a message to the applicant..."
                      disabled={loading}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3">
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
        </div>
      </div>
    </div>
  );
};

export default TeamApplicationsModal;
