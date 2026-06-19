import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useToast } from "../../contexts/ToastContext";
import {
  Calendar,
  Users,
  User,
  UserSearch,
  X,
  SendHorizontal,
  FlaskConical,
  MapPin,
  Globe,
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
import TeamAvatar from "./TeamAvatar";
import {
  DEMO_TEAM_TOOLTIP,
  isSyntheticTeam,
} from "../../utils/userHelpers";
import Alert from "../common/Alert";
import { format } from "date-fns";
import { useHydratedRole } from "../../hooks/useHydratedRole";
import { teamService } from "../../services/teamService";
import { useAuth } from "../../contexts/AuthContext";
import {
  extractRoleMatchData,
  getMemberUserId,
  idsMatch,
  isExistingMemberStatus,
  normalizeBoolean,
} from "../../utils/teamRequestUtils";

const EMPTY_OBJECT = {};

const firstDefined = (...values) =>
  values.find((value) => value !== undefined);

const firstPresent = (...values) =>
  values.find(
    (value) => value !== undefined && value !== null && value !== "",
  );

const hasValue = (value) =>
  value !== undefined && value !== null && value !== "";

const isApplicantExistingTeamMember = ({ application, team, currentUser }) => {
  const applicantId =
    application?.applicant?.id ??
    application?.user?.id ??
    application?.applicantId ??
    application?.applicant_id ??
    application?.userId ??
    application?.user_id ??
    currentUser?.id ??
    null;

  if (!team || applicantId === null || applicantId === undefined) return false;

  const directFlags = [
    application?.isInternalRoleApplication,
    application?.is_internal_role_application,
    application?.isInternal,
    application?.is_internal,
    application?.isApplicantMember,
    application?.is_applicant_member,
    application?.applicantIsMember,
    application?.applicant_is_member,
    application?.alreadyMember,
    application?.already_member,
    application?.isExistingMember,
    application?.is_existing_member,
    application?.existingMember,
    application?.existing_member,
    application?.currentUserIsMember,
    application?.current_user_is_member,
    team?.isApplicantMember,
    team?.is_applicant_member,
    team?.applicantIsMember,
    team?.applicant_is_member,
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
    application?.applicantMembershipStatus,
    application?.applicant_membership_status,
    application?.membershipStatus,
    application?.membership_status,
    application?.applicantStatus,
    application?.applicant_status,
    team?.applicantMembershipStatus,
    team?.applicant_membership_status,
    team?.membershipStatus,
    team?.membership_status,
    team?.applicantStatus,
    team?.applicant_status,
  ];

  if (membershipStatuses.some(isExistingMemberStatus)) {
    return true;
  }

  if (idsMatch(team?.owner_id ?? team?.ownerId, applicantId)) {
    return true;
  }

  const memberCollections = [
    team?.members,
    team?.teamMembers,
    team?.team_members,
  ].filter(Array.isArray);

  if (
    memberCollections.some((members) =>
      members.some((member) => idsMatch(getMemberUserId(member), applicantId)),
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
    memberIds.some((memberId) => idsMatch(memberId, applicantId)),
  );
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
  const { user: currentUser } = useAuth();

  // ============ State ============
  const showToast = useToast();
  const loading = false;
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [isTeamDetailsOpen, setIsTeamDetailsOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [hydratedTeam, setHydratedTeam] = useState(null);
  const teamHeaderRowRef = useRef(null);
  const teamNameContainerRef = useRef(null);
  const teamNameProbeRef = useRef(null);
  const teamDateRef = useRef(null);
  const [teamDateIsNarrow, setTeamDateIsNarrow] = useState(false);

  // ============ Helpers ============

  // Get team data from application
  const baseTeam = application?.team || EMPTY_OBJECT;
  const effectiveTeamId =
    baseTeam?.id ??
    baseTeam?.teamId ??
    baseTeam?.team_id ??
    application?.teamId ??
    application?.team_id ??
    null;
  const sourceTeam = hydratedTeam
    ? { ...baseTeam, ...hydratedTeam }
    : baseTeam;
  const syntheticTeamFlag =
    sourceTeam?.is_synthetic ??
    sourceTeam?.isSynthetic ??
    application?.team_is_synthetic ??
    application?.teamIsSynthetic;
  const team = {
    ...sourceTeam,
    id: firstPresent(
      sourceTeam?.id,
      sourceTeam?.teamId,
      sourceTeam?.team_id,
      application?.teamId,
      application?.team_id,
    ),
    name: firstPresent(
      sourceTeam?.name,
      application?.teamName,
      application?.team_name,
    ),
    current_members_count: firstDefined(
      sourceTeam?.current_members_count,
      sourceTeam?.currentMembersCount,
      application?.team_current_members_count,
      application?.teamCurrentMembersCount,
    ),
    currentMembersCount: firstDefined(
      sourceTeam?.currentMembersCount,
      sourceTeam?.current_members_count,
      application?.teamCurrentMembersCount,
      application?.team_current_members_count,
    ),
    member_count: firstDefined(
      sourceTeam?.member_count,
      sourceTeam?.memberCount,
      application?.team_member_count,
      application?.teamMemberCount,
    ),
    memberCount: firstDefined(
      sourceTeam?.memberCount,
      sourceTeam?.member_count,
      application?.teamMemberCount,
      application?.team_member_count,
    ),
    members_count: firstDefined(
      sourceTeam?.members_count,
      sourceTeam?.membersCount,
      application?.team_members_count,
      application?.teamMembersCount,
    ),
    membersCount: firstDefined(
      sourceTeam?.membersCount,
      sourceTeam?.members_count,
      application?.teamMembersCount,
      application?.team_members_count,
    ),
    max_members: firstDefined(
      sourceTeam?.max_members,
      sourceTeam?.maxMembers,
      application?.team_max_members,
      application?.teamMaxMembers,
    ),
    maxMembers: firstDefined(
      sourceTeam?.maxMembers,
      sourceTeam?.max_members,
      application?.teamMaxMembers,
      application?.team_max_members,
    ),
    city: firstPresent(sourceTeam?.city, application?.team_city),
    country: firstPresent(sourceTeam?.country, application?.team_country),
    location: firstPresent(sourceTeam?.location, application?.team_location),
    postal_code: firstPresent(
      sourceTeam?.postal_code,
      sourceTeam?.postalCode,
      application?.team_postal_code,
      application?.teamPostalCode,
    ),
    postalCode: firstPresent(
      sourceTeam?.postalCode,
      sourceTeam?.postal_code,
      application?.teamPostalCode,
      application?.team_postal_code,
    ),
    is_remote: firstDefined(
      sourceTeam?.is_remote,
      sourceTeam?.isRemote,
      application?.team_is_remote,
      application?.teamIsRemote,
    ),
    isRemote: firstDefined(
      sourceTeam?.isRemote,
      sourceTeam?.is_remote,
      application?.teamIsRemote,
      application?.team_is_remote,
    ),
    is_synthetic:
      sourceTeam?.is_synthetic ?? sourceTeam?.isSynthetic ?? syntheticTeamFlag,
    isSynthetic:
      sourceTeam?.isSynthetic ?? sourceTeam?.is_synthetic ?? syntheticTeamFlag,
  };
  const teamName = team.name || "Unknown Team";

  useEffect(() => {
    if (!isOpen) {
      setHydratedTeam(null);
      return;
    }

    if (!effectiveTeamId) return;

    const hasMemberCount =
      [
        baseTeam?.current_members_count,
        baseTeam?.currentMembersCount,
        baseTeam?.member_count,
        baseTeam?.memberCount,
        baseTeam?.members_count,
        baseTeam?.membersCount,
        application?.team_current_members_count,
        application?.teamCurrentMembersCount,
        application?.team_member_count,
        application?.teamMemberCount,
        application?.team_members_count,
        application?.teamMembersCount,
      ].some((value) => value !== undefined) ||
      Array.isArray(baseTeam?.members);
    const hasMaxMembers = [
      baseTeam?.max_members,
      baseTeam?.maxMembers,
      application?.team_max_members,
      application?.teamMaxMembers,
    ].some((value) => value !== undefined);
    const hasLocation = [
      baseTeam?.city,
      baseTeam?.country,
      baseTeam?.location,
      baseTeam?.postal_code,
      baseTeam?.postalCode,
      application?.team_city,
      application?.team_country,
      application?.team_location,
      application?.team_postal_code,
      application?.teamPostalCode,
    ].some(hasValue);
    const hasRemoteFlag = [
      baseTeam?.is_remote,
      baseTeam?.isRemote,
      application?.team_is_remote,
      application?.teamIsRemote,
    ].some((value) => value !== undefined);
    const hasSyntheticFlag = [
      baseTeam?.is_synthetic,
      baseTeam?.isSynthetic,
      application?.team_is_synthetic,
      application?.teamIsSynthetic,
    ].some((value) => value !== undefined);

    if (
      hasMemberCount &&
      hasMaxMembers &&
      (hasLocation || hasRemoteFlag) &&
      hasSyntheticFlag
    ) {
      setHydratedTeam(null);
      return;
    }

    let cancelled = false;

    const fetchTeamDetails = async () => {
      try {
        const response = await teamService.getTeamById(effectiveTeamId);
        if (cancelled) return;
        setHydratedTeam(response?.data ?? response ?? null);
      } catch (err) {
        console.warn(
          "Could not fetch team details for application details modal:",
          err,
        );
        if (!cancelled) setHydratedTeam(null);
      }
    };

    fetchTeamDetails();

    return () => {
      cancelled = true;
    };
  }, [isOpen, effectiveTeamId, application, baseTeam]);

  useLayoutEffect(() => {
    const row = teamHeaderRowRef.current;
    const container = teamNameContainerRef.current;
    const probe = teamNameProbeRef.current;
    if (!row || !container || !probe) return;

    const update = () => {
      probe.textContent = teamName;
      const rowWidth = row.clientWidth;
      const shouldCollapseForRowWidth = rowWidth > 0 && rowWidth < 520;
      const shouldCollapseForTitle =
        probe.scrollWidth > container.clientWidth;

      setTeamDateIsNarrow(
        shouldCollapseForRowWidth || shouldCollapseForTitle,
      );
    };

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(row);
    resizeObserver.observe(container);
    if (teamDateRef.current) resizeObserver.observe(teamDateRef.current);
    update();

    return () => resizeObserver.disconnect();
  }, [isOpen, teamName]);
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

  const getMemberCount = () => {
    return (
      team.current_members_count ??
      team.currentMembersCount ??
      team.member_count ??
      team.memberCount ??
      team.members_count ??
      team.membersCount ??
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

  const hasTeamMemberCountData =
    [
      team.current_members_count,
      team.currentMembersCount,
      team.member_count,
      team.memberCount,
      team.members_count,
      team.membersCount,
    ].some((value) => value !== undefined) ||
    Array.isArray(team.members);
  const hasTeamMaxMemberData =
    team.max_members !== undefined || team.maxMembers !== undefined;
  const showTeamMemberCapacity =
    hasTeamMemberCountData && hasTeamMaxMemberData;

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
      showToast("Application cancelled successfully.", "success");
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
  const applicantAlreadyTeamMember = isApplicantExistingTeamMember({
    application,
    team,
    currentUser,
  });
  const hasRoleApplication = !!(
    application?.role ||
    application?.roleId ||
    application?.role_id
  );
  const teamLocationDetails = getTeamLocationDetails();
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
      <h2 className="text-xl font-medium text-primary leading-[110%] mb-[0.2em]">
        {isInternalRoleApplication && roleName ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <UserSearch size={20} className="shrink-0 text-primary" />
            <span className="min-w-0 truncate">{roleName}</span>
          </span>
        ) : hasRoleApplication ? (
          <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0 leading-[100%] mb-2">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Users size={20} className="shrink-0 text-primary" />
              <span>Team</span>
            </span>
            <span>{"&"}</span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <UserSearch size={20} className="shrink-0 text-primary" />
              <span>Role Application</span>
            </span>
          </span>
        ) : !hasRoleApplication ? (
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Users size={20} className="shrink-0 text-primary" />
            <span>Team Application</span>
          </span>
        ) : (
          teamName
        )}
      </h2>
      <p className="text-sm text-base-content/70 flex items-start">
        <SendHorizontal
          size={14}
          className={`mr-1.5 mt-[0.15em] shrink-0 ${
            isInternalRoleApplication
              ? "text-orange-500"
              : "text-violet-500"
          }`}
        />
        <span className="leading-[1.2]">
          {isInternalRoleApplication
            ? "You applied to fill this role within your team"
            : hasRoleApplication
              ? "You applied to join a new Team and fill a Role"
            : "You applied to join"}
        </span>
      </p>
    </div>
  );

  // Footer with "Received by" (left) and buttons (right)
  // Owner display now matches the inviter display pattern in TeamInvitationDetailsModal
  const footer = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {/* Received by (left) */}
      <InlineUserLink
        label="Received by"
        user={owner}
        onOpenUser={handleUserClick}
        className="min-w-0 flex-[1_1_12rem] overflow-hidden"
      />

      {/* Buttons (right) */}
      <div className="ml-auto flex flex-wrap justify-end gap-2">
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
        {error && (
          <Alert
            type="error"
            message={error}
            onClose={() => setError(null)}
            className="mb-4 w-full shadow-sm"
          />
        )}

        {/* Top row: Team info (left, clickable) + Date (right) */}
        <div
          ref={teamHeaderRowRef}
          className="relative flex items-start justify-between gap-4 mb-5"
        >
          {/* Team info */}
          <div
            className="flex min-w-0 flex-1 items-start space-x-4 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleTeamClick}
          >
            <Tooltip content="Click to view team details" wrapperClassName="avatar">
              <TeamAvatar
                team={team}
                sizeClass="w-12 h-12"
                initialsClassName="text-xl font-medium"
                showDemoOverlay={isSyntheticTeam(team)}
                demoOverlayTextClassName="text-[8px]"
                demoOverlayTextTranslateClassName="-translate-y-[2px]"
              />
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
                      {getApplicationDate()}
                    </span>
                  </div>
                )}
                {showTeamMemberCapacity && (
                  <Tooltip
                    content="Team members"
                    wrapperClassName="flex shrink-0 items-center gap-1 text-base-content/70"
                  >
                    <Users size={10} className="shrink-0 text-primary" />
                    <span className="leading-[1.05] whitespace-nowrap">
                      {getMemberCount()}/{getMaxMembers()}
                    </span>
                  </Tooltip>
                )}
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
                {applicantAlreadyTeamMember && (
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
              {hasRoleApplication && (
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
        {!application?.message && hasRoleApplication && (
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
        {!application?.message && !hasRoleApplication && (
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
