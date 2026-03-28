import React, { useState, useEffect, useCallback } from "react";
import Card from "../common/Card";
import Button from "../common/Button";
import Tooltip from "../common/Tooltip";
import {
  Users,
  UserSearch,
  EyeClosed,
  EyeIcon,
  Tag,
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
} from "lucide-react";
import TeamDetailsModal from "./TeamDetailsModal";
import UserDetailsModal from "../users/UserDetailsModal";
import TeamApplicationDetailsModal from "./TeamApplicationDetailsModal";
import VacantRoleDetailsModal from "./VacantRoleDetailsModal";
import TeamInvitesModal from "./TeamInvitesModal";
import TeamInvitationDetailsModal from "./TeamInvitationDetailsModal";
import { teamService } from "../../services/teamService";
import { vacantRoleService } from "../../services/vacantRoleService";
import { userService } from "../../services/userService";
import { useAuth } from "../../contexts/AuthContext";
import Alert from "../common/Alert";
import NotificationBadge from "../common/NotificationBadge";
import SearchResultTypeOverlay from "../common/SearchResultTypeOverlay";
import TeamApplicationsModal from "./TeamApplicationsModal";
import { format } from "date-fns";
import LocationDistanceTagsRow from "../common/LocationDistanceTagsRow";
import { getMatchTier } from "../../utils/matchScoreUtils";
import { getResultMatchScore } from "../../utils/teamMatchUtils";
import { calculateDistanceKm } from "../../utils/locationUtils";

const teamMemberBadgesCache = new Map();
const viewerRoleProfileCache = new Map();
const MATCH_WEIGHTS = {
  tags: 0.4,
  badges: 0.3,
  distance: 0.3,
};
const LOCATION_GRACE_KM = 20;
const LOCATION_GRACE_SCORE = 0.25;

const extractBadgeRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
};

const extractProfilePayload = (response) => {
  const payload = response?.data ?? response;

  if (!payload) return null;
  if (payload?.success !== undefined) return payload?.data ?? null;

  return payload?.data?.data ?? payload?.data ?? payload;
};

const extractListPayload = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};

const buildTagLookup = (tagData) => {
  const nextMap = new Map();

  for (const tag of tagData) {
    nextMap.set(Number(tag.id), {
      badgeCredits: Number(tag.badge_credits ?? tag.badgeCredits ?? 0),
    });
  }

  return nextMap;
};

const buildBadgeLookup = (badgeData) => {
  const nextMap = new Map();

  for (const badge of badgeData) {
    const name = (badge.badgeName ?? badge.badge_name ?? badge.name ?? "")
      .trim()
      .toLowerCase();
    const credits = Number(
      badge.totalCredits ?? badge.total_credits ?? badge.credits ?? 0,
    );
    const existing = nextMap.get(name);

    nextMap.set(name, {
      totalCredits: (existing?.totalCredits || 0) + credits,
    });
  }

  return nextMap;
};

const roundMatchValue = (value) => Math.round(value * 100) / 100;

const computeRoleUserMatch = ({
  role,
  tags,
  badges,
  user,
  userTagMap,
  userBadgeMap,
}) => {
  if (!role || !user) return null;

  const requiredTagIds = tags
    .map((tag) => Number(tag.tagId ?? tag.tag_id ?? tag.id))
    .filter(Number.isFinite);
  const requiredBadgeKeys = badges
    .map((badge) =>
      (badge.name ?? badge.badgeName ?? badge.badge_name ?? "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);

  const matchingTags = requiredTagIds.filter((id) => userTagMap.has(id)).length;
  const matchingBadges = requiredBadgeKeys.filter((key) => userBadgeMap.has(key)).length;

  const tagScore =
    requiredTagIds.length > 0 ? matchingTags / requiredTagIds.length : 0.5;
  const badgeScore =
    requiredBadgeKeys.length > 0
      ? matchingBadges / requiredBadgeKeys.length
      : 0.5;

  const isRemote = role.isRemote ?? role.is_remote;
  const maxDistanceKm = Number(role.maxDistanceKm ?? role.max_distance_km) || 50;

  let distanceScore = 0.5;
  let distanceKm = null;
  let isWithinRange = null;

  if (isRemote) {
    distanceScore = 1;
    isWithinRange = true;
  } else {
    distanceKm = calculateDistanceKm(user, role);

    if (distanceKm !== null) {
      if (distanceKm <= maxDistanceKm) {
        distanceScore = 1;
        isWithinRange = true;
      } else if (distanceKm <= maxDistanceKm + LOCATION_GRACE_KM) {
        distanceScore = LOCATION_GRACE_SCORE;
        isWithinRange = false;
      } else {
        distanceScore = 0;
        isWithinRange = false;
      }
    }
  }

  const matchScore =
    MATCH_WEIGHTS.tags * tagScore +
    MATCH_WEIGHTS.badges * badgeScore +
    MATCH_WEIGHTS.distance * distanceScore;

  return {
    matchScore: roundMatchValue(matchScore),
    matchDetails: {
      tagScore: roundMatchValue(tagScore),
      badgeScore: roundMatchValue(badgeScore),
      distanceScore: roundMatchValue(distanceScore),
      matchingTags,
      totalRequiredTags: requiredTagIds.length,
      matchingBadges,
      totalRequiredBadges: requiredBadgeKeys.length,
      distanceKm: distanceKm !== null ? Math.round(distanceKm) : null,
      maxDistanceKm,
      isWithinRange,
    },
  };
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
  listTagsWidthClassName = "",
  listBadgesWidthClassName = "",
  hideDistanceInfo = false,
  hideMemberRoleIcon = false,
  disableListEdgeRounding = false,
  listClassName = "",

  // View mode
  viewMode = "card",
  activeFilters = {},
  showSearchResultTypeOverlay = false,

  // Loading state
  loading = false,

  autoOpenApplications = false,
  highlightApplicantId = null,
  onApplicationsModalClosed,
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
          is_remote: role.isRemote ?? role.is_remote,
          city: role.city,
          country: role.country,
          tags: role.tags ?? [],
          badges: role.badges ?? [],
          _teamName: appTeam.name ?? null,
          matchScore: null,
          matchDetails: null,
          id: undefined,
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
          is_remote: role.isRemote ?? role.is_remote,
          city: role.city,
          country: role.country,
          tags: role.tags ?? [],
          badges: role.badges ?? [],
          _teamName: invTeam.name ?? null,
          matchScore: null,
          matchDetails: null,
          id: undefined,
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

  const normalizedData = getNormalizedData();
  const roleData = isRoleApplicationVariant
    ? application?.role ?? null
    : isRoleInvitationVariant
      ? invitation?.role ?? null
      : null;
  const roleTeamData = isRoleApplicationVariant
    ? application?.team ?? null
    : isRoleInvitationVariant
      ? invitation?.team ?? null
      : null;
  const roleDataId = isRoleApplicationVariant
    ? application?.role?.id ?? application?.roleId ?? null
    : isRoleInvitationVariant
      ? invitation?.role?.id ?? invitation?.roleId ?? null
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
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [teamData, setTeamData] = useState(normalizedData.team);
  const { user, isAuthenticated } = useAuth();
  const [pendingApplications, setPendingApplications] = useState([]);
  const [isApplicationsModalOpen, setIsApplicationsModalOpen] = useState(false);
  const [pendingSentInvitations, setPendingSentInvitations] = useState([]);
  const [isInvitesModalOpen, setIsInvitesModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [responses, setResponses] = useState({});
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
    effectiveVariant,
  ]);

  // Fetch pending applications (for team owners and admins)
  const fetchPendingApplications = useCallback(async () => {
    if (canManageInvitations && teamData?.id && effectiveVariant === "member") {
      try {
        const response = await teamService.getTeamApplications(teamData.id);
        setPendingApplications(response.data || []);
      } catch (error) {
        console.error("Error fetching applications:", error);
      }
    }
  }, [canManageInvitations, teamData?.id, effectiveVariant]);

  // Fetch sent invitations (for team owners and admins)
  const fetchSentInvitations = useCallback(async () => {
    if (canManageInvitations && teamData?.id && effectiveVariant === "member") {
      try {
        const response = await teamService.getTeamSentInvitations(teamData.id);
        setPendingSentInvitations(response.data || []);
      } catch (error) {
        console.error("Error fetching sent invitations:", error);
        setPendingSentInvitations([]);
      }
    }
  }, [canManageInvitations, teamData?.id, effectiveVariant]);

  useEffect(() => {
    fetchPendingApplications();
  }, [fetchPendingApplications]);

  // Fetch sent invitations
  useEffect(() => {
    fetchSentInvitations();
  }, [fetchSentInvitations]);

  useEffect(() => {
    const fetchCompleteTeamData = async () => {
      if (
        teamData &&
        teamData.id &&
        (effectiveVariant === "member" ||
          effectiveVariant === "invitation" ||
          effectiveVariant === "application")
      ) {
        try {
          const shouldFetchMemberBadges =
            !hasDisplayableBadges(teamData.badges);

          const [response, memberBadges] = await Promise.all([
            teamService.getTeamById(teamData.id),
            shouldFetchMemberBadges
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
                ),
          ]);
          const fullTeam = response?.data?.data ?? response?.data;

          console.log("DEBUG is_public:", {
            teamId: fullTeam?.id,
            teamName: fullTeam?.name,
            is_public_raw: fullTeam?.is_public,
            is_public_type: typeof fullTeam?.is_public,
            is_public_normalized: fullTeam?.is_public === true,
          });

          if (fullTeam) {
            setTeamData((prev) => {
              const preservedDistanceKm = resolveDistanceKm({
                preferredDistance: prev?.distance_km ?? prev?.distanceKm,
                fallbackDistance: fullTeam.distance_km ?? fullTeam.distanceKm,
                viewerEntity: viewerDistanceSource ?? user,
                targetEntity: fullTeam,
              });
              const resolvedBadges =
                memberBadges.length > 0
                  ? memberBadges
                  : hasDisplayableBadges(fullTeam.badges)
                    ? fullTeam.badges
                    : prev?.badges;

              return {
                ...prev,
                ...fullTeam,
                is_public:
                  fullTeam.is_public === true || fullTeam.is_public === "true",
                tags: Array.isArray(fullTeam.tags) ? fullTeam.tags : prev.tags,
                badges: resolvedBadges,
                distance_km: preservedDistanceKm,
                distanceKm: preservedDistanceKm,
              };
            });

            // Compute role from members list
            if (user?.id && Array.isArray(fullTeam.members)) {
              const me = fullTeam.members.find(
                (m) => (m.user_id ?? m.userId) === user.id,
              );
              setUserRole(me?.role ?? null);
            }
          }
        } catch (error) {
          console.error("Error fetching complete team data:", error);
        }
      }
    };

    fetchCompleteTeamData();
  }, [teamData?.id, effectiveVariant, user, viewerDistanceSource]);

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
  }, [isSearchResult, isAuthenticated, teamData?.id]);

  // Check if user has a pending invitation for this team (for search results)
  useEffect(() => {
    const checkPendingInvitation = async () => {
      if (!isSearchResult || !isAuthenticated || !teamData?.id) return;

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
  }, [isSearchResult, isAuthenticated, teamData?.id]);

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
        const [viewerProfileRes, detailsRes] = await Promise.allSettled([
          getViewerRoleProfile(user.id, user),
          vacantRoleService.getVacantRoleById(roleTeamId, roleDataId),
        ]);

        if (viewerProfileRes.status !== "fulfilled") {
          throw viewerProfileRes.reason;
        }

        const viewerProfile = viewerProfileRes.value;
        const hydratedRole =
          detailsRes.status === "fulfilled"
            ? extractProfilePayload(detailsRes.value)
            : null;
        const effectiveRole = hydratedRole ?? roleData ?? null;
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
  }, [isRoleVariant, showMatchScore, roleDataId, roleTeamId, roleData, user]);

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
      className="block max-w-full truncate bg-transparent p-0 text-left text-inherit [font:inherit] hover:underline focus:outline-none"
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
    // Add this debug line
    console.log("Team avatar debug:", {
      name: teamData.name,
      teamavatar_url: teamData.teamavatar_url,
      teamavatarUrl: teamData.teamavatarUrl,
    });

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

  const openRoleCount = teamData.open_role_count ?? teamData.openRoleCount ?? 0;

  const getFormattedDate = () => {
    const date = normalizedData.date;
    if (!date) return null;
    try {
      return format(new Date(date), "MM/dd/yy");
    } catch (e) {
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
    } catch (e) {
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
            } catch (e) {
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
          } catch (e) {
            displayTags = teamData.tags
              .split(",")
              .map((name) => ({ name: name.trim() }));
          }
        }
      }
    } catch (e) {
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

  const handleUserClick = (userId) => {
    if (userId) {
      setSelectedUserId(userId);
    }
  };

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

  const handleResponseChange = (id, response) => {
    setResponses((prev) => ({
      ...prev,
      [id]: response,
    }));
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
    await teamService.handleTeamApplication(applicationId, action, response, fillRole);
    await fetchPendingApplications();
    if (onUpdate) {
      const updatedTeam = await teamService.getTeamById(teamData.id);
      onUpdate(updatedTeam.data);
    }
  };

  const handleVacantRoleStatusChange = async () => {
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

  // Member variant handlers
  const handleDeleteClick = async (e) => {
    e.stopPropagation();
    if (
      !window.confirm(
        "Are you sure you want to delete this team? This action cannot be undone.",
      )
    ) {
      return;
    }
    try {
      setIsDeleting(true);
      await teamService.deleteTeam(teamData.id);
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
    console.log("TeamCard handleLeaveTeam called with teamId:", teamId);
    if (onLeave) onLeave(teamId);
  };

  // Application variant handlers
  const handleCancelApplication = async (e) => {
    e.stopPropagation();
    if (
      !window.confirm(
        "Are you sure you want to cancel your application to this team?",
      )
    ) {
      return;
    }
    setActionLoading("cancel");
    try {
      const cancelHandler = onCancel || onCancelApplication;
      if (cancelHandler) {
        await cancelHandler(normalizedData.id);
      }
    } catch (err) {
      console.error("Error canceling application:", err);
      setError("Failed to cancel application. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendReminder = async (e) => {
    e.stopPropagation();
    setActionLoading("reminder");
    try {
      if (onSendReminder) {
        await onSendReminder(normalizedData.id);
      } else {
        alert("Reminder feature coming soon!");
      }
    } catch (err) {
      console.error("Error sending reminder:", err);
      setError("Failed to send reminder. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  // Invitation variant handlers
  const handleAccept = async () => {
    if (!onAccept) return;
    try {
      setActionLoading("accept");
      const invitationId = invitation?.id;
      const responseMessage = responses[invitationId] || "";
      await onAccept(invitationId, responseMessage, false);
      // Clear the response after successful action
      setResponses((prev) => {
        const newResponses = { ...prev };
        delete newResponses[invitationId];
        return newResponses;
      });
    } catch (error) {
      console.error("Error accepting invitation:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async () => {
    if (!onDecline) return;
    try {
      setActionLoading("decline");
      const invitationId = invitation?.id;
      const responseMessage = responses[invitationId] || "";
      await onDecline(invitationId, responseMessage);
      // Clear the response after successful action
      setResponses((prev) => {
        const newResponses = { ...prev };
        delete newResponses[invitationId];
        return newResponses;
      });
    } catch (error) {
      console.error("Error declining invitation:", error);
    } finally {
      setActionLoading(null);
    }
  };

  // ============ Render Helpers ============

  const renderBadges = () => {
    const formattedDate = getFormattedDate();
    const displayTags = getDisplayTags();
    const isPublic = teamData.is_public === true || teamData.isPublic === true;

    return (
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Tags display (member / invitation / application) */}
        {(
          effectiveVariant === "member" ||
          effectiveVariant === "invitation" ||
          effectiveVariant === "application" ||
          effectiveVariant === "role_application" ||
          effectiveVariant === "role_invitation"
        ) &&
          displayTags.length > 0 && (
            <div className="flex items-start text-sm text-base-content/70">
              <Tag size={16} className="mr-1 flex-shrink-0 mt-0.5" />
              <span>
                {(() => {
                  const maxVisible = 5;
                  const visibleTags = displayTags.slice(0, maxVisible);
                  const remainingCount = displayTags.length - maxVisible;

                  return (
                    <>
                      {visibleTags.map((tag, index) => {
                        const tagName =
                          typeof tag === "string"
                            ? tag
                            : tag.name || tag.tag || "";
                        return (
                          <span key={index}>
                            {index > 0 ? ", " : ""}
                            {tagName}
                          </span>
                        );
                      })}
                      {remainingCount > 0 && ` +${remainingCount}`}
                    </>
                  );
                })()}
              </span>
            </div>
          )}
      </div>
    );
  };

  const renderActionButtons = () => {
    // If user has a pending invitation (search or invitation variant)

    // Search page: always show View Details button on the card
    if (isSearchResult) {
      return null;
      // return (
      //   <div className="mt-auto">
      //     <Button
      //       variant="primary"
      //       size={viewMode === "mini" ? "xs" : "sm"}
      //       className="w-full"
      //       onClick={(e) => {
      //         e.stopPropagation();
      //         setIsModalOpen(true);
      //       }}
      //     >
      //       View Details
      //     </Button>
      //   </div>
      // );
    }

    if (
      effectiveVariant === "invitation" ||
      isRoleInvitationVariant ||
      pendingInvitationForTeam
    ) {
      return (
        <div className="mt-auto pt-4">
          {" "}
          {/* pt-4: spacing from tags row — TODO: revert to pt-0 when LocationDistanceTagsRow mb-4 is restored */}
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
          {" "}
          {/* pt-4: spacing from tags row — TODO: revert to pt-0 when LocationDistanceTagsRow mb-4 is restored */}
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
        {" "}
        {/* pt-4: spacing from tags row — TODO: revert to pt-0 when LocationDistanceTagsRow mb-4 is restored */}
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
                count={pendingApplications.length}
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
                count={pendingSentInvitations.length}
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

  console.log("TeamCard data:", teamData, "distance_km:", teamData.distance_km);

  // ============ MATCH SCORE ============
  // Role-based cards should always prefer the role match over any team-level match.
  const rawScore = showMatchScore
    ? (
        isRoleVariant
          ? roleCardRawScore
          : getResultMatchScore(normalizedData.team)
      )
    : null;
  const showScore =
    showMatchScore &&
    rawScore != null &&
    (isRoleVariant || rawScore > 0);

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
    const hasScoreBreakdown =
      matchDetails &&
      ((matchDetails.tagScore ?? matchDetails.tag_score) != null ||
        (matchDetails.badgeScore ?? matchDetails.badge_score) != null ||
        (matchDetails.distanceScore ?? matchDetails.distance_score) != null);

    if (hasScoreBreakdown) {
      const tagPct = Math.round(
        (matchDetails.tagScore ?? matchDetails.tag_score ?? 0) * 100,
      );
      const badgePct = Math.round(
        (matchDetails.badgeScore ?? matchDetails.badge_score ?? 0) * 100,
      );
      const distPct = Math.round(
        (matchDetails.distanceScore ?? matchDetails.distance_score ?? 0) * 100,
      );
      matchTooltipText = `${matchTier.pct}% match — Tags ${tagPct}% · Badges ${badgePct}% · Location ${distPct}%`;
    } else if (matchDetails) {
      const sharedTags =
        matchDetails.sharedTagCount ?? matchDetails.shared_tag_count ?? 0;
      const sharedBadges =
        matchDetails.sharedBadgeCount ?? matchDetails.shared_badge_count ?? 0;
      matchTooltipText =
        sharedTags > 0 || sharedBadges > 0
          ? `${matchTier.pct}% profile match — ${sharedTags} shared tags, ${sharedBadges} shared badges`
          : `${matchTier.pct}% profile match`;
    } else {
      const sharedTagCount =
        normalizedData.team?.sharedTagCount ??
        normalizedData.team?.shared_tag_count ?? 0;
      matchTooltipText =
        sharedTagCount > 0
          ? `${matchTier.pct}% profile match — ${sharedTagCount} shared focus areas`
          : `${matchTier.pct}% profile match`;
    }

    const iconSizeSubtitle =
      viewMode === "list" ? 10 : viewMode === "mini" ? 11 : 12;
    scoreSubtitleItem = (
      <Tooltip content={matchTooltipText}>
        <span className="flex items-center gap-0.5">
          <matchTier.Icon size={iconSizeSubtitle} className={matchTier.text} />
          <span className="text-base-content">{matchTier.pct}%</span>
        </span>
      </Tooltip>
    );

    if (isRoleVariant) {
      const isListMatchBadge = viewMode === "list";
      const isCompactMatchBadge =
        isListMatchBadge || viewMode === "mini";
      const matchBadgeIconSize = isListMatchBadge
        ? 7
        : isCompactMatchBadge
          ? 11
          : 13;

      matchOverlay = (
        <Tooltip content={matchTooltipText}>
          <div
            aria-label={matchTooltipText}
            className={`absolute ${isListMatchBadge ? "-top-0.5 -left-0.5" : "-top-1 -left-1"} z-10 rounded-full ring-2 ring-white flex items-center justify-center ${matchTier.bg} text-white`}
            style={{
              width: isListMatchBadge
                ? "14px"
                : isCompactMatchBadge
                  ? "22px"
                  : "26px",
              height: isListMatchBadge
                ? "14px"
                : isCompactMatchBadge
                  ? "22px"
                  : "26px",
            }}
          >
            <UserSearch
              size={matchBadgeIconSize}
              className="text-white"
              strokeWidth={2.5}
            />
          </div>
        </Tooltip>
      );
    } else if (isTeamInvitationOrApplicationVariant) {
      const isListMatchBadge = viewMode === "list";
      const isCompactMatchBadge =
        isListMatchBadge || viewMode === "mini";
      const matchBadgeIconSize = isListMatchBadge
        ? 7
        : isCompactMatchBadge
          ? 11
          : 13;

      matchOverlay = (
        <Tooltip content={matchTooltipText}>
          <div
            aria-label={matchTooltipText}
            className={`absolute ${isListMatchBadge ? "-top-0.5 -left-0.5" : "-top-1 -left-1"} z-10 rounded-full ring-2 ring-white flex items-center justify-center ${matchTier.bg} text-white`}
            style={{
              width: isListMatchBadge
                ? "14px"
                : isCompactMatchBadge
                  ? "22px"
                  : "26px",
              height: isListMatchBadge
                ? "14px"
                : isCompactMatchBadge
                  ? "22px"
                  : "26px",
            }}
          >
            <Users
              size={matchBadgeIconSize}
              className="text-white"
              strokeWidth={2.5}
            />
          </div>
        </Tooltip>
      );
    } else {
      matchOverlay = (
        <div
          className={`absolute -top-0.5 -left-0.5 rounded-full ring-2 ring-white flex items-center justify-center ${matchTier.bg} ${viewMode === "list" ? "w-[14px] h-[14px]" : "w-5 h-5"}`}
        >
          <matchTier.Icon
            size={viewMode === "list" ? 7 : 10}
            className="text-white"
            strokeWidth={2.5}
          />
        </div>
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

  // ============ LIST VIEW ============

  if (viewMode === "list") {
    const locationText =
      teamData.is_remote || teamData.isRemote
        ? "Remote"
        : [teamData.city, teamData.country].filter(Boolean).join(", ");
    const distance = teamData.distance_km ?? teamData.distanceKm;
    const showDistance =
      !hideDistanceInfo &&
      distance != null &&
      distance < 999999 &&
      !(teamData.is_remote || teamData.isRemote);

    const tagNames = (teamData.tags || [])
      .map((t) => (typeof t === "string" ? t : t.name || t.tag || ""))
      .filter(Boolean);
    const maxInlineTags = 3;
    const visibleTags = tagNames.slice(0, maxInlineTags);
    const remainingTags = tagNames.length - maxInlineTags;
    const tagsSummary =
      visibleTags.length > 0
        ? visibleTags.join(", ") +
          (remainingTags > 0 ? ` +${remainingTags}` : "")
        : "";

    const badgeNames = getDisplayBadges()
      .map((badge) => (typeof badge === "string" ? badge : badge.name || ""))
      .filter(Boolean);
    const maxInlineBadges = 3;
    const visibleBadges = badgeNames.slice(0, maxInlineBadges);
    const remainingBadges = badgeNames.length - maxInlineBadges;
    const badgesSummary =
      visibleBadges.length > 0
        ? visibleBadges.join(", ") + (remainingBadges > 0 ? ` +${remainingBadges}` : "")
        : "";

    const memberCount = getMemberCount();
    const maxMembers = getMaxMembers();
    const shouldReserveMyTeamsActionSlot = !isSearchResult;
    const memberCountListItem = shouldShowMemberCountInList ? (
      <span className="flex items-center gap-0.5">
        <Users size={11} />
        <span>{memberCount}/{maxMembers}</span>
      </span>
    ) : null;

    const subtitleContent = (
      <span className="flex min-w-0 flex-nowrap items-center gap-1 overflow-hidden whitespace-nowrap text-base-content/60">
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
                size={11}
                className={hasInternalRoleInvitation ? "text-orange-500" : "text-pink-500"}
              />
              {getFormattedDate() && <span>{getFormattedDate()}</span>}
            </span>
          </Tooltip>
        )}
        {teamInvitationRoleName && (
          <Tooltip
            content={teamInvitationRoleName}
            wrapperClassName="min-w-0 max-w-full overflow-hidden"
          >
            <span className="flex min-w-0 max-w-full items-center gap-0.5 overflow-hidden">
              <UserSearch size={12} className="flex-shrink-0 text-orange-500" />
              <span className="truncate">{teamInvitationRoleName}</span>
            </span>
          </Tooltip>
        )}
        {(effectiveVariant === "application" || isRoleApplicationVariant || pendingApplicationForTeam) && (
          <Tooltip
            content={
              isPendingRoleApplicationForTeam
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
              <SendHorizontal size={11} className={(isRoleApplicationVariant || isPendingRoleApplicationForTeam) ? "text-orange-500" : "text-info"} />
              {getFormattedDate() && <span>{getFormattedDate()}</span>}
            </span>
          </Tooltip>
        )}
        {teamApplicationRoleName && (
          <Tooltip
            content={teamApplicationRoleName}
            wrapperClassName="min-w-0 max-w-full overflow-hidden"
          >
            <span className="flex min-w-0 max-w-full items-center gap-0.5 overflow-hidden">
              <UserSearch size={12} className="flex-shrink-0 text-orange-500" />
              <span className="truncate">{teamApplicationRoleName}</span>
            </span>
          </Tooltip>
        )}
        {shouldShowOpenRoleCount && openRoleCount > 0 && (
          <Tooltip content={`${openRoleCount} open ${openRoleCount === 1 ? 'role' : 'roles'} posted in this team`}>
            <span className="flex items-center">
              <UserSearch size={12} className="text-orange-500 mr-0.5" />
              <span>{openRoleCount}</span>
            </span>
          </Tooltip>
        )}
        {isRoleVariant && teamData._teamName && (
          <Tooltip content="Click to view team details" wrapperClassName="min-w-0 overflow-hidden flex-1">
            <span
              className="flex items-center gap-0.5 min-w-0 overflow-hidden cursor-pointer w-full"
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
            >
              <Users size={11} className="flex-shrink-0 text-primary" />
              <span className="truncate">{teamData._teamName}</span>
            </span>
          </Tooltip>
        )}
        {userRole && effectiveVariant === "member" && (
          <>
            {userRole === "owner" && (
              <Tooltip content="You are the owner of this team">
                <Crown size={11} className="text-[var(--color-role-owner-bg)]" />
              </Tooltip>
            )}
            {userRole === "admin" && (
              <Tooltip content="You are an admin of this team">
                <ShieldCheck size={11} className="text-[var(--color-role-admin-bg)]" />
              </Tooltip>
            )}
            {userRole === "member" && !hideMemberRoleIcon && (
              <Tooltip content="You are a member of this team">
                <User size={11} className="text-[var(--color-role-member-bg)]" />
              </Tooltip>
            )}
          </>
        )}
        {shouldShowVisibilityIcon() && (
          <Tooltip content={teamData.is_public === true || teamData.isPublic === true ? "Public Team - visible for everyone" : "Private Team - only visible for Members"}>
            {teamData.is_public === true || teamData.isPublic === true ? (
              <EyeIcon size={11} className="text-green-600" />
            ) : (
              <EyeClosed size={11} className="text-gray-500" />
            )}
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
          listEdgeRounding={!disableListEdgeRounding}
      >
          <div
            className={`box-border w-56 flex-shrink-0 flex items-center gap-3 overflow-hidden ${listLocationWidthClassName} ${listLocationInsetClassName}`}
          >
            {showDistance && (
              <div className="w-16 flex-shrink-0 overflow-hidden">
                <div className="text-xs text-base-content flex items-center gap-1 overflow-hidden">
                  <Tooltip content={`${Math.round(distance)} km away from you`}>
                    <div className="flex items-center gap-1">
                      <Ruler size={11} className="flex-shrink-0" />
                      <span className="whitespace-nowrap">{Math.round(distance)} km</span>
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
                    {teamData.is_remote || teamData.isRemote ? (
                      <Globe size={11} className="flex-shrink-0" />
                    ) : (
                      <MapPin size={11} className="flex-shrink-0" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{locationText}</span>
                  </div>
                </Tooltip>
              </div>
            )}
          </div>
          <div
            className={`w-52 flex-shrink-0 text-xs text-base-content/60 hidden sm:flex items-center gap-1 overflow-hidden ${listTagsWidthClassName}`}
          >
            {tagsSummary && (
              <Tooltip content={tagNames.join(", ")} wrapperClassName="flex items-center gap-1 min-w-0 overflow-hidden w-full">
                <Tag size={11} className="flex-shrink-0" />
                <span className="truncate">{tagsSummary}</span>
              </Tooltip>
            )}
          </div>
          <div
            className={`w-48 flex-shrink-0 text-xs text-base-content/60 hidden sm:flex items-center gap-1 overflow-hidden ${listBadgesWidthClassName}`}
          >
            {badgesSummary && (
              <Tooltip content={badgeNames.join(", ")} wrapperClassName="flex items-center gap-1 min-w-0 overflow-hidden w-full">
                <Award size={11} className="flex-shrink-0" />
                <span className="truncate">{badgesSummary}</span>
              </Tooltip>
            )}
          </div>
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
                    count={pendingApplications.length}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsApplicationsModalOpen(true);
                    }}
                  />
                  <NotificationBadge
                    variant="invitation"
                    count={pendingSentInvitations.length}
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
          isFromSearch={isSearchResult || effectiveVariant !== "member"}
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
          showMatchHighlights={shouldShowTeamModalMatchHighlights}
          matchScore={teamModalRawScore ?? null}
          matchType={teamModalMatchType}
          matchDetails={teamModalMatchDetails}
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
            teamName={teamData.name}
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
            className={`flex text-base-content/70 ${isRoleVariant ? `flex-col leading-snug ${viewMode === "mini" ? "text-xs gap-y-px w-full" : "text-sm gap-y-px"}` : `items-center flex-wrap leading-snug ${viewMode === "mini" ? "text-xs gap-x-1 gap-y-px w-full" : "text-sm gap-x-1.5 gap-y-px"}`}`}
          >
            {/* Score + date on the same row for role variants */}
            {isRoleVariant ? (
              <span className="flex items-center gap-1.5 flex-nowrap">
                {scoreSubtitleItem}
                {getFormattedDate() && (
                  <Tooltip content={getRoleStatusTooltip()}>
                    <span className="flex items-center gap-0.5 whitespace-nowrap">
                      {isRoleInvitationVariant ? (
                        <Mail
                          size={viewMode === "mini" ? 11 : 12}
                          className={`flex-shrink-0 ${hasInternalRoleInvitation ? "text-orange-500" : "text-pink-500"}`}
                        />
                      ) : (
                        <SendHorizontal size={viewMode === "mini" ? 11 : 12} className="flex-shrink-0 text-orange-500" />
                      )}
                      <span>{getFormattedDate()}</span>
                    </span>
                  </Tooltip>
                )}
              </span>
            ) : (
              scoreSubtitleItem
            )}

            {/* Members count for member search results */}
            {!isRoleVariant && shouldShowMemberCountInSubtitle && (
              <span className="flex items-center">
                <Users
                  size={viewMode === "mini" ? 12 : 14}
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
                <span className="flex items-center">
                  <Mail
                    size={viewMode === "mini" ? 12 : 14}
                    className={
                      hasInternalRoleInvitation
                        ? "text-orange-500"
                        : "text-pink-500"
                    }
                  />
                  {getFormattedDate() && (
                    <span className="ml-0.5">{getFormattedDate()}</span>
                  )}
                </span>
              </Tooltip>
            )}
            {teamInvitationRoleName && (
              <Tooltip content={teamInvitationRoleName}>
                {viewMode === "card" ? (
                  <span className="flex items-center">
                    <UserSearch
                      size={14}
                      className="text-orange-500"
                    />
                  </span>
                ) : (
                  <span className="flex items-start">
                    <UserSearch
                      size={viewMode === "mini" ? 12 : 14}
                      className="text-orange-500 mr-0.5 flex-shrink-0 mt-0.5"
                    />
                    <span className="leading-[1.15]">{teamInvitationRoleName}</span>
                  </span>
                )}
              </Tooltip>
            )}

            {/* Pending regular team-join application indicator */}
            {(effectiveVariant === "application" ||
              (pendingApplicationForTeam && !isPendingRoleApplicationForTeam)) && (
              <Tooltip
                content={`You applied to join this team${
                  getFormattedDate()
                    ? `\non ${format(
                        new Date(normalizedData.date),
                        "MMM d, yyyy",
                      )}`
                    : ""
                }`}
              >
                <span className="flex items-center">
                  <SendHorizontal
                    size={viewMode === "mini" ? 12 : 14}
                    className="text-info"
                  />
                  {getFormattedDate() && (
                    <span className="ml-0.5">{getFormattedDate()}</span>
                  )}
                </span>
              </Tooltip>
            )}
            {teamApplicationRoleName && (
              <Tooltip content={teamApplicationRoleName}>
                {viewMode === "card" ? (
                  <span className="flex items-center">
                    <UserSearch
                      size={14}
                      className="text-orange-500"
                    />
                  </span>
                ) : (
                  <span className="flex items-start">
                    <UserSearch
                      size={viewMode === "mini" ? 12 : 14}
                      className="text-orange-500 mr-0.5 flex-shrink-0 mt-0.5"
                    />
                    <span className="leading-[1.15]">{teamApplicationRoleName}</span>
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
                      size={14}
                      className="text-primary"
                    />
                  </span>
                ) : (
                  <span
                    className="flex items-start cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsModalOpen(true);
                    }}
                  >
                    <Users
                      size={viewMode === "mini" ? 12 : 14}
                      className="text-primary mr-0.5 flex-shrink-0 mt-0.5"
                    />
                    <span className="leading-[1.15]">{teamData._teamName}</span>
                  </span>
                )}
              </Tooltip>
            )}

            {shouldMoveSearchResultRoleApplicationIndicator &&
              isPendingRoleApplicationForTeam && (
                <Tooltip content="You applied for a role within this team">
                  <span className="flex items-center">
                    <SendHorizontal
                      size={viewMode === "mini" ? 12 : 14}
                      className="text-orange-500"
                    />
                  </span>
                </Tooltip>
              )}

            {/* Open roles count */}
            {shouldShowOpenRoleCount && openRoleCount > 0 && (
              <Tooltip content={`${openRoleCount} open ${openRoleCount === 1 ? 'role' : 'roles'} posted in this team`}>
                <span className="flex items-center">
                  <UserSearch
                    size={viewMode === "mini" ? 12 : 14}
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
                    size={viewMode === "mini" ? 12 : 14}
                    className="text-green-600"
                  />
                ) : (
                  <EyeClosed
                    size={viewMode === "mini" ? 12 : 14}
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
                    size={viewMode === "mini" ? 12 : 14}
                    className="text-orange-500"
                  />
                </span>
              </Tooltip>
              )}

            {/* User role - show for member variant when user has a role */}
            {userRole && effectiveVariant === "member" && (
              <span className="flex items-center text-base-content/70">
                {userRole === "owner" && (
                  <Tooltip content="You are the owner of this team">
                    <Crown
                      size={viewMode === "mini" ? 12 : 14}
                      className="text-[var(--color-role-owner-bg)]"
                    />
                  </Tooltip>
                )}
                {userRole === "admin" && (
                  <Tooltip content="You are an admin of this team">
                    <ShieldCheck
                      size={viewMode === "mini" ? 12 : 14}
                      className="text-[var(--color-role-admin-bg)]"
                    />
                  </Tooltip>
                )}
                {userRole === "member" && !hideMemberRoleIcon && (
                  <Tooltip content="You are a member of this team">
                    <User
                      size={viewMode === "mini" ? 12 : 14}
                      className="text-[var(--color-role-member-bg)]"
                    />
                  </Tooltip>
                )}
              </span>
            )}

            {/* Compact location in subtitle for mini cards */}
            {viewMode === "mini" &&
              !activeFilters.showLocation &&
              (teamData.city ||
                teamData.country ||
                teamData.is_remote ||
                teamData.isRemote) && (
                <span className="flex items-start">
                  {teamData.is_remote || teamData.isRemote ? (
                    <>
                      <Globe size={12} className="mr-0.5 flex-shrink-0 mt-0.5" />
                      <span>Remote</span>
                    </>
                  ) : (
                    <>
                      <MapPin size={12} className="mr-0.5 flex-shrink-0 mt-0.5" />
                      <span>
                        {[teamData.city, teamData.country]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </>
                  )}
                </span>
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
            ? `!p-4 sm:!p-5 ${activeFilters.showLocation || activeFilters.showTags || activeFilters.showBadges ? "!pb-4" : "!pb-0"}`
            : ""
        }
        imageWrapperClassName={viewMode === "mini" ? "mb-0 pb-0" : ""}
        titleClassName={
          viewMode === "mini" ? "text-base mb-0.5 leading-[110%]" : ""
        }
        marginClassName={viewMode === "mini" ? "mb-2" : ""}
        imageOverlay={avatarOverlay}
      >
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
          hideLocation={viewMode === "mini" && !activeFilters.showLocation}
          compact={viewMode === "mini"}
        />
        {viewMode === "card" && teamRequestRoleName && (
          <div className="mt-2 flex items-start text-sm text-base-content/70">
            <UserSearch
              size={16}
              className="mr-1 flex-shrink-0 mt-0.5 text-base-content"
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
                size={16}
                className="mr-1 flex-shrink-0 mt-0.5 text-base-content"
              />
              <span>{teamData._teamName}</span>
            </div>
          </Tooltip>
        )}

        {/* Action buttons */}
        {renderActionButtons()}
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
        isFromSearch={isSearchResult || effectiveVariant !== "member"}
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
        showMatchHighlights={shouldShowTeamModalMatchHighlights}
        roleMatchBadgeNames={roleMatchBadgeNames}
        matchScore={teamModalRawScore ?? null}
        matchType={teamModalMatchType}
        matchDetails={teamModalMatchDetails}
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
          teamName={teamData.name}
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
