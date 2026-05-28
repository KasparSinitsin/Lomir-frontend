import React, { useLayoutEffect, useRef, useState } from "react";
import {
  Calendar,
  MessageSquare,
  Users,
  Check,
  CheckCheck,
  User,
  UserCheck,
  UserSearch,
  X,
  MailOpen,
  UserPlus,
  FlaskConical,
  MapPin,
  Globe,
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
import {
  extractRoleMatchData,
  getMemberUserId,
  idsMatch,
  isExistingMemberStatus,
  normalizeBoolean,
} from "../../utils/teamRequestUtils";

const isInviteeExistingTeamMember = ({ invitation, team, currentUser }) => {
  const inviteeId =
    invitation?.invitee?.id ??
    invitation?.inviteeId ??
    invitation?.invitee_id ??
    currentUser?.id ??
    null;

  if (!team || inviteeId === null || inviteeId === undefined) return false;

  const directFlags = [
    invitation?.isInternal,
    invitation?.is_internal,
    invitation?.isInviteeMember,
    invitation?.is_invitee_member,
    invitation?.inviteeIsMember,
    invitation?.invitee_is_member,
    invitation?.alreadyMember,
    invitation?.already_member,
    invitation?.isExistingMember,
    invitation?.is_existing_member,
    invitation?.existingMember,
    invitation?.existing_member,
    invitation?.currentUserIsMember,
    invitation?.current_user_is_member,
    team?.isInviteeMember,
    team?.is_invitee_member,
    team?.inviteeIsMember,
    team?.invitee_is_member,
    team?.alreadyMember,
    team?.already_member,
    team?.isExistingMember,
    team?.is_existing_member,
    team?.existingMember,
    team?.existing_member,
    team?.currentUserIsMember,
    team?.current_user_is_member,
  ];

  if (directFlags.some((flag) => normalizeBoolean(flag) === true)) {
    return true;
  }

  const membershipStatuses = [
    invitation?.inviteeMembershipStatus,
    invitation?.invitee_membership_status,
    invitation?.membershipStatus,
    invitation?.membership_status,
    invitation?.inviteeStatus,
    invitation?.invitee_status,
    team?.inviteeMembershipStatus,
    team?.invitee_membership_status,
    team?.membershipStatus,
    team?.membership_status,
    team?.inviteeStatus,
    team?.invitee_status,
  ];

  if (membershipStatuses.some(isExistingMemberStatus)) {
    return true;
  }

  if (idsMatch(team?.owner_id ?? team?.ownerId, inviteeId)) {
    return true;
  }

  const memberCollections = [
    team?.members,
    team?.teamMembers,
    team?.team_members,
  ].filter(Array.isArray);

  if (
    memberCollections.some((members) =>
      members.some((member) => idsMatch(getMemberUserId(member), inviteeId)),
    )
  ) {
    return true;
  }

  const memberIdLists = [
    team?.memberIds,
    team?.member_ids,
    team?.memberUserIds,
    team?.member_user_ids,
    team?.teamMemberIds,
    team?.team_member_ids,
  ].filter(Array.isArray);

  return memberIdLists.some((memberIds) =>
    memberIds.some((memberId) => idsMatch(memberId, inviteeId)),
  );
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
  const teamNameContainerRef = useRef(null);
  const teamNameProbeRef = useRef(null);
  const teamDateRef = useRef(null);
  const [teamDateIsNarrow, setTeamDateIsNarrow] = useState(false);
  const teamDateIsNarrowRef = useRef(false);
  teamDateIsNarrowRef.current = teamDateIsNarrow;

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
  const teamName = team.name || "Unknown Team";

  useLayoutEffect(() => {
    const container = teamNameContainerRef.current;
    const probe = teamNameProbeRef.current;
    if (!container || !probe) return;

    const update = () => {
      const dateEl = teamDateRef.current;
      const reservedWidth =
        teamDateIsNarrowRef.current && dateEl ? dateEl.offsetWidth + 16 : 0;

      probe.textContent = teamName;
      setTeamDateIsNarrow(
        probe.scrollWidth > container.clientWidth - reservedWidth,
      );
    };

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(container);
    if (teamDateRef.current) resizeObserver.observe(teamDateRef.current);
    update();

    return () => resizeObserver.disconnect();
  }, [teamName]);
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

  const getTeamLocationDetails = () => {
    const isRemote =
      normalizeBoolean(team.isRemote ?? team.is_remote) === true;
    const locationParts = [team.city, team.country].filter(Boolean);
    const fallbackLocation =
      typeof team.location === "string"
        ? team.location
        : team.postal_code ?? team.postalCode ?? null;

    return {
      isRemote,
      locationText: isRemote
        ? "Remote"
        : locationParts.length > 0
          ? locationParts.join(", ")
          : fallbackLocation,
    };
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
  const isInternal =
    normalizeBoolean(invitation?.isInternal ?? invitation?.is_internal) === true;
  const inviteeAlreadyTeamMember =
    isInternal ||
    isInviteeExistingTeamMember({ invitation, team, currentUser });
  const isAcceptRoleLoading = actionLoading === "acceptRole";
  const isSwitchRoleLoading = actionLoading === "switchRole";
  const isAcceptTeamLoading = actionLoading === "acceptTeam";
  const isDeclineLoading = actionLoading === "decline";
  const isActionPending =
    isAcceptRoleLoading || isSwitchRoleLoading || isAcceptTeamLoading || isDeclineLoading;
  const isControlsDisabled = loading || isActionPending;
  const teamLocationDetails = getTeamLocationDetails();
  const isCombinedRoleInvitation = hasRoleInvitation && !inviteeAlreadyTeamMember;

  const headerSubtitle = isInternal
    ? "You've been invited to fill this role!"
    : inviteeAlreadyTeamMember && hasRoleInvitation
      ? "You've been invited to fill this role!"
      : isCombinedRoleInvitation
      ? "You've been invited to join a new Team and fill a Role"
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
    inviteeAlreadyTeamMember &&
    !isRoleUnavailable &&
    Boolean(currentFilledRole?.id ?? invitation?.current_filled_role_id ?? invitation?.currentFilledRoleId);
  const invitationRoleName =
    roleForCard?.roleName ??
    roleForCard?.role_name ??
    invitation?.roleName ??
    invitation?.role_name ??
    null;

  // Custom header
  const customHeader = (
    <div>
      <h2 className="text-xl font-medium text-primary leading-[110%] mb-[0.2em]">
        {inviteeAlreadyTeamMember && hasRoleInvitation && invitationRoleName ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <UserSearch size={20} className="shrink-0 text-primary" />
            <span className="min-w-0 truncate">{invitationRoleName}</span>
          </span>
        ) : isCombinedRoleInvitation ? (
          <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Users size={20} className="shrink-0 text-primary" />
              <span>Team</span>
            </span>
            <span>{"&"}</span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <UserSearch size={20} className="shrink-0 text-primary" />
              <span>Role Invitation</span>
            </span>
          </span>
        ) : !hasRoleInvitation ? (
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Users size={20} className="shrink-0 text-primary" />
            <span>Team Invitation</span>
          </span>
        ) : (
          teamName
        )}
      </h2>
      <p className="text-sm text-base-content/70 flex items-start">
        <MailOpen
          size={14}
          className={`mr-1.5 mt-[0.15em] shrink-0 ${
            inviteeAlreadyTeamMember ? "text-orange-500" : "text-pink-500"
          }`}
        />
        <span className="leading-[1.2]">{headerSubtitle}</span>
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
        className="min-w-0 flex-[1_1_12rem] overflow-hidden"
      />

      {/* Buttons — right-aligned and allowed to wrap on narrow screens */}
      <div className="ml-auto flex flex-wrap justify-end gap-2">
          {hasRoleInvitation && inviteeAlreadyTeamMember ? (
            // Internal role invite: user is already a member, just fill the role
            isRoleUnavailable ? (
              <Tooltip content={isRoleFilled ? "This role is already filled" : "This role is closed"}>
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
            ) : canSwitchRole ? (
              <Tooltip content={`Leave ${currentFilledRoleName} and fill this role instead.`}>
                <Button
                  variant="successOutline"
                  size="sm"
                  onClick={handleSwitchRole}
                  disabled={isControlsDisabled}
                  icon={<ArrowRightLeft size={16} />}
                >
                  {isSwitchRoleLoading ? "Switching..." : "Switch Role"}
                </Button>
              </Tooltip>
            ) : (
              <Tooltip content="Accept this role invitation">
                <Button
                  variant="successOutline"
                  size="sm"
                  onClick={handleAcceptWithRole}
                  disabled={isControlsDisabled}
                  icon={<Check size={16} />}
                >
                  {isAcceptRoleLoading ? "Accepting..." : "Fill Role"}
                </Button>
              </Tooltip>
            )
          ) : hasRoleInvitation ? (
            // External invite with a role: offer team-only or fill-role options
            <>
              {isRoleUnavailable ? (
                <Tooltip content={isRoleFilled ? "This role is already filled — you can still join the team" : "This role is closed — you can still join the team"}>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={true}
                    className="border border-base-content/30 text-base-content/40"
                    icon={<UserCheck size={16} />}
                  >
                    Fill Role + Join Team
                  </Button>
                </Tooltip>
              ) : (
                <Tooltip content="Join the team and fill the role">
                  <Button
                    variant="successOutline"
                    size="sm"
                    onClick={handleAcceptWithRole}
                    disabled={isControlsDisabled}
                    icon={<CheckCheck size={16} />}
                  >
                    {isAcceptRoleLoading ? "Joining..." : "Fill Role + Join Team"}
                  </Button>
                </Tooltip>
              )}
              <Tooltip content="Join the team without filling the role">
                <Button
                  variant="successOutline"
                  size="sm"
                  onClick={handleAcceptTeamOnly}
                  disabled={isControlsDisabled}
                  icon={<Check size={16} />}
                >
                  {isAcceptTeamLoading ? "Joining..." : "Join Team"}
                </Button>
              </Tooltip>
            </>
          ) : (
            // No role: simple accept
            <Tooltip content="Accept this team invitation">
              <Button
                variant="successOutline"
                size="sm"
                onClick={handleAcceptTeamOnly}
                disabled={isControlsDisabled}
                icon={<Check size={16} />}
              >
                {isAcceptTeamLoading ? "Joining..." : "Join Team"}
              </Button>
            </Tooltip>
          )}
          <Tooltip content="Decline this invitation">
            <Button
              variant="errorOutline"
              size="sm"
              onClick={handleDecline}
              disabled={isControlsDisabled}
              icon={<X size={16} />}
            >
              {isDeclineLoading ? "Declining..." : "Decline"}
            </Button>
          </Tooltip>
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
        <div className="relative flex items-start justify-between gap-4 mb-5">
          {/* Team info (hover + onClick like in TeamInvitesModal) */}
          <div
            className="flex min-w-0 flex-1 items-start space-x-4 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleTeamClick}
          >
            <Tooltip content="Click to view team details" wrapperClassName="avatar">
              <div className="w-12 h-12 rounded-full relative overflow-hidden">
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
                    textClassName="text-[8px]"
                    textTranslateClassName="-translate-y-[2px]"
                  />
                )}
              </div>
            </Tooltip>

            <div className="flex-1 min-w-0">
              <h4
                ref={teamNameContainerRef}
                className="font-medium text-base-content leading-[120%] mb-[0.2em] truncate relative"
              >
                <Tooltip
                  content="Click to view team details"
                  wrapperClassName="cursor-pointer hover:text-primary transition-colors"
                >
                  <span>{teamName}</span>
                </Tooltip>
                <span
                  ref={teamNameProbeRef}
                  className="invisible absolute whitespace-nowrap pointer-events-none left-0 top-0 font-medium"
                  aria-hidden="true"
                >
                  {teamName}
                </span>
              </h4>
              <div
                className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0 overflow-hidden text-xs"
                style={{ maxHeight: "2.1em" }}
              >
                {teamDateIsNarrow && (
                  <div className="flex shrink-0 items-center gap-1 text-base-content/60">
                    <Calendar size={10} className="shrink-0" />
                    <span className="leading-[1.05] whitespace-nowrap">
                      {getInvitationDate()}
                    </span>
                  </div>
                )}
                <Tooltip
                  content="Team members"
                  wrapperClassName="flex shrink-0 items-center gap-1 text-base-content/70"
                >
                  <Users size={10} className="shrink-0 text-primary" />
                  <span className="leading-[1.05] whitespace-nowrap">
                    {getMemberCount()}/{getMaxMembers()}
                  </span>
                </Tooltip>
                {teamLocationDetails.locationText && (
                  <Tooltip
                    content={teamLocationDetails.locationText}
                    wrapperClassName="flex min-w-0 max-w-[calc(100%-1.5rem)] flex-[0_1_auto] items-center gap-1 overflow-hidden"
                  >
                    {teamLocationDetails.isRemote ? (
                      <Globe size={10} className="shrink-0 text-base-content/60" />
                    ) : (
                      <MapPin size={10} className="shrink-0 text-base-content/60" />
                    )}
                    <span className="min-w-0 truncate text-base-content/60 leading-[1.05]">
                      {teamLocationDetails.locationText}
                    </span>
                  </Tooltip>
                )}
                {inviteeAlreadyTeamMember && (
                  <Tooltip
                    content="You are already a member of this team"
                    wrapperClassName="flex min-w-0 overflow-hidden items-center gap-0.5 text-base-content/70"
                  >
                    <User size={10} className="flex-shrink-0 text-success" />
                    <span className="leading-[1.05] whitespace-nowrap">Team Member</span>
                  </Tooltip>
                )}
                {isSyntheticTeam(team) && (
                  <Tooltip
                    content={DEMO_TEAM_TOOLTIP}
                    wrapperClassName="flex shrink-0 items-center gap-0.5 text-base-content/50"
                  >
                    <FlaskConical size={10} className="flex-shrink-0" />
                  </Tooltip>
                )}
              </div>
            </div>
          </div>

          {/* Date - top right */}
          <div
            ref={teamDateRef}
            className={`flex items-center text-xs text-base-content/60 whitespace-nowrap flex-shrink-0${teamDateIsNarrow ? " absolute opacity-0 pointer-events-none" : ""}`}
          >
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
                  if (inviteeAlreadyTeamMember && currentFilledRoleName && currentFilledRoleName !== "your current role") {
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
                    isTeamMember={inviteeAlreadyTeamMember}
                    hideActions={true}
                    notificationHighlight={notificationHighlight}
                  />
                </div>
              )}
              {inviteeAlreadyTeamMember && currentFilledRoleForCard && (
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
              isTeamMember={inviteeAlreadyTeamMember}
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
