import React, { useState, useEffect, useRef } from "react";
import { Check, CheckCheck, UserCheck, X as Decline, User, Users, Mail, MessageSquare, AlertTriangle, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import RequestListModal from "../common/RequestListModal";
import PersonRequestCard from "../common/PersonRequestCard";
import Button from "../common/Button";
import Modal from "../common/Modal";
import Tooltip from "../common/Tooltip";
import UserDetailsModal from "../users/UserDetailsModal";
import VacantRoleCard from "./VacantRoleCard";
import TeamApplicationDetailsModal from "./TeamApplicationDetailsModal";
import { matchingService } from "../../services/matchingService";
import { vacantRoleService } from "../../services/vacantRoleService";
import { messageService } from "../../services/messageService";
import { useAuth } from "../../contexts/AuthContext";
import { useTeamModal } from "../../contexts/TeamModalContext";
import { buildRoleApplicationFilledMessage } from "../../utils/roleEventMessages";
import {
  buildApplicationRoleForCard,
  getRequestRoleId,
} from "../../utils/teamRequestUtils";

const SELF_ROLE_MATCH_FETCH_LIMIT = 1000;

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
 * @param {string|number|null} highlightApplicationId - Application ID to scroll to + highlight (optional)
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
  highlightApplicationId = null,
  highlightUserId = null,
}) => {
  // ============ Auth ============
  const { user: currentUser } = useAuth();
  const { openTeamModal } = useTeamModal();

  // ============ State ============
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [responses, setResponses] = useState({});
  const [responseExpanded, setResponseExpanded] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [roleStatusOverrides, setRoleStatusOverrides] = useState({});
  const [statusUpdatingRoleId, setStatusUpdatingRoleId] = useState(null);
  const [showCloseGuard, setShowCloseGuard] = useState(false);
  const [applicationDetailsFor, setApplicationDetailsFor] = useState(null);
  const [selfRoleMatchMap, setSelfRoleMatchMap] = useState({});
  const [polledRoleStatusMap, setPolledRoleStatusMap] = useState({});
  const [narrowMap, setNarrowMap] = useState({});

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
    response = "",
    fillRoleOverride = null
  ) => {
    try {
      setLoading(true);
      setError(null);

      // Determine if the admin toggled "Mark role as filled" for this application's role
      let fillRole = false;
      const application = applications.find((app) => app.id === applicationId);
      const isInternalRoleApplication = Boolean(
        application?.isInternalRoleApplication ??
          application?.is_internal_role_application ??
          false,
      );
      if (action === "approve") {
        const appRoleId = application?.role?.id ?? null;
        if (fillRoleOverride !== null && fillRoleOverride !== undefined) {
          fillRole = Boolean(fillRoleOverride);
        } else if (
          appRoleId &&
          (isInternalRoleApplication ||
            roleStatusOverrides[appRoleId]?.status === "filled")
        ) {
          fillRole = true;
        }
      }

      const actionResult = await onApplicationAction(applicationId, action, response, fillRole);
      const actionData = actionResult?.data ?? actionResult ?? {};
      const roleFilled = Boolean(actionData.roleFilled);
      const roleInvitationCreated = Boolean(actionData.roleInvitationCreated);

      if (action === "approve" && fillRole && roleFilled && teamId && application?.role) {
        try {
          await messageService.sendMessage(
            teamId,
            buildRoleApplicationFilledMessage({
              teamId,
              teamName,
              role: application.role,
              applicant: application.applicant ?? null,
              approver: currentUser ?? null,
            }),
            "team",
          );
        } catch (messageError) {
          console.warn("Role application filled, but chat event could not be sent:", messageError);
        }
      }

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

      if (action === "approve" && roleInvitationCreated) {
        const roleName =
          application?.role?.roleName ??
          application?.role?.role_name ??
          "the role";
        const currentRoleName =
          actionData.deferredByCurrentRoleName ?? "their current role";
        setSuccess(
          `Application approved! ${roleName} is now a role offer the member can accept once they leave ${currentRoleName}.`,
        );
      } else if (action === "approve" && fillRole && roleFilled) {
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
    if (!isOpen || (!highlightApplicationId && !highlightUserId)) return;

    let frameId = null;
    const t = setTimeout(() => {
      frameId = window.requestAnimationFrame(() => {
        highlightedRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    }, 150);

    return () => {
      clearTimeout(t);
      if (frameId != null) window.cancelAnimationFrame(frameId);
    };
  }, [applications.length, highlightApplicationId, highlightUserId, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setStatusUpdatingRoleId(null);
      setRoleStatusOverrides({});
    }
  }, [isOpen]);

  useEffect(() => {
    const selfRoleIds = [
      ...new Set(
        applications
          .filter((application) => {
            const applicantId =
              application?.applicant?.id ??
              application?.applicant_id ??
              null;
            return applicantId != null && String(applicantId) === String(currentUser?.id);
          })
          .map((application) =>
            application?.role?.id ??
            application?.roleId ??
            application?.role_id ??
            null,
          )
          .filter((roleId) => roleId != null)
          .map(String),
      ),
    ];

    if (!isOpen || !teamId || !currentUser?.id || selfRoleIds.length === 0) {
      setSelfRoleMatchMap({});
      return;
    }

    let cancelled = false;

    const fetchSelfRoleMatches = async () => {
      try {
        const response = await matchingService.getMatchingRolesForTeam(teamId, {
          limit: SELF_ROLE_MATCH_FETCH_LIMIT,
        });

        if (cancelled) return;

        const nextMatchMap = {};

        (response?.data || []).forEach((role) => {
          const roleId = role?.id;
          if (roleId == null || !selfRoleIds.includes(String(roleId))) return;

          nextMatchMap[String(roleId)] = {
            matchScore:
              role?.matchScore ??
              role?.match_score ??
              null,
            matchDetails:
              role?.matchDetails ??
              role?.match_details ??
              null,
          };
        });

        setSelfRoleMatchMap(nextMatchMap);
      } catch (error) {
        if (!cancelled) {
          console.warn("Could not fetch self-application role match scores:", error);
          setSelfRoleMatchMap({});
        }
      }
    };

    fetchSelfRoleMatches();

    return () => {
      cancelled = true;
    };
  }, [isOpen, teamId, currentUser?.id, applications]);

  // Poll role status every 20s so VacantRoleCard reflects changes made by others
  useEffect(() => {
    if (!isOpen || !teamId) return;

    const roleIds = [
      ...new Set(
        applications
          .map(
            (app) =>
              app?.role?.id ?? app?.roleId ?? app?.role_id ?? null,
          )
          .filter(Boolean)
          .map(String),
      ),
    ];

    if (roleIds.length === 0) return;

    let isCancelled = false;

    const pollRoles = async () => {
      try {
        const results = await Promise.allSettled(
          roleIds.map((id) =>
            vacantRoleService.getVacantRoleById(teamId, id),
          ),
        );
        if (isCancelled) return;
        const nextMap = {};
        results.forEach((result, i) => {
          if (result.status === "fulfilled") {
            const payload = result.value?.data ?? result.value;
            const roleData =
              payload?.success !== undefined
                ? payload?.data ?? null
                : payload?.data?.data ?? payload?.data ?? payload;
            if (roleData) nextMap[roleIds[i]] = roleData;
          }
        });
        setPolledRoleStatusMap((prev) => ({ ...prev, ...nextMap }));
      } catch {
        // silent — keep showing last known state
      }
    };

    pollRoles();
    const intervalId = setInterval(pollRoles, 20_000);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [isOpen, teamId, applications]);

  // ============ Render ============
  const anyNarrow = Object.values(narrowMap).some(Boolean);

  return (
    <RequestListModal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <span className="leading-[100%]">
          <Users size={20} className="inline-block align-middle mr-1.5 shrink-0 text-primary" />
          <Tooltip content="View team" wrapperClassName="inline">
            <span
              className="font-semibold text-success cursor-pointer hover:text-success/70 transition-colors"
              onClick={() => teamId && openTeamModal(teamId, teamName)}
            >{teamName}</span>
          </Tooltip>
          <span>'s Applications</span>
        </span>
      }
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
            bodyClassName="p-4"
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
        const roleId = getRequestRoleId(application);
        const roleOverride = roleId ? roleStatusOverrides[roleId] : null;
        const polledRole = roleId ? polledRoleStatusMap[String(roleId)] : null;
        const role = buildApplicationRoleForCard(
          application,
          polledRole,
          roleOverride,
        );
        const isSelfApplication =
          currentUser?.id === (application.applicant?.id ?? application.applicant_id);
        const isInternalRoleApplication = Boolean(
          application?.isInternalRoleApplication ??
            application?.is_internal_role_application ??
            false,
        );
        const hasRoleApplication = roleId != null;
        const isExternalRoleApplication =
          hasRoleApplication && !isInternalRoleApplication;
        const selfRoleMatch =
          roleId != null && isSelfApplication
            ? selfRoleMatchMap[String(roleId)] ?? null
            : null;

        // Normalize types to avoid "1" vs 1 mismatches
        const isHighlighted =
          (highlightApplicationId != null &&
            String(application.id) === String(highlightApplicationId)) ||
          (highlightUserId != null &&
            applicantId != null &&
            String(applicantId) === String(highlightUserId));

        // Role availability guards
        const serverRoleStatus =
          polledRole?.status ?? application.role?.status ?? "open";
        const isServerFilled = serverRoleStatus === "filled";
        const isServerClosed = serverRoleStatus === "closed";
        const isRoleUnavailable = isServerFilled || isServerClosed;

        const applicationTeamOwnerId =
          application.ownerId ?? application.owner_id ?? null;
        const isCurrentUserOwner =
          applicationTeamOwnerId != null &&
          currentUser?.id != null &&
          String(currentUser.id) === String(applicationTeamOwnerId);

        const filledByUserId =
          application.role?.filledBy ?? application.role?.filled_by ?? null;
        const isCurrentUserFilledBy =
          filledByUserId != null &&
          currentUser?.id != null &&
          String(currentUser.id) === String(filledByUserId);

        // Restrict the status toggle on the role card for unavailable roles:
        // filled → only owner or the person filling it; closed → only owner
        const canManageStatusForRole =
          !isSelfApplication &&
          (!isServerFilled || isCurrentUserOwner || isCurrentUserFilledBy) &&
          (!isServerClosed || isCurrentUserOwner);

        const unavailableTooltip = isInternalRoleApplication
          ? (isServerFilled ? "This role is already filled" : "This role is closed")
          : (isServerFilled
              ? "This role is already filled — you can still add this person to the team"
              : "This role is closed — you can still add this person to the team");

        return (
          <div
            key={application.id}
            ref={isHighlighted ? highlightedRef : null}
            className={`transition-all duration-300 ${
              isHighlighted
                ? "ring-2 ring-green-500/70 ring-offset-2 rounded-xl bg-green-50"
                : ""
            } ${isSelfApplication ? "opacity-60" : ""}`}
          >
            <PersonRequestCard
              user={application.applicant}
              date={getApplicationDate(application)}
              onNarrowChange={(narrow) => setNarrowMap((prev) => {
                if ((prev[String(application.id)] ?? false) === narrow) return prev;
                return { ...prev, [String(application.id)]: narrow };
              })}
              forceNarrow={anyNarrow}
              message={application.message || "No message provided."}
              messageLabel={`${application.applicant?.first_name || application.applicant?.firstName || application.applicant?.username || "Their"}'s application message:`}
              messageIcon={<Mail size={12} className="text-pink-500 mr-1" />}
              onUserClick={handleUserClick}
              showLocation={true}
              sublineExtra={
                isInternalRoleApplication ? (
                  <Tooltip
                    content="Already a member of this team"
                    wrapperClassName="flex min-w-0 overflow-hidden items-center gap-0.5 text-base-content/70"
                  >
                    <User size={10} className="flex-shrink-0 text-success" />
                    <span className="leading-[1.05] whitespace-nowrap">Team Member</span>
                  </Tooltip>
                ) : null
              }
              messageBubbleExtra={
                role ? (
                  <VacantRoleCard
                      role={role}
                      team={{ id: teamId, name: teamName }}
                      matchScore={
                        selfRoleMatch?.matchScore ??
                        role.match_score ??
                        role.matchScore ??
                        null
                      }
                      matchDetails={
                        selfRoleMatch?.matchDetails ??
                        role.match_details ??
                        role.matchDetails ??
                        null
                      }
                      canManage={false}
                      canManageStatus={canManageStatusForRole}
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
                ) : null
              }
              extraContent={
                <>
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
                      <div className="flex mb-1">
                      <button
                        type="button"
                        onClick={() =>
                          setResponseExpanded((prev) => ({
                            ...prev,
                            [application.id]: !prev[application.id],
                          }))
                        }
                        className={`text-xs text-base-content/60 flex items-center text-left cursor-pointer hover:text-base-content/80 transition-colors ${responseExpanded[application.id] ? "w-full" : "ml-auto"}`}
                      >
                        {responseExpanded[application.id] || responses[application.id]
                          ? <MessageSquare size={12} className="text-primary mr-1" />
                          : <Pencil size={12} className="text-primary mr-1" />
                        }
                        {responseExpanded[application.id]
                          ? "Your response message (optional):"
                          : "Add a personal response message (optional)"
                        }
                        <span className="ml-auto pl-3 text-base-content/40">
                          {responseExpanded[application.id] ? (
                            <ChevronUp size={12} />
                          ) : (
                            <ChevronDown size={12} />
                          )}
                        </span>
                      </button>
                      </div>
                      {responseExpanded[application.id] && (
                        <textarea
                          value={responses[application.id] || ""}
                          onChange={(e) =>
                            handleResponseChange(application.id, e.target.value)
                          }
                          className="textarea textarea-bordered textarea-sm w-full h-20 resize-none text-sm"
                          placeholder="Add a personal message to your decision..."
                          disabled={loading}
                        />
                      )}
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
                  <div className="flex flex-wrap justify-end gap-2">
                    {isExternalRoleApplication ? (
                      <>
                        {isRoleUnavailable ? (
                          <Tooltip content={unavailableTooltip}>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={true}
                              className="border border-base-content/30 text-base-content/40"
                              icon={<UserCheck size={16} />}
                            >
                              Fill Role + Add to Team
                            </Button>
                          </Tooltip>
                        ) : (
                          <Tooltip content="Accept application, add to team and fill the role">
                            <Button
                              variant="successOutline"
                              size="sm"
                              onClick={() =>
                                handleApplicationAction(
                                  application.id,
                                  "approve",
                                  responses[application.id] || "",
                                  true
                                )
                              }
                              disabled={loading}
                              icon={<CheckCheck size={16} />}
                            >
                              Fill Role + Add to Team
                            </Button>
                          </Tooltip>
                        )}
                        <Tooltip content="Accept application and add to team without filling the role">
                          <Button
                            variant="successOutline"
                            size="sm"
                            onClick={() =>
                              handleApplicationAction(
                                application.id,
                                "approve",
                                responses[application.id] || "",
                                false
                              )
                            }
                            disabled={loading}
                            icon={<Check size={16} />}
                          >
                            Add to Team
                          </Button>
                        </Tooltip>
                      </>
                    ) : isInternalRoleApplication ? (
                      isRoleUnavailable ? (
                        <Tooltip content={unavailableTooltip}>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={true}
                            className="border border-base-content/30 text-base-content/40"
                            icon={<UserCheck size={16} />}
                          >
                            Fill Role
                          </Button>
                        </Tooltip>
                      ) : (
                        <Tooltip content="Accept application and assign this team member to the role">
                          <Button
                            variant="successOutline"
                            size="sm"
                            onClick={() =>
                              handleApplicationAction(
                                application.id,
                                "approve",
                                responses[application.id] || "",
                                true
                              )
                            }
                            disabled={loading}
                            icon={<Check size={16} />}
                          >
                            Fill Role
                          </Button>
                        </Tooltip>
                      )
                    ) : (
                      <Tooltip content="Accept application and add to team">
                        <Button
                          variant="successOutline"
                          size="sm"
                          onClick={() =>
                            handleApplicationAction(
                              application.id,
                              "approve",
                              responses[application.id] || "",
                              false
                            )
                          }
                          disabled={loading}
                          icon={<Check size={16} />}
                        >
                          Add to Team
                        </Button>
                      </Tooltip>
                    )}
                    <Tooltip content="Decline this application">
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
                    </Tooltip>
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
