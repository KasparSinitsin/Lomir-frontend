import React, { useState, useEffect, useCallback, useMemo } from "react";
import Card from "../common/Card";
import Button from "../common/Button";
import Tooltip from "../common/Tooltip";
import {
  Users,
  UserSearch,
  EyeClosed,
  EyeIcon,
  Award,
  User,
  Crown,
  ShieldCheck,
  SendHorizontal,
  Mail,
  Globe,
  MapPin,
  Ruler,
  Calendar,
  FlaskConical,
  Trash2,
} from "lucide-react";
import TeamDetailsModal from "./TeamDetailsModal";
import UserDetailsModal from "../users/UserDetailsModal";
import TeamApplicationDetailsModal from "./TeamApplicationDetailsModal";
import VacantRoleDetailsModal from "./VacantRoleDetailsModalLazy";
import TeamInvitesModal from "./TeamInvitesModal";
import TeamInvitationDetailsModal from "./TeamInvitationDetailsModal";
import { teamService } from "../../services/teamService";
import { vacantRoleService } from "../../services/vacantRoleService";
import { userService } from "../../services/userService";
import useSocketEvents from "../../hooks/useSocketEvents";
import useTeamRequestLists from "../../hooks/useTeamRequestLists";
import { useAuth } from "../../contexts/AuthContext";
import Alert from "../common/Alert";
import ConfirmModal from "../common/ConfirmModal";
import NotificationBadge from "../common/NotificationBadge";
import SearchResultTypeOverlay from "../common/SearchResultTypeOverlay";
import ListViewRow from "../common/ListViewRow";
import MatchScoreOverlay from "../common/MatchScoreOverlay";
import MatchScoreSubtitle from "../common/MatchScoreSubtitle";
import TeamApplicationsModal from "./TeamApplicationsModal";
import { format } from "date-fns";
import LocationDistanceTagsRow from "../common/LocationDistanceTagsRow";
import { getMatchTier, getMatchTooltipText } from "../../utils/matchScoreUtils";
import { getResultMatchScore } from "../../utils/teamMatchUtils";
import { extractNames, summarizeList } from "../../utils/listSummaryUtils";
import {
  calculateDistanceKm,
  formatListLocation,
  normalizeLocationData,
} from "../../utils/locationUtils";
import {
  extractListPayload,
  extractProfilePayload,
} from "../../utils/payloadExtractors";
import {
  buildBadgeLookup,
  buildTagLookup,
  computeRoleUserMatch,
  extractCandidateMatchData,
} from "../../utils/matchHelpers";
import {
  DEMO_ROLE_TOOLTIP,
  DEMO_TEAM_TOOLTIP,
  isSyntheticRole,
  isSyntheticTeam,
} from "../../utils/userHelpers";
import DemoAvatarOverlay from "../users/DemoAvatarOverlay";

const teamMemberBadgesCache = new Map();
const viewerRoleProfileCache = new Map();
const teamOpenRolesCache = new Map();
const EMPTY_ARRAY = [];

const extractArrayPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
};

const getRoleStatus = (role) =>
  String(role?.status ?? "open").toLowerCase();

const isOpenRole = (role) => getRoleStatus(role) === "open";

const getRoleDisplayName = (role) => {
  if (!role) return null;

  return (
    role.roleName ??
    role.role_name ??
    role.name ??
    role.title ??
    null
  );
};

const normalizeRoleNames = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "string" ? item.trim() : getRoleDisplayName(item),
      )
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
  }

  return [];
};

const getTeamRoleCollections = (team) =>
  [
    team?.openRoles,
    team?.open_roles,
    team?.vacantRoles,
    team?.vacant_roles,
  ].filter(Array.isArray);

const resolveTeamOpenRoleSnapshot = (team) => {
  const roleCollections = getTeamRoleCollections(team);

  if (roleCollections.length > 0) {
    const roles = roleCollections.flat().filter(isOpenRole);
    return {
      count: roles.length,
      names: roles.map(getRoleDisplayName).filter(Boolean),
      source: "records",
    };
  }

  const rawCount =
    team?.openRoleCount ??
    team?.open_role_count ??
    team?.openRolesCount ??
    team?.open_roles_count ??
    null;
  const count = Number(rawCount);
  const names = normalizeRoleNames(
    team?.openRoleNames ?? team?.open_role_names,
  );

  return {
    count: Number.isFinite(count) ? count : names.length,
    names,
    source: rawCount != null || names.length > 0 ? "aggregate" : "none",
  };
};

const extractBadgeRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
};

const getViewerRoleProfile = async (userId, fallbackUser = null) => {
  const cacheKey = String(userId);
  if (viewerRoleProfileCache.has(cacheKey)) {
    return viewerRoleProfileCache.get(cacheKey);
  }

  const request = (async () => {
    const [profileRes, tagsRes, badgesRes] = await Promise.allSettled([
      userService.getUserById(userId),
      userService.getUserTags(userId),
      userService.getUserBadges(userId),
    ]);

    const profileData =
      profileRes.status === "fulfilled"
        ? extractProfilePayload(profileRes.value)
        : null;
    const tagData =
      tagsRes.status === "fulfilled"
        ? extractListPayload(tagsRes.value)
        : [];
    const badgeData =
      badgesRes.status === "fulfilled"
        ? extractListPayload(badgesRes.value)
        : [];

    return {
      user: {
        ...(fallbackUser || {}),
        ...(profileData || {}),
      },
      userTagMap: buildTagLookup(tagData),
      userBadgeMap: buildBadgeLookup(badgeData),
    };
  })();

  viewerRoleProfileCache.set(cacheKey, request);

  try {
    const result = await request;
    viewerRoleProfileCache.set(cacheKey, Promise.resolve(result));
    return result;
  } catch (error) {
    viewerRoleProfileCache.delete(cacheKey);
    throw error;
  }
};

const getExplicitMatchScore = (item) => {
  const raw =
    item?.bestMatchScore ??
    item?.best_match_score ??
    item?.matchScore ??
    item?.match_score;
  const score = Number(raw);

  return Number.isFinite(score) ? score : null;
};

const hasRoleMatchDetails = (item) =>
  item?.matchDetails != null || item?.match_details != null;

const hasDisplayableBadges = (rawBadges) => {
  if (typeof rawBadges === "string") {
    return rawBadges.trim().length > 0;
  }

  if (!Array.isArray(rawBadges)) return false;

  return rawBadges.some((badge) => {
    if (typeof badge === "string") {
      return badge.trim().length > 0;
    }

    if (badge && typeof badge === "object") {
      return Boolean(
        String(badge.name ?? badge.badgeName ?? badge.badge_name ?? "").trim(),
      );
    }

    return false;
  });
};

const resolveDistanceKm = ({
  preferredDistance = null,
  fallbackDistance = null,
  viewerEntity = null,
  targetEntity = null,
} = {}) => {
  const rawPreferred = Number(preferredDistance);
  const rawFallback = Number(fallbackDistance);
  const existingDistance = Number.isFinite(rawPreferred) && rawPreferred < 999999
    ? rawPreferred
    : Number.isFinite(rawFallback) && rawFallback < 999999
      ? rawFallback
      : null;

  const computedDistance =
    viewerEntity && targetEntity
      ? calculateDistanceKm(viewerEntity, targetEntity)
      : null;

  if (computedDistance != null) {
    return computedDistance;
  }

  return existingDistance;
};

/**
 * Unified TeamCard Component
 *
 * Handles multiple variants:
 * - "member" (default): Teams you're part of
 * - "application": Your pending applications to join teams
 * - "role_application": Your pending applications for internal team roles
 * - "invitation": Invitations you've received from teams
 * - "role_invitation": Invitations you've received for internal team roles
 *
 * @param {Object} props
 * @param {Object} props.team - Team data (for member variant)
 * @param {Object} props.application - Application data (for application variant)
 * @param {Object} props.invitation - Invitation data (for invitation variant)
 * @param {string} props.variant - "member" | "application" | "role_application" | "invitation" | "role_invitation"
 * @param {Function} props.onUpdate - Callback when team is updated
 * @param {Function} props.onDelete - Callback when team is deleted
 * @param {Function} props.onLeave - Callback when user leaves a team
 * @param {Function} props.onCancel - Callback to cancel application
 * @param {Function} props.onSendReminder - Callback to send reminder for application
 * @param {Function} props.onAccept - Callback to accept invitation
 * @param {Function} props.onDecline - Callback to decline invitation
 * @param {boolean} props.isSearchResult - Whether this card is shown in search results
 */
const TeamCard = ({
  // Data props - use the appropriate one based on variant
  team,
  application,
  invitation,

  // Variant control
  variant = "member", // "member" | "application" | "role_application" | "invitation" | "role_invitation"

  // Legacy prop support (maps to variant="application")
  isPendingApplication = false,

  // Common handlers
  onUpdate,
  onDelete,
  onLeave,
  isSearchResult = false,

  // Application-specific handlers
  onCancel,
  onCancelApplication, // Legacy prop name
  onSendReminder,

  // Invitation-specific handlers
  onAccept,
  onDecline,

  showMatchHighlights = false,
  showMatchScore = false,
  roleMatchBadgeNames = null,
  viewerDistanceSource = null,
  listLocationInsetClassName = "",
  listLocationWidthClassName = "",
  listLocationVisibilityClassName = "flex",
  listTagsWidthClassName = "",
  listBadgesWidthClassName = "",
  listLocationShortBreakpoint = "sm",
  hideDistanceInfo = false,
  hideMemberRoleIcon = false,
  disableListEdgeRounding = false,
  listClassName = "",

  // View mode
  viewMode = "card",
  activeFilters = {},
  showSearchResultTypeOverlay = false,

  autoOpenApplications = false,
  highlightApplicantId = null,
  highlightApplicationId = null,
  highlightInvitationId = null,
  onApplicationsModalClosed,

  // Preloaded viewer-scoped lists (provided by parent to avoid N+1 fetches).
  // If the prop is undefined (not provided by parent at all), the card falls
  // back to fetching on its own. If the prop is null, parent is still loading
  // and the card should wait — not fall back to fetching.
  viewerPendingApplications,
  viewerPendingInvitations,

  // Pre-fetched member badges for this team (bulk-fetched by the parent).
  // Same `!== undefined` sentinel: undefined = parent doesn't manage, null =
  // parent is loading, array = use directly (skip per-card fetch).
  teamMemberBadges,
}) => {
  const isInternalRoleApplication =
    application?.isInternalRoleApplication ??
    application?.is_internal_role_application ??
    false;

  // Determine effective variant (support legacy isPendingApplication prop)
  let effectiveVariant = isPendingApplication ? "application" : variant;
  if (effectiveVariant === "application" && isInternalRoleApplication) {
    effectiveVariant = "role_application";
  } else if (effectiveVariant === "role_invitation") {
    effectiveVariant = "role_invitation";
  }
  const isRoleApplicationVariant = effectiveVariant === "role_application";
  const isRoleInvitationVariant = effectiveVariant === "role_invitation";
  const isRoleVariant = isRoleApplicationVariant || isRoleInvitationVariant;
  const isTeamInvitationOrApplicationVariant =
    effectiveVariant === "invitation" || effectiveVariant === "application";
  const shouldShowOpenRoleCount =
    !isRoleVariant && !isTeamInvitationOrApplicationVariant;

  // Normalize data based on variant
  const getNormalizedData = () => {
    if (effectiveVariant === "invitation" && invitation) {
      return {
        team: invitation.team || {},
        id: invitation.id,
        message: invitation.message,
        date: invitation.created_at || invitation.createdAt,
        inviter: invitation.inviter,
      };
    }
    if (effectiveVariant === "application" && application) {
      return {
        team: application.team || {},
        id: application.id,
        message: application.message,
        date: application.created_at || application.createdAt,
      };
    }
    if (isRoleApplicationVariant && application) {
      const role = application.role ?? {};
      const appTeam = application.team ?? {};
      return {
        team: {
          name: role.roleName ?? role.role_name ?? "Vacant Role",
          description: role.bio ?? role.roleBio ?? appTeam.description ?? null,
          is_remote: role.isRemote ?? role.is_remote ?? appTeam.is_remote ?? appTeam.isRemote,
          city: role.city ?? appTeam.city,
          state: role.state ?? role.region ?? role.province ?? appTeam.state ?? appTeam.region ?? appTeam.province,
          country: role.country ?? appTeam.country,
          postal_code: role.postal_code ?? role.postalCode ?? appTeam.postal_code ?? appTeam.postalCode,
          latitude: role.latitude ?? role.lat ?? appTeam.latitude ?? appTeam.lat,
          longitude: role.longitude ?? role.lng ?? role.lon ?? appTeam.longitude ?? appTeam.lng ?? appTeam.lon,
          tags: role.tags ?? [],
          badges: role.badges ?? [],
          _teamName: appTeam.name ?? null,
          matchScore: null,
          matchDetails: null,
          id: appTeam.id,
        },
        id: application.id,
        message: application.message,
        date: application.created_at || application.createdAt,
      };
    }
    if (isRoleInvitationVariant && invitation) {
      const role = invitation.role ?? {};
      const invTeam = invitation.team ?? {};
      return {
        team: {
          name: role.roleName ?? role.role_name ?? "Role Invitation",
          description: role.bio ?? role.roleBio ?? invTeam.description ?? null,
          is_remote: role.isRemote ?? role.is_remote ?? invTeam.is_remote ?? invTeam.isRemote,
          city: role.city ?? invTeam.city,
          state: role.state ?? role.region ?? role.province ?? invTeam.state ?? invTeam.region ?? invTeam.province,
          country: role.country ?? invTeam.country,
          postal_code: role.postal_code ?? role.postalCode ?? invTeam.postal_code ?? invTeam.postalCode,
          latitude: role.latitude ?? role.lat ?? invTeam.latitude ?? invTeam.lat,
          longitude: role.longitude ?? role.lng ?? role.lon ?? invTeam.longitude ?? invTeam.lng ?? invTeam.lon,
          tags: role.tags ?? [],
          badges: role.badges ?? [],
          _teamName: invTeam.name ?? null,
          matchScore: null,
          matchDetails: null,
          id: invTeam.id,
        },
        id: invitation.id,
        message: invitation.message,
        date: invitation.created_at || invitation.createdAt,
        inviter: invitation.inviter,
      };
    }
    // For legacy application support via team prop with application data
    if (effectiveVariant === "application" && team) {
      return {
        team: team,
        id: team.applicationId,
        message: team.applicationMessage,
        date: team.applicationDate || team.created_at || team.createdAt,
      };
    }
    // Default: member variant
    return {
      team: team || {},
      id: null,
      message: null,
      date: null,
    };
  };

  const normalizedData = useMemo(
    () => getNormalizedData(),
    [team, application, invitation, effectiveVariant],
  );
  const roleSource = isRoleApplicationVariant
    ? application ?? null
    : isRoleInvitationVariant
      ? invitation ?? null
      : null;
  const nestedRoleData = roleSource?.role ?? null;
  const flatRoleName = roleSource?.roleName ?? roleSource?.role_name ?? null;
  const flatRoleBio = roleSource?.bio ?? roleSource?.roleBio ?? null;
  const flatRoleCity = roleSource?.city ?? null;
  const flatRoleCountry = roleSource?.country ?? null;
  const flatRoleTags = roleSource?.tags ?? EMPTY_ARRAY;
  const flatRoleBadges = roleSource?.badges ?? EMPTY_ARRAY;
  const roleHasPreloadedRequirements =
    (Array.isArray(nestedRoleData?.tags) &&
      Array.isArray(nestedRoleData?.badges)) ||
    (Array.isArray(roleSource?.tags) && Array.isArray(roleSource?.badges));
  const flatRoleIsRemote =
    roleSource?.isRemote ?? roleSource?.is_remote ?? undefined;
  const syntheticRoleFlag = isRoleApplicationVariant
    ? application?.role?.is_synthetic ??
      application?.role?.isSynthetic ??
      application?.role_is_synthetic ??
      application?.roleIsSynthetic ??
      application?.is_synthetic ??
      application?.isSynthetic
    : isRoleInvitationVariant
      ? invitation?.role?.is_synthetic ??
        invitation?.role?.isSynthetic ??
        invitation?.role_is_synthetic ??
        invitation?.roleIsSynthetic ??
        invitation?.is_synthetic ??
        invitation?.isSynthetic
      : undefined;
  const roleDataId = isRoleApplicationVariant
    ? application?.role?.id ?? application?.roleId ?? application?.role_id ?? null
    : isRoleInvitationVariant
      ? invitation?.role?.id ?? invitation?.roleId ?? invitation?.role_id ?? null
      : null;
  const roleData = useMemo(() => {
    if (!isRoleVariant) return null;

    if (nestedRoleData) {
      const needsFallbackFields =
        (nestedRoleData.id == null && roleDataId != null) ||
        (!nestedRoleData.roleName &&
          !nestedRoleData.role_name &&
          flatRoleName != null) ||
        (nestedRoleData.bio == null &&
          nestedRoleData.roleBio == null &&
          flatRoleBio != null) ||
        (nestedRoleData.city == null && flatRoleCity != null) ||
        (nestedRoleData.country == null && flatRoleCountry != null) ||
        (nestedRoleData.is_synthetic == null &&
          nestedRoleData.isSynthetic == null &&
          syntheticRoleFlag != null) ||
        (nestedRoleData.tags == null && flatRoleTags.length > 0) ||
        (nestedRoleData.badges == null && flatRoleBadges.length > 0);

      if (!needsFallbackFields) {
        return nestedRoleData;
      }

      return {
        ...nestedRoleData,
        id: nestedRoleData.id ?? roleDataId,
        roleName: nestedRoleData.roleName ?? nestedRoleData.role_name ?? flatRoleName,
        role_name: nestedRoleData.role_name ?? nestedRoleData.roleName ?? flatRoleName,
        bio: nestedRoleData.bio ?? nestedRoleData.roleBio ?? flatRoleBio,
        roleBio: nestedRoleData.roleBio ?? nestedRoleData.bio ?? flatRoleBio,
        city: nestedRoleData.city ?? flatRoleCity,
        country: nestedRoleData.country ?? flatRoleCountry,
        is_remote:
          nestedRoleData.is_remote ??
          nestedRoleData.isRemote ??
          flatRoleIsRemote,
        isRemote:
          nestedRoleData.isRemote ??
          nestedRoleData.is_remote ??
          flatRoleIsRemote,
        tags: nestedRoleData.tags ?? flatRoleTags,
        badges: nestedRoleData.badges ?? flatRoleBadges,
        is_synthetic:
          nestedRoleData.is_synthetic ??
          nestedRoleData.isSynthetic ??
          syntheticRoleFlag,
        isSynthetic:
          nestedRoleData.isSynthetic ??
          nestedRoleData.is_synthetic ??
          syntheticRoleFlag,
      };
    }

    return {
      id: roleDataId,
      roleName: flatRoleName,
      role_name: flatRoleName,
      bio: flatRoleBio,
      roleBio: flatRoleBio,
      city: flatRoleCity,
      country: flatRoleCountry,
      is_remote: flatRoleIsRemote,
      isRemote: flatRoleIsRemote,
      tags: flatRoleTags,
      badges: flatRoleBadges,
      is_synthetic: syntheticRoleFlag,
      isSynthetic: syntheticRoleFlag,
    };
  }, [
    isRoleVariant,
    nestedRoleData,
    roleDataId,
    flatRoleName,
    flatRoleBio,
    flatRoleCity,
    flatRoleCountry,
    flatRoleIsRemote,
    flatRoleTags,
    flatRoleBadges,
    syntheticRoleFlag,
  ]);
  const roleTeamData = isRoleApplicationVariant
    ? application?.team ?? null
    : isRoleInvitationVariant
      ? invitation?.team ?? null
      : null;
  const roleTeamId = isRoleApplicationVariant
    ? application?.team?.id ?? null
    : isRoleInvitationVariant
      ? invitation?.team?.id ?? null
      : null;

  // ========= ALL HOOKS (useState, useAuth, useCallback, useEffect) =========

  // State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [isRoleDetailsModalOpen, setIsRoleDetailsModalOpen] = useState(false);
  const [roleMatchData, setRoleMatchData] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCancelApplicationDialogOpen, setIsCancelApplicationDialogOpen] =
    useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [reminderNotice, setReminderNotice] = useState(null);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [teamData, setTeamData] = useState(normalizedData.team);
  const [freshOpenRoleSnapshot, setFreshOpenRoleSnapshot] = useState(null);
  const { user, isAuthenticated } = useAuth();
  const [isApplicationsModalOpen, setIsApplicationsModalOpen] = useState(false);
  const [isInvitesModalOpen, setIsInvitesModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isInvitationDetailsModalOpen, setIsInvitationDetailsModalOpen] =
    useState(false);
  const [pendingInvitationForTeam, setPendingInvitationForTeam] =
    useState(null);
  const [pendingApplicationForTeam, setPendingApplicationForTeam] =
    useState(null);
  const hasInternalRoleInvitation =
    isRoleInvitationVariant ||
    invitation?.isInternal ||
    invitation?.is_internal ||
    pendingInvitationForTeam?.isInternal ||
    pendingInvitationForTeam?.is_internal;
  const isPendingRoleApplicationForTeam = !!(
    pendingApplicationForTeam?.role ||
    pendingApplicationForTeam?.roleId ||
    pendingApplicationForTeam?.role_id
  );
  // Combined = external applicant applying to join the team AND fill a role in one go → violet
  const isCombinedApplication =
    effectiveVariant === "application" &&
    Boolean(application?.role || application?.roleId || application?.role_id) &&
    !isInternalRoleApplication;
  const isPendingCombinedApplicationForTeam =
    isPendingRoleApplicationForTeam &&
    !(pendingApplicationForTeam?.isInternalRoleApplication ||
      pendingApplicationForTeam?.is_internal_role_application);
  const isPendingInternalRoleApplicationForTeam =
    isPendingRoleApplicationForTeam &&
    Boolean(pendingApplicationForTeam?.isInternalRoleApplication ||
      pendingApplicationForTeam?.is_internal_role_application);
  const shouldShowMemberCountInSubtitle = effectiveVariant === "member";
  const shouldShowMemberCountInList = effectiveVariant === "member";
  const shouldMoveSearchResultRoleApplicationIndicator =
    isSearchResult && effectiveVariant === "member";

  // Check if current user is the owner of the team
  const isOwner =
    user && (teamData?.owner_id === user.id || teamData?.ownerId === user.id);

  // Check if user is admin (owner or admin role can manage invitations)
  const isAdmin = userRole === "admin";
  const canManageInvitations = isOwner || isAdmin;

  // Update local team data when props change
  useEffect(() => {
    const incoming = getNormalizedData().team;

    setTeamData((prev) => {
      // If we already have the same team loaded, merge so we don't lose `members`, etc.
      if (prev?.id && incoming?.id && prev.id === incoming.id) {
        const incomingBadges =
          hasDisplayableBadges(incoming.badges)
            ? incoming.badges
            : prev.badges;
        const incomingDistance = resolveDistanceKm({
          preferredDistance: incoming.distance_km ?? incoming.distanceKm,
          fallbackDistance: prev.distance_km ?? prev.distanceKm,
          viewerEntity: viewerDistanceSource ?? user,
          targetEntity: incoming,
        });

        return {
          ...prev,
          ...incoming,
          badges: incomingBadges,
          distance_km: incomingDistance,
          distanceKm: incomingDistance,
        };
      }
      return incoming;
    });
  }, [team, application, invitation, viewerDistanceSource, user]);

  useEffect(() => {
    setFreshOpenRoleSnapshot(null);
  }, [teamData?.id]);

  useEffect(() => {
    if (!shouldShowOpenRoleCount || !teamData?.id) {
      setFreshOpenRoleSnapshot(null);
      return;
    }

    const localSnapshot = resolveTeamOpenRoleSnapshot(teamData);
    if (localSnapshot.source !== "aggregate") {
      setFreshOpenRoleSnapshot(null);
      return;
    }

    let isActive = true;
    const cacheKey = String(teamData.id);
    let openRolesRequest = teamOpenRolesCache.get(cacheKey);

    if (!openRolesRequest) {
      openRolesRequest = vacantRoleService
        .getVacantRoles(teamData.id, "open")
        .then((response) => extractArrayPayload(response).filter(isOpenRole));
      teamOpenRolesCache.set(cacheKey, openRolesRequest);
    }

    openRolesRequest
      .then((roles) => {
        if (!isActive) return;

        setFreshOpenRoleSnapshot({
          teamId: teamData.id,
          count: roles.length,
          names: roles.map(getRoleDisplayName).filter(Boolean),
          source: "fetch",
        });
      })
      .catch((error) => {
        teamOpenRolesCache.delete(cacheKey);
        if (!isActive) return;
        console.warn("Could not fetch current open roles for team card:", error);
        setFreshOpenRoleSnapshot(null);
      });

    return () => {
      isActive = false;
    };
  }, [
    shouldShowOpenRoleCount,
    teamData?.id,
    teamData?.openRoleCount,
    teamData?.open_role_count,
    teamData?.openRolesCount,
    teamData?.open_roles_count,
    teamData?.openRoleNames,
    teamData?.open_role_names,
  ]);

  //   // Fetch user's role in this team (only for member variant)
  //   useEffect(() => {
  //     const fetchUserRole = async () => {
  //       if (user && teamData?.id && effectiveVariant === "member") {
  //         try {
  //           const response = await teamService.getUserRoleInTeam(
  //             teamData.id,
  //             user.id
  //           );

  // const payload = response?.data;
  // const data = payload?.data ?? payload; // supports {success,data:{...}} and {...}

  // const isMember = data?.isMember ?? payload?.isMember; // supports both shapes
  // const role = data?.role ?? payload?.role ?? null;

  // if (isMember === false) {
  //   setUserRole(null);
  // } else {
  //   setUserRole(role);
  // }

  //         } catch (err) {
  //           console.error("Error fetching user role:", err);
  //           setUserRole(null); // optional: keeps UI clean on errors
  //         }
  //       }
  //     };
  //     fetchUserRole();
  //   }, [user, teamData?.id, effectiveVariant]);

  // Fetch user's role in this team (member cards only)
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.id || !teamData?.id) return;
      if (effectiveVariant !== "member") return;
      if (userRole) return;

      // Owner shortcut (no request needed)
      if (teamData.owner_id === user.id || teamData.ownerId === user.id) {
        setUserRole("owner");
        return;
      }

      // Use role from list response (getUserTeams) if present — avoids an
      // extra request per card.
      const preloadedRole = teamData.userRole ?? teamData.user_role ?? null;
      if (preloadedRole) {
        setUserRole(preloadedRole);
        return;
      }

      try {
        const response = await teamService.getUserRoleInTeam(
          teamData.id,
          user.id,
        );

        const payload = response?.data;
        const data = payload?.data ?? payload; // supports both shapes

        const isMember = data?.isMember ?? payload?.isMember;
        const role = data?.role ?? payload?.role ?? null;

        if (isMember === false) {
          setUserRole(null);
        } else {
          setUserRole(role);
        }
      } catch (err) {
        console.error("Error fetching user role:", err);
        setUserRole(null);
      }
    };

    fetchUserRole();
  }, [
    user?.id,
    teamData?.id,
    teamData?.owner_id,
    teamData?.ownerId,
    teamData?.userRole,
    teamData?.user_role,
    effectiveVariant,
  ]);

  // Counts may be preloaded by the parent's list response (getUserTeams).
  // When present, we defer the full list fetch until the user actually opens
  // the corresponding modal. Note: postgres returns COUNT(*) as bigint which
  // the pg driver serializes as a string unless cast, so coerce defensively.
  const rawPreloadedApplicationCount =
    teamData?.pendingApplicationsCount ??
    teamData?.pending_applications_count;
  const rawPreloadedSentInvitationCount =
    teamData?.pendingSentInvitationsCount ??
    teamData?.pending_sent_invitations_count;
  const preloadedApplicationCount =
    rawPreloadedApplicationCount != null
      ? Number(rawPreloadedApplicationCount)
      : undefined;
  const preloadedSentInvitationCount =
    rawPreloadedSentInvitationCount != null
      ? Number(rawPreloadedSentInvitationCount)
      : undefined;
  const hasPreloadedApplicationCount = Number.isFinite(
    preloadedApplicationCount,
  );
  const hasPreloadedSentInvitationCount = Number.isFinite(
    preloadedSentInvitationCount,
  );
  const canFetchTeamRequests =
    canManageInvitations && Boolean(teamData?.id) && effectiveVariant === "member";
  const shouldFetchApplications =
    canFetchTeamRequests &&
    (!hasPreloadedApplicationCount || isApplicationsModalOpen);
  const shouldFetchInvitations =
    canFetchTeamRequests &&
    (!hasPreloadedSentInvitationCount || isInvitesModalOpen);
  const {
    applications: pendingApplications,
    invitations: pendingSentInvitations,
    applicationsLoaded: rawPendingApplicationsLoaded,
    invitationsLoaded: rawPendingInvitationsLoaded,
    refetchApplications,
    refetchInvitations,
  } = useTeamRequestLists(teamData?.id, {
    enabled: canFetchTeamRequests,
    applicationsEnabled: shouldFetchApplications,
    invitationsEnabled: shouldFetchInvitations,
  });
  const pendingApplicationsLoaded =
    canFetchTeamRequests && rawPendingApplicationsLoaded;
  const pendingInvitationsLoaded =
    canFetchTeamRequests && rawPendingInvitationsLoaded;

  const fetchPendingApplications = useCallback(async () => {
    if (!canFetchTeamRequests) return [];

    const result = await refetchApplications();
    if (result.error) {
      console.error("Error fetching applications:", result.error);
      return [];
    }
    return result.data ?? [];
  }, [canFetchTeamRequests, refetchApplications]);

  const fetchSentInvitations = useCallback(async () => {
    if (!canFetchTeamRequests) return [];

    const result = await refetchInvitations();
    if (result.error) {
      console.error("Error fetching sent invitations:", result.error);
      return [];
    }
    return result.data ?? [];
  }, [canFetchTeamRequests, refetchInvitations]);

  // Once the full list is loaded (after a modal open), state.length is the
  // source of truth. Otherwise fall back to the count from teamData.
  const displayedApplicationCount = pendingApplicationsLoaded
    ? pendingApplications.length
    : hasPreloadedApplicationCount
      ? preloadedApplicationCount
      : 0;
  const displayedSentInvitationCount = pendingInvitationsLoaded
    ? pendingSentInvitations.length
    : hasPreloadedSentInvitationCount
      ? preloadedSentInvitationCount
      : 0;

  const handleTeamRequestEvent = useCallback((payload = {}) => {
    const payloadTeamId = payload.teamId ?? payload.team_id ?? null;
    if (payloadTeamId != null && String(payloadTeamId) !== String(teamData.id)) {
      return;
    }

    const type = String(payload.type ?? payload.notificationType ?? "").toLowerCase();
    const shouldRefreshApplications =
      !type ||
      type.includes("application") ||
      type === "member_joined" ||
      type === "role_filled";
    const shouldRefreshInvitations =
      !type ||
      type.includes("invitation") ||
      type.includes("invite");

    // Only refresh the per-card list when we already loaded it (i.e. the
    // modal was opened at least once). Otherwise badge counts update from
    // the parent's getUserTeams refetch and the list is re-fetched the next
    // time the modal opens.
    if (shouldRefreshApplications && pendingApplicationsLoaded) {
      fetchPendingApplications();
    }

    if (shouldRefreshInvitations && pendingInvitationsLoaded) {
      fetchSentInvitations();
    }
  }, [
    fetchPendingApplications,
    fetchSentInvitations,
    teamData?.id,
    pendingApplicationsLoaded,
    pendingInvitationsLoaded,
  ]);

  useSocketEvents(
    effectiveVariant === "member" && teamData?.id && canManageInvitations
      ? {
          "notification:new": handleTeamRequestEvent,
          "notification:updated": handleTeamRequestEvent,
          "notification:deleted": handleTeamRequestEvent,
        }
      : null,
    [
      canManageInvitations,
      effectiveVariant,
      fetchPendingApplications,
      fetchSentInvitations,
      teamData?.id,
    ],
  );

  useEffect(() => {
    const fetchCompleteTeamData = async () => {
      if (!teamData?.id) return;
      const isHydratableVariant =
        effectiveVariant === "member" ||
        effectiveVariant === "invitation" ||
        effectiveVariant === "application";
      if (!isHydratableVariant) return;

      // Skip getTeamById when the parent already provided the tags array.
      // The list response from getUserTeams + search responses both include
      // it (empty array means "no tags", which is valid data — no fetch
      // needed). Skip team member badges when the parent is managing them
      // via the teamMemberBadges prop (bulk-fetched by MyTeams).
      const parentProvidedTags = Array.isArray(teamData.tags);
      const parentManagesMemberBadges = teamMemberBadges !== undefined;
      const shouldFetchTeamById = !parentProvidedTags;
      const shouldFetchMemberBadges =
        !parentManagesMemberBadges && !hasDisplayableBadges(teamData.badges);

      if (!shouldFetchTeamById && !shouldFetchMemberBadges) return;

      try {
        const teamByIdPromise = shouldFetchTeamById
          ? teamService.getTeamById(teamData.id)
          : Promise.resolve(null);

        const memberBadgesPromise = shouldFetchMemberBadges
          ? (() => {
              const cached = teamMemberBadgesCache.get(teamData.id);
              if (cached) return Promise.resolve(cached);

              return teamService
                .getTeamMemberBadges(teamData.id)
                .then((badgesResponse) => {
                  const badges = extractBadgeRows(badgesResponse);
                  teamMemberBadgesCache.set(teamData.id, badges);
                  return badges;
                })
                .catch((badgeError) => {
                  console.warn(
                    "Could not fetch team member badges for card display:",
                    badgeError,
                  );
                  return [];
                });
            })()
          : Promise.resolve(
              hasDisplayableBadges(teamData.badges) ? teamData.badges : [],
            );

        const [response, memberBadges] = await Promise.all([
          teamByIdPromise,
          memberBadgesPromise,
        ]);

        const fullTeam = response?.data?.data ?? response?.data ?? null;

        setTeamData((prev) => {
          const baseTeam = fullTeam ?? prev;
          const preservedDistanceKm = resolveDistanceKm({
            preferredDistance: prev?.distance_km ?? prev?.distanceKm,
            fallbackDistance: baseTeam.distance_km ?? baseTeam.distanceKm,
            viewerEntity: viewerDistanceSource ?? user,
            targetEntity: baseTeam,
          });
          const resolvedBadges =
            memberBadges.length > 0
              ? memberBadges
              : hasDisplayableBadges(baseTeam.badges)
                ? baseTeam.badges
                : prev?.badges;

          if (!fullTeam) {
            // Only refreshed badges / distance — keep everything else.
            return {
              ...prev,
              badges: resolvedBadges,
              distance_km: preservedDistanceKm,
              distanceKm: preservedDistanceKm,
            };
          }

          return {
            ...prev,
            ...fullTeam,
            is_public:
              fullTeam.is_public === true || fullTeam.is_public === "true",
            tags: Array.isArray(fullTeam.tags) ? fullTeam.tags : prev.tags,
            badges: resolvedBadges,
            distance_km: preservedDistanceKm,
            distanceKm: preservedDistanceKm,
            open_role_count: fullTeam.openRoleCount ?? fullTeam.open_role_count ?? prev.open_role_count,
            open_role_names: fullTeam.openRoleNames ?? fullTeam.open_role_names ?? prev.open_role_names,
          };
        });

        // Compute role from members list (only possible if we fetched it)
        if (fullTeam && user?.id && Array.isArray(fullTeam.members)) {
          const me = fullTeam.members.find(
            (m) => (m.user_id ?? m.userId) === user.id,
          );
          setUserRole(me?.role ?? null);
        }
      } catch (error) {
        console.error("Error fetching complete team data:", error);
      }
    };

    fetchCompleteTeamData();
  }, [teamData?.id, effectiveVariant, user, viewerDistanceSource]);

  // For role variants the invitation/application API response doesn't include
  // team lat/lon, so fetch just those two fields to enable distance display.
  useEffect(() => {
    if (!isRoleVariant || !teamData?.id) return;
    if (teamData.latitude != null) return;

    let active = true;
    teamService.getTeamById(teamData.id)
      .then((response) => {
        if (!active) return;
        const fullTeam = response?.data?.data ?? response?.data ?? null;
        if (!fullTeam) return;
        const lat = fullTeam.latitude ?? fullTeam.lat ?? null;
        const lng = fullTeam.longitude ?? fullTeam.lng ?? fullTeam.lon ?? null;
        if (lat == null || lng == null) return;
        setTeamData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
      })
      .catch(() => {});
    return () => { active = false; };
  }, [isRoleVariant, teamData?.id]);

  // Sync parent-managed member badges into teamData. When the parent provides
  // an array (bulk fetch resolved), we use it directly. While the parent is
  // still loading (prop === null), we leave teamData.badges alone so the card
  // doesn't flicker between "no badges" and "with badges" mid-load.
  useEffect(() => {
    if (Array.isArray(teamMemberBadges)) {
      setTeamData((prev) => ({
        ...prev,
        badges: teamMemberBadges,
      }));
    }
  }, [teamMemberBadges]);

  useEffect(() => {
    if (!teamData?.id) return;
    if (teamData.is_remote || teamData.isRemote) return;

    setTeamData((prev) => {
      if (!prev?.id) return prev;

      const resolvedDistance = resolveDistanceKm({
        preferredDistance: prev.distance_km ?? prev.distanceKm,
        viewerEntity: viewerDistanceSource ?? user,
        targetEntity: prev,
      });

      if (resolvedDistance == null) return prev;

      const currentDistance = Number(prev.distance_km ?? prev.distanceKm);
      if (
        Number.isFinite(currentDistance) &&
        Math.abs(currentDistance - resolvedDistance) < 0.5
      ) {
        return prev;
      }

      return {
        ...prev,
        distance_km: resolvedDistance,
        distanceKm: resolvedDistance,
      };
    });
  }, [
    teamData?.id,
    teamData?.distance_km,
    teamData?.distanceKm,
    teamData?.latitude,
    teamData?.longitude,
    teamData?.is_remote,
    teamData?.isRemote,
    viewerDistanceSource,
    user,
  ]);

  // Check if user has a pending application for this team (for search results)
  useEffect(() => {
    const checkPendingApplication = async () => {
      if (!isSearchResult || !isAuthenticated || !teamData?.id) {
        return;
      }

      // If parent is managing the viewer's pending applications, never fetch.
      // While the parent's list is still loading (null), wait. Once it's an
      // array, scan it locally.
      if (viewerPendingApplications !== undefined) {
        if (Array.isArray(viewerPendingApplications)) {
          const found = viewerPendingApplications.find(
            (app) => app.team?.id === teamData.id || app.team_id === teamData.id,
          );
          setPendingApplicationForTeam(found || null);
        }
        return;
      }

      try {
        const response = await teamService.getUserPendingApplications();
        const pendingApplications = response.data || [];

        // Find the application for this team (if any)
        const foundApplication = pendingApplications.find(
          (app) => app.team?.id === teamData.id || app.team_id === teamData.id,
        );

        setPendingApplicationForTeam(foundApplication || null);
      } catch (error) {
        console.error("Error checking pending applications:", error);
      }
    };

    checkPendingApplication();
  }, [isSearchResult, isAuthenticated, teamData?.id, viewerPendingApplications]);

  // Check if user has a pending invitation for this team (for search results)
  useEffect(() => {
    const checkPendingInvitation = async () => {
      if (!isSearchResult || !isAuthenticated || !teamData?.id) return;

      // If parent is managing the viewer's pending invitations, never fetch.
      if (viewerPendingInvitations !== undefined) {
        if (Array.isArray(viewerPendingInvitations)) {
          const found = viewerPendingInvitations.find(
            (inv) => inv.team?.id === teamData.id || inv.team_id === teamData.id,
          );
          setPendingInvitationForTeam(found || null);
        }
        return;
      }

      try {
        // IMPORTANT: use whatever your actual service method is called
        // Common naming pattern (matching getUserPendingApplications):
        const response = await teamService.getUserReceivedInvitations();
        const pendingInvitations = response.data || [];

        const foundInvitation = pendingInvitations.find(
          (inv) => inv.team?.id === teamData.id || inv.team_id === teamData.id,
        );

        setPendingInvitationForTeam(foundInvitation || null);
      } catch (error) {
        console.error("Error checking pending invitations:", error);
        setPendingInvitationForTeam(null);
      }
    };

    checkPendingInvitation();
  }, [isSearchResult, isAuthenticated, teamData?.id, viewerPendingInvitations]);

  // useEffect(() => {
  //   if (effectiveVariant !== "member") return;

  //   // Owner shortcut (works even if members are missing)
  //   if (user?.id && (teamData?.owner_id === user.id || teamData?.ownerId === user.id)) {
  //     setUserRole("owner");
  //     return;
  //   }

  //   if (!user?.id || !Array.isArray(teamData?.members)) {
  //     setUserRole(null);
  //     return;
  //   }

  //   const me = teamData.members.find(
  //     (m) => m.user_id === user.id || m.userId === user.id
  //   );

  //   setUserRole(me?.role ?? null);
  // }, [effectiveVariant, user?.id, teamData?.owner_id, teamData?.ownerId, teamData?.members]);

  // Auto-open applications modal if triggered from URL params
  useEffect(() => {
    if (autoOpenApplications && effectiveVariant === "member") {
      setIsApplicationsModalOpen(true);
    }
  }, [autoOpenApplications, effectiveVariant]);

  // Fetch role match details for role-based cards (breakdown may be omitted from pending-item responses)
  useEffect(() => {
    if (
      !isRoleVariant ||
      !showMatchScore ||
      !roleDataId ||
      !roleTeamId ||
      !user?.id
    ) {
      setRoleMatchData(null);
      return;
    }

    let isCancelled = false;
    setRoleMatchData(null);

    const fetchRoleMatchData = async () => {
      try {
        const preloadedMatchData = extractCandidateMatchData(roleData);
        if (
          preloadedMatchData.matchScore != null &&
          hasRoleMatchDetails(roleData)
        ) {
          if (!isCancelled) {
            setRoleMatchData(preloadedMatchData);
          }
          return;
        }

        const viewerProfile = await getViewerRoleProfile(user.id, user);
        let effectiveRole = roleData ?? null;

        if (!roleHasPreloadedRequirements) {
          const detailsRes = await vacantRoleService.getVacantRoleById(
            roleTeamId,
            roleDataId,
          );
          effectiveRole = extractProfilePayload(detailsRes) ?? effectiveRole;
        }

        const nextMatchData = effectiveRole
          ? computeRoleUserMatch({
              role: effectiveRole,
              tags: effectiveRole.tags ?? [],
              badges: effectiveRole.badges ?? [],
              user: viewerProfile.user,
              userTagMap: viewerProfile.userTagMap,
              userBadgeMap: viewerProfile.userBadgeMap,
            })
          : null;

        if (!isCancelled) {
          setRoleMatchData(nextMatchData);
        }
      } catch (err) {
        console.error("[TeamCard] role match data fetch error:", err);
      }
    };

    fetchRoleMatchData();

    return () => {
      isCancelled = true;
    };
  }, [
    isRoleVariant,
    showMatchScore,
    roleData,
    roleDataId,
    roleHasPreloadedRequirements,
    roleTeamId,
    user?.id,
  ]);

  // ================= GUARD CLAUSE – AFTER ALL HOOKS =================

  if (!teamData) {
    return null;
  }

  const teamDetailsInitialTeamData = isRoleVariant ? (roleTeamData ?? teamData) : teamData;
  const roleModalMatchDetails =
    roleMatchData?.matchDetails ??
    roleMatchData?.match_details ??
    null;
  const teamModalMatchSource = isRoleVariant
    ? (roleTeamData ?? teamDetailsInitialTeamData ?? null)
    : (normalizedData.team ?? teamData ?? null);
  const shouldShowTeamModalMatchHighlights = showMatchHighlights || isRoleVariant;
  const shouldHideMatchData = !shouldShowTeamModalMatchHighlights && !showMatchScore;
  const teamModalRawScore = showMatchScore
    ? getExplicitMatchScore(teamModalMatchSource)
    : null;
  const teamModalMatchType =
    teamModalMatchSource?.matchType ??
    teamModalMatchSource?.match_type ??
    null;
  const teamModalMatchDetails =
    teamModalMatchSource?.matchDetails ??
    teamModalMatchSource?.match_details ??
    null;
  const roleCardRawScore = (() => {
    const raw =
      roleMatchData?.matchScore ??
      roleMatchData?.match_score ??
      roleMatchData?.bestMatchScore ??
      roleMatchData?.best_match_score ??
      null;
    const numeric = Number(raw);

    return Number.isFinite(numeric) ? numeric : null;
  })();
  const roleTitle = teamData.name || "Unknown Team";
  const cardTitle = isRoleInvitationVariant ? (
    <button
      type="button"
      data-tooltip-trigger="true"
      className="block max-w-full bg-transparent p-0 text-left text-inherit [font:inherit] hover:underline focus:outline-none"
      onClick={(event) => {
        event.stopPropagation();
        setIsRoleDetailsModalOpen(true);
      }}
      title="Click to view role details"
    >
      {roleTitle}
    </button>
  ) : (
    roleTitle
  );
  const cardClickTooltip = isRoleApplicationVariant
    ? "Click to view role details"
    : isRoleInvitationVariant
      ? "Click to view invitation details"
      : "Click to view Team details";

  // ============ Helper Functions ============

  // Get team initials from name (e.g., "Urban Gardeners Berlin" → "UGB")
  const getTeamInitials = () => {
    const name = teamData.name;
    if (!name || typeof name !== "string") return "?";

    const words = name.trim().split(/\s+/);

    if (words.length === 1) {
      // Single word: take first 2 characters
      return name.slice(0, 2).toUpperCase();
    }

    // Multiple words: take first letter of each word (max 3)
    return words
      .slice(0, 3)
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase();
  };

  // Get team image URL (return null for fallback)
  const getTeamImage = () => {
    if (teamData.teamavatar_url) return teamData.teamavatar_url;
    if (teamData.teamavatarUrl) return teamData.teamavatarUrl;
    return null;
  };

  const getTeamId = () => {
    if (isRoleVariant) {
      return roleTeamId;
    }
    return teamData.id || normalizedData.team?.id;
  };

  const getMemberCount = () => {
    return (
      teamData.current_members_count ??
      teamData.currentMembersCount ??
      teamData.members?.length ??
      0
    );
  };

  const getMaxMembers = () => {
    const maxMembers = teamData.max_members ?? teamData.maxMembers;
    return maxMembers === null || maxMembers === undefined ? "∞" : maxMembers;
  };

  const localOpenRoleSnapshot = resolveTeamOpenRoleSnapshot(teamData);
  const resolvedOpenRoleSnapshot =
    freshOpenRoleSnapshot?.teamId != null &&
    teamData?.id != null &&
    String(freshOpenRoleSnapshot.teamId) === String(teamData.id)
      ? freshOpenRoleSnapshot
      : localOpenRoleSnapshot;
  const openRoleCount = resolvedOpenRoleSnapshot.count;
  const openRoleNames = resolvedOpenRoleSnapshot.names;

  const getFormattedDate = () => {
    const date = normalizedData.date;
    if (!date) return null;
    try {
      return format(new Date(date), "MM/dd/yy");
    } catch {
      return null;
    }
  };

  const getInternalRoleInvitationTooltip = () => {
    if (!normalizedData.date) {
      return "You are invited to fill a role in this team";
    }

    try {
      return `You were invited to fill a role in this team on ${format(
        new Date(normalizedData.date),
        "MMM d, yyyy",
      )}`;
    } catch {
      return "You are invited to fill a role in this team";
    }
  };

  const getRoleStatusTooltip = () => {
    if (isRoleInvitationVariant) {
      return getInternalRoleInvitationTooltip();
    }

    const formattedDate = getFormattedDate();
    const actionText = "You applied for this role";

    if (!formattedDate || !normalizedData.date) {
      return actionText;
    }

    return `${actionText}\non ${format(new Date(normalizedData.date), "MMM d, yyyy")}`;
  };

  const getAssociatedRoleName = (item) => {
    const roleName =
      item?.role?.roleName ??
      item?.role?.role_name ??
      item?.roleName ??
      item?.role_name ??
      null;

    if (typeof roleName === "string" && roleName.trim()) {
      return roleName.trim();
    }

    const hasRoleReference = !!(
      item?.role?.id ??
      item?.roleId ??
      item?.role_id
    );

    return hasRoleReference ? "Vacant Role" : null;
  };

  const teamInvitationRoleName =
    effectiveVariant === "invitation"
      ? getAssociatedRoleName(invitation)
      : null;
  const teamApplicationRoleName =
    effectiveVariant === "application"
      ? getAssociatedRoleName(application)
      : null;
  const teamRequestRoleName =
    teamInvitationRoleName ?? teamApplicationRoleName ?? null;

  const getDisplayTags = () => {
    let displayTags = [];
    try {
      if (teamData.tags_json) {
        const tagStrings = teamData.tags_json.split(",");
        displayTags = tagStrings
          .filter((tagStr) => tagStr && tagStr.trim() !== "null")
          .map((tagStr) => {
            try {
              return JSON.parse(tagStr.trim());
            } catch {
              return null;
            }
          })
          .filter((tag) => tag !== null);
      } else if (teamData.tags) {
        if (Array.isArray(teamData.tags)) {
          displayTags = teamData.tags.map((tag) => {
            if (typeof tag === "string") return { name: tag };
            if (tag && typeof tag === "object") {
              return {
                id: tag.id || tag.tag_id || tag.tagId,
                name: tag.name || (typeof tag.tag === "string" ? tag.tag : ""),
                category: tag.category || tag.supercategory || "",
              };
            }
            return tag;
          });
        } else if (typeof teamData.tags === "string") {
          try {
            displayTags = JSON.parse(teamData.tags);
          } catch {
            displayTags = teamData.tags
              .split(",")
              .map((name) => ({ name: name.trim() }));
          }
        }
      }
    } catch {
      displayTags = [];
    }
    return displayTags.filter(
      (tag) => tag && (tag.name || typeof tag === "string"),
    );
  };

  const getDisplayBadges = () => {
    let displayBadges = [];

    try {
      if (Array.isArray(teamData.badges)) {
        displayBadges = teamData.badges.map((badge) => {
          if (typeof badge === "string") return { name: badge };
          if (badge && typeof badge === "object") {
            return {
              id: badge.id || badge.badge_id || badge.badgeId,
              name:
                badge.name ||
                badge.badgeName ||
                (typeof badge.badge_name === "string"
                  ? badge.badge_name
                  : ""),
              category: badge.category || "",
              total_credits:
                badge.total_credits ??
                badge.totalCredits ??
                badge.credits ??
                0,
            };
          }
          return badge;
        });
      } else if (typeof teamData.badges === "string") {
        try {
          const parsedBadges = JSON.parse(teamData.badges);
          displayBadges = Array.isArray(parsedBadges)
            ? parsedBadges
            : [{ name: teamData.badges.trim() }];
        } catch {
          displayBadges = teamData.badges
            .split(",")
            .map((name) => ({ name: name.trim() }));
        }
      }
    } catch {
      displayBadges = [];
    }

    return displayBadges.filter(
      (badge) => badge && (badge.name || typeof badge === "string"),
    );
  };

  const shouldShowVisibilityIcon = () => {
    if (!isAuthenticated || !user) return false;
    if (effectiveVariant !== "member") return false;
    if (isOwner) return true;
    if (teamData.owner_id === user.id || teamData.ownerId === user.id)
      return true;
    if (teamData.members && Array.isArray(teamData.members)) {
      const foundInMembers = teamData.members.some(
        (member) => member.user_id === user.id || member.userId === user.id,
      );
      if (foundInMembers) return true;
    }
    if (userRole && userRole !== null) return true;
    return false;
  };

  // ============ Event Handlers ============

  const openRoleDetails = (event) => {
    if (event) {
      event.stopPropagation();
    }
    setIsRoleDetailsModalOpen(true);
  };

  const handleCardClick = () => {
    if (isRoleApplicationVariant) {
      openRoleDetails();
    } else if (isRoleInvitationVariant) {
      setIsInvitationDetailsModalOpen(true);
    } else {
      setIsModalOpen(true);
    }
  };

  const handleModalClose = async () => {
    if (effectiveVariant === "member") {
      try {
        const response = await teamService.getTeamById(teamData.id);
        if (response && response.data) {
          const fullTeam = response?.data?.data ?? response?.data;
          // Normalize is_public to ensure it's a boolean
          const normalizedTeam = {
            ...fullTeam,
            is_public:
              fullTeam.is_public === true || fullTeam.is_public === "true",
          };
          const mergedTeam = {
            ...teamData,
            ...normalizedTeam,
            badges: hasDisplayableBadges(normalizedTeam.badges)
              ? normalizedTeam.badges
              : teamData.badges,
          };
          mergedTeam.open_role_count = normalizedTeam.openRoleCount ?? normalizedTeam.open_role_count ?? teamData.open_role_count;
          mergedTeam.open_role_names = normalizedTeam.openRoleNames ?? normalizedTeam.open_role_names ?? teamData.open_role_names;
          const refreshedDistance = resolveDistanceKm({
            preferredDistance:
              normalizedTeam.distance_km ?? normalizedTeam.distanceKm,
            fallbackDistance: teamData.distance_km ?? teamData.distanceKm,
            viewerEntity: viewerDistanceSource ?? user,
            targetEntity: mergedTeam,
          });

          mergedTeam.distance_km = refreshedDistance;
          mergedTeam.distanceKm = refreshedDistance;

          setTeamData(mergedTeam);
          if (onUpdate) onUpdate(mergedTeam);
        }
      } catch (error) {
        console.error("Error refreshing team data:", error);
      }
    }
    setIsModalOpen(false);
    setIsApplicationModalOpen(false);
  };

  const handleTeamUpdate = (updatedTeam) => {
    const mergedTeam = {
      ...teamData,
      ...updatedTeam,
      badges: hasDisplayableBadges(updatedTeam?.badges)
        ? updatedTeam.badges
        : teamData.badges,
    };
    mergedTeam.open_role_count = updatedTeam?.openRoleCount ?? updatedTeam?.open_role_count ?? teamData.open_role_count;
    mergedTeam.open_role_names = updatedTeam?.openRoleNames ?? updatedTeam?.open_role_names ?? teamData.open_role_names;
    const refreshedDistance = resolveDistanceKm({
      preferredDistance: updatedTeam?.distance_km ?? updatedTeam?.distanceKm,
      fallbackDistance: teamData.distance_km ?? teamData.distanceKm,
      viewerEntity: viewerDistanceSource ?? user,
      targetEntity: mergedTeam,
    });

    mergedTeam.distance_km = refreshedDistance;
    mergedTeam.distanceKm = refreshedDistance;

    setTeamData(mergedTeam);
    if (onUpdate) onUpdate(mergedTeam);
  };

  const handleApplicationAction = async (applicationId, action, response, fillRole = false) => {
    const result = await teamService.handleTeamApplication(applicationId, action, response, fillRole);
    await fetchPendingApplications();
    if (onUpdate) {
      const updatedTeam = await teamService.getTeamById(teamData.id);
      onUpdate(updatedTeam.data);
    }
    return result;
  };

  const handleVacantRoleStatusChange = async () => {
    if (teamData?.id != null) {
      teamOpenRolesCache.delete(String(teamData.id));
      setFreshOpenRoleSnapshot(null);
    }

    await fetchPendingApplications();

    try {
      const response = await teamService.getTeamById(teamData.id);
      const fullTeam = response?.data?.data ?? response?.data;

      if (!fullTeam) return;

      const normalizedTeam = {
        ...fullTeam,
        is_public:
          fullTeam.is_public === true || fullTeam.is_public === "true",
      };
      const mergedTeam = {
        ...teamData,
        ...normalizedTeam,
        badges: hasDisplayableBadges(normalizedTeam.badges)
          ? normalizedTeam.badges
          : teamData.badges,
      };
      mergedTeam.open_role_count = normalizedTeam.openRoleCount ?? normalizedTeam.open_role_count ?? teamData.open_role_count;
      mergedTeam.open_role_names = normalizedTeam.openRoleNames ?? normalizedTeam.open_role_names ?? teamData.open_role_names;
      const refreshedDistance = resolveDistanceKm({
        preferredDistance:
          normalizedTeam.distance_km ?? normalizedTeam.distanceKm,
        fallbackDistance: teamData.distance_km ?? teamData.distanceKm,
        viewerEntity: viewerDistanceSource ?? user,
        targetEntity: mergedTeam,
      });

      mergedTeam.distance_km = refreshedDistance;
      mergedTeam.distanceKm = refreshedDistance;

      setTeamData(mergedTeam);
      if (onUpdate) onUpdate(mergedTeam);
    } catch (error) {
      console.error("Error refreshing team data after role status change:", error);
    }
  };

  // Handler for canceling a sent invitation
  const handleCancelInvitation = async (invitationId) => {
    try {
      await teamService.cancelInvitation(invitationId);
      // Refresh the invitations list
      await fetchSentInvitations();
    } catch (error) {
      console.error("Error canceling invitation:", error);
      throw error;
    }
  };

  const handleCancelRoleInvitation = async (invitationId) => {
    try {
      await teamService.cancelRoleInvitation(invitationId);
      await fetchSentInvitations();
    } catch (error) {
      console.error("Error canceling role invitation:", error);
      throw error;
    }
  };

  const closeDeleteTeamDialog = () => {
    if (isDeleting) return;
    setIsDeleteDialogOpen(false);
  };

  const confirmDeleteTeam = async () => {
    try {
      setIsDeleting(true);
      await teamService.deleteTeam(teamData.id);
      setIsDeleteDialogOpen(false);
      if (onDelete) onDelete(teamData.id);
    } catch (err) {
      console.error("Error deleting team:", err);
      setError("Failed to delete team. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handler for when user leaves a team (called from TeamDetailsModal)
  const handleLeaveTeam = (teamId) => {
    if (onLeave) onLeave(teamId);
  };

  const closeCancelApplicationDialog = () => {
    if (actionLoading === "cancel") return;
    setIsCancelApplicationDialogOpen(false);
  };

  const confirmCancelApplication = async () => {
    setActionLoading("cancel");
    try {
      const cancelHandler = onCancel || onCancelApplication;
      if (cancelHandler) {
        await cancelHandler(normalizedData.id);
      }
      setIsCancelApplicationDialogOpen(false);
    } catch (err) {
      console.error("Error canceling application:", err);
      setError("Failed to cancel application. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  // ============ Render Helpers ============

  const renderActionButtons = () => {
    // If user has a pending invitation (search or invitation variant)

    // Search page: always show View Details button on the card
    if (isSearchResult) {
      return null;
    }

    if (
      effectiveVariant === "invitation" ||
      isRoleInvitationVariant ||
      pendingInvitationForTeam
    ) {
      return (
        <div className="mt-auto pt-4">
          <Button
            variant="primary"
            className="w-full"
            icon={<Mail size={16} />}
            suppressCardTooltip={true}
            onClick={(e) => {
              e.stopPropagation();
              setIsInvitationDetailsModalOpen(true);
            }}
          >
            Open Invite to Respond
          </Button>
        </div>
      );
    }

    // If user has a pending application (search or application variant)
    if (effectiveVariant === "application" || effectiveVariant === "role_application" || pendingApplicationForTeam) {
      return (
        <div className="mt-auto pt-4">
          <Button
            variant="primary"
            className="w-full"
            icon={<SendHorizontal size={16} />}
            suppressCardTooltip={true}
            onClick={(e) => {
              e.stopPropagation();
              setIsApplicationModalOpen(true);
            }}
          >
            {effectiveVariant === "role_application" ? "View Role Application Details" : "View Application Details"}
          </Button>
        </div>
      );
    }

    // Member variant: View Details + management actions
    return (
      <div className="mt-auto pt-4 flex justify-between items-center">
        <Button
          variant="primary"
          suppressCardTooltip={true}
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
          className="flex-grow"
        >
          View Details
        </Button>
        {/* Team Management Actions (owner and admin) */}
        {isAuthenticated && !isSearchResult && (
          <div className="flex items-center space-x-2 ml-2">
            {/* Application badge - owners and admins */}
            {canManageInvitations && (
              <NotificationBadge
                variant="application"
                count={displayedApplicationCount}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsApplicationsModalOpen(true);
                }}
              />
            )}

            {/* Sent invitations badge - owners and admins */}
            {canManageInvitations && (
              <NotificationBadge
                variant="invitation"
                count={displayedSentInvitationCount}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsInvitesModalOpen(true);
                }}
              />
            )}
          </div>
        )}
      </div>
    );
  };

  // ============ MATCH SCORE ============
  // Role-based cards should always prefer the role match over any team-level match.
  const rawScore = showMatchScore
    ? (
        isRoleVariant
          ? roleCardRawScore
          : getResultMatchScore(normalizedData.team)
      )
    : null;
  const showScore = showMatchScore && rawScore != null;

  let matchTier = null;
  let matchOverlay = null;
  let scoreSubtitleItem = null;
  let scoreAvatarReplacement = null;
  let matchTooltipText = null;
  if (showScore) {
    matchTier = getMatchTier(rawScore);

    const matchDetails = isRoleVariant
      ? (
          roleMatchData?.matchDetails ??
          roleMatchData?.match_details ??
          null
        )
      : (
          normalizedData.team?.matchDetails ??
          normalizedData.team?.match_details ??
          roleMatchData?.matchDetails ??
          null
        );
    const sharedTagCount =
      normalizedData.team?.sharedTagCount ??
      normalizedData.team?.shared_tag_count ??
      0;
    matchTooltipText = getMatchTooltipText(matchTier, matchDetails, {
      sharedFocusCount: sharedTagCount,
    });

    const iconSizeSubtitle =
      viewMode === "list" ? 9 : viewMode === "mini" ? 10 : 13;
    scoreSubtitleItem = (
      <MatchScoreSubtitle
        matchTier={matchTier}
        tooltipText={matchTooltipText}
        iconSize={iconSizeSubtitle}
      />
    );

    const isListMatchBadge = viewMode === "list";
    const isCompactMatchBadge = isListMatchBadge || viewMode === "mini";
    const matchBadgeIconSize = isListMatchBadge ? 7 : isCompactMatchBadge ? 11 : 13;
    const matchBadgePx = isListMatchBadge ? 14 : isCompactMatchBadge ? 22 : 26;
    const overlayPosition = `absolute ${isListMatchBadge ? "-top-0.5 -left-0.5" : "-top-1 -left-1"} z-10`;

    if (isRoleVariant) {
      matchOverlay = (
        <MatchScoreOverlay
          matchTier={matchTier}
          icon={UserSearch}
          tooltipText={matchTooltipText}
          sizeClassName=""
          iconSize={matchBadgeIconSize}
          positionClassName={overlayPosition}
          style={{ width: `${matchBadgePx}px`, height: `${matchBadgePx}px` }}
        />
      );
    } else if (isTeamInvitationOrApplicationVariant) {
      matchOverlay = (
        <MatchScoreOverlay
          matchTier={matchTier}
          icon={Users}
          tooltipText={matchTooltipText}
          sizeClassName=""
          iconSize={matchBadgeIconSize}
          positionClassName={overlayPosition}
          style={{ width: `${matchBadgePx}px`, height: `${matchBadgePx}px` }}
        />
      );
    } else {
      matchOverlay = (
        <MatchScoreOverlay
          matchTier={matchTier}
          tooltipText={matchTooltipText}
          sizeClassName={viewMode === "list" ? "w-[14px] h-[14px]" : "w-5 h-5"}
          iconSize={viewMode === "list" ? 7 : 10}
          positionClassName="absolute -top-0.5 -left-0.5 z-10"
        />
      );
    }
  }

  const avatarOverlay = showSearchResultTypeOverlay ? (
    <SearchResultTypeOverlay
      icon={Users}
      bgClassName={matchTier?.bg ?? "bg-[var(--color-role-owner-bg)]"}
      tooltip="Team"
      viewMode={viewMode}
    />
  ) : (
    matchOverlay
  );
  const demoTeamData = isRoleVariant ? (roleTeamData ?? teamData) : teamData;
  const showDemoRoleIndicator =
    isRoleVariant && isSyntheticRole(roleData);
  const showDemoTeamIndicator =
    !showDemoRoleIndicator && isSyntheticTeam(demoTeamData);
  const showDemoIndicator = showDemoRoleIndicator || showDemoTeamIndicator;
  const demoTooltip = showDemoRoleIndicator
    ? DEMO_ROLE_TOOLTIP
    : DEMO_TEAM_TOOLTIP;
  const demoAvatarOverlay = showDemoIndicator ? (
    <DemoAvatarOverlay viewMode={viewMode} />
  ) : null;

  // ============ LIST VIEW ============

  if (viewMode === "list") {
    const { short: locationTextShort, full: locationText } =
      formatListLocation(teamData, {
        isRemote: teamData.is_remote || teamData.isRemote,
      });
    const distance = teamData.distance_km ?? teamData.distanceKm;
    const showDistance =
      !hideDistanceInfo &&
      distance != null &&
      distance < 999999 &&
      !(teamData.is_remote || teamData.isRemote);

    const tagNames = extractNames(teamData.tags);
    const { summary: tagsSummary, tooltip: tagsTooltip } =
      summarizeList(tagNames);

    const badgeNames = extractNames(getDisplayBadges());
    const { summary: badgesSummary, tooltip: badgesTooltip } =
      summarizeList(badgeNames);

    const memberCount = getMemberCount();
    const maxMembers = getMaxMembers();
    const shouldReserveMyTeamsActionSlot = !isSearchResult;
    const memberCountListItem = shouldShowMemberCountInList ? (
      <span className="inline-flex items-center gap-0.5">
        <Users size={9} />
        <span>{memberCount}/{maxMembers}</span>
      </span>
    ) : null;

    const subtitleContent = (
      <span className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-base-content/60 space-x-1">
        {scoreSubtitleItem}
        {memberCountListItem}
        {(effectiveVariant === "invitation" || isRoleInvitationVariant || pendingInvitationForTeam) && (
          <Tooltip
            content={
              hasInternalRoleInvitation
                ? getInternalRoleInvitationTooltip()
                : `You were invited to this team${
                    getFormattedDate()
                      ? `\non ${format(new Date(normalizedData.date), "MMM d, yyyy")}`
                      : ""
                  }`
            }
          >
            <span
              className={`flex items-center gap-0.5 ${isRoleInvitationVariant ? "cursor-pointer" : ""}`}
              onClick={
                isRoleInvitationVariant
                  ? (e) => {
                      e.stopPropagation();
                      setIsInvitationDetailsModalOpen(true);
                    }
                  : undefined
              }
            >
              <Mail
                size={9}
                className={hasInternalRoleInvitation ? "text-orange-500" : "text-pink-500"}
              />
              {getFormattedDate() && <span>{getFormattedDate()}</span>}
            </span>
          </Tooltip>
        )}
        {teamInvitationRoleName && (
          <Tooltip
            content={teamInvitationRoleName}
            wrapperClassName="inline-flex items-center gap-0.5"
          >
            <UserSearch size={9} className="flex-shrink-0 text-orange-500" />
            <span>{teamInvitationRoleName}</span>
          </Tooltip>
        )}
        {(effectiveVariant === "application" || isRoleApplicationVariant || pendingApplicationForTeam) && (
          <Tooltip
            content={
              isCombinedApplication || isPendingCombinedApplicationForTeam
                ? `You applied to join this team and fill a role${getFormattedDate() ? `\non ${format(new Date(normalizedData.date), "MMM d, yyyy")}` : ""}`
                : isPendingInternalRoleApplicationForTeam
                  ? "You applied for a role within this team"
                  : `You applied${isRoleApplicationVariant ? " for this role" : " to join this team"}${
                      getFormattedDate()
                        ? `\non ${format(new Date(normalizedData.date), "MMM d, yyyy")}`
                        : ""
                    }`
            }
          >
            <span
              className="flex items-center gap-0.5 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setIsApplicationModalOpen(true);
              }}
            >
              <SendHorizontal size={9} className={
                (isCombinedApplication || isPendingCombinedApplicationForTeam) ? "text-violet-500" :
                (isRoleApplicationVariant || isPendingInternalRoleApplicationForTeam) ? "text-orange-500" :
                "text-info"
              } />
              {getFormattedDate() && <span>{getFormattedDate()}</span>}
            </span>
          </Tooltip>
        )}
        {teamApplicationRoleName && (
          <Tooltip
            content={teamApplicationRoleName}
            wrapperClassName="inline-flex items-center gap-0.5"
          >
            <UserSearch size={9} className="flex-shrink-0 text-orange-500" />
            <span>{teamApplicationRoleName}</span>
          </Tooltip>
        )}
        {shouldShowOpenRoleCount && openRoleCount > 0 && (
          <Tooltip content={`${openRoleCount} open ${openRoleCount === 1 ? 'role' : 'roles'} posted in this team`}>
            <span className="flex items-center">
              <UserSearch size={9} className="text-orange-500 mr-0.5" />
              <span>{openRoleCount}</span>
            </span>
          </Tooltip>
        )}
        {isRoleVariant && teamData._teamName && (
          <Tooltip content="Click to view team details" wrapperClassName="inline-flex items-center gap-0.5">
            <span
              className="inline-flex items-center gap-0.5 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
            >
              <Users size={9} className="flex-shrink-0 text-primary" />
              <span>{teamData._teamName}</span>
            </span>
          </Tooltip>
        )}
        {userRole && effectiveVariant === "member" && (
          <>
            {userRole === "owner" && (
              <Tooltip content="You are the owner of this team">
                <Crown size={9} className="text-[var(--color-role-owner-bg)]" />
              </Tooltip>
            )}
            {userRole === "admin" && (
              <Tooltip content="You are an admin of this team">
                <ShieldCheck size={9} className="text-[var(--color-role-admin-bg)]" />
              </Tooltip>
            )}
            {userRole === "member" && !hideMemberRoleIcon && (
              <Tooltip content="You are a member of this team">
                <User size={9} className="text-[var(--color-role-member-bg)]" />
              </Tooltip>
            )}
          </>
        )}
        {shouldShowVisibilityIcon() && (
          <Tooltip content={teamData.is_public === true || teamData.isPublic === true ? "Public Team - visible for everyone" : "Private Team - only visible for Members"}>
            {teamData.is_public === true || teamData.isPublic === true ? (
              <EyeIcon size={9} className="text-green-600" />
            ) : (
              <EyeClosed size={9} className="text-gray-500" />
            )}
          </Tooltip>
        )}
        {showDemoIndicator && (
          <Tooltip
            content={demoTooltip}
            wrapperClassName="inline-flex items-center whitespace-nowrap text-base-content/50"
          >
            <FlaskConical size={9} className="flex-shrink-0" />
          </Tooltip>
        )}
      </span>
    );

    return (
      <>
        <Card
          title={cardTitle}
          subtitle={subtitleContent}
          image={getTeamImage()}
          imageFallback={getTeamInitials()}
          imageReplacement={scoreAvatarReplacement}
          imageAlt={`${teamData.name} team`}
          onClick={handleCardClick}
          viewMode="list"
          className={listClassName}
          clickTooltip={cardClickTooltip}
          imageOverlay={avatarOverlay}
          imageInnerOverlay={demoAvatarOverlay}
          listEdgeRounding={!disableListEdgeRounding}
      >
          <ListViewRow
            locationText={locationTextShort}
            locationTooltip={locationText}
            isRemote={teamData.is_remote || teamData.isRemote}
            distance={showDistance ? Math.round(distance) : null}
            tagsSummary={tagsSummary}
            tagsTooltip={tagsTooltip}
            badgesSummary={badgesSummary}
            badgesTooltip={badgesTooltip}
            locationVisibilityClassName={listLocationVisibilityClassName}
            locationWidthClassName={listLocationWidthClassName}
            locationInsetClassName={listLocationInsetClassName}
            tagsWidthClassName={listTagsWidthClassName}
            badgesWidthClassName={listBadgesWidthClassName}
            locationBreakpoint={listLocationShortBreakpoint}
          />
          {shouldReserveMyTeamsActionSlot && (
            <div className="w-20 flex-shrink-0 flex items-center justify-end gap-2">
              {(effectiveVariant === "invitation" || isRoleInvitationVariant) && (
                <Tooltip content="Open Invite to Respond">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-shrink-0 !min-h-8 !h-8 !w-8 !min-w-8 !px-0"
                    icon={<Mail size={16} />}
                    suppressCardTooltip={true}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsInvitationDetailsModalOpen(true);
                    }}
                  />
                </Tooltip>
              )}
              {(effectiveVariant === "application" || isRoleApplicationVariant) && (
                <Tooltip content={isRoleApplicationVariant ? "View Role Application Details" : "View Application Details"}>
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-shrink-0 !min-h-8 !h-8 !w-8 !min-w-8 !px-0"
                    icon={<SendHorizontal size={16} />}
                    suppressCardTooltip={true}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsApplicationModalOpen(true);
                    }}
                  />
                </Tooltip>
              )}
              {effectiveVariant === "member" && canManageInvitations && (
                <>
                  <NotificationBadge
                    variant="application"
                    count={displayedApplicationCount}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsApplicationsModalOpen(true);
                    }}
                  />
                  <NotificationBadge
                    variant="invitation"
                    count={displayedSentInvitationCount}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsInvitesModalOpen(true);
                    }}
                  />
                </>
              )}
            </div>
          )}
        </Card>

        <TeamDetailsModal
          isOpen={isModalOpen}
          teamId={getTeamId()}
          initialTeamData={teamDetailsInitialTeamData}
          onClose={handleModalClose}
          onUpdate={handleTeamUpdate}
          onDelete={onDelete}
          onLeave={handleLeaveTeam}
          userRole={userRole}
          isFromSearch={isSearchResult}
          hasPendingInvitation={
            effectiveVariant === "invitation" || !!pendingInvitationForTeam
          }
          pendingInvitation={
            effectiveVariant === "invitation"
              ? invitation
              : pendingInvitationForTeam
          }
          hasPendingApplication={
            effectiveVariant === "application" || isRoleApplicationVariant || !!pendingApplicationForTeam
          }
          pendingApplication={
            effectiveVariant === "application" || isRoleApplicationVariant
              ? application
              : pendingApplicationForTeam
          }
          onViewApplicationDetails={() => setIsApplicationModalOpen(true)}
          onSendReminder={onSendReminder}
          showMatchHighlights={shouldShowTeamModalMatchHighlights}
          hideMatchData={shouldHideMatchData}
          matchScore={teamModalRawScore ?? null}
          matchType={teamModalMatchType}
          matchDetails={teamModalMatchDetails}
          teamMemberBadges={teamMemberBadges}
        />

        {/* Applications Modal (for team owners and admins) */}
        {effectiveVariant === "member" && (
          <TeamApplicationsModal
            isOpen={isApplicationsModalOpen}
            onClose={() => {
              setIsApplicationsModalOpen(false);
              if (onApplicationsModalClosed) {
                onApplicationsModalClosed();
              }
            }}
            teamId={teamData.id}
            applications={pendingApplications}
            onApplicationAction={handleApplicationAction}
            onRoleStatusChanged={handleVacantRoleStatusChange}
            teamName={teamData.name}
            highlightApplicationId={highlightApplicationId}
            highlightUserId={highlightApplicantId}
          />
        )}

        {/* Invites Modal (for team owners and admins) */}
        {effectiveVariant === "member" && (
          <TeamInvitesModal
            isOpen={isInvitesModalOpen}
            onClose={() => {
              setIsInvitesModalOpen(false);
              fetchSentInvitations();
            }}
            teamId={teamData.id}
            invitations={pendingSentInvitations}
            onCancelInvitation={handleCancelInvitation}
            onCancelRoleInvitation={handleCancelRoleInvitation}
            teamName={teamData.name}
            highlightInvitationId={highlightInvitationId}
          />
        )}

        {isInvitationDetailsModalOpen &&
          (invitation || pendingInvitationForTeam) && (
            <TeamInvitationDetailsModal
              isOpen={isInvitationDetailsModalOpen}
              invitation={
                effectiveVariant === "invitation" || isRoleInvitationVariant
                  ? invitation
                  : pendingInvitationForTeam
              }
              onClose={() => setIsInvitationDetailsModalOpen(false)}
              onAccept={onAccept}
              onDecline={onDecline}
            />
          )}

        {isApplicationModalOpen &&
          (application || pendingApplicationForTeam) && (
            <TeamApplicationDetailsModal
              isOpen={isApplicationModalOpen}
              application={
                effectiveVariant === "application" || effectiveVariant === "role_application"
                  ? application
                  : pendingApplicationForTeam
              }
              onClose={() => setIsApplicationModalOpen(false)}
              onCancel={onCancel || onCancelApplication}
              onSendReminder={onSendReminder}
            />
          )}

        {isRoleVariant && roleData && (
          <VacantRoleDetailsModal
            isOpen={isRoleDetailsModalOpen}
            onClose={() => setIsRoleDetailsModalOpen(false)}
            team={roleTeamData ?? null}
            role={roleData}
            matchScore={rawScore ?? null}
            matchDetails={roleModalMatchDetails}
            canManage={canManageInvitations}
            isTeamMember={Boolean(userRole) || isOwner}
            onViewApplicationDetails={
              isRoleApplicationVariant
                ? () => {
                    setIsRoleDetailsModalOpen(false);
                    setIsApplicationModalOpen(true);
                  }
                : null
            }
          />
        )}

        <UserDetailsModal
          isOpen={!!selectedUserId}
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      </>
    );
  }

  // ============ Main Render ============

  return (
    <>
      <Card
        title={cardTitle}
        subtitle={
          <span
            className={`mt-0.5 flex max-h-[2.75em] overflow-hidden items-center flex-wrap leading-[110%] text-base-content/70 ${viewMode === "mini" ? "text-xs gap-x-1 gap-y-px w-full" : "text-sm gap-x-1.5 gap-y-px"}`}
          >
            {scoreSubtitleItem}
            {isRoleVariant && getFormattedDate() && (
              <Tooltip content={getRoleStatusTooltip()}>
                <span className="flex items-center gap-0.5 whitespace-nowrap">
                  {isRoleInvitationVariant ? (
                    <Mail
                      size={viewMode === "mini" ? 10 : 13}
                      className={`flex-shrink-0 ${hasInternalRoleInvitation ? "text-orange-500" : "text-pink-500"}`}
                    />
                  ) : (
                    <SendHorizontal size={viewMode === "mini" ? 10 : 13} className="flex-shrink-0 text-orange-500" />
                  )}
                  <span>{getFormattedDate()}</span>
                </span>
              </Tooltip>
            )}

            {/* Members count for member search results */}
            {!isRoleVariant && shouldShowMemberCountInSubtitle && (
              <span className="flex items-center">
                <Users
                  size={viewMode === "mini" ? 10 : 13}
                  className="text-primary mr-0.5"
                />
                <span>
                  {getMemberCount()}/{getMaxMembers()}
                </span>
              </span>
            )}

            {/* Pending invitation indicator with date */}
            {(effectiveVariant === "invitation" ||
              pendingInvitationForTeam) && (
              <Tooltip
                content={
                  hasInternalRoleInvitation
                    ? getInternalRoleInvitationTooltip()
                    : `You were invited to this team${
                        getFormattedDate()
                          ? `\non ${format(
                              new Date(normalizedData.date),
                              "MMM d, yyyy",
                            )}`
                          : ""
                      }`
                }
              >
                <span className="flex items-center gap-0.5 whitespace-nowrap">
                  <Mail
                    size={viewMode === "mini" ? 10 : 13}
                    className={
                      hasInternalRoleInvitation
                        ? "text-orange-500"
                        : "text-pink-500"
                    }
                  />
                  {getFormattedDate() && (
                    <span>{getFormattedDate()}</span>
                  )}
                </span>
              </Tooltip>
            )}
            {teamInvitationRoleName && (
              <Tooltip content={teamInvitationRoleName}>
                {viewMode === "card" ? (
                  <span className="flex items-center">
                    <UserSearch
                      size={13}
                      className="text-orange-500"
                    />
                  </span>
                ) : (
                  <span className="flex items-start gap-1">
                    <UserSearch
                      size={viewMode === "mini" ? 10 : 13}
                      className="text-orange-500 flex-shrink-0 mt-0.5"
                    />
                    <span className="leading-[1.05]">{teamInvitationRoleName}</span>
                  </span>
                )}
              </Tooltip>
            )}

            {/* Pending team application indicator (team-only = blue, combined = violet) */}
            {(effectiveVariant === "application" ||
              (pendingApplicationForTeam && !isPendingRoleApplicationForTeam)) && (
              <Tooltip
                content={
                  isCombinedApplication
                    ? `You applied to join this team and fill a role${getFormattedDate() ? `\non ${format(new Date(normalizedData.date), "MMM d, yyyy")}` : ""}`
                    : `You applied to join this team${getFormattedDate() ? `\non ${format(new Date(normalizedData.date), "MMM d, yyyy")}` : ""}`
                }
              >
                <span className="flex items-center gap-0.5 whitespace-nowrap">
                  <SendHorizontal
                    size={viewMode === "mini" ? 10 : 13}
                    className={isCombinedApplication ? "text-violet-500" : "text-info"}
                  />
                  {getFormattedDate() && (
                    <span>{getFormattedDate()}</span>
                  )}
                </span>
              </Tooltip>
            )}
            {teamApplicationRoleName && (
              <Tooltip content={teamApplicationRoleName}>
                {viewMode === "card" ? (
                  <span className="flex items-center">
                    <UserSearch
                      size={13}
                      className="text-orange-500"
                    />
                  </span>
                ) : (
                  <span className="flex items-start gap-1">
                    <UserSearch
                      size={viewMode === "mini" ? 10 : 13}
                      className="text-orange-500 flex-shrink-0 mt-0.5"
                    />
                    <span className="leading-[1.05]">{teamApplicationRoleName}</span>
                  </span>
                )}
              </Tooltip>
            )}

            {/* Team name for role variants */}
            {isRoleVariant && teamData._teamName && (
              <Tooltip content={teamData._teamName}>
                {viewMode === "card" ? (
                  <span
                    className="flex items-center cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsModalOpen(true);
                    }}
                  >
                    <Users
                      size={13}
                      className="text-primary"
                    />
                  </span>
                ) : (
                  <span
                    className="flex items-start gap-1 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsModalOpen(true);
                    }}
                  >
                    <Users
                      size={viewMode === "mini" ? 10 : 13}
                      className="text-primary flex-shrink-0 mt-0.5"
                    />
                    <span className="leading-[1.05]">{teamData._teamName}</span>
                  </span>
                )}
              </Tooltip>
            )}

            {shouldMoveSearchResultRoleApplicationIndicator &&
              isPendingRoleApplicationForTeam && (
                <Tooltip content={isPendingCombinedApplicationForTeam ? "You applied to join this team and fill a role" : "You applied for a role within this team"}>
                  <span className="flex items-center">
                    <SendHorizontal
                      size={viewMode === "mini" ? 10 : 13}
                      className={isPendingCombinedApplicationForTeam ? "text-violet-500" : "text-orange-500"}
                    />
                  </span>
                </Tooltip>
              )}

            {/* Open roles count */}
            {shouldShowOpenRoleCount && openRoleCount > 0 && (
              <Tooltip content={`${openRoleCount} open ${openRoleCount === 1 ? 'role' : 'roles'} posted in this team`}>
                <span className="flex items-center">
                  <UserSearch
                    size={viewMode === "mini" ? 10 : 13}
                    className="text-orange-500 mr-0.5"
                  />
                  <span>{openRoleCount}</span>
                </span>
              </Tooltip>
            )}

            {/* Privacy status */}
            {shouldShowVisibilityIcon() && (
              <Tooltip
                content={
                  teamData.is_public === true || teamData.isPublic === true
                    ? "Public Team - visible for everyone"
                    : "Private Team - only visible for Members"
                }
              >
                {teamData.is_public === true || teamData.isPublic === true ? (
                  <EyeIcon
                    size={viewMode === "mini" ? 10 : 13}
                    className="text-green-600"
                  />
                ) : (
                  <EyeClosed
                    size={viewMode === "mini" ? 10 : 13}
                    className="text-gray-500"
                  />
                )}
              </Tooltip>
            )}

            {/* Pending role application indicator */}
            {!shouldMoveSearchResultRoleApplicationIndicator &&
              isPendingRoleApplicationForTeam && (
              <Tooltip content="You applied for a role within this team">
                <span className="flex items-center">
                  <SendHorizontal
                    size={viewMode === "mini" ? 10 : 13}
                    className="text-orange-500"
                  />
                </span>
              </Tooltip>
              )}

            {/* User role - show for member variant when user has a role */}
            {userRole && effectiveVariant === "member" &&
              (userRole === "owner" || userRole === "admin" || (userRole === "member" && !hideMemberRoleIcon)) && (
              <span className="flex items-center text-base-content/70">
                {userRole === "owner" && (
                  <Tooltip content="You are the owner of this team">
                    <Crown
                      size={viewMode === "mini" ? 10 : 13}
                      className="text-[var(--color-role-owner-bg)]"
                    />
                  </Tooltip>
                )}
                {userRole === "admin" && (
                  <Tooltip content="You are an admin of this team">
                    <ShieldCheck
                      size={viewMode === "mini" ? 10 : 13}
                      className="text-[var(--color-role-admin-bg)]"
                    />
                  </Tooltip>
                )}
                {userRole === "member" && !hideMemberRoleIcon && (
                  <Tooltip content="You are a member of this team">
                    <User
                      size={viewMode === "mini" ? 10 : 13}
                      className="text-[var(--color-role-member-bg)]"
                    />
                  </Tooltip>
                )}
              </span>
            )}

            {/* Compact location in subtitle for mini cards — search results only (My Teams always shows location in body) */}
            {viewMode === "mini" &&
              !activeFilters.showLocation &&
              isSearchResult &&
              (teamData.city ||
                teamData.country ||
                teamData.is_remote ||
                teamData.isRemote) && (
                <span className="flex items-center gap-1">
                  {teamData.is_remote || teamData.isRemote ? (
                    <>
                      <Globe size={10} className="flex-shrink-0" />
                      <span>Remote</span>
                    </>
                  ) : (
                    <>
                      <MapPin size={10} className="flex-shrink-0" />
                      <span>
                        {[teamData.city, normalizeLocationData(teamData).countryName]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </>
                  )}
                </span>
              )}
            {showDemoIndicator && (
              <Tooltip
                content={demoTooltip}
                wrapperClassName="flex items-center gap-1 text-base-content/50"
              >
                <FlaskConical
                  size={viewMode === "mini" ? 10 : 13}
                  className="flex-shrink-0"
                />
              </Tooltip>
            )}
          </span>
        }
        hoverable
        image={getTeamImage()}
        imageFallback={getTeamInitials()}
        imageReplacement={scoreAvatarReplacement}
        imageAlt={`${teamData.name} team`}
        imageSize="medium"
        imageShape="circle"
        onClick={handleCardClick}
        truncateContent={true}
        clickTooltip={cardClickTooltip}
        contentClassName={
          viewMode === "mini"
            ? `!pt-0 !px-4 sm:!px-5 ${activeFilters.showLocation || activeFilters.showTags || activeFilters.showBadges || !isSearchResult ? "!pb-4 sm:!pb-5" : "!pb-0"}`
            : ""
        }
        headerClassName={
          viewMode === "mini"
            ? "!p-4 sm:!p-5 !pb-4 sm:!pb-5"
            : ""
        }
        imageWrapperClassName={viewMode === "mini" ? "mb-0 pb-0" : ""}
        titleClassName={
          viewMode === "mini" ? "text-base mb-0 leading-[110%]" : ""
        }
        marginClassName="mb-0"
        imageOverlay={avatarOverlay}
        imageInnerOverlay={demoAvatarOverlay}
      >
        {reminderNotice && (
          <Alert
            type="info"
            message={reminderNotice}
            onClose={() => setReminderNotice(null)}
            className="mb-4"
          />
        )}
        {error && (
          <Alert
            type="error"
            message={error}
            onClose={() => setError(null)}
            className="mb-4"
          />
        )}
        {/* Team description */}
        {viewMode !== "mini" && (
          <p className="text-base-content/80 mb-4">
            {teamData.description || "No description"}
          </p>
        )}

        <LocationDistanceTagsRow
          entity={teamData}
          entityType="team"
          distance={
            hideDistanceInfo ? null : (teamData.distance_km ?? teamData.distanceKm)
          }
          getDisplayTags={
            viewMode === "mini" && !activeFilters.showTags
              ? null
              : getDisplayTags
          }
          badges={
            viewMode === "mini" && !activeFilters.showBadges
              ? null
              : getDisplayBadges()
          }
          openRoles={openRoleNames}
          hideLocation={viewMode === "mini" && !activeFilters.showLocation && isSearchResult}
          compact={viewMode === "mini"}
          showCountryCode={viewMode !== "card" && viewMode !== "mini"}
        />
        {viewMode === "card" && teamRequestRoleName && (
          <div className="mt-2 flex items-start text-sm text-base-content/70">
            <UserSearch
              size={13}
              className="mr-1 flex-shrink-0 mt-0.5"
            />
            <span>{teamRequestRoleName}</span>
          </div>
        )}
        {viewMode === "card" && isRoleVariant && teamData._teamName && (
          <Tooltip content="Click to view team details">
            <div
              className="mt-2 flex items-start text-sm text-base-content/70 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
            >
              <Users
                size={13}
                className="mr-1 flex-shrink-0 mt-0.5"
              />
              <span>{teamData._teamName}</span>
            </div>
          </Tooltip>
        )}

        {/* Action buttons */}
        {renderActionButtons()}
      </Card>

      <ConfirmModal
        isOpen={isDeleteDialogOpen}
        onClose={closeDeleteTeamDialog}
        onConfirm={confirmDeleteTeam}
        title="Delete Team"
        loading={isDeleting}
        confirmLabel="Delete Team"
        loadingLabel="Deleting..."
        confirmVariant="error"
        confirmIcon={<Trash2 size={16} />}
      >
        <p className="text-sm text-base-content/80">
          Delete this team? This action cannot be undone.
        </p>
      </ConfirmModal>

      <ConfirmModal
        isOpen={isCancelApplicationDialogOpen}
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
          Cancel your application to {teamData.name || "this team"}? The team
          will no longer be able to review it.
        </p>
      </ConfirmModal>

      <TeamDetailsModal
        isOpen={isModalOpen}
        teamId={getTeamId()}
        initialTeamData={teamDetailsInitialTeamData}
        onClose={handleModalClose}
        onUpdate={handleTeamUpdate}
        onDelete={onDelete}
        onLeave={handleLeaveTeam}
        userRole={userRole}
        isFromSearch={isSearchResult}
        hasPendingInvitation={
          effectiveVariant === "invitation" || !!pendingInvitationForTeam
        }
        pendingInvitation={
          effectiveVariant === "invitation" || isRoleInvitationVariant
            ? invitation
            : pendingInvitationForTeam
        }
        hasPendingApplication={
          effectiveVariant === "application" || isRoleApplicationVariant || !!pendingApplicationForTeam
        }
        pendingApplication={
          effectiveVariant === "application" || isRoleApplicationVariant
            ? application
            : pendingApplicationForTeam
        }
        onViewApplicationDetails={() => setIsApplicationModalOpen(true)}
        onSendReminder={onSendReminder}
        showMatchHighlights={shouldShowTeamModalMatchHighlights}
        hideMatchData={shouldHideMatchData}
        roleMatchBadgeNames={roleMatchBadgeNames}
        matchScore={teamModalRawScore ?? null}
        matchType={teamModalMatchType}
        matchDetails={teamModalMatchDetails}
        teamMemberBadges={teamMemberBadges}
      />

      {/* Applications Modal (for team owners and admins) */}
      {effectiveVariant === "member" && (
        <TeamApplicationsModal
          isOpen={isApplicationsModalOpen}
          onClose={() => {
            setIsApplicationsModalOpen(false);
            if (onApplicationsModalClosed) {
              onApplicationsModalClosed();
            }
          }}
          teamId={teamData.id}
          applications={pendingApplications}
          onApplicationAction={handleApplicationAction}
          onRoleStatusChanged={handleVacantRoleStatusChange}
          teamName={teamData.name}
          highlightApplicationId={highlightApplicationId}
          highlightUserId={highlightApplicantId}
        />
      )}

      {/* Invites Modal (for team owners and admins) */}
      {effectiveVariant === "member" && (
        <TeamInvitesModal
          isOpen={isInvitesModalOpen}
          onClose={() => {
            setIsInvitesModalOpen(false);
            // Optionally refresh the list when closing
            fetchSentInvitations();
          }}
          teamId={teamData.id}
          invitations={pendingSentInvitations}
          onCancelInvitation={handleCancelInvitation}
          onCancelRoleInvitation={handleCancelRoleInvitation}
          teamName={teamData.name}
          highlightInvitationId={highlightInvitationId}
        />
      )}

      {isInvitationDetailsModalOpen &&
        (invitation || pendingInvitationForTeam) && (
          <TeamInvitationDetailsModal
            isOpen={isInvitationDetailsModalOpen}
            invitation={
              effectiveVariant === "invitation" || isRoleInvitationVariant
                ? invitation
                : pendingInvitationForTeam
            }
            onClose={() => setIsInvitationDetailsModalOpen(false)}
            onAccept={onAccept}
            onDecline={onDecline}
          />
        )}

      {/* Application Details Modal (works for application-variant AND search results with pendingApplicationForTeam) */}
      {isApplicationModalOpen && (application || pendingApplicationForTeam) && (
        <TeamApplicationDetailsModal
          isOpen={isApplicationModalOpen}
          application={
            effectiveVariant === "application" || isRoleApplicationVariant
              ? application
              : pendingApplicationForTeam
          }
          onClose={() => setIsApplicationModalOpen(false)}
          onCancel={onCancel || onCancelApplication}
          onSendReminder={onSendReminder}
        />
      )}

      {/* Role Details Modal (for role variants) */}
      {isRoleVariant && roleData && (
        <VacantRoleDetailsModal
          isOpen={isRoleDetailsModalOpen}
          onClose={() => setIsRoleDetailsModalOpen(false)}
          team={roleTeamData ?? null}
          role={roleData}
          matchScore={rawScore ?? null}
          matchDetails={roleModalMatchDetails}
          canManage={canManageInvitations}
          isTeamMember={Boolean(userRole) || isOwner}
          onViewApplicationDetails={
            isRoleApplicationVariant
              ? () => {
                  setIsRoleDetailsModalOpen(false);
                  setIsApplicationModalOpen(true);
                }
              : null
          }
        />
      )}

      {/* User Details Modal (for viewing inviter profile) */}
      <UserDetailsModal
        isOpen={!!selectedUserId}
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
    </>
  );
};

export default TeamCard;
