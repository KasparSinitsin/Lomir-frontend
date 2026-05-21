import React, { useState } from "react";
import {
  Calendar,
  MessageSquare,
  Users,
  Check,
  User,
  UserCheck,
  X,
  MailOpen,
  UserPlus,
  FlaskConical,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Pencil,
} from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Tooltip from "../common/Tooltip";
import UserDetailsModal from "../users/UserDetailsModal";
import TeamDetailsModal from "./TeamDetailsModal";
import VacantRoleCard from "./VacantRoleCard";
import Alert from "../common/Alert";
import { format } from "date-fns";
import InlineUserLink from "../users/InlineUserLink";
import { useHydratedRole } from "../../hooks/useHydratedRole";
import DemoAvatarOverlay from "../users/DemoAvatarOverlay";
import { DEMO_TEAM_TOOLTIP, isSyntheticTeam } from "../../utils/userHelpers";
import { useAuth } from "../../contexts/AuthContext";

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
 * TeamInvitationDetailsModal Component
 *
 * Displays invitation details and allows user to accept or decline.
 * Similar structure to TeamApplicationDetailsModal.
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Object} invitation - Invitation data object
 * @param {Function} onClose - Callback to close the modal
 * @param {Function} onAccept - Callback to accept invitation
 * @param {Function} onDecline - Callback to decline invitation
 */
const TeamInvitationDetailsModal = ({
  isOpen,
  invitation,
  onClose,
  onAccept,
  onDecline,
  notificationHighlight = false,
}) => {
  // ============ Auth ============
  const { user: currentUser } = useAuth();

  // ============ State ============
  const [loading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // "acceptRole" | "switchRole" | "acceptTeam" | "decline" | null
  const [error, setError] = useState(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [responseExpanded, setResponseExpanded] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isTeamDetailsOpen, setIsTeamDetailsOpen] = useState(false);

  // ============ Helpers ============

  // Get team data from invitation
  const baseTeam = invitation?.team || {};
  const syntheticTeamFlag =
    baseTeam?.is_synthetic ??
    baseTeam?.isSynthetic ??
    invitation?.team_is_synthetic ??
    invitation?.teamIsSynthetic;
  const team = {
    ...baseTeam,
    is_synthetic:
      baseTeam?.is_synthetic ?? baseTeam?.isSynthetic ?? syntheticTeamFlag,
    isSynthetic:
      baseTeam?.isSynthetic ?? baseTeam?.is_synthetic ?? syntheticTeamFlag,
  };
  const roleId =
    invitation?.role?.id ?? invitation?.roleId ?? invitation?.role_id ?? null;
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
  const currentFilledRoleId =
    invitation?.current_filled_role_id ?? invitation?.currentFilledRoleId ?? null;
  const { hydratedRole: hydratedCurrentFilledRole } = useHydratedRole({
    isOpen,
    roleId: currentFilledRoleId,
    teamId,
  });
  const invitationRoleMatch = extractRoleMatchData(invitation?.role);
  const hydratedRoleMatch = extractRoleMatchData(hydratedRole);
  const isUsingHydratedRoleMatch =
    fetchedRoleMatchScore === hydratedRoleMatch.matchScore &&
    fetchedRoleMatchDetails === hydratedRoleMatch.matchDetails;
  const roleMatchScore =
    invitationRoleMatch.matchScore != null && isUsingHydratedRoleMatch
      ? invitationRoleMatch.matchScore
      : fetchedRoleMatchScore ?? invitationRoleMatch.matchScore;
  const roleMatchDetails =
    invitationRoleMatch.matchScore != null && isUsingHydratedRoleMatch
      ? invitationRoleMatch.matchDetails
      : fetchedRoleMatchDetails ?? invitationRoleMatch.matchDetails;
  const inviter = invitation?.inviter || {};

  // Format invitation date
  const getInvitationDate = () => {
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

  // ============ Handlers ============

  const handleAcceptWithRole = async () => {
    try {
      setActionLoading("acceptRole");
      setError(null);
      await onAccept(invitation.id, responseMessage, true);
      setResponseMessage("");
      onClose();
    } catch (err) {
      setError(err.message || "Failed to accept invitation");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSwitchRole = async () => {
    try {
      setActionLoading("switchRole");
      setError(null);
      await onAccept(invitation.id, responseMessage, true, { switchRoles: true });
      setResponseMessage("");
      onClose();
    } catch (err) {
      setError(err.message || "Failed to switch roles");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptTeamOnly = async () => {
    try {
      setActionLoading("acceptTeam");
      setError(null);
      await onAccept(invitation.id, responseMessage, false);
      setResponseMessage("");
      onClose();
    } catch (err) {
      setError(err.message || "Failed to accept invitation");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async () => {
    try {
      setActionLoading("decline");
      setError(null);
      await onDecline(invitation.id, responseMessage);
      setResponseMessage("");
      onClose();
    } catch (err) {
      setError(err.message || "Failed to decline invitation");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUserClick = (userId) => {
    if (userId) {
      setSelectedUserId(userId);
    }
  };

  // ============ Render ============

  const hasRoleInvitation = !!(invitation?.role_id ?? invitation?.roleId ?? invitation?.role?.id);
  const isInternal = invitation?.isInternal ?? invitation?.is_internal ?? false;
  const isAcceptRoleLoading = actionLoading === "acceptRole";
  const isSwitchRoleLoading = actionLoading === "switchRole";
  const isAcceptTeamLoading = actionLoading === "acceptTeam";
  const isDeclineLoading = actionLoading === "decline";
  const isActionPending =
    isAcceptRoleLoading || isSwitchRoleLoading || isAcceptTeamLoading || isDeclineLoading;
  const isControlsDisabled = loading || isActionPending;

  const headerSubtitle = isInternal
    ? "You've been invited to fill a role!"
    : hasRoleInvitation
      ? "You are invited for a role!"
      : "You are invited!";
  const syntheticRoleFlag =
    invitation?.role?.is_synthetic ??
    invitation?.role?.isSynthetic ??
    invitation?.role_is_synthetic ??
    invitation?.roleIsSynthetic ??
    invitation?.is_synthetic ??
    invitation?.isSynthetic;
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
      : invitation?.role
      ? {
          ...invitation.role,
          is_synthetic:
            invitation.role.is_synthetic ??
            invitation.role.isSynthetic ??
            syntheticRoleFlag,
          isSynthetic:
            invitation.role.isSynthetic ??
            invitation.role.is_synthetic ??
            syntheticRoleFlag,
        }
      : {
          id: invitation?.roleId ?? invitation?.role_id,
          roleName: invitation?.roleName ?? invitation?.role_name,
          role_name: invitation?.role_name ?? invitation?.roleName,
          is_synthetic: syntheticRoleFlag,
          isSynthetic: syntheticRoleFlag,
        };

  const roleStatus = roleForCard?.status;
  const isRoleFilled = hasRoleInvitation && roleStatus === "filled";
  const isRoleClosed = hasRoleInvitation && roleStatus === "closed";
  const isRoleUnavailable = isRoleFilled || isRoleClosed;
  const currentFilledRole =
    invitation?.currentFilledRole ??
    invitation?.current_filled_role ??
    (invitation?.current_filled_role_id || invitation?.currentFilledRoleId
      ? {
          id: invitation.current_filled_role_id ?? invitation.currentFilledRoleId,
          roleName:
            invitation.current_filled_role_name ??
            invitation.currentFilledRoleName ??
            "your current role",
          role_name:
            invitation.current_filled_role_name ??
            invitation.currentFilledRoleName ??
            "your current role",
        }
      : null);
  const currentFilledRoleName =
    currentFilledRole?.roleName ??
    currentFilledRole?.role_name ??
    invitation?.current_filled_role_name ??
    invitation?.currentFilledRoleName ??
    "your current role";
  const currentFilledRoleForCard = hydratedCurrentFilledRole
    ? {
        ...hydratedCurrentFilledRole,
        is_synthetic:
          hydratedCurrentFilledRole.is_synthetic ??
          hydratedCurrentFilledRole.isSynthetic ??
          syntheticRoleFlag,
        isSynthetic:
          hydratedCurrentFilledRole.isSynthetic ??
          hydratedCurrentFilledRole.is_synthetic ??
          syntheticRoleFlag,
      }
    : currentFilledRole
    ? {
        ...currentFilledRole,
        status: currentFilledRole.status ?? "filled",
        filled_by: currentUser?.id ?? null,
        filled_by_user: currentUser ?? null,
        is_synthetic: syntheticRoleFlag,
        isSynthetic: syntheticRoleFlag,
      }
    : null;
  const canSwitchRole =
    hasRoleInvitation &&
    isInternal &&
    !isRoleUnavailable &&
    Boolean(currentFilledRole?.id ?? invitation?.current_filled_role_id ?? invitation?.currentFilledRoleId);

  // Custom header
  const customHeader = (
    <div>
      <h2 className="text-xl font-medium text-primary leading-[120%] mb-[0.2em]">
        {team.name || "Unknown Team"}
      </h2>
      <p className="text-sm text-base-content/70 flex items-center">
        <MailOpen size={14} className={`mr-1.5 ${isInternal ? "text-orange-500" : ""}`} />
        {headerSubtitle}
      </p>
    </div>
  );

  // Footer with action buttons + "Sent by"
  const footer = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {/* Sent by — shares row with buttons when there's space, own row otherwise */}
      <InlineUserLink
        label="Invite sent by"
        user={inviter}
        onOpenUser={handleUserClick}
      />

      {/* Buttons — right-aligned, never wrap internally */}
      <div className="flex flex-nowrap gap-2 ml-auto">
          {isRoleUnavailable && (
            <Tooltip
              content={
                isInternal
                  ? (isRoleFilled ? "This role is already filled" : "This role is closed")
                  : (isRoleFilled
                      ? "This role is already filled — you can still join the team"
                      : "This role is closed — you can still join the team")
              }
            >
              <Button
                variant="ghost"
                size="sm"
                disabled={true}
                className="border border-base-content/30 text-base-content/40"
                icon={<UserCheck size={16} />}
              >
                {isInternal ? "Accept Role" : "Accept & Fill Role"}
              </Button>
            </Tooltip>
          )}
          <Button
            variant="errorOutline"
            size="sm"
            onClick={handleDecline}
            disabled={isControlsDisabled}
            icon={<X size={16} />}
          >
            {isDeclineLoading ? "Declining..." : "Decline"}
          </Button>
          {hasRoleInvitation && isInternal ? (
            // Internal role invite: user is already a member, just accept/fill the role
            !isRoleUnavailable && (
              canSwitchRole ? (
                <Tooltip
                  content={`Leave ${currentFilledRoleName} and fill this role instead.`}
                >
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSwitchRole}
                    disabled={isControlsDisabled}
                    icon={<ArrowRightLeft size={16} />}
                  >
                    {isSwitchRoleLoading ? "Switching..." : "Leave old role to fill new role"}
                  </Button>
                </Tooltip>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAcceptWithRole}
                  disabled={isControlsDisabled}
                  icon={<Check size={16} />}
                >
                  {isAcceptRoleLoading ? "Accepting..." : "Accept Role"}
                </Button>
              )
            )
          ) : hasRoleInvitation ? (
            // External invite with a role: offer team-only or fill-role options
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAcceptTeamOnly}
                disabled={isControlsDisabled}
                icon={<UserPlus size={16} />}
              >
                {isAcceptTeamLoading ? "Joining..." : "Join Team Only"}
              </Button>
              {!isRoleUnavailable && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAcceptWithRole}
                  disabled={isControlsDisabled}
                  icon={<Check size={16} />}
                >
                  {isAcceptRoleLoading ? "Joining..." : "Accept & Fill Role"}
                </Button>
              )}
            </>
          ) : (
            // No role: simple accept
            <Button
              variant="primary"
              size="sm"
              onClick={handleAcceptTeamOnly}
              disabled={isControlsDisabled}
              icon={<Check size={16} />}
            >
              {isAcceptTeamLoading ? "Joining..." : "Accept"}
            </Button>
          )}
        </div>
    </div>
  );
  return (
    <>
      <Modal
        isOpen={isOpen && !!invitation}
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
          {/* Team info (hover + onClick like in TeamInvitesModal) */}
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
                          ".avatar-fallback",
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
                {isInternal && (
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
            <span>{getInvitationDate()}</span>
          </div>
        </div>

        {/* Team description */}
        {team.description && (
          <p className="text-sm text-base-content/80 mb-5">
            {team.description}
          </p>
        )}

        {/* Invitation message + role card in speech bubble (when message exists) */}
        {invitation?.message && (
          <div className="mb-5">
            <p className="text-xs text-base-content/60 mb-1 flex items-center">
              <MailOpen size={12} className="text-info mr-1" />
              {`Invitation message from ${inviter?.first_name || inviter?.firstName || inviter?.username || "them"}:`}
            </p>
            <div className="w-fit max-w-full bg-base-200 rounded-lg rounded-bl-none p-3">
              <p className="text-sm text-base-content/90 leading-relaxed">
                {(() => {
                  if (isInternal && currentFilledRoleName && currentFilledRoleName !== "your current role") {
                    const suffix = ` ${currentFilledRoleName}.`;
                    return invitation.message.endsWith(suffix)
                      ? invitation.message.slice(0, -suffix.length)
                      : invitation.message;
                  }
                  return invitation.message;
                })()}
              </p>
              {(hydratedRole || invitation?.role || invitation?.roleId || invitation?.role_id) && (
                <div className="mt-3 max-w-[300px]">
                  <VacantRoleCard
                    role={roleForCard}
                    team={team}
                    matchScore={roleMatchScore}
                    matchDetails={roleMatchDetails}
                    canManage={false}
                    isTeamMember={false}
                    hideActions={true}
                    notificationHighlight={notificationHighlight}
                  />
                </div>
              )}
              {isInternal && currentFilledRoleForCard && (
                <div className="mt-3 max-w-[300px]">
                  <VacantRoleCard
                    role={currentFilledRoleForCard}
                    team={team}
                    matchScore={null}
                    canManage={false}
                    isTeamMember={true}
                    hideActions={true}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Role card bare — shown when invitation has no message */}
        {!invitation?.message && (hydratedRole || invitation?.role || invitation?.roleId || invitation?.role_id) && (
          <div className="mb-5 max-w-[300px]">
            <VacantRoleCard
              role={roleForCard}
              team={team}
              matchScore={roleMatchScore}
              matchDetails={roleMatchDetails}
              canManage={false}
              isTeamMember={false}
              hideActions={true}
              notificationHighlight={notificationHighlight}
            />
          </div>
        )}

        {/* Response Textarea — collapsible */}
        <div className="mt-2">
          <div className="flex mb-1">
            <button
              type="button"
              onClick={() => setResponseExpanded((prev) => !prev)}
              className={`text-xs text-base-content/60 flex items-center text-left cursor-pointer hover:text-base-content/80 transition-colors ${responseExpanded ? "w-full" : "ml-auto"}`}
              disabled={isControlsDisabled}
            >
              {responseExpanded || responseMessage
                ? <MessageSquare size={12} className="text-primary mr-1" />
                : <Pencil size={12} className="text-primary mr-1" />
              }
              {responseExpanded
                ? "Your response message (optional):"
                : "Add a personal response message (optional)"
              }
              <span className="ml-auto pl-3 text-base-content/40">
                {responseExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </span>
            </button>
          </div>
          {responseExpanded && (
            <textarea
              value={responseMessage}
              onChange={(e) => setResponseMessage(e.target.value)}
              className="textarea textarea-bordered textarea-sm w-full h-20 resize-none text-sm"
              placeholder="Add a personal message to your decision. Decline messages will be sent as DM to the inviter only. Acceptance messages will be sent to the team chat."
              disabled={isControlsDisabled}
            />
          )}
        </div>
      </Modal>

      <TeamDetailsModal
        isOpen={isTeamDetailsOpen}
        teamId={team?.id}
        initialTeamData={team}
        onClose={() => setIsTeamDetailsOpen(false)}
        hasPendingInvitation={true}
      />

      {/* User Details Modal */}
      <UserDetailsModal
        isOpen={!!selectedUserId}
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
    </>
  );
};

export default TeamInvitationDetailsModal;
