import React, { useState } from "react";
import {
  Calendar,
  Users,
  User,
  X,
  SendHorizontal,
  FlaskConical,
  Trash2,
} from "lucide-react";
import Modal from "../common/Modal";
import Tooltip from "../common/Tooltip";
import Button from "../common/Button";
import ConfirmModal from "../common/ConfirmModal";
import TeamDetailsModal from "./TeamDetailsModal";
import UserDetailsModal from "../users/UserDetailsModal";
import InlineUserLink from "../users/InlineUserLink";
import VacantRoleCard from "./VacantRoleCard";
import DemoAvatarOverlay from "../users/DemoAvatarOverlay";
import {
  DEMO_TEAM_TOOLTIP,
  isSyntheticTeam,
} from "../../utils/userHelpers";
import Alert from "../common/Alert";
import { format } from "date-fns";
import { useHydratedRole } from "../../hooks/useHydratedRole";

const extractRoleMatchData = (roleLike) => {
  const rawScore = roleLike?.matchScore ?? roleLike?.match_score ?? null;
  const numericScore = Number(rawScore);

  return {
    matchScore: Number.isFinite(numericScore) ? numericScore : null,
    matchDetails:
      roleLike?.matchDetails ??
      roleLike?.match_details ??
      roleLike?.scoreBreakdown ??
      null,
  };
};

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
  notificationHighlight = false,
}) => {
  // ============ State ============
  const loading = false;
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [isTeamDetailsOpen, setIsTeamDetailsOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  // ============ Helpers ============

  // Get team data from application
  const baseTeam = application?.team || {};
  const syntheticTeamFlag =
    baseTeam?.is_synthetic ??
    baseTeam?.isSynthetic ??
    application?.team_is_synthetic ??
    application?.teamIsSynthetic;
  const team = {
    ...baseTeam,
    is_synthetic:
      baseTeam?.is_synthetic ?? baseTeam?.isSynthetic ?? syntheticTeamFlag,
    isSynthetic:
      baseTeam?.isSynthetic ?? baseTeam?.is_synthetic ?? syntheticTeamFlag,
  };
  const roleId = application?.role?.id ?? application?.roleId ?? null;
  const teamId = team?.id ?? null;
  const {
    hydratedRole,
    roleMatchScore: fetchedRoleMatchScore,
    roleMatchDetails: fetchedRoleMatchDetails,
  } = useHydratedRole({
    isOpen,
    roleId,
    teamId,
  });
  const applicationRoleMatch = extractRoleMatchData(application?.role);
  const hydratedRoleMatch = extractRoleMatchData(hydratedRole);
  const isUsingHydratedRoleMatch =
    fetchedRoleMatchScore === hydratedRoleMatch.matchScore &&
    fetchedRoleMatchDetails === hydratedRoleMatch.matchDetails;
  const roleMatchScore =
    applicationRoleMatch.matchScore != null && isUsingHydratedRoleMatch
      ? applicationRoleMatch.matchScore
      : fetchedRoleMatchScore ?? applicationRoleMatch.matchScore;
  const roleMatchDetails =
    applicationRoleMatch.matchScore != null && isUsingHydratedRoleMatch
      ? applicationRoleMatch.matchDetails
      : fetchedRoleMatchDetails ?? applicationRoleMatch.matchDetails;
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

  // Get team initials from name (e.g., "Urban Gardeners Berlin" → "UGB")
  const getTeamInitials = () => {
    const name = team?.name;
    if (!name || typeof name !== "string") return "?";

    const words = name.trim().split(/\s+/);

    if (words.length === 1) {
      return name.slice(0, 2).toUpperCase();
    }

    return words
      .slice(0, 3)
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase();
  };

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

  const handleUserClick = (userId) => {
    if (userId) {
      setSelectedUserId(userId);
    }
  };

  // ============ Handlers ============

  const handleCancelApplication = () => {
    setIsCancelDialogOpen(true);
  };

  const closeCancelApplicationDialog = () => {
    if (actionLoading === "cancel") return;
    setIsCancelDialogOpen(false);
  };

  const confirmCancelApplication = async () => {
    try {
      setActionLoading("cancel");
      setError(null);
      await onCancel(application.id);
      setIsCancelDialogOpen(false);
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

  const isInternalRoleApplication =
    application?.isInternalRoleApplication ?? application?.is_internal_role_application ?? false;
  const roleName =
    application?.role?.roleName ?? application?.role?.role_name ?? null;
  const syntheticRoleFlag =
    application?.role?.is_synthetic ??
    application?.role?.isSynthetic ??
    application?.role_is_synthetic ??
    application?.roleIsSynthetic ??
    application?.is_synthetic ??
    application?.isSynthetic;
  const roleForCard =
    hydratedRole
      ? {
          ...hydratedRole,
          is_synthetic:
            hydratedRole.is_synthetic ??
            hydratedRole.isSynthetic ??
            syntheticRoleFlag,
          isSynthetic:
            hydratedRole.isSynthetic ??
            hydratedRole.is_synthetic ??
            syntheticRoleFlag,
        }
      : application?.role
      ? {
          ...application.role,
          is_synthetic:
            application.role.is_synthetic ??
            application.role.isSynthetic ??
            syntheticRoleFlag,
          isSynthetic:
            application.role.isSynthetic ??
            application.role.is_synthetic ??
            syntheticRoleFlag,
        }
      : {
          id: application?.roleId,
          roleName: application?.roleName ?? application?.role_name,
          role_name: application?.role_name ?? application?.roleName,
          is_synthetic: syntheticRoleFlag,
          isSynthetic: syntheticRoleFlag,
        };

  // Custom header
  const customHeader = (
    <div>
      <h2 className="text-xl font-medium text-primary leading-[120%] mb-[0.2em]">
        {isInternalRoleApplication && roleName
          ? `Role Application: ${roleName}`
          : team.name || "Unknown Team"}
      </h2>
      <p className="text-sm text-base-content/70 flex items-center">
        <SendHorizontal size={14} className="mr-1.5" />
        {isInternalRoleApplication
          ? "Role application within your team"
          : "You applied"}
      </p>
    </div>
  );

  // Footer with "Received by" (left) and buttons (right)
  // Owner display now matches the inviter display pattern in TeamInvitationDetailsModal
  const footer = (
    <div className="flex items-center justify-between gap-3">
      {/* Received by (left) */}
      <InlineUserLink
        label="Received by"
        user={owner}
        onOpenUser={handleUserClick}
      />

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
            className="flex items-start space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleTeamClick}
          >
            <Tooltip content="View team details" wrapperClassName="avatar">
              <div className="w-14 h-14 rounded-full relative overflow-hidden">
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
                  className="avatar-fallback bg-[var(--color-primary-focus)] text-primary-content flex items-center justify-center w-full h-full rounded-full absolute inset-0"
                  style={{ display: getTeamAvatar() ? "none" : "flex" }}
                >
                  <span className="text-xl font-medium">
                    {getTeamInitials()}
                  </span>
                </div>

                {isSyntheticTeam(team) && (
                  <DemoAvatarOverlay
                    textClassName="text-[7px]"
                    textTranslateClassName="-translate-y-[3px]"
                  />
                )}
              </div>
            </Tooltip>

            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-base-content hover:text-primary transition-colors leading-[120%] mb-[0.2em]">
                {team.name || "Unknown Team"}
              </h4>
              <div className="mt-0.5 flex max-h-[2.75em] flex-wrap items-center gap-x-1.5 gap-y-px overflow-hidden text-sm text-base-content/70">
                <Tooltip
                  content="Team members"
                  wrapperClassName="flex items-center gap-1 text-base-content/70 text-sm"
                >
                  <Users size={14} className="text-primary" />
                  <span>
                    {getMemberCount()}/{getMaxMembers()}
                  </span>
                </Tooltip>
                {isInternalRoleApplication && (
                  <Tooltip
                    content="You are already a member of this team"
                    wrapperClassName="flex items-center gap-1 text-base-content/70 text-sm"
                  >
                    <User size={14} className="flex-shrink-0 text-success" />
                    <span>You are a member</span>
                  </Tooltip>
                )}
                {isSyntheticTeam(team) && (
                  <Tooltip
                    content={DEMO_TEAM_TOOLTIP}
                    wrapperClassName="flex items-center gap-1 text-base-content/50 text-sm"
                  >
                    <FlaskConical size={14} className="flex-shrink-0" />
                    <span>Demo Team</span>
                  </Tooltip>
                )}
              </div>
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

        {/* Application message + role card in speech bubble (when message exists) */}
        {application?.message && (
          <div className="mb-5">
            <p className="text-xs text-base-content/60 mb-1 flex items-center">
              <SendHorizontal size={12} className="text-info mr-1" />
              Your application message:
            </p>
            <div className="w-fit max-w-full bg-base-200 rounded-lg rounded-bl-none p-3">
              <p className="text-sm text-base-content/90 leading-relaxed">
                {application.message}
              </p>
              {(application?.role || application?.roleId) && (
                <div className="mt-3 max-w-[300px]">
                  <VacantRoleCard
                    role={roleForCard}
                    team={team}
                    matchScore={roleMatchScore}
                    matchDetails={roleMatchDetails}
                    canManage={false}
                    isTeamMember={false}
                    notificationHighlight={notificationHighlight}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Role card bare — shown when no message but role exists */}
        {!application?.message && (application?.role || application?.roleId) && (
          <div className="mb-5 max-w-[300px]">
            <VacantRoleCard
              role={roleForCard}
              team={team}
              matchScore={roleMatchScore}
              matchDetails={roleMatchDetails}
              canManage={false}
              isTeamMember={false}
              notificationHighlight={notificationHighlight}
            />
          </div>
        )}

        {/* No message fallback — only when no role either */}
        {!application?.message && !(application?.role || application?.roleId) && (
          <div className="mb-5">
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

      <ConfirmModal
        isOpen={isCancelDialogOpen}
        onClose={closeCancelApplicationDialog}
        onConfirm={confirmCancelApplication}
        title="Cancel Application"
        loading={actionLoading === "cancel"}
        confirmLabel="Cancel Application"
        loadingLabel="Canceling..."
        confirmVariant="error"
        confirmIcon={<Trash2 size={16} />}
        cancelLabel="Keep"
      >
        <p className="text-sm text-base-content/80">
          Cancel your application to {team.name || "this team"}? The team will
          no longer be able to review it.
        </p>
      </ConfirmModal>

      {/* Team Details Modal */}
      <TeamDetailsModal
        isOpen={isTeamDetailsOpen}
        teamId={team?.id}
        initialTeamData={team}
        onClose={() => setIsTeamDetailsOpen(false)}
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
