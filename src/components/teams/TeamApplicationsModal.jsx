import React, { useState, useEffect, useRef } from "react";
import { Check, X as Decline, User, Mail, MessageSquare, AlertTriangle } from "lucide-react";
import RequestListModal from "../common/RequestListModal";
import PersonRequestCard from "../common/PersonRequestCard";
import Button from "../common/Button";
import Modal from "../common/Modal";
import UserDetailsModal from "../users/UserDetailsModal";
import VacantRoleCard from "./VacantRoleCard";
import TeamApplicationDetailsModal from "./TeamApplicationDetailsModal";
import { vacantRoleService } from "../../services/vacantRoleService";
import { useAuth } from "../../contexts/AuthContext";

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
 * @param {string|number|null} highlightUserId - User ID to scroll to + highlight (optional)
 */
const TeamApplicationsModal = ({
  isOpen,
  onClose,
  teamId = null,
  applications = [],
  onApplicationAction,
  onRoleStatusChanged,
  teamName,
  highlightUserId = null,
}) => {
  // ============ Auth ============
  const { user: currentUser } = useAuth();

  // ============ State ============
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [responses, setResponses] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [roleStatusOverrides, setRoleStatusOverrides] = useState({});
  const [statusUpdatingRoleId, setStatusUpdatingRoleId] = useState(null);
  const [showCloseGuard, setShowCloseGuard] = useState(false);
  const [applicationDetailsFor, setApplicationDetailsFor] = useState(null);

  // ============ Refs ============
  const highlightedRef = useRef(null);

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

      // Determine if the admin toggled "Mark role as filled" for this application's role
      let fillRole = false;
      const application = applications.find((app) => app.id === applicationId);
      if (action === "approve") {
        const appRoleId = application?.role?.id ?? null;
        if (appRoleId && roleStatusOverrides[appRoleId]?.status === "filled") {
          fillRole = true;
        }
      }

      await onApplicationAction(applicationId, action, response, fillRole);

      // If approved, clear the role status override for this application's role
      if (action === "approve") {
        const appRoleId = application?.role?.id ?? null;
        if (appRoleId && roleStatusOverrides[appRoleId]) {
          setRoleStatusOverrides((prev) => {
            const next = { ...prev };
            delete next[appRoleId];
            return next;
          });
        }
      }

      if (action === "approve" && fillRole) {
        const roleName =
          application?.role?.roleName ??
          application?.role?.role_name ??
          "the role";
        setSuccess(`Application approved! ${roleName} has been marked as filled.`);
      } else {
        setSuccess(
          `Application ${action === "approve" ? "approved" : "declined"} successfully!`
        );
      }

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

  const handleRoleStatusChange = async (roleId, newStatus, filledUser = null) => {
    if (!roleId) return;

    // ── "Mark role as filled" → always local-only toggle ──
    if (newStatus === "filled") {
      setRoleStatusOverrides((prev) => ({
        ...prev,
        [roleId]: {
          status: "filled",
          filledBy: filledUser?.id ?? null,
          filledByUser: filledUser ?? null,
        },
      }));
      return;
    }

    // ── "Reopen Role" → check if it's a local toggle or a server-persisted fill ──
    if (newStatus === "open") {
      const hasLocalOverride = !!roleStatusOverrides[roleId];

      // Find the original server status from the application data
      const originalRole = applications.find((app) => {
        const appRoleId = app?.role?.id ?? null;
        return appRoleId != null && String(appRoleId) === String(roleId);
      })?.role;
      const serverStatus = originalRole?.status ?? originalRole?.originalStatus ?? "open";

      if (hasLocalOverride && serverStatus !== "filled") {
        // Case 1: The fill was local-only → just clear the override
        setRoleStatusOverrides((prev) => {
          const next = { ...prev };
          delete next[roleId];
          return next;
        });
        return;
      }

      // Case 2: The role is genuinely filled on the server → API call needed
      if (!teamId) return;

      try {
        setStatusUpdatingRoleId(roleId);
        setError(null);

        await vacantRoleService.updateVacantRoleStatus(teamId, roleId, "open", null);

        // Clear any local override to reflect the server state
        setRoleStatusOverrides((prev) => {
          const next = { ...prev };
          delete next[roleId];
          return next;
        });

        setSuccess("Role reopened successfully!");

        try {
          await onRoleStatusChanged?.(roleId, "open");
        } catch (refreshError) {
          console.warn(
            "Role reopened, but the applications list could not be refreshed:",
            refreshError,
          );
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to reopen role");
      } finally {
        setStatusUpdatingRoleId(null);
      }
    }
  };

  const handleClose = () => {
    if (Object.keys(roleStatusOverrides).length > 0) {
      setShowCloseGuard(true);
      return;
    }
    onClose();
  };

  const handleCloseGuardConfirm = () => {
    setShowCloseGuard(false);
    setRoleStatusOverrides({});
    onClose();
  };

  const handleUserClick = (userId) => {
    if (userId) {
      setSelectedUserId(userId);
    }
  };

  // ============ Helper Functions ============
  const getApplicationDate = (application) => {
    return (
      application?.created_at ||
      application?.createdAt ||
      application?.date ||
      application?.applied_at
    );
  };

  // ============ Effects ============
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

  useEffect(() => {
    if (!isOpen) {
      setStatusUpdatingRoleId(null);
      setRoleStatusOverrides({});
    }
  }, [isOpen]);

  // ============ Render ============
  return (
    <RequestListModal
      isOpen={isOpen}
      onClose={handleClose}
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
        <>
          <UserDetailsModal
            isOpen={!!selectedUserId}
            userId={selectedUserId}
            onClose={() => setSelectedUserId(null)}
          />
          <TeamApplicationDetailsModal
            isOpen={!!applicationDetailsFor}
            application={applicationDetailsFor}
            onClose={() => setApplicationDetailsFor(null)}
          />
          <Modal
            isOpen={showCloseGuard}
            onClose={() => setShowCloseGuard(false)}
            size="small"
            showCloseButton={false}
            closeOnBackdrop={false}
            title={
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
                <span>Discard unsaved changes?</span>
              </div>
            }
            footer={
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowCloseGuard(false)}>
                  Go back
                </Button>
                <Button variant="warning" onClick={handleCloseGuardConfirm}>
                  Discard & close
                </Button>
              </div>
            }
          >
            <p className="text-base-content/80">
              You've marked a role as filled but haven't accepted the applicant yet.
              If you close now, this change will be discarded.
            </p>
          </Modal>
        </>
      }
    >
      {applications.map((application) => {
        const applicantId =
          application?.applicant?.id ?? application?.applicant_id ?? null;
        const roleId = application?.role?.id ?? null;
        const roleOverride = roleId ? roleStatusOverrides[roleId] : null;
        const role =
          application?.role && roleId
            ? {
                ...application.role,
                status:
                  roleOverride?.status ??
                  application.role.status ??
                  "open",
                filledBy:
                  roleOverride?.filledBy ??
                  application.role.filledBy ??
                  application.role.filled_by ??
                  null,
                filledByUser:
                  roleOverride?.filledByUser ??
                  application.role.filledByUser ??
                  application.role.filled_by_user ??
                  null,
              }
            : application?.role ?? null;

        const isSelfApplication =
          currentUser?.id === (application.applicant?.id ?? application.applicant_id);

        // Normalize types to avoid "1" vs 1 mismatches
        const isHighlighted =
          highlightUserId != null &&
          applicantId != null &&
          String(applicantId) === String(highlightUserId);

        return (
          <div
            key={application.id}
            ref={isHighlighted ? highlightedRef : null}
            className={`transition-all duration-300 ${
              isHighlighted
                ? "ring-2 ring-primary/30 rounded-xl bg-primary/5"
                : ""
            } ${isSelfApplication ? "opacity-60" : ""}`}
          >
            <PersonRequestCard
              user={application.applicant}
              date={getApplicationDate(application)}
              message={application.message || "No message provided."}
              messageLabel="Application message:"
              messageIcon={<Mail size={12} className="text-pink-500 mr-1" />}
              onUserClick={handleUserClick}
              showLocation={false}
              extraContent={
                <>
                  {/* Vacant role card — shown when application targets a specific role */}
                  {role && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                      <VacantRoleCard
                        role={role}
                        team={{ id: teamId, name: teamName }}
                        matchScore={role.matchScore ?? role.match_score ?? null}
                        matchDetails={role.matchDetails ?? role.match_details ?? null}
                        canManage={false}
                        canManageStatus={!isSelfApplication}
                        onViewApplicationDetails={
                          isSelfApplication
                            ? () => setApplicationDetailsFor(application)
                            : null
                        }
                        isTeamMember={true}
                        onStatusChange={(currentRoleId, newStatus) =>
                          handleRoleStatusChange(
                            currentRoleId,
                            newStatus,
                            application.applicant ?? null,
                          )
                        }
                        allowedStatusActions={["filled", "open"]}
                        statusActionLoading={statusUpdatingRoleId === roleId}
                        viewAsUserId={application.applicant?.id}
                        viewAsUser={application.applicant}
                      />
                    </div>
                  )}

                  {/* User Tags/Skills if available */}
                  {application.applicant?.tags &&
                    application.applicant.tags.length > 0 && (
                      <div className="mb-4">
                        <h5 className="font-medium text-sm text-base-content/80 mb-2">
                          Focus Areas:
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
                  {!isSelfApplication && (
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
                  )}
                </>
              }
              actions={
                isSelfApplication ? (
                  <div className="flex items-center gap-2 text-sm text-info bg-info/10 rounded-lg px-3 py-2">
                    <AlertTriangle size={16} className="flex-shrink-0" />
                    <span>Another owner or admin must review your application.</span>
                  </div>
                ) : (
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="errorOutline"
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
                      variant="successOutline"
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
                )
              }
            />
          </div>
        );
      })}
    </RequestListModal>
  );
};

export default TeamApplicationsModal;
