import React, { useState, useEffect } from "react";
import {
  MapPin,
  Globe,
  UserSearch,
  UserCheck,
  Tag,
  Award,
  Calendar,
  Users,
  Mail,
  CircleDot,
  Check,
  X,
  ChevronRight,
} from "lucide-react";
import Modal from "../common/Modal";
import {
  getCategoryIcon,
  getSupercategoryIcon,
} from "../../utils/badgeIconUtils";
import {
  CATEGORY_COLORS,
  CATEGORY_CARD_PASTELS,
  DEFAULT_COLOR,
  PILL_ROW_HEIGHT,
  FOCUS_GREEN,
  FOCUS_GREEN_DARK,
  SUPERCATEGORY_ORDER,
  TAG_SECTION_BG,
} from "../../constants/badgeConstants";
import Button from "../common/Button";
import Tooltip from "../common/Tooltip";
import CardMetaItem from "../common/CardMetaItem";
import CardMetaRow from "../common/CardMetaRow";
import TeamApplicationButton from "./TeamApplicationButton";
import TeamApplicationsModal from "./TeamApplicationsModal";
import { useAuth } from "../../contexts/AuthContext";
import { userService } from "../../services/userService";
import { matchingService } from "../../services/matchingService";
import { teamService } from "../../services/teamService";
import { vacantRoleService } from "../../services/vacantRoleService";
import { getMatchTier } from "../../utils/matchScoreUtils";
import { getDisplayName, getUserInitials } from "../../utils/userHelpers";
import {
  calculateDistanceKm,
  normalizeLocationData,
  formatLocation,
} from "../../utils/locationUtils";
import { resolveFilledRoleUser } from "../../utils/vacantRoleUtils";
import { useUserModalSafe } from "../../contexts/UserModalContext";

const MATCH_WEIGHTS = {
  tags: 0.4,
  badges: 0.3,
  distance: 0.3,
};

const LOCATION_GRACE_KM = 20;
const LOCATION_GRACE_SCORE = 0.25;

const roundMatchValue = (value) => Math.round(value * 100) / 100;
const toPossessive = (value) =>
  !value ? "your" : value.endsWith("s") ? `${value}'` : `${value}'s`;

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
    .map((badge) => (badge.name ?? badge.badgeName ?? badge.badge_name ?? "").trim().toLowerCase())
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

/**
 * VacantRoleDetailsModal Component
 *
 * Read-only modal showing full details of a vacant team role.
 *
 * @param {boolean} isOpen
 * @param {Function} onClose
 * @param {Object} role - Full or partial role data object
 */
const VacantRoleDetailsModal = ({
  isOpen,
  onClose,
  team = null,
  role,
  matchScore = null,
  matchDetails = null,
  canManage = false,
  isTeamMember = false,
  viewAsUserId = null,
  viewAsUser = null,
}) => {
  const { user: currentUser, isAuthenticated } = useAuth();
  const userModal = useUserModalSafe();

  const [userTagMap, setUserTagMap] = useState(new Map()); // tagId → { badgeCredits }
  const [userBadgeMap, setUserBadgeMap] = useState(new Map()); // lowercase name → { totalCredits }
  const [hydratedRole, setHydratedRole] = useState(null);
  const [loadingRoleDetails, setLoadingRoleDetails] = useState(false);
  const [comparisonUserProfile, setComparisonUserProfile] = useState(null);
  const [loadingComparisonData, setLoadingComparisonData] = useState(false);
  const [comparisonDataLoaded, setComparisonDataLoaded] = useState(false);
  // Role applicants
  const [roleApplications, setRoleApplications] = useState([]);
  const [allApplications, setAllApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsModalOpen, setApplicationsModalOpen] = useState(false);
  const [highlightApplicantId, setHighlightApplicantId] = useState(null);
  const [applicantMatchMap, setApplicantMatchMap] = useState({});
  const [applicantProfileMap, setApplicantProfileMap] = useState({});
  const roleId = role?.id;
  const teamId = role?.teamId ?? role?.team_id ?? team?.id;

  useEffect(() => {
    const fetchFullRole = async () => {
      if (!isOpen || !roleId || !teamId) return;

      try {
        setLoadingRoleDetails(true);
        const response = await vacantRoleService.getVacantRoleById(teamId, roleId);

        if (response?.success && response?.data) {
          setHydratedRole(response.data);
        } else if (response?.data) {
          setHydratedRole(response.data);
        } else {
          setHydratedRole(null);
        }
      } catch (error) {
        console.error("Error fetching full vacant role details:", error);
        setHydratedRole(null);
      } finally {
        setLoadingRoleDetails(false);
      }
    };

    fetchFullRole();
  }, [isOpen, roleId, teamId]);

  useEffect(() => {
    if (!isOpen) {
      setHydratedRole(null);
      setLoadingRoleDetails(false);
      setComparisonUserProfile(null);
      setLoadingComparisonData(false);
      setComparisonDataLoaded(false);
      setUserTagMap(new Map());
      setUserBadgeMap(new Map());
      setRoleApplications([]);
      setAllApplications([]);
      setApplicationsModalOpen(false);
      setHighlightApplicantId(null);
      setApplicantMatchMap({});
      setApplicantProfileMap({});
    }
  }, [isOpen]);

  const displayRole = hydratedRole || role;
  const status = displayRole?.status;
  const isRoleOpen = String(status ?? "").toLowerCase() === "open";
  const isFilledRole = String(status ?? "").toLowerCase() === "filled";
  const resolvedFilledUser = resolveFilledRoleUser(displayRole, {
    viewAsUserId,
    viewAsUser,
  });
  const comparisonUserId = isFilledRole
    ? resolvedFilledUser?.id ?? viewAsUserId ?? null
    : viewAsUserId || currentUser?.id || null;
  const comparisonUserSeed = isFilledRole
    ? resolvedFilledUser ?? viewAsUser ?? null
    : viewAsUser ?? currentUser ?? null;
  const comparisonUserSeedJson = JSON.stringify(comparisonUserSeed ?? null);

  useEffect(() => {
    if (!isOpen || !isAuthenticated || !comparisonUserId) {
      setComparisonUserProfile(null);
      setComparisonDataLoaded(false);
      setUserTagMap(new Map());
      setUserBadgeMap(new Map());
      return;
    }

    const fetchComparisonData = async () => {
      const fallbackComparisonUser = comparisonUserSeedJson
        ? JSON.parse(comparisonUserSeedJson)
        : null;

      try {
        setLoadingComparisonData(true);
        setComparisonDataLoaded(false);

        const [profileRes, tagsRes, badgesRes] = await Promise.allSettled([
          userService.getUserById(comparisonUserId),
          userService.getUserTags(comparisonUserId),
          userService.getUserBadges(comparisonUserId),
        ]);

        if (profileRes.status === "fulfilled") {
          const profileData =
            profileRes.value?.data?.data ?? profileRes.value?.data ?? null;
          setComparisonUserProfile({
            ...(fallbackComparisonUser || {}),
            ...(profileData || {}),
          });
        } else {
          setComparisonUserProfile(fallbackComparisonUser);
        }

        const tagData =
          tagsRes.status === "fulfilled"
            ? Array.isArray(tagsRes.value)
              ? tagsRes.value
              : Array.isArray(tagsRes.value?.data)
                ? tagsRes.value.data
                : tagsRes.value?.data?.data || []
            : [];
        const tMap = new Map();
        for (const tag of tagData) {
          tMap.set(Number(tag.id), {
            badgeCredits: Number(tag.badge_credits ?? tag.badgeCredits ?? 0),
          });
        }
        setUserTagMap(tMap);

        const badgeData =
          badgesRes.status === "fulfilled"
            ? Array.isArray(badgesRes.value)
              ? badgesRes.value
              : Array.isArray(badgesRes.value?.data)
                ? badgesRes.value.data
                : badgesRes.value?.data?.data || []
            : [];
        const bMap = new Map();
        for (const badge of badgeData) {
          const name = (badge.badgeName ?? badge.badge_name ?? badge.name ?? "")
            .trim()
            .toLowerCase();
          const credits = Number(
            badge.totalCredits ?? badge.total_credits ?? badge.credits ?? 0,
          );
          const existing = bMap.get(name);
          bMap.set(name, {
            totalCredits: (existing?.totalCredits || 0) + credits,
          });
        }
        setUserBadgeMap(bMap);
      } catch (err) {
        console.warn("Could not fetch user data for matching highlights:", err);
        setComparisonUserProfile(fallbackComparisonUser);
        setUserTagMap(new Map());
        setUserBadgeMap(new Map());
      } finally {
        setLoadingComparisonData(false);
        setComparisonDataLoaded(true);
      }
    };

    fetchComparisonData();
  }, [isOpen, isAuthenticated, comparisonUserId, comparisonUserSeedJson]);

  useEffect(() => {
    if (!isOpen || !canManage || !teamId) {
      setRoleApplications([]);
      setAllApplications([]);
      setApplicationsLoading(false);
      return;
    }

    const normalizedStatus = String(status ?? "").toLowerCase();
    if (normalizedStatus !== "open") {
      setRoleApplications([]);
      setAllApplications([]);
      setApplicationsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchApplications = async () => {
      try {
        setApplicationsLoading(true);
        const response = await teamService.getTeamApplications(teamId);
        if (cancelled) return;

        const apps = response.data || [];
        setAllApplications(apps);

        const currentRoleId = roleId;
        const filtered = apps.filter((app) => {
          const appRoleId = app.role?.id ?? app.roleId ?? app.role_id ?? null;
          return appRoleId != null && String(appRoleId) === String(currentRoleId);
        });
        setRoleApplications(filtered);
      } catch (err) {
        console.warn("Could not fetch applications for role:", err);
        setRoleApplications([]);
        setAllApplications([]);
      } finally {
        if (!cancelled) setApplicationsLoading(false);
      }
    };

    fetchApplications();
    return () => { cancelled = true; };
  }, [isOpen, canManage, teamId, roleId, status]);

  useEffect(() => {
    if (!isOpen || !canManage || !roleId || !isRoleOpen || roleApplications.length === 0) {
      setApplicantMatchMap({});
      return;
    }

    let cancelled = false;

    const fetchApplicantMatches = async () => {
      try {
        const response = await matchingService.getMatchingCandidates(roleId, {
          limit: Math.max(roleApplications.length, 20),
        });
        if (cancelled) return;

        const candidates = response?.data || [];
        const nextMatchMap = {};

        candidates.forEach((candidate) => {
          const candidateId = candidate?.id ?? candidate?.userId ?? candidate?.user_id;
          if (candidateId == null) return;

          nextMatchMap[String(candidateId)] = {
            ...candidate,
            matchScore:
              candidate?.matchScore ??
              candidate?.match_score ??
              candidate?.bestMatchScore ??
              candidate?.best_match_score ??
              null,
            matchDetails:
              candidate?.matchDetails ??
              candidate?.match_details ??
              null,
          };
        });

        setApplicantMatchMap(nextMatchMap);
      } catch (err) {
        console.warn("Could not fetch applicant match scores for role:", err);
        if (!cancelled) {
          setApplicantMatchMap({});
        }
      }
    };

    fetchApplicantMatches();

    return () => {
      cancelled = true;
    };
  }, [isOpen, canManage, isRoleOpen, roleApplications, roleId]);

  useEffect(() => {
    if (!isOpen || !canManage || !isRoleOpen || roleApplications.length === 0) {
      setApplicantProfileMap({});
      return;
    }

    let cancelled = false;

    const fetchApplicantProfiles = async () => {
      const applicantIds = [
        ...new Set(
          roleApplications
            .map((application) => {
              const applicant = application?.applicant || {};
              return applicant.id ?? application.applicant_id ?? null;
            })
            .filter((id) => id != null),
        ),
      ];

      if (applicantIds.length === 0) {
        setApplicantProfileMap({});
        return;
      }

      try {
        const results = await Promise.allSettled(
          applicantIds.map((id) => userService.getUserById(id)),
        );

        if (cancelled) return;

        const nextProfileMap = {};

        results.forEach((result, index) => {
          if (result.status !== "fulfilled") return;

          const payload = result.value?.data ?? result.value;
          const profile =
            payload?.success !== undefined
              ? payload?.data
              : (payload?.data?.data ?? payload?.data ?? payload);

          if (!profile) return;

          nextProfileMap[String(applicantIds[index])] = profile;
        });

        setApplicantProfileMap(nextProfileMap);
      } catch (err) {
        console.warn("Could not fetch applicant profile details:", err);
        if (!cancelled) {
          setApplicantProfileMap({});
        }
      }
    };

    fetchApplicantProfiles();

    return () => {
      cancelled = true;
    };
  }, [isOpen, canManage, isRoleOpen, roleApplications]);

  const handleApplicationAction = async (applicationId, action, response = "") => {
    await teamService.handleTeamApplication(applicationId, action, response);
    try {
      const refreshed = await teamService.getTeamApplications(teamId);
      const apps = refreshed.data || [];
      setAllApplications(apps);
      const currentRoleId = roleId;
      setRoleApplications(
        apps.filter((app) => {
          const appRoleId = app.role?.id ?? app.roleId ?? app.role_id ?? null;
          return appRoleId != null && String(appRoleId) === String(currentRoleId);
        })
      );
    } catch (e) {
      console.warn("Could not refresh applications:", e);
    }
  };

  if (!displayRole) return null;

  // Normalize camelCase/snake_case
  const roleName =
    displayRole.roleName ?? displayRole.role_name ?? "Vacant Role";
  const bio = displayRole.bio ?? "";
  const city = displayRole.city;
  const country = displayRole.country;
  const state = displayRole.state;
  const _postalCode = displayRole.postalCode ?? displayRole.postal_code;
  const maxDistanceKm =
    displayRole.maxDistanceKm ?? displayRole.max_distance_km;
  const isRemote = displayRole.isRemote ?? displayRole.is_remote;
  const createdAt = displayRole.createdAt ?? displayRole.created_at;
  const updatedAt = displayRole.updatedAt ?? displayRole.updated_at;
  const tags =
    displayRole.tags?.length > 0
      ? displayRole.tags
      : displayRole.desiredTags || [];
  const badges =
    displayRole.badges?.length > 0
      ? displayRole.badges
      : displayRole.desiredBadges || [];

  const teamName = displayRole.teamName ?? displayRole.team_name;
  const teamMemberCount =
    displayRole.teamMemberCount ?? displayRole.team_member_count;
  const teamMaxMembers =
    displayRole.teamMaxMembers ?? displayRole.team_max_members;
  const teamDescription =
    displayRole.teamDescription ?? displayRole.team_description ?? "";
  const teamAvatarUrl =
    displayRole.teamavatar_url ??
    displayRole.teamavatarUrl ??
    displayRole.teamAvatarUrl ??
    displayRole.team_avatar_url ??
    null;
  const applicationTeam = {
    ...team,
    id: team?.id ?? teamId,
    name: team?.name ?? teamName,
    description: team?.description ?? teamDescription,
    current_members_count:
      team?.current_members_count ??
      team?.currentMembersCount ??
      team?.member_count ??
      team?.memberCount ??
      teamMemberCount,
    max_members: team?.max_members ?? team?.maxMembers ?? teamMaxMembers,
    teamavatar_url:
      team?.teamavatar_url ??
      team?.teamavatarUrl ??
      team?.avatar_url ??
      team?.avatarUrl ??
      teamAvatarUrl,
  };

  const creatorFirstName =
    displayRole.creatorFirstName ?? displayRole.creator_first_name;
  const creatorLastName =
    displayRole.creatorLastName ?? displayRole.creator_last_name;
  const creatorUsername =
    displayRole.creatorUsername ?? displayRole.creator_username;
  const creatorName =
    creatorFirstName && creatorLastName
      ? `${creatorFirstName} ${creatorLastName}`
      : creatorUsername || null;
  const comparisonUser = comparisonUserProfile || comparisonUserSeed || null;
  const comparisonFirstName =
    comparisonUser?.firstName ?? comparisonUser?.first_name ?? null;
  const comparisonDisplayName =
    comparisonUser && getDisplayName(comparisonUser) !== "Unknown"
      ? getDisplayName(comparisonUser)
      : null;
  const isComparisonSelf =
    !isFilledRole &&
    comparisonUserId != null &&
    currentUser?.id != null &&
    String(comparisonUserId) === String(currentUser.id);
  const comparisonShortName = isComparisonSelf
    ? null
    : comparisonFirstName || comparisonDisplayName;
  const comparisonPossessive = toPossessive(comparisonShortName);
  const filledRoleUser = isFilledRole
    ? comparisonUser || resolvedFilledUser
    : null;
  const filledRoleDisplayName =
    filledRoleUser && getDisplayName(filledRoleUser) !== "Unknown"
      ? getDisplayName(filledRoleUser)
      : null;
  const filledRoleAvatarUrl =
    filledRoleUser?.avatarUrl ?? filledRoleUser?.avatar_url ?? null;
  const filledAt =
    displayRole.filledAt ??
    displayRole.filled_at ??
    updatedAt ??
    createdAt;
  const serverRoleMatchScore =
    matchScore ??
    displayRole.matchScore ??
    displayRole.match_score ??
    null;
  const serverRoleMatchDetails =
    matchDetails ??
    displayRole.matchDetails ??
    displayRole.match_details ??
    displayRole.scoreBreakdown ??
    null;
  const computedRoleMatch =
    comparisonDataLoaded && comparisonUserId && comparisonUser
      ? computeRoleUserMatch({
          role: displayRole,
          tags,
          badges,
          user: comparisonUser,
          userTagMap,
          userBadgeMap,
        })
      : null;
  const effectiveMatchScore = isFilledRole
    ? computedRoleMatch?.matchScore ?? null
    : serverRoleMatchScore;
  const effectiveMatchDetails = isFilledRole
    ? computedRoleMatch?.matchDetails ?? null
    : serverRoleMatchDetails;
  const effectivePct =
    effectiveMatchScore !== null && effectiveMatchScore !== undefined
      ? Math.round(effectiveMatchScore * 100)
      : null;
  const matchTier =
    effectiveMatchScore !== null && effectiveMatchScore !== undefined
      ? getMatchTier(effectiveMatchScore)
      : null;
  const MatchTierIcon = matchTier?.Icon ?? null;
  const handleFilledUserClick = () => {
    const filledUserId = filledRoleUser?.id;
    if (filledUserId && userModal?.openUserModal) {
      userModal.openUserModal(filledUserId, {
        filledRoleName: roleName ?? null,
        teamName: teamName ?? null,
      });
    }
  };

  const modalStatusTitle = isFilledRole ? "Filled Role" : "Vacant Role";
  const ModalStatusIcon = isFilledRole ? UserCheck : UserSearch;
  const summarySuffix = isComparisonSelf
    ? " with you"
    : comparisonShortName
      ? ` with ${comparisonShortName}`
      : "";
  const distanceKm =
    effectiveMatchDetails?.distanceKm ??
    effectiveMatchDetails?.distance_km ??
    null;
  const withinRange =
    effectiveMatchDetails?.isWithinRange ??
    effectiveMatchDetails?.is_within_range ??
    null;
  const shouldShowComparisonSummary =
    isAuthenticated && comparisonUserId && comparisonDataLoaded;
  const locationMatchText = comparisonShortName
    ? `Matches ${comparisonPossessive} location`
    : "Matches your location";
  const locationMismatchText = comparisonShortName
    ? `Outside ${comparisonPossessive} location range`
    : "Outside your location range";

  const getRoleInitials = () => {
    const name = roleName || "Vacant Role";
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getLocationText = () => {
    if (isRemote) return "Remote — no geographic preference";
    const parts = [city, state, country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const getApplicantLocationText = (applicant, fallbackDistanceKm = null) => {
    if (!applicant) {
      return fallbackDistanceKm != null
        ? `${Math.round(fallbackDistanceKm)} km away`
        : "Location unavailable";
    }

    const locationLabel = formatLocation(normalizeLocationData(applicant), {
      displayType: "short",
      showCountry: true,
    });

    if (locationLabel) return locationLabel;

    return fallbackDistanceKm != null
      ? `${Math.round(fallbackDistanceKm)} km away`
      : "Location unavailable";
  };

  const locationText = getLocationText();

  const buildSearchUrl = () => {
    const params = new URLSearchParams();
    params.set("type", "users");
    params.set("sort", "match");

    const tagIds = tags
      .map((t) => Number(t.tagId ?? t.tag_id ?? t.id))
      .filter(Boolean);
    if (tagIds.length > 0) params.set("tags", tagIds.join(","));

    const badgeIds = badges
      .map((b) => Number(b.badgeId ?? b.badge_id ?? b.id))
      .filter(Boolean);
    if (badgeIds.length > 0) params.set("badges", badgeIds.join(","));

    if (isRemote) params.set("proximity", "remote");
    if (!isRemote && maxDistanceKm) {
      params.set("roleMaxDistanceKm", String(maxDistanceKm));
    }

    if (roleId) params.set("roleId", roleId);
    if (teamId) params.set("excludeTeamId", teamId);
    const searchRoleName = displayRole.roleName ?? displayRole.role_name ?? "Vacant Role";
    if (searchRoleName) params.set("roleName", searchRoleName);
    const searchTeamName = displayRole.teamName ?? displayRole.team_name ?? "";
    if (searchTeamName) params.set("excludeTeamName", searchTeamName);

    return `/search?${params.toString()}`;
  };

  const badgesByCategory = badges.reduce((acc, badge) => {
    const cat = badge.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(badge);
    return acc;
  }, {});

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return null;
    }
  };

  const getApplicationApplicantScore = (application) => {
    if (!application) return null;

    const applicantId =
      application?.applicant?.id ??
      application?.applicant_id ??
      null;
    const applicantMatch =
      applicantId != null ? applicantMatchMap[String(applicantId)] ?? null : null;
    const rawScore =
      application?.role?.matchScore ??
      application?.role?.match_score ??
      applicantMatch?.matchScore ??
      applicantMatch?.match_score ??
      null;
    const numericScore = Number(rawScore);

    return Number.isFinite(numericScore) ? numericScore : null;
  };

  const sortedRoleApplications = [...roleApplications].sort((a, b) => {
    const scoreA = getApplicationApplicantScore(a);
    const scoreB = getApplicationApplicantScore(b);

    if (scoreA == null && scoreB == null) return 0;
    if (scoreA == null) return 1;
    if (scoreB == null) return -1;

    return scoreB - scoreA;
  });

  const modalTitle = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <ModalStatusIcon
          className={isFilledRole ? "text-success" : "text-amber-500"}
          size={20}
        />
        <h2 className="text-lg font-medium">{modalStatusTitle}</h2>
      </div>
      {!isFilledRole && isTeamMember && (tags.length > 0 || badges.length > 0) && (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(buildSearchUrl(), '_blank')}
            className="flex items-center gap-1"
          >
            <UserSearch size={16} />
            <span className="hidden sm:inline">Find matching people outside this team</span>
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      position="center"
      size="default"
      maxHeight="max-h-[90vh]"
      closeOnBackdrop={true}
      closeOnEscape={true}
      showCloseButton={true}
    >
      <div className="space-y-6">
        {loadingRoleDetails && !hydratedRole && (
          <div className="text-sm text-base-content/50">
            Loading full role details...
          </div>
        )}

        {/* Header — avatar + role name + status */}
        <div className="flex items-start space-x-4">
          <div className="avatar relative">
            {isFilledRole ? (
              <Tooltip content={filledRoleUser?.id ? `Click to view ${filledRoleDisplayName || "this user"}'s profile` : undefined}>
              <div
                className={`w-20 h-20 rounded-full ${filledRoleUser?.id ? "cursor-pointer" : ""}`}
                onClick={filledRoleUser?.id ? handleFilledUserClick : undefined}
                role={filledRoleUser?.id ? "button" : undefined}
                tabIndex={filledRoleUser?.id ? 0 : undefined}
                onKeyDown={filledRoleUser?.id ? (e) => { if (e.key === "Enter" || e.key === " ") handleFilledUserClick(); } : undefined}
              >
                {filledRoleAvatarUrl ? (
                  <img
                    src={filledRoleAvatarUrl}
                    alt={filledRoleDisplayName || roleName}
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
                  className="avatar-fallback bg-success text-white rounded-full w-full h-full flex items-center justify-center absolute inset-0"
                  style={{ display: filledRoleAvatarUrl ? "none" : "flex" }}
                >
                  <span className="text-2xl font-semibold">
                    {filledRoleUser
                      ? getUserInitials(filledRoleUser)
                      : getRoleInitials()}
                  </span>
                </div>
              </div>
              </Tooltip>
            ) : effectivePct !== null ? (
              <div
                className={`${matchTier?.bg ?? "bg-slate-400"} text-white rounded-full w-20 h-20 relative flex items-center justify-center overflow-hidden`}
              >
                {MatchTierIcon ? (
                  <MatchTierIcon
                    size={56}
                    className="absolute text-white/40"
                    strokeWidth={1.5}
                  />
                ) : null}
                <span className="relative text-2xl font-bold">
                  {effectivePct}%
                </span>
              </div>
            ) : (
              <div className="bg-amber-500 text-white rounded-full w-20 h-20 flex items-center justify-center">
                <span className="text-2xl">{getRoleInitials()}</span>
              </div>
            )}
            {isFilledRole && MatchTierIcon && (
              <div
                className={`absolute -top-1 -left-1 w-6 h-6 rounded-full ring-2 ring-white flex items-center justify-center ${matchTier.bg}`}
                title={`${matchTier.pct}% ${matchTier.label.toLowerCase()}`}
              >
                <MatchTierIcon
                  size={12}
                  className="text-white"
                  strokeWidth={2.5}
                />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-tight">{roleName}</h1>

            {teamName && (
              <div className="flex items-center gap-1 mt-1 text-sm text-base-content/70">
                <Users size={14} className="text-primary flex-shrink-0" />
                <span>{teamName}</span>
                {teamMemberCount != null && (
                  <span className="text-base-content/50">
                    · {teamMemberCount}/{teamMaxMembers ?? "∞"} members
                  </span>
                )}
              </div>
            )}

            {(isFilledRole ? filledAt : createdAt) && (
              <div className="flex items-center gap-1 mt-1 text-xs text-base-content/50">
                <Calendar size={12} />
                <span>
                  {isFilledRole ? "Filled on" : "Posted"}{" "}
                  {formatDate(isFilledRole ? filledAt : createdAt)}
                </span>
                {isFilledRole && filledRoleUser?.id ? (
                  <span>
                    {" "}by{" "}
                    <Tooltip content={`Click to view ${filledRoleDisplayName || "this user"}'s profile`}>
                      <button
                        type="button"
                        className="hover:text-primary transition-colors font-medium"
                        onClick={handleFilledUserClick}
                      >
                        {filledRoleDisplayName}
                      </button>
                    </Tooltip>
                  </span>
                ) : (isFilledRole ? filledRoleDisplayName : creatorName) ? (
                  <span> by {isFilledRole ? filledRoleDisplayName : creatorName}</span>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {bio && (
          <div>
            <p className="text-base-content/90 leading-relaxed">{bio}</p>
          </div>
        )}

        {loadingComparisonData &&
          isFilledRole &&
          comparisonUserId &&
          effectiveMatchScore === null && (
            <div className="rounded-xl border border-base-300 bg-base-100/60 p-4 text-sm text-base-content/60">
              Calculating match details for{" "}
              {filledRoleDisplayName || "the filled member"}...
            </div>
          )}

        {effectiveMatchScore !== null &&
          effectiveMatchScore !== undefined &&
          (() => {
            const pct = Math.round(effectiveMatchScore * 100);
            const tagPct = Math.round(
              (effectiveMatchDetails?.tagScore ??
                effectiveMatchDetails?.tag_score ??
                0) * 100,
            );
            const badgePct = Math.round(
              (effectiveMatchDetails?.badgeScore ??
                effectiveMatchDetails?.badge_score ??
                0) * 100,
            );
            const distPct = Math.round(
              (effectiveMatchDetails?.distanceScore ??
                effectiveMatchDetails?.distance_score ??
                0) * 100,
            );

            const tierColor = {
              bg: "bg-base-200/50",
              border: "border-base-300",
              text: matchTier?.text ?? "text-base-content/70",
            };

            return (
              <div
                className={`rounded-xl p-4 ${tierColor.bg} border ${tierColor.border}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  {MatchTierIcon ? (
                    <MatchTierIcon size={16} className={tierColor.text} />
                  ) : null}
                  <span className={`text-sm font-semibold ${tierColor.text}`}>
                    {isFilledRole
                      ? `${pct}% matching score for ${filledRoleDisplayName || "this member"} with this role`
                      : `${pct}% match with ${comparisonPossessive} profile`}
                  </span>
                </div>

                <div className="space-y-2">
                  {[
                    {
                      label: "Location",
                      value: distPct,
                      icon: MapPin,
                      tooltip: (
                        <>
                          Location factors into the score with 30%.
                          <br />
                          Within the role's radius = 100%. Up to 20 km beyond =
                          25%. Farther = 0%.
                        </>
                      ),
                    },
                    {
                      label: "Focus Areas",
                      value: tagPct,
                      icon: Tag,
                      tooltip: (
                        <>
                          Focus Areas factor into the score with 40%.
                          <br />
                          {effectiveMatchDetails?.matchingTags ??
                            effectiveMatchDetails?.matching_tags ??
                            0}{" "}
                          out of{" "}
                          {effectiveMatchDetails?.totalRequiredTags ??
                            effectiveMatchDetails?.total_required_tags ??
                            0}{" "}
                          required focus areas met.
                        </>
                      ),
                    },
                    {
                      label: "Badges",
                      value: badgePct,
                      icon: Award,
                      tooltip: (
                        <>
                          Badges factor into the score with 30%.
                          <br />
                          {effectiveMatchDetails?.matchingBadges ??
                            effectiveMatchDetails?.matching_badges ??
                            0}{" "}
                          out of{" "}
                          {effectiveMatchDetails?.totalRequiredBadges ??
                            effectiveMatchDetails?.total_required_badges ??
                            0}{" "}
                          required badges met.
                        </>
                      ),
                    },
                  ].map((row) => {
                    const IconComponent = row.icon;

                    return (
                      <div key={row.label} className="flex items-center gap-2">
                        <Tooltip content={row.tooltip}>
                          <span className="text-xs text-base-content/60 w-24 flex-shrink-0 flex items-center gap-1 cursor-help">
                            <IconComponent size={12} className="flex-shrink-0" />
                            {row.label}
                          </span>
                        </Tooltip>
                        <div className="flex-1 h-1.5 bg-base-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              matchTier?.bg ?? "bg-slate-400"
                            }`}
                            style={{ width: `${Math.max(0, row.value)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-base-content/60 w-8 text-right">
                          {row.value}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

        {locationText && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                {isRemote ? (
                  <Globe size={18} className="mr-2 text-primary flex-shrink-0" />
                ) : (
                  <MapPin size={18} className="mr-2 text-primary flex-shrink-0" />
                )}
                <h3 className="font-medium">Location Preference</h3>
              </div>
              {isAuthenticated && (() => {
                if (isRemote) {
                  return (
                    <span className="flex items-center gap-1.5 text-sm text-success">
                      <Check size={14} className="flex-shrink-0" />
                      <span>{locationMatchText}</span>
                    </span>
                  );
                }
                if (distanceKm !== null && withinRange !== null) {
                  if (withinRange) {
                    return (
                      <span className="flex items-center gap-1.5 text-sm text-success">
                        <Check size={14} className="flex-shrink-0" />
                        <span>{locationMatchText}</span>
                      </span>
                    );
                  } else {
                    return (
                      <span className="flex items-center gap-1.5 text-sm text-error/70">
                        <X size={14} className="flex-shrink-0" />
                        <span>{locationMismatchText}</span>
                      </span>
                    );
                  }
                }
                return null;
              })()}
            </div>

            <div className="flex items-center gap-2 text-sm text-base-content/70">
              <span>{locationText}</span>
              {!isRemote && maxDistanceKm && (
                <span className="flex items-center gap-1 text-base-content/50">
                  <CircleDot size={14} />
                  within {maxDistanceKm} km from Role Location
                </span>
              )}
            </div>
          </div>
        )}

        {/* Desired Focus Areas */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Tag size={18} className="mr-2 text-primary flex-shrink-0" />
              <h3 className="font-medium">Desired Focus Areas</h3>
            </div>
            {shouldShowComparisonSummary && tags.length > 0 && (() => {
              const matchCount = tags.filter((t) => {
                const tagId = Number(t.tagId ?? t.tag_id ?? t.id);
                return userTagMap.has(tagId);
              }).length;
              const total = tags.length;
              if (matchCount > 0) {
                return (
                  <span className="flex items-center gap-1.5 text-sm text-success">
                    <Check size={14} className="flex-shrink-0" />
                    <span>{matchCount}/{total} in common{summarySuffix}</span>
                  </span>
                );
              }
              return (
                <span className="flex items-center gap-1.5 text-sm text-error/70">
                  <X size={14} className="flex-shrink-0" />
                  <span>None in common{summarySuffix}</span>
                </span>
              );
            })()}
          </div>

          {tags.length > 0 ? (
            (() => {
              const groups = {};
              for (const tag of tags) {
                const supercat = tag.supercategory || "Other";
                if (!groups[supercat]) groups[supercat] = [];
                groups[supercat].push(tag);
              }

              const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
                const idxA = SUPERCATEGORY_ORDER.indexOf(a);
                const idxB = SUPERCATEGORY_ORDER.indexOf(b);
                const posA = idxA === -1 ? 999 : idxA;
                const posB = idxB === -1 ? 999 : idxB;
                return posA - posB;
              });

              for (const [, groupTags] of sortedGroups) {
                groupTags.sort((a, b) => a.name.localeCompare(b.name));
              }

              return (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  {sortedGroups.map(([supercategory, groupTags]) => (
                    <div
                      key={supercategory}
                      className="flex items-start gap-0"
                      title={supercategory}
                    >
                      <Tooltip content={supercategory}>
                        <span
                          className="inline-flex items-center justify-center pr-[6px] flex-shrink-0"
                          style={{
                            height: PILL_ROW_HEIGHT,
                            color: FOCUS_GREEN_DARK,
                          }}
                        >
                          {getSupercategoryIcon(
                            supercategory,
                            14,
                            FOCUS_GREEN_DARK,
                          )}
                        </span>
                      </Tooltip>

                      <div className="flex flex-wrap gap-1.5">
                        {groupTags.map((tag) => {
                          const tagId = Number(
                            tag.tagId ?? tag.tag_id ?? tag.id,
                          );
                          const userTag = userTagMap.get(tagId);
                          const isMatch = !!userTag;
                          const credits = userTag?.badgeCredits || 0;

                          return (
                            <Tooltip
                              key={tagId}
                              content={`${tag.name} — ${tag.supercategory || "Other"}`}
                            >
                              <span
                                className="badge badge-outline p-3 inline-flex items-center gap-1"
                                style={{
                                  borderColor: FOCUS_GREEN_DARK,
                                  color: FOCUS_GREEN_DARK,
                                  ...(isMatch
                                    ? { backgroundColor: TAG_SECTION_BG }
                                    : {}),
                                }}
                              >
                                {isMatch && (
                                  <Check
                                    size={12}
                                    className="flex-shrink-0"
                                    style={{ color: FOCUS_GREEN }}
                                  />
                                )}
                                {tag.name}
                                {isMatch && credits > 0 && (
                                  <span className="opacity-70">
                                    | {credits}ct.
                                  </span>
                                )}
                              </span>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          ) : (
            <p className="text-sm text-base-content/50">
              No specific focus areas required
            </p>
          )}
        </div>

        {/* Desired Badges */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Award size={18} className="mr-2 text-primary flex-shrink-0" />
              <h3 className="font-medium">Desired Badges</h3>
            </div>
            {shouldShowComparisonSummary && badges.length > 0 && (() => {
              const matchCount = badges.filter((b) => {
                const badgeKey = (b.name ?? b.badgeName ?? b.badge_name ?? "").trim().toLowerCase();
                return userBadgeMap.has(badgeKey);
              }).length;
              const total = badges.length;
              if (matchCount > 0) {
                return (
                  <span className="flex items-center gap-1.5 text-sm text-success">
                    <Check size={14} className="flex-shrink-0" />
                    <span>{matchCount}/{total} in common{summarySuffix}</span>
                  </span>
                );
              }
              return (
                <span className="flex items-center gap-1.5 text-sm text-error/70">
                  <X size={14} className="flex-shrink-0" />
                  <span>None in common{summarySuffix}</span>
                </span>
              );
            })()}
          </div>

          {badges.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {Object.entries(badgesByCategory).map(([category, catBadges]) => {
                const categoryColor =
                  CATEGORY_COLORS[category] || DEFAULT_COLOR;

                return (
                  <div key={category} className="flex items-start">
                    <Tooltip content={category}>
                      <span
                        className="inline-flex items-center justify-center pr-[6px]"
                        style={{
                          height: PILL_ROW_HEIGHT,
                          color: categoryColor,
                        }}
                      >
                        {getCategoryIcon(category, categoryColor, 14)}
                      </span>
                    </Tooltip>

                    <div className="flex flex-wrap gap-1.5">
                      {catBadges.map((badge) => {
                        const badgeColor = badge.color || categoryColor;
                        const badgeKey = (badge.name ?? "")
                          .trim()
                          .toLowerCase();
                        const userBadge = userBadgeMap.get(badgeKey);
                        const isMatch = !!userBadge;
                        const credits = userBadge?.totalCredits || 0;
                        const pastel =
                          CATEGORY_CARD_PASTELS[category] || `${badgeColor}15`;

                        return (
                          <Tooltip
                            key={badge.badgeId ?? badge.badge_id ?? badge.id}
                            content={
                              badge.description || `${badge.name} — ${category}`
                            }
                          >
                            <span
                              className="badge badge-outline p-3 inline-flex items-center gap-1"
                              style={{
                                borderColor: badgeColor,
                                color: badgeColor,
                                ...(isMatch ? { backgroundColor: pastel } : {}),
                              }}
                            >
                              {isMatch && (
                                <Check size={12} className="flex-shrink-0" />
                              )}
                              {badge.name}
                              {isMatch && credits > 0 && (
                                <span className="opacity-70">
                                  | {credits}ct.
                                </span>
                              )}
                            </span>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-base-content/50">
              No specific badges required
            </p>
          )}
        </div>

        {/* Applications for this role — admin/owner only */}
        {canManage && isRoleOpen && (
          applicationsLoading ? (
            <div className="flex justify-center py-3">
              <span className="loading loading-spinner loading-sm text-primary"></span>
            </div>
          ) : roleApplications.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Mail size={18} className="mr-2 text-primary flex-shrink-0" />
                  <h3 className="font-medium">Applications for this role</h3>
                </div>
                <span className="text-sm text-base-content/50">
                  ({roleApplications.length})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sortedRoleApplications.map((application) => {
                  const applicant = application.applicant || {};
                  const applicantId =
                    applicant.id ??
                    application.applicant_id ??
                    null;
                  const applicantMatch =
                    applicantId != null
                      ? applicantMatchMap[String(applicantId)] ?? null
                      : null;
                  const applicantProfileDetails =
                    applicantId != null
                      ? applicantProfileMap[String(applicantId)] ?? null
                      : null;
                  const applicantProfile = {
                    ...(applicant || {}),
                    ...(applicantMatch || {}),
                    ...(applicantProfileDetails || {}),
                  };
                  const firstName =
                    applicantProfile.firstName ??
                    applicantProfile.first_name ??
                    "";
                  const lastName =
                    applicantProfile.lastName ??
                    applicantProfile.last_name ??
                    "";
                  const username = applicantProfile.username ?? "";
                  const avatarUrl =
                    applicantProfile.avatarUrl ??
                    applicantProfile.avatar_url ??
                    null;
                  const displayName = firstName && lastName
                    ? `${firstName} ${lastName}`
                    : firstName || lastName || username || "Unknown";
                  const initials = firstName && lastName
                    ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
                    : (firstName || lastName || username || "?")
                        .charAt(0)
                        .toUpperCase();
                  const applicationRoleMatch = application.role || {};
                  const applicantScore =
                    applicationRoleMatch.matchScore ??
                    applicationRoleMatch.match_score ??
                    applicantMatch?.matchScore ??
                    applicantMatch?.match_score ??
                    null;
                  const applicantDistanceKm =
                    applicationRoleMatch.matchDetails?.distanceKm ??
                    applicationRoleMatch.matchDetails?.distance_km ??
                    applicationRoleMatch.match_details?.distanceKm ??
                    applicationRoleMatch.match_details?.distance_km ??
                    applicantMatch?.matchDetails?.distanceKm ??
                    applicantMatch?.matchDetails?.distance_km ??
                    applicantMatch?.match_details?.distanceKm ??
                    applicantMatch?.match_details?.distance_km ??
                    null;
                  const applicantMatchTier =
                    applicantScore != null ? getMatchTier(applicantScore) : null;
                  const ApplicantMatchIcon = applicantMatchTier?.Icon ?? null;
                  const locationLabel = getApplicantLocationText(
                    applicantProfile,
                    applicantDistanceKm,
                  );

                  return (
                    <button
                      key={application.id}
                      type="button"
                      className="flex items-start bg-green-50 rounded-xl shadow p-4 gap-4 transition-all duration-200 hover:bg-green-100 hover:shadow-md cursor-pointer text-left w-full"
                      onClick={() => {
                        setHighlightApplicantId(applicantId);
                        setApplicationsModalOpen(true);
                      }}
                    >
                      <div className="avatar relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-full">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={displayName}
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
                            className="avatar-fallback bg-primary text-primary-content rounded-full w-full h-full flex items-center justify-center absolute inset-0"
                            style={{ display: avatarUrl ? "none" : "flex" }}
                          >
                            <span className="text-lg">{initials}</span>
                          </div>
                        </div>
                        {ApplicantMatchIcon && (
                          <div
                            className={`absolute -top-0.5 -left-0.5 w-[14px] h-[14px] rounded-full ring-2 ring-white flex items-center justify-center ${applicantMatchTier.bg}`}
                            title={`${applicantMatchTier.pct}% ${applicantMatchTier.label.toLowerCase()}`}
                          >
                            <ApplicantMatchIcon
                              size={7}
                              className="text-white"
                              strokeWidth={2.5}
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 pt-[1px]">
                        <div className="flex flex-col">
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="block w-full min-w-0 truncate font-medium text-base leading-[120%] text-base-content">
                                {displayName}
                              </p>
                            </div>
                            <ChevronRight
                              size={14}
                              className="text-base-content/30 flex-shrink-0"
                            />
                          </div>

                          <CardMetaRow>
                            {applicantMatchTier && (
                              <div className="flex items-start gap-0.5 min-w-0">
                                <ApplicantMatchIcon
                                  size={10}
                                  className={`${applicantMatchTier.text} shrink-0 mt-[3px]`}
                                />
                                <span className="text-base-content/60 leading-tight whitespace-nowrap">
                                  {applicantMatchTier.pct}%
                                </span>
                              </div>
                            )}
                            <CardMetaItem icon={MapPin}>
                              {locationLabel}
                            </CardMetaItem>
                          </CardMetaRow>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null
        )}

        {isAuthenticated && !isTeamMember && isRoleOpen && (
          <div className="mt-6 border-t border-base-200 pt-4">
            <TeamApplicationButton
              team={applicationTeam}
              teamId={teamId}
              roleId={roleId}
              className="w-full"
            />
          </div>
        )}
      </div>
    </Modal>

    {applicationsModalOpen && (
      <TeamApplicationsModal
        isOpen={applicationsModalOpen}
        onClose={() => {
          setApplicationsModalOpen(false);
          setHighlightApplicantId(null);
        }}
        teamId={teamId}
        applications={allApplications}
        onApplicationAction={handleApplicationAction}
        teamName={teamName}
        highlightUserId={highlightApplicantId}
      />
    )}
    </>
  );
};

export default VacantRoleDetailsModal;
