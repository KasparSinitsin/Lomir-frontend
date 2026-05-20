import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Award,
  Calendar,
  MapPin,
  Globe,
  CircleDot,
  Mail,
  Ruler,
  SendHorizontal,
  Tag,
  Users,
  UserSearch,
  UserCheck,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Sparkles,
  TrendingUp,
  TrendingDown,
  FlaskConical,
} from "lucide-react";
import VacantRoleDetailsModal from "./VacantRoleDetailsModal";
import Card from "../common/Card";
import RoleBadgePill from "../common/RoleBadgePill";
import CardMetaItem from "../common/CardMetaItem";
import CardMetaRow from "../common/CardMetaRow";
import LocationDistanceTagsRow from "../common/LocationDistanceTagsRow";
import SearchResultTypeOverlay from "../common/SearchResultTypeOverlay";
import Tooltip from "../common/Tooltip";
import {
  DEMO_ROLE_TOOLTIP,
  getDisplayName,
  getUserInitials,
  isSyntheticRole,
} from "../../utils/userHelpers";
import DemoAvatarOverlay from "../users/DemoAvatarOverlay";
import { resolveFilledRoleUser } from "../../utils/vacantRoleUtils";
import {
  getMatchTier,
  MATCH_TIER_GOOD,
  MATCH_TIER_GREAT,
} from "../../utils/matchScoreUtils";
import { teamService } from "../../services/teamService";
import { useAuth } from "../../contexts/AuthContext";
import { format } from "date-fns";
import { formatDisplayName } from "../../utils/nameFormatters";

const userPendingApplicationsCache = new Map();
const userReceivedInvitationsCache = new Map();
const userTeamIdsCache = new Map();

const getCachedUserPendingApplications = async (userId) => {
  if (!userId) return [];

  if (userPendingApplicationsCache.has(userId)) {
    return userPendingApplicationsCache.get(userId);
  }

  const request = (async () => {
    const response = await teamService.getUserPendingApplications();
    return Array.isArray(response?.data) ? response.data : [];
  })();

  userPendingApplicationsCache.set(userId, request);

  try {
    const result = await request;
    userPendingApplicationsCache.set(userId, Promise.resolve(result));
    return result;
  } catch (error) {
    userPendingApplicationsCache.delete(userId);
    throw error;
  }
};

const getCachedUserReceivedInvitations = async (userId) => {
  if (!userId) return [];

  if (userReceivedInvitationsCache.has(userId)) {
    return userReceivedInvitationsCache.get(userId);
  }

  const request = (async () => {
    const response = await teamService.getUserReceivedInvitations();
    return Array.isArray(response?.data) ? response.data : [];
  })();

  userReceivedInvitationsCache.set(userId, request);

  try {
    const result = await request;
    userReceivedInvitationsCache.set(userId, Promise.resolve(result));
    return result;
  } catch (error) {
    userReceivedInvitationsCache.delete(userId);
    throw error;
  }
};

const getCachedUserTeamIds = async (userId) => {
  if (!userId) return new Set();

  if (userTeamIdsCache.has(userId)) {
    return userTeamIdsCache.get(userId);
  }

  const request = (async () => {
    const teamIds = new Set();
    const limit = 100;
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const response = await teamService.getUserTeams(userId, { page, limit });
      const teams = Array.isArray(response?.data) ? response.data : [];

      teams.forEach((userTeam) => {
        const id = userTeam?.id ?? userTeam?.teamId ?? userTeam?.team_id;
        if (id != null) {
          teamIds.add(String(id));
        }
      });

      const pagination = response?.pagination ?? {};
      const nextTotalPages = Number(
        pagination.totalPages ?? pagination.total_pages ?? 1,
      );
      totalPages =
        Number.isFinite(nextTotalPages) && nextTotalPages > 0
          ? nextTotalPages
          : 1;

      const hasNextPage = Boolean(
        pagination.hasNextPage ?? pagination.has_next_page ?? page < totalPages,
      );

      if (!hasNextPage) {
        break;
      }

      page += 1;
    }

    return teamIds;
  })();

  userTeamIdsCache.set(userId, request);

  try {
    const result = await request;
    userTeamIdsCache.set(userId, Promise.resolve(result));
    return result;
  } catch (error) {
    userTeamIdsCache.delete(userId);
    throw error;
  }
};

/**
 * VacantRoleCard Component
 *
 * Compact card matching TeamMembersSection member cards.
 * Shows: avatar initials, role name, location, status badge,
 * and optionally the authenticated user's match score.
 * Clicking opens VacantRoleDetailsModal with full details.
 *
 * @param {Object} role - Vacant role data from API
 * @param {boolean} canManage - Whether the current user can edit/delete this role
 * @param {Function} onEdit - Callback to open edit modal
 * @param {Function} onDelete - Callback to delete this role
 * @param {Function} onStatusChange - Callback to change role status
 * @param {number|null} matchScore - 0–1 match score (null = not available)
 * @param {Object|null} matchDetails - Breakdown: tagScore, badgeScore, distanceScore
 */
const VacantRoleCard = ({
  team = null,
  role,
  canManage = false,
  canManageStatus = false,
  isTeamMember = false,
  onEdit,
  onDelete,
  onStatusChange,
  allowedStatusActions = ["closed", "open"],
  statusActionLoading = false,
  matchScore = null,
  matchDetails = null,
  viewAsUserId = null,
  viewAsUser = null,
  onViewApplicationDetails = null,
  hideActions = false,
  viewMode = "card",
  teamContext = null,
  activeFilters = { showLocation: true, showTags: true, showBadges: true },
  showSearchResultTypeOverlay = false,
  notificationHighlight = false,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const menuTriggerRef = useRef(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [pendingApplicationForRole, setPendingApplicationForRole] =
    useState(null);
  const [pendingInvitationForRole, setPendingInvitationForRole] =
    useState(null);
  const [isCurrentUserTeamMember, setIsCurrentUserTeamMember] =
    useState(false);
  const { user, isAuthenticated } = useAuth();
  const usesSharedSearchCard = hideActions && Boolean(teamContext);
  const roleId = role?.id ?? role?.roleId ?? role?.role_id ?? null;
  const roleNameForMatch = role?.roleName ?? role?.role_name ?? "";
  const rolePostedAt =
    role?.postedAt ??
    role?.posted_at ??
    role?.createdAt ??
    role?.created_at ??
    null;
  const teamIdForMatch =
    team?.id ??
    teamContext?.id ??
    role?.teamId ??
    role?.team_id ??
    role?.team?.id ??
    role?.team?.teamId ??
    role?.team?.team_id ??
    null;

  useEffect(() => {
    if (
      !role ||
      !usesSharedSearchCard ||
      !isAuthenticated ||
      !user?.id ||
      roleId == null
    ) {
      setPendingApplicationForRole(null);
      return;
    }

    let isActive = true;

    const checkPendingApplication = async () => {
      try {
        const pendingApplications = await getCachedUserPendingApplications(
          user.id,
        );

        const foundApplication = pendingApplications.find((app) => {
          const appRoleId = app.role?.id ?? app.roleId ?? app.role_id ?? null;
          if (appRoleId != null && String(appRoleId) === String(roleId)) {
            return true;
          }

          const appTeamId =
            app.team?.id ?? app.teamId ?? app.team_id ?? null;
          const appRoleName =
            app.role?.roleName ??
            app.role?.role_name ??
            app.roleName ??
            app.role_name ??
            null;

          return (
            teamIdForMatch != null &&
            appTeamId != null &&
            String(appTeamId) === String(teamIdForMatch) &&
            typeof appRoleName === "string" &&
            typeof roleNameForMatch === "string" &&
            appRoleName.trim().toLowerCase() ===
              roleNameForMatch.trim().toLowerCase()
          );
        });

        if (isActive) {
          setPendingApplicationForRole(foundApplication || null);
        }
      } catch (error) {
        console.error("Error checking pending role applications:", error);
        if (isActive) {
          setPendingApplicationForRole(null);
        }
      }
    };

    checkPendingApplication();

    return () => {
      isActive = false;
    };
  }, [
    isAuthenticated,
    role,
    roleId,
    roleNameForMatch,
    teamIdForMatch,
    user?.id,
    usesSharedSearchCard,
  ]);

  useEffect(() => {
    if (
      !role ||
      !usesSharedSearchCard ||
      !isAuthenticated ||
      !user?.id ||
      roleId == null
    ) {
      setPendingInvitationForRole(null);
      return;
    }

    let isActive = true;

    const checkPendingInvitation = async () => {
      try {
        const receivedInvitations = await getCachedUserReceivedInvitations(
          user.id,
        );

        const foundInvitation = receivedInvitations.find((invitation) => {
          const invitationRoleId =
            invitation.role?.id ??
            invitation.roleId ??
            invitation.role_id ??
            null;
          if (
            invitationRoleId != null &&
            String(invitationRoleId) === String(roleId)
          ) {
            return true;
          }

          const invitationTeamId =
            invitation.team?.id ??
            invitation.teamId ??
            invitation.team_id ??
            null;
          const invitationRoleName =
            invitation.role?.roleName ??
            invitation.role?.role_name ??
            invitation.roleName ??
            invitation.role_name ??
            null;

          return (
            teamIdForMatch != null &&
            invitationTeamId != null &&
            String(invitationTeamId) === String(teamIdForMatch) &&
            typeof invitationRoleName === "string" &&
            typeof roleNameForMatch === "string" &&
            invitationRoleName.trim().toLowerCase() ===
              roleNameForMatch.trim().toLowerCase()
          );
        });

        if (isActive) {
          setPendingInvitationForRole(foundInvitation || null);
        }
      } catch (error) {
        console.error("Error checking pending role invitations:", error);
        if (isActive) {
          setPendingInvitationForRole(null);
        }
      }
    };

    checkPendingInvitation();

    return () => {
      isActive = false;
    };
  }, [
    isAuthenticated,
    role,
    roleId,
    roleNameForMatch,
    teamIdForMatch,
    user?.id,
    usesSharedSearchCard,
  ]);

  useEffect(() => {
    if (
      !role ||
      !usesSharedSearchCard ||
      !isAuthenticated ||
      !user?.id ||
      teamIdForMatch == null
    ) {
      setIsCurrentUserTeamMember(false);
      return;
    }

    let isActive = true;

    const checkTeamMembership = async () => {
      try {
        const teamIds = await getCachedUserTeamIds(user.id);
        if (isActive) {
          setIsCurrentUserTeamMember(teamIds.has(String(teamIdForMatch)));
        }
      } catch (error) {
        console.error("Error checking team membership for role card:", error);
        if (isActive) {
          setIsCurrentUserTeamMember(false);
        }
      }
    };

    checkTeamMembership();

    return () => {
      isActive = false;
    };
  }, [
    isAuthenticated,
    role,
    teamIdForMatch,
    user?.id,
    usesSharedSearchCard,
  ]);

  if (!role) return null;

  // Handle both camelCase (from API response interceptor) and snake_case
  const role_name = role.roleName ?? role.role_name;
  const role_bio = role.bio ?? role.roleBio ?? role.role_bio ?? "";
  const city = role.city;
  const country = role.country;
  const max_distance_km = role.maxDistanceKm ?? role.max_distance_km;
  const is_remote = role.isRemote ?? role.is_remote;
  const status = role.status;
  const statusActions = Array.isArray(allowedStatusActions)
    ? allowedStatusActions
    : [];
  const resolvedTeamName =
    teamContext?.name ?? role.teamName ?? role.team_name ?? "";
  const currentUserRoleApplication =
    role.currentUserRoleApplication ??
    role.current_user_role_application ??
    role.currentUserApplication ??
    role.current_user_application ??
    role.pendingRoleApplication ??
    role.pending_role_application ??
    role.pendingApplication ??
    role.pending_application ??
    role.roleApplication ??
    role.role_application ??
    role.application ??
    null;
  const currentUserRoleInvitation =
    role.currentUserRoleInvitation ??
    role.current_user_role_invitation ??
    role.currentUserInvitation ??
    role.current_user_invitation ??
    role.pendingRoleInvitation ??
    role.pending_role_invitation ??
    role.pendingInvitation ??
    role.pending_invitation ??
    role.roleInvitation ??
    role.role_invitation ??
    role.invitation ??
    null;
  const roleApplicationStatus = String(
    role.applicationStatus ??
      role.application_status ??
      role.currentUserApplicationStatus ??
      role.current_user_application_status ??
      currentUserRoleApplication?.status ??
      currentUserRoleApplication?.applicationStatus ??
      currentUserRoleApplication?.application_status ??
      "",
  ).toLowerCase();
  const roleInvitationStatus = String(
    role.invitationStatus ??
      role.invitation_status ??
      role.currentUserInvitationStatus ??
      role.current_user_invitation_status ??
      currentUserRoleInvitation?.status ??
      currentUserRoleInvitation?.invitationStatus ??
      currentUserRoleInvitation?.invitation_status ??
      "",
  ).toLowerCase();
  const hasCurrentUserRoleApplication = Boolean(
    role.hasAppliedToRole ??
      role.has_applied_to_role ??
      role.hasApplied ??
      role.has_applied ??
      role.isApplied ??
      role.is_applied ??
      role.viewerHasApplied ??
      role.viewer_has_applied ??
      role.hasPendingApplication ??
      role.has_pending_application ??
      role.hasPendingRoleApplication ??
      role.has_pending_role_application ??
      role.isPendingApplication ??
      role.is_pending_application ??
      role.currentUserHasApplied ??
      role.current_user_has_applied ??
      pendingApplicationForRole ??
      currentUserRoleApplication ??
      (roleApplicationStatus &&
        !["withdrawn", "rejected", "declined", "cancelled", "canceled"].includes(
          roleApplicationStatus,
        )),
  );
  const hasCurrentUserRoleInvitation = Boolean(
    role.hasRoleInvitation ??
      role.has_role_invitation ??
      role.hasInvitationToRole ??
      role.has_invitation_to_role ??
      role.hasInvitation ??
      role.has_invitation ??
      role.isInvitedToRole ??
      role.is_invited_to_role ??
      role.viewerHasInvitation ??
      role.viewer_has_invitation ??
      role.currentUserHasInvitation ??
      role.current_user_has_invitation ??
      pendingInvitationForRole ??
      currentUserRoleInvitation ??
      (roleInvitationStatus &&
        !["withdrawn", "revoked", "declined", "cancelled", "canceled"].includes(
          roleInvitationStatus,
        )),
  );
  const membershipRole =
    teamContext?.userRole ??
    teamContext?.user_role ??
    teamContext?.viewerRole ??
    teamContext?.viewer_role ??
    role.userRole ??
    role.user_role ??
    role.viewerRole ??
    role.viewer_role ??
    role.currentUserRole ??
    role.current_user_role ??
    null;
  const viewerIsTeamMember = Boolean(
    isTeamMember ||
      isCurrentUserTeamMember ||
      teamContext?.isTeamMember ||
      teamContext?.is_team_member ||
      role.isTeamMember ||
      role.is_team_member ||
      role.viewerIsTeamMember ||
      role.viewer_is_team_member ||
      role.memberOfTeam ||
      role.member_of_team ||
      (typeof membershipRole === "string" &&
        ["owner", "admin", "member"].includes(membershipRole)),
  );

  const getLocationText = () => {
    if (is_remote) return "Remote";
    const parts = [city, country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const locationText = getLocationText();
  const rawDistanceKm = Number(
    role.distanceKm ??
      role.distance_km ??
      matchDetails?.distanceKm ??
      matchDetails?.distance_km,
  );
  const showDistance =
    Number.isFinite(rawDistanceKm) &&
    rawDistanceKm < 999999 &&
    !is_remote;
  const tagNames = Array.isArray(role.tags)
    ? role.tags
        .map((tag) => {
          if (typeof tag === "string") return tag.trim();

          return String(
            tag?.name ?? tag?.tagName ?? tag?.tag_name ?? tag?.tag ?? "",
          ).trim();
        })
        .filter(Boolean)
    : [];

  const getRoleInitials = () => {
    const name = role_name || "Vacant Role";
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getRoleShortInitials = () =>
    (role_name || "Vacant Role").trim().slice(0, 2).toUpperCase() || "VR";

  const handleCardClick = (e) => {
    if (e?.target?.closest("[data-dropdown-menu]")) return;
    setIsDetailsOpen(true);
  };

  const hasMatchScore = matchScore !== null && matchScore !== undefined;
  const pct = hasMatchScore ? Math.round(matchScore * 100) : 0;
  const matchTier = hasMatchScore ? getMatchTier(matchScore) : null;

  const getMatchColor = () => {
    if (pct >= MATCH_TIER_GREAT) {
      return {
        avatarBg: "bg-amber-500",
        avatarText: "text-white",
        sparkle: "text-white/40",
      };
    }

    if (pct >= MATCH_TIER_GOOD) {
      return {
        avatarBg: "bg-success",
        avatarText: "text-white",
        sparkle: "text-white/40",
      };
    }

    return {
      avatarBg: "bg-slate-400",
      avatarText: "text-white",
      sparkle: "text-white/40",
    };
  };

  const matchColor = hasMatchScore ? getMatchColor() : null;

  const getMatchTooltip = () => {
    if (!matchDetails) return `${pct}% match`;
    const tagPct = Math.round(
      (matchDetails.tagScore ?? matchDetails.tag_score ?? 0) * 100,
    );
    const badgePct = Math.round(
      (matchDetails.badgeScore ?? matchDetails.badge_score ?? 0) * 100,
    );
    const distPct = Math.round(
      (matchDetails.distanceScore ?? matchDetails.distance_score ?? 0) * 100,
    );
    return `${pct}% match — Tags ${tagPct}% · Badges ${badgePct}% · Location ${distPct}%`;
  };

  const getFormattedPostedDate = () => {
    if (!rolePostedAt) return null;

    try {
      return format(new Date(rolePostedAt), "MM/dd/yy");
    } catch {
      return null;
    }
  };

  const getPostedDateTooltip = () => {
    if (!rolePostedAt) {
      return "Posted";
    }

    try {
      return `Posted ${format(new Date(rolePostedAt), "MMM d, yyyy")}`;
    } catch {
      return "Posted";
    }
  };

  const canUpdateStatus =
    (canManage || canManageStatus) && typeof onStatusChange === "function";
  const canEditRole = canManage && typeof onEdit === "function";
  const canDeleteRole = canManage && typeof onDelete === "function";
  const canMarkFilled =
    canUpdateStatus &&
    status === "open" &&
    statusActions.includes("filled") &&
    Boolean(viewAsUser);
  const canCloseRole =
    canUpdateStatus &&
    status === "open" &&
    statusActions.includes("closed");
  const canReopenRole =
    canUpdateStatus &&
    status !== "open" &&
    statusActions.includes("open");
  const hasBadgeActions =
    canEditRole ||
    canDeleteRole ||
    canMarkFilled ||
    canCloseRole ||
    canReopenRole;
  const canOpenBadgeMenu = hasBadgeActions && !statusActionLoading;
  const isFilled = status === "filled";
  const isClosed = status === "closed";
  const filledUser = isFilled
    ? resolveFilledRoleUser(role, { viewAsUserId, viewAsUser })
    : null;
  const filledUserAvatarUrl =
    filledUser?.avatar_url ?? filledUser?.avatarUrl ?? null;
  const filledUserDisplayName =
    filledUser && getDisplayName(filledUser) !== "Unknown"
      ? getDisplayName(filledUser)
      : null;
  const filledByText = filledUser
    ? formatDisplayName(filledUser)
    : filledUserDisplayName
    ? filledUserDisplayName
    : "Filled";
  const badgeConfig = isFilled
    ? {
        icon: UserCheck,
        label: "Filled",
        badgeColorClass: "badge-role-filled",
      }
    : isClosed
    ? {
        icon: XCircle,
        label: "Closed",
        badgeColorClass: "badge-role-closed",
      }
    : {
        icon: UserSearch,
        label: "Vacant",
        badgeColorClass: "badge-role-vacant",
      };
  const cardColorClass = isFilled
    ? "bg-green-50 hover:bg-green-100"
    : isClosed
    ? "bg-gray-50 hover:bg-gray-100"
    : "bg-amber-50 hover:bg-amber-100/70";
  const initialsAvatarClass = isFilled
    ? "bg-[var(--color-primary-focus)] text-white"
    : isClosed
    ? "bg-slate-400 text-white"
    : "bg-amber-500 text-white";
  const isMiniView = viewMode === "mini";
  const avatarSizeClass = isMiniView ? "w-10 h-10" : "w-14 h-14";
  const avatarTextClass = isMiniView ? "text-sm" : "text-xl";
  const matchIconSize = isMiniView ? 32 : 44;
  const wrapperPaddingClass = isMiniView ? "p-3" : "p-4";
  const titleLeadingClass = isMiniView ? "leading-[110%]" : "leading-[120%]";
  const roleNameClass = isMiniView
    ? "text-sm font-medium"
    : "text-base font-medium";
  const roleBadges =
    role.badges ?? role.requiredBadges ?? role.required_badges ?? [];
  const badgeNames = Array.isArray(roleBadges)
    ? roleBadges
        .map((badge) => {
          if (typeof badge === "string") return badge.trim();

          return String(
            badge?.name ?? badge?.badgeName ?? badge?.badge_name ?? "",
          ).trim();
        })
        .filter(Boolean)
    : [];
  const scoreSubtitleIconSize =
    viewMode === "list" ? 8 : viewMode === "mini" ? 9 : 10;
  const subtitleMetaIconSize =
    viewMode === "list" ? 9 : viewMode === "mini" ? 9 : 10;
  const teamLineIconSize =
    viewMode === "list" ? 9 : viewMode === "mini" ? 10 : 11;
  const formattedPostedDate = getFormattedPostedDate();
  const scoreSubtitleItem = matchTier ? (
    <Tooltip content={getMatchTooltip()}>
      <span className="inline-flex items-center gap-0.5 whitespace-nowrap leading-none">
        <matchTier.Icon
          size={scoreSubtitleIconSize}
          className={`${matchTier.text} flex-shrink-0`}
        />
        <span className="text-base-content">{matchTier.pct}%</span>
      </span>
    </Tooltip>
  ) : null;
  const roleApplicationSubtitleItem = hasCurrentUserRoleApplication ? (
    <Tooltip content="You applied for this role">
      <span className="inline-flex shrink-0 items-center leading-none text-orange-500">
        <SendHorizontal
          size={subtitleMetaIconSize}
          className="flex-shrink-0"
        />
      </span>
    </Tooltip>
  ) : null;
  const postedDateSubtitleItem = formattedPostedDate ? (
    <Tooltip content={getPostedDateTooltip()}>
      <span className="inline-flex items-center gap-0.5 whitespace-nowrap leading-none">
        <Calendar
          size={subtitleMetaIconSize}
          className="flex-shrink-0 text-base-content/60"
        />
        <span>{formattedPostedDate}</span>
      </span>
    </Tooltip>
  ) : null;
  const roleInvitationSubtitleItem = hasCurrentUserRoleInvitation ? (
    <Tooltip content="You were invited to fill this role">
      <span className="inline-flex shrink-0 items-center leading-none text-orange-500">
        <Mail
          size={subtitleMetaIconSize}
          className="flex-shrink-0"
        />
      </span>
    </Tooltip>
  ) : null;
  const miniLocationSubtitleItem =
    isMiniView && !activeFilters.showLocation && locationText ? (
      <span className="inline-flex min-w-0 items-center gap-0.5 leading-none">
        {is_remote ? (
          <>
            <Globe size={10} className="flex-shrink-0" />
            <span className="leading-[1.05]">{locationText}</span>
          </>
        ) : (
          <>
            <MapPin size={10} className="flex-shrink-0" />
            <span className="leading-[1.05]">{locationText}</span>
          </>
        )}
      </span>
    ) : null;
  const miniHasContent =
    viewMode !== "mini" ||
    activeFilters.showLocation ||
    activeFilters.showTags ||
    activeFilters.showBadges;
  const teamSubtitleItem = resolvedTeamName ? (
    <Tooltip
      content={
        viewerIsTeamMember
          ? `You are a member of this team: ${resolvedTeamName}`
          : resolvedTeamName
      }
      wrapperClassName={
        viewMode === "list" ? "min-w-0 max-w-full overflow-hidden" : undefined
      }
    >
      <span
        className={`inline-flex items-center ${
          viewMode === "list"
            ? "min-w-0 max-w-full gap-0.5 overflow-hidden"
            : ""
        }`}
      >
        <Users
          size={teamLineIconSize}
          className={`${
            viewerIsTeamMember ? "text-success" : "text-base-content"
          } flex-shrink-0`}
        />
        {viewMode === "list" && (
          <span className="min-w-0 truncate">{resolvedTeamName}</span>
        )}
      </span>
    </Tooltip>
  ) : null;
  const demoRoleMetaItem = isSyntheticRole(role) ? (
    <Tooltip
      content={DEMO_ROLE_TOOLTIP}
      wrapperClassName="flex items-center gap-1 whitespace-nowrap text-base-content/50"
    >
      <FlaskConical size={10} className="flex-shrink-0" />
    </Tooltip>
  ) : null;

  const renderMatchOverlay = ({ size, iconSize }) => {
    if (!matchTier) return null;

    return (
      <Tooltip content={getMatchTooltip()}>
        <div
          aria-label={getMatchTooltip()}
          className="absolute -top-0.5 -left-0.5 z-10 rounded-full ring-2 ring-white flex items-center justify-center text-white"
          style={{
            width: `${size}px`,
            height: `${size}px`,
          }}
        >
          <div
            className={`w-full h-full rounded-full flex items-center justify-center ${matchTier.bg}`}
          >
            <matchTier.Icon
              size={iconSize}
              className="text-white"
              strokeWidth={2.5}
            />
          </div>
        </div>
      </Tooltip>
    );
  };
  const searchResultTypeOverlay = showSearchResultTypeOverlay ? (
    <SearchResultTypeOverlay
      icon={UserSearch}
      bgClassName={matchTier?.bg ?? "bg-orange-500"}
      tooltip="Open Role"
      viewMode={viewMode}
    />
  ) : null;

  const renderMatchIcon = (size) => {
    if (pct >= MATCH_TIER_GREAT) {
      return (
        <Sparkles
          size={size}
          className={`absolute ${matchColor.sparkle}`}
          strokeWidth={1.5}
        />
      );
    }

    if (pct >= MATCH_TIER_GOOD) {
      return (
        <TrendingUp
          size={size}
          className={`absolute ${matchColor.sparkle}`}
          strokeWidth={1.5}
        />
      );
    }

    return (
      <TrendingDown
        size={size}
        className={`absolute ${matchColor.sparkle}`}
        strokeWidth={1.5}
      />
    );
  };

  const resolvedTeam =
    team ??
    ((role.teamId ?? role.team_id ?? teamContext?.id)
      ? {
          id: role.teamId ?? role.team_id ?? teamContext?.id,
          name:
            role.teamName ??
            role.team_name ??
            teamContext?.name ??
            null,
          teamavatar_url:
            role.teamAvatarUrl ??
            role.team_avatar_url ??
            teamContext?.avatarUrl ??
            null,
        }
      : null);

  const detailsModal = (
    <VacantRoleDetailsModal
      isOpen={isDetailsOpen}
      onClose={() => setIsDetailsOpen(false)}
      team={resolvedTeam}
      role={role}
      matchScore={matchScore}
      matchDetails={matchDetails}
      canManage={canManage}
      isTeamMember={viewerIsTeamMember}
      viewAsUserId={viewAsUserId}
      viewAsUser={viewAsUser}
      onViewApplicationDetails={onViewApplicationDetails}
      hideActions={hideActions && !usesSharedSearchCard}
    />
  );
  const demoAvatarOverlay = isSyntheticRole(role) ? (
    <DemoAvatarOverlay
      textClassName={
        viewMode === "list"
          ? "text-[5px]"
          : viewMode === "mini"
            ? "text-[9px]"
            : "text-[10px]"
      }
      textTranslateClassName={
        viewMode === "list"
          ? "-translate-y-[2px]"
          : viewMode === "mini"
            ? "-translate-y-[4px]"
            : "-translate-y-[4px]"
      }
    />
  ) : null;
  const compactDemoAvatarOverlay = isSyntheticRole(role) ? (
    <DemoAvatarOverlay
      textClassName={isMiniView ? "text-[6px]" : "text-[7px]"}
      textTranslateClassName="-translate-y-[3px]"
    />
  ) : null;

  if (viewMode === "list") {
    const roundedDistanceKm = showDistance ? Math.round(rawDistanceKm) : null;
    const visibleTags = tagNames.slice(0, 3);
    const remainingTagCount = tagNames.length - visibleTags.length;
    const tagsSummary =
      visibleTags.length > 0
        ? visibleTags.join(", ") + (remainingTagCount > 0 ? ` +${remainingTagCount}` : "")
        : "";
    const visibleBadges = badgeNames.slice(0, 3);
    const remainingBadgeCount = badgeNames.length - visibleBadges.length;
    const badgesSummary =
      visibleBadges.length > 0
        ? visibleBadges.join(", ") + (remainingBadgeCount > 0 ? ` +${remainingBadgeCount}` : "")
        : "";
    const listSubtitle =
      scoreSubtitleItem ||
      postedDateSubtitleItem ||
      teamSubtitleItem ||
      roleInvitationSubtitleItem ||
      roleApplicationSubtitleItem ||
      isSyntheticRole(role) ? (
        <span className="flex min-w-0 flex-nowrap items-center gap-1 overflow-hidden whitespace-nowrap text-base-content/60">
          {scoreSubtitleItem}
          {postedDateSubtitleItem}
          {roleInvitationSubtitleItem}
          {roleApplicationSubtitleItem}
          {teamSubtitleItem}
          {isSyntheticRole(role) && (
            <Tooltip
              content={DEMO_ROLE_TOOLTIP}
              wrapperClassName="flex items-center whitespace-nowrap text-base-content/50"
            >
              <FlaskConical size={9} className="flex-shrink-0" />
            </Tooltip>
          )}
        </span>
      ) : null;

    return (
      <>
        <Card
          title={role_name || "Vacant Role"}
          subtitle={listSubtitle}
          image={null}
          imageFallback={getRoleShortInitials()}
          imageOverlay={
            searchResultTypeOverlay ?? renderMatchOverlay({ size: 14, iconSize: 7 })
          }
          imageInnerOverlay={demoAvatarOverlay}
          onClick={() => setIsDetailsOpen(true)}
          viewMode="list"
          titleClassName="text-sm font-semibold"
          marginClassName=""
          clickTooltip={
            teamContext?.name
              ? `${role_name || "Vacant Role"} — ${teamContext.name}`
              : null
          }
          className={status !== "open" ? "opacity-70" : ""}
        >
          <div className="flex w-24 flex-shrink-0 items-center gap-3 overflow-hidden sm:w-56">
            {showDistance && (
              <div className="hidden w-16 flex-shrink-0 overflow-hidden md:block">
                <div className="text-xs text-base-content flex items-center gap-1 overflow-hidden">
                  <Tooltip content={`${roundedDistanceKm} km away from you`}>
                    <div className="flex items-center gap-1">
                      <Ruler size={9} className="flex-shrink-0" />
                      <span className="whitespace-nowrap">
                        {roundedDistanceKm} km
                      </span>
                    </div>
                  </Tooltip>
                </div>
              </div>
            )}
            {locationText && (
              <div className="min-w-0 text-xs text-base-content/60 flex items-center gap-1 overflow-hidden">
                <Tooltip
                  content={locationText}
                  wrapperClassName="flex min-w-0 w-full items-center overflow-hidden"
                >
                  <div className="flex min-w-0 w-full items-center gap-1 overflow-hidden">
                    {is_remote ? (
                      <Globe size={9} className="flex-shrink-0" />
                    ) : (
                      <MapPin size={9} className="flex-shrink-0" />
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      {locationText}
                    </span>
                  </div>
                </Tooltip>
              </div>
            )}
          </div>

          <div className="hidden w-52 flex-shrink-0 text-xs text-base-content/60 lg:flex items-center gap-1 overflow-hidden">
            {tagsSummary && (
              <Tooltip
                content={tagNames.join(", ")}
                wrapperClassName="flex items-center gap-1 min-w-0 overflow-hidden w-full"
              >
                <Tag size={9} className="flex-shrink-0" />
                <span className="truncate">{tagsSummary}</span>
              </Tooltip>
            )}
          </div>

          <div className="hidden w-48 flex-shrink-0 text-xs text-base-content/60 xl:flex items-center gap-1 overflow-hidden">
            {badgesSummary && (
              <Tooltip
                content={badgeNames.join(", ")}
                wrapperClassName="flex items-center gap-1 min-w-0 overflow-hidden w-full"
              >
                <Award size={9} className="flex-shrink-0" />
                <span className="truncate">{badgesSummary}</span>
              </Tooltip>
            )}
          </div>
        </Card>
        {detailsModal}
      </>
    );
  }

  if (usesSharedSearchCard) {
    const searchCardSubtitle = (
      <span
        className={`mt-0.5 flex max-h-[2.75em] overflow-hidden text-base-content/70 leading-snug ${
          isMiniView
            ? "items-center flex-wrap text-xs gap-x-1 gap-y-px w-full"
            : "items-center flex-wrap text-sm gap-x-1.5 gap-y-px"
        }`}
      >
        {scoreSubtitleItem}
        {teamSubtitleItem}
        {postedDateSubtitleItem}
        {roleInvitationSubtitleItem}
        {roleApplicationSubtitleItem}
        {miniLocationSubtitleItem}
        {isSyntheticRole(role) && (
          <Tooltip
            content={DEMO_ROLE_TOOLTIP}
            wrapperClassName="flex items-center gap-1 text-base-content/50"
          >
            <FlaskConical
              size={viewMode === "mini" ? 10 : 11}
              className="flex-shrink-0"
            />
          </Tooltip>
        )}
      </span>
    );

    return (
      <>
        <Card
          title={role_name || "Vacant Role"}
          subtitle={searchCardSubtitle}
          hoverable
          image={isFilled ? filledUserAvatarUrl : null}
          imageFallback={
            isFilled && filledUser ? getUserInitials(filledUser) : getRoleInitials()
          }
          imageAlt={role_name || "Vacant Role"}
          imageSize="medium"
          imageShape="circle"
          onClick={handleCardClick}
          truncateContent={true}
          clickTooltip={
            resolvedTeamName
              ? `${role_name || "Vacant Role"}\n${resolvedTeamName}`
              : role_name || "Vacant Role"
          }
          contentClassName={
            viewMode === "mini"
              ? `!pt-0 !px-4 sm:!px-5 ${miniHasContent ? "!pb-4 sm:!pb-5" : "!pb-0"}`
              : ""
          }
          headerClassName={
            viewMode === "mini"
              ? `!p-4 sm:!p-5 ${miniHasContent ? "!pb-4" : "!pb-0"}`
              : ""
          }
          imageWrapperClassName={viewMode === "mini" ? "mb-0 pb-0" : ""}
          titleClassName={
            viewMode === "mini" ? "text-base mb-0.5 leading-[110%]" : ""
          }
          marginClassName={viewMode === "mini" ? "mb-2" : ""}
          imageOverlay={
            searchResultTypeOverlay ??
            (matchTier ? renderMatchOverlay({ size: 20, iconSize: 10 }) : null)
          }
          imageInnerOverlay={demoAvatarOverlay}
        >
          {viewMode !== "mini" && (
            <p className="text-base-content/80 mb-4">
              {role_bio || "No description"}
            </p>
          )}

          <LocationDistanceTagsRow
            entity={role}
            entityType="team"
            tags={viewMode === "mini" && !activeFilters.showTags ? null : tagNames}
            badges={
              viewMode === "mini" && !activeFilters.showBadges
                ? null
                : roleBadges
            }
            hideLocation={viewMode === "mini" && !activeFilters.showLocation}
            compact={viewMode === "mini"}
          />

          {resolvedTeamName &&
            !(
              viewMode === "mini" &&
              !activeFilters.showLocation &&
              !activeFilters.showTags &&
              !activeFilters.showBadges
            ) && (
            <div
              className={`flex items-start ${
                viewMode === "mini"
                  ? "mt-1 text-xs text-base-content/70"
                  : "mt-2 text-sm text-base-content/70"
              }`}
            >
              <Users
                size={teamLineIconSize}
                className="text-base-content mr-1 flex-shrink-0 mt-0.5"
              />
              <span className="min-w-0 leading-[1.05] whitespace-normal break-words">
                {resolvedTeamName}
              </span>
            </div>
          )}
        </Card>
        {detailsModal}
      </>
    );
  }

  const miniMatchOverlay = isMiniView
    ? renderMatchOverlay({ size: 18, iconSize: 9 })
    : null;

  return (
    <>
      <div
        onClick={handleCardClick}
        className={`flex items-start rounded-xl shadow gap-4 transition-all duration-200 hover:shadow-md cursor-pointer ${wrapperPaddingClass} ${cardColorClass} ${
          status !== "open" ? "opacity-70" : ""
        } ${notificationHighlight ? "role-card-highlight" : ""}`}
      >
        {isFilled && filledUser ? (
            <div className="avatar">
              <div className={`${avatarSizeClass} rounded-full relative overflow-hidden`}>
                {filledUserAvatarUrl ? (
                  <img
                    src={filledUserAvatarUrl}
                    alt={filledUserDisplayName || "Filled role"}
                    className="object-cover w-full h-full rounded-full"
                    onError={(e) => {
                      e.target.style.display = "none";
                      const fallback =
                        e.target.parentElement.querySelector(".avatar-fallback");
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className="avatar-fallback bg-[var(--color-primary-focus)] text-white flex items-center justify-center w-full h-full rounded-full absolute inset-0"
                  style={{ display: filledUserAvatarUrl ? "none" : "flex" }}
                >
                  <span className={`${avatarTextClass} font-medium`}>
                    {getUserInitials(filledUser)}
                  </span>
                </div>
                {compactDemoAvatarOverlay}
                {miniMatchOverlay}
              </div>
            </div>
          ) : hasMatchScore && !isMiniView ? (
            <Tooltip content={getMatchTooltip()}>
              <div className="avatar placeholder">
                <div
                  className={`${matchColor.avatarBg} ${matchColor.avatarText} ${avatarSizeClass} rounded-full relative flex items-center justify-center overflow-hidden`}
                >
                  {renderMatchIcon(matchIconSize)}
                  <span
                    className={`relative ${avatarTextClass} font-bold leading-none`}
                  >
                    {pct}%
                  </span>
                  {compactDemoAvatarOverlay}
                </div>
              </div>
            </Tooltip>
          ) : (
            <div className="avatar placeholder">
              <div
                className={`${initialsAvatarClass} ${avatarSizeClass} rounded-full relative flex items-center justify-center overflow-hidden`}
              >
                <span className={avatarTextClass}>{getRoleInitials()}</span>
                {compactDemoAvatarOverlay}
                {miniMatchOverlay}
              </div>
            </div>
          )}

        <div className={`flex-1 min-w-0 pt-[1px] ${isMiniView ? "space-y-1" : ""}`}>
          <div className="flex flex-col">
            <div className="flex min-w-0 items-center gap-1">
              <h3 className={`${roleNameClass} ${titleLeadingClass} min-w-0 flex-1 truncate`}>
                {role_name || "Vacant Role"}
              </h3>
              <div ref={menuTriggerRef} className="shrink-0 ml-1" data-dropdown-menu>
              <RoleBadgePill
                icon={badgeConfig.icon}
                label={badgeConfig.label}
                badgeColorClass={badgeConfig.badgeColorClass}
                interactive={canOpenBadgeMenu}
                loading={statusActionLoading}
                onClick={
                  canOpenBadgeMenu
                    ? (e) => {
                        e.stopPropagation();
                        if (!showMenu && menuTriggerRef.current) {
                          const rect = menuTriggerRef.current.getBoundingClientRect();
                          setMenuPosition({
                            top: rect.bottom + 4,
                            right: window.innerWidth - rect.right,
                          });
                        }
                        setShowMenu(!showMenu);
                      }
                    : undefined
                }
              />
              </div>
              {canOpenBadgeMenu && showMenu && menuPosition && createPortal(
              <>
                <div
                  className="fixed inset-0"
                  style={{ zIndex: 9998 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div
                  style={{
                    position: "fixed",
                    top: menuPosition.top,
                    right: menuPosition.right,
                    zIndex: 9999,
                  }}
                  className="bg-base-100 border border-base-300 rounded-lg shadow-lg py-1 min-w-[200px]"
                >
                  {canEditRole && (
                    <button
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-base-200 text-left"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onEdit(role);
                      }}
                    >
                      <Edit size={14} />
                      Edit Role
                    </button>
                  )}
                  {canMarkFilled && (
                    <button
                      className="flex items-start gap-2 w-full px-3 py-2 text-sm hover:bg-base-200 text-left"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onStatusChange(role.id, "filled");
                      }}
                    >
                      <CheckCircle
                        size={14}
                        className="text-success flex-shrink-0 mt-[2px]"
                      />
                      {viewAsUser
                        ? `Mark role as filled with ${
                            viewAsUser.firstName ??
                            viewAsUser.first_name ??
                            viewAsUser.username ??
                            "this applicant"
                          }`
                        : "Mark Filled"}
                    </button>
                  )}
                  {canCloseRole && (
                    <button
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-base-200 text-left"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onStatusChange(role.id, "closed");
                      }}
                    >
                      <XCircle size={14} className="text-warning" />
                      Close Role
                    </button>
                  )}
                  {canReopenRole && (
                    <button
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-base-200 text-left"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onStatusChange(role.id, "open");
                      }}
                    >
                      <CheckCircle size={14} className="text-primary" />
                      Reopen Role
                    </button>
                  )}
                  {canDeleteRole && (
                    <button
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-base-200 text-left text-error"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onDelete(role.id);
                      }}
                    >
                      <Trash2 size={14} />
                      Delete Role
                    </button>
                  )}
                </div>
              </>,
              document.body
            )}
            </div>
            {teamContext?.name && viewMode === "card" && (
              <p className="text-xs text-base-content/50 mt-0.5 truncate">
                {teamContext.name}
              </p>
            )}
          </div>

          {isMiniView && scoreSubtitleItem && (
            <div className="flex items-center gap-1 text-xs text-base-content/60">
              {scoreSubtitleItem}
            </div>
          )}

          {isMiniView ? (
            isFilled ? (
              <div className="mt-0.5 flex max-h-[2.1em] flex-wrap items-center gap-2 overflow-hidden text-xs text-base-content/60">
                <span className="flex items-center gap-1 min-w-0">
                  <UserCheck size={10} className="shrink-0" />
                  <span className="truncate">{filledByText}</span>
                </span>
                {locationText && (
                  <span className="flex items-center gap-1 min-w-0">
                    {is_remote ? (
                      <Globe size={10} className="shrink-0" />
                    ) : (
                      <MapPin size={10} className="shrink-0" />
                    )}
                    <span className="truncate">{locationText}</span>
                  </span>
                )}
                {!is_remote && max_distance_km && (
                  <span className="flex items-center gap-1 text-base-content/50">
                    <CircleDot size={10} className="shrink-0" />
                    <span>{max_distance_km} km</span>
                  </span>
                )}
                {demoRoleMetaItem}
              </div>
            ) : locationText || (!is_remote && max_distance_km) || demoRoleMetaItem ? (
              <div className="mt-0.5 flex max-h-[2.1em] flex-wrap items-center gap-2 overflow-hidden text-xs text-base-content/60">
                {locationText && (
                  <span className="flex items-center gap-1 min-w-0">
                    {is_remote ? (
                      <Globe size={10} className="shrink-0" />
                    ) : (
                      <MapPin size={10} className="shrink-0" />
                    )}
                    <span className="truncate">{locationText}</span>
                  </span>
                )}

                {!is_remote && max_distance_km && (
                  <span className="flex items-center gap-1 text-base-content/50">
                    <CircleDot size={10} className="shrink-0" />
                    <span>{max_distance_km} km</span>
                  </span>
                )}
                {demoRoleMetaItem}
              </div>
            ) : null
          ) : isFilled ? (
            <CardMetaRow>
              <CardMetaItem icon={UserCheck}>{filledByText}</CardMetaItem>
              {locationText && (
                <CardMetaItem icon={is_remote ? Globe : MapPin}>
                  {locationText}
                </CardMetaItem>
              )}
              {!is_remote && max_distance_km && (
                <CardMetaItem icon={CircleDot} tone="muted" nowrap>
                  {max_distance_km} km
                </CardMetaItem>
              )}
              {demoRoleMetaItem}
            </CardMetaRow>
          ) : locationText || (!is_remote && max_distance_km) || demoRoleMetaItem ? (
            <CardMetaRow>
              {locationText && (
                <CardMetaItem icon={is_remote ? Globe : MapPin}>
                  {locationText}
                </CardMetaItem>
              )}

              {!is_remote && max_distance_km && (
                <CardMetaItem icon={CircleDot} tone="muted" nowrap>
                  {max_distance_km} km
                </CardMetaItem>
              )}
              {demoRoleMetaItem}
            </CardMetaRow>
          ) : null}
        </div>
      </div>

      {detailsModal}
    </>
  );
};

export default VacantRoleCard;
