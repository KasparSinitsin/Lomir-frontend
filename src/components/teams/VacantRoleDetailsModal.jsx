import React, { useState, useEffect, useMemo } from "react";
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
  ChevronUp,
  SendHorizontal,
  FlaskConical,
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
import DemoAvatarOverlay from "../users/DemoAvatarOverlay";
import CardMetaItem from "../common/CardMetaItem";
import CardMetaRow from "../common/CardMetaRow";
import TeamApplicationButton from "./TeamApplicationButton";
import TeamApplicationModal from "./TeamApplicationModal";
import TeamApplicationDetailsModal from "./TeamApplicationDetailsModal";
import TeamApplicationsModal from "./TeamApplicationsModal";
import TeamInvitationDetailsModal from "./TeamInvitationDetailsModal";
import TeamInvitesModal from "./TeamInvitesModal";
import { useAuth } from "../../contexts/AuthContext";
import { userService } from "../../services/userService";
import { matchingService } from "../../services/matchingService";
import { teamService } from "../../services/teamService";
import { vacantRoleService } from "../../services/vacantRoleService";
import { getMatchTier } from "../../utils/matchScoreUtils";
import {
  DEMO_ROLE_TOOLTIP,
  getDisplayName,
  getUserInitials,
  isSyntheticRole,
} from "../../utils/userHelpers";
import {
  calculateDistanceKm,
  normalizeLocationData,
  formatLocation,
} from "../../utils/locationUtils";
import { resolveFilledRoleUser } from "../../utils/vacantRoleUtils";
import { useUserModalSafe } from "../../contexts/UserModalContext";
import { useTeamModalSafe } from "../../contexts/TeamModalContext";
import { useChildModalZIndex } from "../../contexts/ModalLayerContext";

const MATCH_WEIGHTS = {
  tags: 0.4,
  badges: 0.3,
  distance: 0.3,
};

const LOCATION_GRACE_KM = 20;
const LOCATION_GRACE_SCORE = 0.25;
const COLLAPSED_COUNT = 4;
const EMPTY_TEAM_MEMBERS = [];

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

const getRoleRecordId = (record) =>
  record?.role?.id ?? record?.roleId ?? record?.role_id ?? null;

const getRoleRecordTeamId = (record) =>
  record?.team?.id ?? record?.teamId ?? record?.team_id ?? null;

const getRoleRecordName = (record) =>
  record?.role?.roleName ??
  record?.role?.role_name ??
  record?.roleName ??
  record?.role_name ??
  null;

const matchesRoleRecord = (record, { roleId, teamId, roleName }) => {
  const recordRoleId = getRoleRecordId(record);

  if (recordRoleId != null && roleId != null) {
    return String(recordRoleId) === String(roleId);
  }

  const recordTeamId = getRoleRecordTeamId(record);
  const recordRoleName = getRoleRecordName(record);

  return (
    recordTeamId != null &&
    teamId != null &&
    String(recordTeamId) === String(teamId) &&
    typeof recordRoleName === "string" &&
    typeof roleName === "string" &&
    recordRoleName.trim().toLowerCase() === roleName.trim().toLowerCase()
  );
};

const hasActiveApplicationStatus = (application) => {
  const status = String(
    application?.status ??
      application?.applicationStatus ??
      application?.application_status ??
      "",
  ).toLowerCase();

  return ![
    "withdrawn",
    "rejected",
    "declined",
    "cancelled",
    "canceled",
  ].includes(status);
};

const hasActiveInvitationStatus = (invitation) => {
  const status = String(
    invitation?.status ??
      invitation?.invitationStatus ??
      invitation?.invitation_status ??
      "",
  ).toLowerCase();

  return ![
    "withdrawn",
    "revoked",
    "declined",
    "cancelled",
    "canceled",
  ].includes(status);
};

const buildRoleStatusRecord = (
  record,
  fallbackTeam,
  fallbackRole,
  options = {},
) => {
  if (!record) return null;

  const nextRecord = {
    ...record,
    team: record.team ?? fallbackTeam,
    role: record.role ?? fallbackRole,
  };

  if (
    options.isInternalRoleApplication !== undefined &&
    nextRecord.isInternalRoleApplication == null &&
    nextRecord.is_internal_role_application == null
  ) {
    nextRecord.isInternalRoleApplication = options.isInternalRoleApplication;
  }

  if (
    options.isInternal !== undefined &&
    nextRecord.isInternal == null &&
    nextRecord.is_internal == null
  ) {
    nextRecord.isInternal = options.isInternal;
  }

  return nextRecord;
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
  onViewApplicationDetails = null,
  hideActions = false,
}) => {
  const { user: currentUser, isAuthenticated } = useAuth();
  const userModal = useUserModalSafe();
  const teamModal = useTeamModalSafe();
  const childTeamModalZIndex = useChildModalZIndex();

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
  const [roleCandidateMatchMap, setRoleCandidateMatchMap] = useState({});
  const [applicantProfileMap, setApplicantProfileMap] = useState({});
  const [roleInvitations, setRoleInvitations] = useState([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invitationsModalOpen, setInvitationsModalOpen] = useState(false);
  const [highlightInviteeId, setHighlightInviteeId] = useState(null);
  const [inviteeProfileMap, setInviteeProfileMap] = useState({});
  const [roleTeamMembers, setRoleTeamMembers] = useState([]);
  const [teamMembersLoading, setTeamMembersLoading] = useState(false);
  const [isApplicationsExpanded, setIsApplicationsExpanded] = useState(false);
  const [isInvitationsExpanded, setIsInvitationsExpanded] = useState(false);
  const [isTeamMembersExpanded, setIsTeamMembersExpanded] = useState(false);
  const [isInternalApplicationOpen, setIsInternalApplicationOpen] = useState(false);
  const [viewerRoleApplicationRecord, setViewerRoleApplicationRecord] =
    useState(null);
  const [viewerRoleInvitationRecord, setViewerRoleInvitationRecord] =
    useState(null);
  const [viewerRoleStatusLoading, setViewerRoleStatusLoading] =
    useState(false);
  const [isViewerApplicationDetailsOpen, setIsViewerApplicationDetailsOpen] =
    useState(false);
  const [isViewerInvitationDetailsOpen, setIsViewerInvitationDetailsOpen] =
    useState(false);
  const roleId = role?.id;
  const teamId = role?.teamId ?? role?.team_id ?? team?.id;
  const teamMembers = Array.isArray(team?.members) ? team.members : EMPTY_TEAM_MEMBERS;
  const currentTeamMemberIds = new Set(
    teamMembers
      .map((member) => member?.userId ?? member?.user_id ?? null)
      .filter((id) => id != null)
      .map(String),
  );
  const teamMemberScoreMap = useMemo(() => {
    const map = {};

    for (const row of roleTeamMembers) {
      const memberId = row.memberId ?? row.member?.id ?? null;

      if (memberId != null && row.matchScore != null) {
        map[String(memberId)] = {
          matchScore: row.matchScore,
          matchDetails: row.matchDetails ?? null,
        };
      }
    }

    return map;
  }, [roleTeamMembers]);
  const canViewTeamMemberMatches = canManage || isTeamMember;
  const teamMemberIdsKey = JSON.stringify(
    [
      ...new Set(
        teamMembers
          .map((member) => member?.userId ?? member?.user_id ?? null)
          .filter((id) => id != null)
          .map(String),
      ),
    ],
  );

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
      setRoleCandidateMatchMap({});
      setApplicantProfileMap({});
      setRoleInvitations([]);
      setInvitationsLoading(false);
      setInvitationsModalOpen(false);
      setHighlightInviteeId(null);
      setInviteeProfileMap({});
      setRoleTeamMembers([]);
      setTeamMembersLoading(false);
      setIsApplicationsExpanded(false);
      setIsInvitationsExpanded(false);
      setIsTeamMembersExpanded(false);
      setViewerRoleApplicationRecord(null);
      setViewerRoleInvitationRecord(null);
      setViewerRoleStatusLoading(false);
      setIsViewerApplicationDetailsOpen(false);
      setIsViewerInvitationDetailsOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setIsApplicationsExpanded(false);
    setIsInvitationsExpanded(false);
    setIsTeamMembersExpanded(false);
  }, [isOpen, roleId]);

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
  const roleNameForStatusMatch =
    displayRole?.roleName ??
    displayRole?.role_name ??
    role?.roleName ??
    role?.role_name ??
    "";

  useEffect(() => {
    if (!isOpen || !isAuthenticated || (!roleId && !roleNameForStatusMatch)) {
      setViewerRoleApplicationRecord(null);
      setViewerRoleInvitationRecord(null);
      setViewerRoleStatusLoading(false);
      return;
    }

    let cancelled = false;

    const fallbackTeam = {
      ...team,
      id: team?.id ?? teamId,
      name:
        team?.name ??
        team?.team_name ??
        displayRole?.teamName ??
        displayRole?.team_name ??
        displayRole?.team?.name ??
        displayRole?.team?.team_name ??
        null,
      teamavatar_url:
        team?.teamavatar_url ??
        team?.teamavatarUrl ??
        team?.avatar_url ??
        team?.avatarUrl ??
        displayRole?.teamavatar_url ??
        displayRole?.teamavatarUrl ??
        displayRole?.teamAvatarUrl ??
        displayRole?.team_avatar_url ??
        null,
    };
    const fallbackRole = {
      ...displayRole,
      id: displayRole?.id ?? roleId,
      teamId: displayRole?.teamId ?? displayRole?.team_id ?? teamId,
      team_id: displayRole?.team_id ?? displayRole?.teamId ?? teamId,
    };
    const seededApplication = hasActiveApplicationStatus(
      role?.currentUserRoleApplication ??
        role?.current_user_role_application ??
        role?.currentUserApplication ??
        role?.current_user_application ??
        role?.pendingRoleApplication ??
        role?.pending_role_application ??
        role?.pendingApplication ??
        role?.pending_application ??
        role?.roleApplication ??
        role?.role_application ??
        role?.application ??
        null,
    )
      ? buildRoleStatusRecord(
          role?.currentUserRoleApplication ??
            role?.current_user_role_application ??
            role?.currentUserApplication ??
            role?.current_user_application ??
            role?.pendingRoleApplication ??
            role?.pending_role_application ??
            role?.pendingApplication ??
            role?.pending_application ??
            role?.roleApplication ??
            role?.role_application ??
            role?.application ??
            null,
          fallbackTeam,
          fallbackRole,
          { isInternalRoleApplication: isTeamMember },
        )
      : null;
    const seededInvitation = hasActiveInvitationStatus(
      role?.currentUserRoleInvitation ??
        role?.current_user_role_invitation ??
        role?.currentUserInvitation ??
        role?.current_user_invitation ??
        role?.pendingRoleInvitation ??
        role?.pending_role_invitation ??
        role?.pendingInvitation ??
        role?.pending_invitation ??
        role?.roleInvitation ??
        role?.role_invitation ??
        role?.invitation ??
        null,
    )
      ? buildRoleStatusRecord(
          role?.currentUserRoleInvitation ??
            role?.current_user_role_invitation ??
            role?.currentUserInvitation ??
            role?.current_user_invitation ??
            role?.pendingRoleInvitation ??
            role?.pending_role_invitation ??
            role?.pendingInvitation ??
            role?.pending_invitation ??
            role?.roleInvitation ??
            role?.role_invitation ??
            role?.invitation ??
            null,
          fallbackTeam,
          fallbackRole,
          { isInternal: isTeamMember },
        )
      : null;

    setViewerRoleApplicationRecord(seededApplication);
    setViewerRoleInvitationRecord(seededInvitation);
    setViewerRoleStatusLoading(true);

    const fetchViewerRoleStatus = async () => {
      const [applicationsResult, invitationsResult] = await Promise.allSettled([
        teamService.getUserPendingApplications(),
        teamService.getUserReceivedInvitations(),
      ]);

      if (cancelled) return;

      let nextApplication = seededApplication;
      let nextInvitation = seededInvitation;

      if (applicationsResult.status === "fulfilled") {
        const pendingApplications = Array.isArray(applicationsResult.value?.data)
          ? applicationsResult.value.data
          : [];
        const foundApplication =
          pendingApplications.find((application) =>
            matchesRoleRecord(application, {
              roleId,
              teamId,
              roleName: roleNameForStatusMatch,
            }),
          ) ?? null;

        nextApplication = foundApplication
          ? buildRoleStatusRecord(
              foundApplication,
              fallbackTeam,
              fallbackRole,
              { isInternalRoleApplication: isTeamMember },
            )
          : null;
      }

      if (invitationsResult.status === "fulfilled") {
        const receivedInvitations = Array.isArray(invitationsResult.value?.data)
          ? invitationsResult.value.data
          : [];
        const foundInvitation =
          receivedInvitations.find((invitation) =>
            matchesRoleRecord(invitation, {
              roleId,
              teamId,
              roleName: roleNameForStatusMatch,
            }),
          ) ?? null;

        nextInvitation = foundInvitation
          ? buildRoleStatusRecord(
              foundInvitation,
              fallbackTeam,
              fallbackRole,
              { isInternal: isTeamMember },
            )
          : null;
      }

      setViewerRoleApplicationRecord(nextApplication);
      setViewerRoleInvitationRecord(nextInvitation);
      setViewerRoleStatusLoading(false);
    };

    fetchViewerRoleStatus().catch((error) => {
      console.warn("Could not fetch viewer role status:", error);
      if (!cancelled) {
        setViewerRoleApplicationRecord(seededApplication);
        setViewerRoleInvitationRecord(seededInvitation);
        setViewerRoleStatusLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    displayRole,
    isAuthenticated,
    isOpen,
    isTeamMember,
    role,
    roleId,
    roleNameForStatusMatch,
    team,
    teamId,
  ]);

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
    if (!isOpen || !canManage || !teamId) {
      setRoleInvitations([]);
      setInvitationsLoading(false);
      return;
    }

    const normalizedStatus = String(status ?? "").toLowerCase();
    if (normalizedStatus !== "open") {
      setRoleInvitations([]);
      setInvitationsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchInvitations = async () => {
      try {
        setInvitationsLoading(true);
        const response = await teamService.getTeamSentInvitations(teamId);
        if (cancelled) return;

        const invitations = response.data || [];
        const currentRoleId = roleId;
        const filtered = invitations.filter((invitation) => {
          const invitationRoleId =
            invitation.role?.id ?? invitation.roleId ?? invitation.role_id ?? null;
          return (
            invitationRoleId != null &&
            String(invitationRoleId) === String(currentRoleId)
          );
        });
        setRoleInvitations(filtered);
      } catch (err) {
        console.warn("Could not fetch invitations for role:", err);
        setRoleInvitations([]);
      } finally {
        if (!cancelled) setInvitationsLoading(false);
      }
    };

    fetchInvitations();
    return () => {
      cancelled = true;
    };
  }, [isOpen, canManage, teamId, roleId, status]);

  useEffect(() => {
    const roleCandidateIds = [
      ...new Set(
        [
          ...roleApplications.map(
            (application) => application?.applicant?.id ?? application?.applicant_id ?? null,
          ),
          ...roleInvitations.map(
            (invitation) => invitation?.invitee?.id ?? invitation?.invitee_id ?? null,
          ),
        ]
          .filter((id) => id != null)
          .map(String),
      ),
    ];

    if (!isOpen || !canManage || !roleId || !isRoleOpen || roleCandidateIds.length === 0) {
      setRoleCandidateMatchMap({});
      return;
    }

    let cancelled = false;

    const fetchRoleCandidateMatches = async () => {
      try {
        const response = await matchingService.getMatchingCandidates(roleId, {
          limit: Math.max(roleCandidateIds.length, 20),
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

        setRoleCandidateMatchMap(nextMatchMap);
      } catch (err) {
        console.warn("Could not fetch candidate match scores for role:", err);
        if (!cancelled) {
          setRoleCandidateMatchMap({});
        }
      }
    };

    fetchRoleCandidateMatches();

    return () => {
      cancelled = true;
    };
  }, [isOpen, canManage, isRoleOpen, roleApplications, roleInvitations, roleId]);

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

  useEffect(() => {
    if (!isOpen || !canManage || !isRoleOpen || roleInvitations.length === 0) {
      setInviteeProfileMap({});
      return;
    }

    let cancelled = false;

    const fetchInviteeProfiles = async () => {
      const inviteeIds = [
        ...new Set(
          roleInvitations
            .map((invitation) => {
              const invitee = invitation?.invitee || {};
              return invitee.id ?? invitation.invitee_id ?? null;
            })
            .filter((id) => id != null),
        ),
      ];

      if (inviteeIds.length === 0) {
        setInviteeProfileMap({});
        return;
      }

      try {
        const results = await Promise.allSettled(
          inviteeIds.map((id) => userService.getUserById(id)),
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

          nextProfileMap[String(inviteeIds[index])] = profile;
        });

        setInviteeProfileMap(nextProfileMap);
      } catch (err) {
        console.warn("Could not fetch invitee profile details:", err);
        if (!cancelled) {
          setInviteeProfileMap({});
        }
      }
    };

    fetchInviteeProfiles();

    return () => {
      cancelled = true;
    };
  }, [isOpen, canManage, isRoleOpen, roleInvitations]);

  useEffect(() => {
    if (
      !isOpen ||
      !displayRole ||
      !canViewTeamMemberMatches ||
      !isRoleOpen ||
      teamMemberIdsKey === "[]"
    ) {
      setRoleTeamMembers((prev) => (prev.length === 0 ? prev : []));
      setTeamMembersLoading(false);
      return;
    }

    let cancelled = false;

    const fetchTeamMemberMatches = async () => {
      const roleTags =
        displayRole?.tags?.length > 0
          ? displayRole.tags
          : displayRole?.desiredTags || [];
      const roleBadges =
        displayRole?.badges?.length > 0
          ? displayRole.badges
          : displayRole?.desiredBadges || [];
      const uniqueMembers = [
        ...new Map(
          teamMembers
            .map((member) => {
              const memberId = member?.userId ?? member?.user_id ?? null;
              return memberId != null ? [String(memberId), member] : null;
            })
            .filter(Boolean),
        ).entries(),
      ];

      if (uniqueMembers.length === 0) {
        setRoleTeamMembers([]);
        setTeamMembersLoading(false);
        return;
      }

      try {
        setTeamMembersLoading(true);

        const results = await Promise.allSettled(
          uniqueMembers.map(async ([memberKey, member]) => {
            const memberId = memberKey;
            const [profileRes, tagsRes, badgesRes] = await Promise.allSettled([
              userService.getUserById(memberId),
              userService.getUserTags(memberId),
              userService.getUserBadges(memberId),
            ]);

            const profile =
              profileRes.status === "fulfilled"
                ? extractProfilePayload(profileRes.value)
                : null;
            const memberProfile = {
              ...(member || {}),
              ...(profile || {}),
            };
            const memberTagMap =
              tagsRes.status === "fulfilled"
                ? buildTagLookup(extractListPayload(tagsRes.value))
                : new Map();
            const memberBadgeMap =
              badgesRes.status === "fulfilled"
                ? buildBadgeLookup(extractListPayload(badgesRes.value))
                : new Map();
            const memberMatch = computeRoleUserMatch({
              role: displayRole,
              tags: roleTags,
              badges: roleBadges,
              user: memberProfile,
              userTagMap: memberTagMap,
              userBadgeMap: memberBadgeMap,
            });

            return {
              memberId,
              member: memberProfile,
              teamRole: member?.role ?? null,
              matchScore: memberMatch?.matchScore ?? null,
              matchDetails: memberMatch?.matchDetails ?? null,
            };
          }),
        );

        if (cancelled) return;

        const nextRows = results
          .filter((result) => result.status === "fulfilled")
          .map((result) => result.value)
          .sort((a, b) => {
            const scoreA = Number(a?.matchScore);
            const scoreB = Number(b?.matchScore);
            const hasScoreA = Number.isFinite(scoreA);
            const hasScoreB = Number.isFinite(scoreB);

            if (hasScoreA && hasScoreB && scoreA !== scoreB) {
              return scoreB - scoreA;
            }
            if (hasScoreA && !hasScoreB) return -1;
            if (!hasScoreA && hasScoreB) return 1;

            return getDisplayName(a?.member ?? {}).localeCompare(
              getDisplayName(b?.member ?? {}),
            );
          });

        setRoleTeamMembers(nextRows);
      } catch (error) {
        console.warn("Could not fetch team member matches for role:", error);
        if (!cancelled) {
          setRoleTeamMembers([]);
        }
      } finally {
        if (!cancelled) {
          setTeamMembersLoading(false);
        }
      }
    };

    fetchTeamMemberMatches();

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    displayRole,
    canViewTeamMemberMatches,
    isRoleOpen,
    teamMembers,
    teamMemberIdsKey,
  ]);

  const handleApplicationAction = async (applicationId, action, response = "", fillRole = false) => {
    await teamService.handleTeamApplication(applicationId, action, response, fillRole);
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

  const handleCancelInvitation = async (invitationId) => {
    await teamService.cancelInvitation(invitationId);
    setRoleInvitations((prev) => prev.filter((invitation) => invitation.id !== invitationId));

    try {
      const refreshed = await teamService.getTeamSentInvitations(teamId);
      const invitations = refreshed.data || [];
      const currentRoleId = roleId;
      setRoleInvitations(
        invitations.filter((invitation) => {
          const invitationRoleId =
            invitation.role?.id ?? invitation.roleId ?? invitation.role_id ?? null;
          return (
            invitationRoleId != null &&
            String(invitationRoleId) === String(currentRoleId)
          );
        }),
      );
    } catch (e) {
      console.warn("Could not refresh invitations:", e);
    }
  };

  const handleViewerApplicationCancel = async (applicationId) => {
    await teamService.cancelApplication(applicationId);
    setViewerRoleApplicationRecord(null);
    setIsViewerApplicationDetailsOpen(false);
  };

  const handleViewerInvitationAccept = async (
    invitationId,
    responseMessage = "",
    fillRole = false,
  ) => {
    await teamService.respondToInvitation(
      invitationId,
      "accept",
      responseMessage,
      fillRole,
    );
    setViewerRoleInvitationRecord(null);
    setIsViewerInvitationDetailsOpen(false);
  };

  const handleViewerInvitationDecline = async (
    invitationId,
    responseMessage = "",
  ) => {
    await teamService.respondToInvitation(
      invitationId,
      "decline",
      responseMessage,
    );
    setViewerRoleInvitationRecord(null);
    setIsViewerInvitationDetailsOpen(false);
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

  const teamName =
    displayRole.teamName ??
    displayRole.team_name ??
    displayRole.team?.name ??
    displayRole.team?.team_name ??
    team?.name ??
    team?.team_name ??
    null;
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
  const creatorUserId =
    displayRole.createdBy ??
    displayRole.created_by ??
    displayRole.creatorId ??
    displayRole.creator_id ??
    displayRole.creator?.id ??
    null;
  const creatorName =
    creatorFirstName && creatorLastName
      ? `${creatorFirstName} ${creatorLastName}`
      : creatorUsername || null;
  const canOpenTeamModal = Boolean(teamId && teamModal?.openTeamModal);
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
  // Prefer locally-computed match when available: it uses the hydrated role
  // (with lat/lng after geocoding) and the user's actual profile data, so it
  // gives the real distance score and correct distanceKm / isWithinRange.
  // Fall back to the server value when local computation hasn't run yet.
  const effectiveMatchScore =
    computedRoleMatch?.matchScore != null
      ? computedRoleMatch.matchScore
      : isFilledRole ? null : serverRoleMatchScore;
  const effectiveMatchDetails =
    computedRoleMatch?.matchDetails != null
      ? computedRoleMatch.matchDetails
      : isFilledRole ? null : serverRoleMatchDetails;
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
  const handleCreatorUserClick = () => {
    if (creatorUserId && userModal?.openUserModal) {
      userModal.openUserModal(creatorUserId, {
        teamName: teamName ?? null,
      });
    }
  };
  const handleTeamClick = () => {
    if (teamId && teamModal?.openTeamModal) {
      teamModal.openTeamModal(teamId, teamName ?? undefined, {
        zIndex: childTeamModalZIndex,
      });
    }
  };

  const modalStatusTitle = isFilledRole ? "Filled Role" : "Vacant Role";
  const demoAvatarOverlay = isSyntheticRole(displayRole) ? (
    <DemoAvatarOverlay
      textClassName="text-[9px]"
      textTranslateClassName="-translate-y-[4px]"
    />
  ) : null;
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
  const roleMatchTagIds = tags
    .map((tag) => Number(tag.tagId ?? tag.tag_id ?? tag.id))
    .filter(Number.isFinite);
  const roleMatchBadgeNames = new Set(
    badges
      .map((badge) => (badge.name ?? badge.badgeName ?? badge.badge_name ?? "").trim().toLowerCase())
      .filter(Boolean),
  );

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

  const getPersonLocationText = (person, fallbackDistanceKm = null) => {
    if (!person) {
      return fallbackDistanceKm != null
        ? `${Math.round(fallbackDistanceKm)} km away`
        : "Location unavailable";
    }

    const locationLabel = formatLocation(normalizeLocationData(person), {
      displayType: "short",
      showCountry: true,
    });

    if (locationLabel) return locationLabel;

    return fallbackDistanceKm != null
      ? `${Math.round(fallbackDistanceKm)} km away`
      : "Location unavailable";
  };

  const locationText = getLocationText();
  const handleTeamMemberClick = (memberRow) => {
    const memberId = memberRow?.memberId ?? memberRow?.member?.id ?? null;

    if (!memberId || !userModal?.openUserModal) return;

    userModal.openUserModal(memberId, {
      roleMatchTagIds: new Set(roleMatchTagIds),
      roleMatchBadgeNames: new Set(roleMatchBadgeNames),
      roleMatchName: roleName,
      roleMatchMaxDistanceKm: maxDistanceKm ?? null,
      showMatchHighlights: true,
      matchScore: memberRow?.matchScore ?? null,
      matchType: "role_match",
      matchDetails: memberRow?.matchDetails ?? null,
      distanceKm:
        memberRow?.matchDetails?.distanceKm ??
        memberRow?.matchDetails?.distance_km ??
        memberRow?.member?.distance_km ??
        memberRow?.member?.distanceKm ??
        null,
      teamName: teamName ?? null,
      invitationPrefillTeamId: teamId ?? null,
      invitationPrefillRoleId: roleId ?? null,
      invitationPrefillTeamName: teamName ?? null,
      invitationPrefillRoleName: roleName ?? null,
    });
  };

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
    const searchTeamName = teamName ?? "";
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

  const getRoleCandidateMatch = (userId) => {
    if (userId == null) return null;

    const key = String(userId);
    return teamMemberScoreMap[key] ?? roleCandidateMatchMap[key] ?? null;
  };
  const isCurrentTeamMember = (userId) =>
    userId != null && currentTeamMemberIds.has(String(userId));

  const getApplicationApplicantScore = (application) => {
    if (!application) return null;

    const applicantId =
      application?.applicant?.id ??
      application?.applicant_id ??
      null;
    const applicantMatch = getRoleCandidateMatch(applicantId);
    const rawScore =
      applicantMatch?.matchScore ??
      applicantMatch?.match_score ??
      application?.role?.matchScore ??
      application?.role?.match_score ??
      null;
    const numericScore = Number(rawScore);

    return Number.isFinite(numericScore) ? numericScore : null;
  };

  const getInvitationInviteeScore = (invitation) => {
    if (!invitation) return null;

    const inviteeId =
      invitation?.invitee?.id ??
      invitation?.invitee_id ??
      null;
    const inviteeMatch = getRoleCandidateMatch(inviteeId);
    const rawScore =
      inviteeMatch?.matchScore ??
      inviteeMatch?.match_score ??
      invitation?.role?.matchScore ??
      invitation?.role?.match_score ??
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
  const visibleRoleApplications = isApplicationsExpanded
    ? sortedRoleApplications
    : sortedRoleApplications.slice(0, COLLAPSED_COUNT);
  const sortedRoleInvitations = [...roleInvitations].sort((a, b) => {
    const scoreA = getInvitationInviteeScore(a);
    const scoreB = getInvitationInviteeScore(b);

    if (scoreA == null && scoreB == null) return 0;
    if (scoreA == null) return 1;
    if (scoreB == null) return -1;

    return scoreB - scoreA;
  });
  const visibleRoleInvitations = isInvitationsExpanded
    ? sortedRoleInvitations
    : sortedRoleInvitations.slice(0, COLLAPSED_COUNT);

  // Detect if the current user already has a pending application for this role.
  // roleApplications is only populated when canManage=true, which covers the
  // main scenario (owner/admin applying internally). When canManage=false,
  // this is null and the Apply button shows normally.
  const currentUserRoleApplication =
    !applicationsLoading && canManage && currentUser?.id != null
      ? (roleApplications.find((app) => {
          const applicantId = app.applicant?.id ?? app.applicant_id;
          return String(applicantId) === String(currentUser.id);
        }) ?? null)
      : null;
  const effectiveViewerRoleApplication =
    viewerRoleApplicationRecord ?? currentUserRoleApplication;
  const effectiveViewerRoleInvitation = viewerRoleInvitationRecord;
  const visibleRoleTeamMembers = isTeamMembersExpanded
    ? roleTeamMembers
    : roleTeamMembers.slice(0, COLLAPSED_COUNT);
  const modalTitle = (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-2">
        <ModalStatusIcon
          className={isFilledRole ? "text-success" : "text-orange-500"}
          size={20}
        />
        <h2 className="text-base font-medium leading-snug sm:text-lg">
          {modalStatusTitle}
        </h2>
      </div>
      {!isFilledRole && isTeamMember && (tags.length > 0 || badges.length > 0) && !hideActions && (
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
                className={`w-20 h-20 rounded-full relative overflow-hidden ${filledRoleUser?.id ? "cursor-pointer" : ""}`}
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
                {demoAvatarOverlay}
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
                {demoAvatarOverlay}
              </div>
            ) : (
              <div className="bg-amber-500 text-white rounded-full w-20 h-20 relative flex items-center justify-center overflow-hidden">
                <span className="text-2xl">{getRoleInitials()}</span>
                {demoAvatarOverlay}
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

            {teamMemberCount != null && (
              <div className="flex items-center gap-1 mt-1 text-sm text-base-content/70">
                <Users size={14} className="text-primary flex-shrink-0" />
                <span className="text-base-content/50">
                  {teamMemberCount}/{teamMaxMembers ?? "∞"} members
                </span>
              </div>
            )}

            {(isFilledRole ? filledAt : createdAt) && (
              <div className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-base-content/50">
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
                ) : !isFilledRole && creatorName ? (
                  <span>
                    {" "}by{" "}
                    {creatorUserId ? (
                      <Tooltip content={`Click to view ${creatorName}'s profile`}>
                        <button
                          type="button"
                          className="hover:text-primary transition-colors font-medium"
                          onClick={handleCreatorUserClick}
                        >
                          {creatorName}
                        </button>
                      </Tooltip>
                    ) : (
                      <span>{creatorName}</span>
                    )}
                  </span>
                ) : null}
                {!isFilledRole && teamName ? (
                  <span className="ml-1 inline-flex min-w-0 max-w-full items-center gap-1">
                    <Users size={12} className="flex-shrink-0" />
                    {canOpenTeamModal ? (
                      <Tooltip content={`Click to view ${teamName}`}>
                        <button
                          type="button"
                          className="min-w-0 text-left font-medium whitespace-normal break-words transition-colors hover:text-primary"
                          onClick={handleTeamClick}
                        >
                          {teamName}
                        </button>
                      </Tooltip>
                    ) : (
                      <span className="min-w-0 whitespace-normal break-words">
                        {teamName}
                      </span>
                    )}
                  </span>
                ) : null}
              </div>
            )}

            {isSyntheticRole(displayRole) && (
              <Tooltip
                content={DEMO_ROLE_TOOLTIP}
                wrapperClassName="mt-1 flex items-center gap-1 text-base-content/50 text-xs"
              >
                <FlaskConical size={12} className="flex-shrink-0" />
                <span>Demo Role</span>
              </Tooltip>
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
                {visibleRoleApplications.map((application) => {
                  const applicant = application.applicant || {};
                  const applicantId =
                    applicant.id ??
                    application.applicant_id ??
                    null;
                  const applicantMatch = getRoleCandidateMatch(applicantId);
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
                    applicantMatch?.matchScore ??
                    applicantMatch?.match_score ??
                    applicationRoleMatch.matchScore ??
                    applicationRoleMatch.match_score ??
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
                  const applicantIsTeamMember = isCurrentTeamMember(applicantId);
                  const applicationDate = formatDate(
                    application?.created_at ??
                    application?.createdAt ??
                    application?.date ??
                    application?.applied_at,
                  );
                  const locationLabel = getPersonLocationText(
                    applicantProfile,
                    applicantDistanceKm,
                  );
                  const applicantTooltipName = firstName || displayName || "this applicant";
                  const applicantTooltip = `Click to view ${toPossessive(applicantTooltipName)} full application for the team`;

                  return (
                    <Tooltip
                      key={application.id}
                      content={applicantTooltip}
                      wrapperClassName="block w-full"
                    >
                      <button
                        type="button"
                        className={`flex items-start rounded-xl shadow p-4 gap-4 transition-all duration-200 hover:shadow-md cursor-pointer text-left w-full ${
                          applicantIsTeamMember
                            ? "bg-green-50 hover:bg-green-100"
                            : "bg-white hover:bg-base-100"
                        }`}
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
                              {applicationDate && (
                                <CardMetaItem icon={Mail}>
                                  {applicationDate}
                                </CardMetaItem>
                              )}
                              {applicantIsTeamMember && (
                                <Tooltip
                                  content="Member of this team"
                                  wrapperClassName="flex items-start gap-0.5 min-w-0"
                                >
                                  <Users
                                    size={10}
                                    className="text-success shrink-0 mt-[3px]"
                                  />
                                </Tooltip>
                              )}
                              <CardMetaItem icon={MapPin}>
                                {locationLabel}
                              </CardMetaItem>
                            </CardMetaRow>
                          </div>
                        </div>
                      </button>
                    </Tooltip>
                  );
                })}
              </div>

              {sortedRoleApplications.length > COLLAPSED_COUNT && (
                <button
                  type="button"
                  className="flex items-center gap-1 mt-3 text-sm text-base-content/50 hover:text-base-content/80 transition-colors"
                  onClick={() =>
                    setIsApplicationsExpanded((value) => !value)
                  }
                >
                  {isApplicationsExpanded ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                  {isApplicationsExpanded ? "Show less" : "Show all"}
                </button>
              )}
            </div>
          ) : null
        )}

        {/* Invited for this role — admin/owner only */}
        {canManage && isRoleOpen && (
          invitationsLoading ? (
            <div className="flex justify-center py-3">
              <span className="loading loading-spinner loading-sm text-primary"></span>
            </div>
          ) : roleInvitations.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <SendHorizontal size={18} className="mr-2 text-primary flex-shrink-0" />
                  <h3 className="font-medium">Invited for this role</h3>
                </div>
                <span className="text-sm text-base-content/50">
                  ({roleInvitations.length})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {visibleRoleInvitations.map((invitation) => {
                  const invitee = invitation.invitee || {};
                  const inviteeId =
                    invitee.id ??
                    invitation.invitee_id ??
                    null;
                  const inviteeMatch = getRoleCandidateMatch(inviteeId);
                  const inviteeProfileDetails =
                    inviteeId != null
                      ? inviteeProfileMap[String(inviteeId)] ?? null
                      : null;
                  const inviteeProfile = {
                    ...(invitee || {}),
                    ...(inviteeMatch || {}),
                    ...(inviteeProfileDetails || {}),
                  };
                  const firstName =
                    inviteeProfile.firstName ??
                    inviteeProfile.first_name ??
                    "";
                  const lastName =
                    inviteeProfile.lastName ??
                    inviteeProfile.last_name ??
                    "";
                  const username = inviteeProfile.username ?? "";
                  const avatarUrl =
                    inviteeProfile.avatarUrl ??
                    inviteeProfile.avatar_url ??
                    null;
                  const displayName = firstName && lastName
                    ? `${firstName} ${lastName}`
                    : firstName || lastName || username || "Unknown";
                  const initials = firstName && lastName
                    ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
                    : (firstName || lastName || username || "?")
                        .charAt(0)
                        .toUpperCase();
                  const invitationRoleMatch = invitation.role || {};
                  const inviteeScore =
                    inviteeMatch?.matchScore ??
                    inviteeMatch?.match_score ??
                    invitationRoleMatch.matchScore ??
                    invitationRoleMatch.match_score ??
                    null;
                  const inviteeDistanceKm =
                    invitationRoleMatch.matchDetails?.distanceKm ??
                    invitationRoleMatch.matchDetails?.distance_km ??
                    invitationRoleMatch.match_details?.distanceKm ??
                    invitationRoleMatch.match_details?.distance_km ??
                    inviteeMatch?.matchDetails?.distanceKm ??
                    inviteeMatch?.matchDetails?.distance_km ??
                    inviteeMatch?.match_details?.distanceKm ??
                    inviteeMatch?.match_details?.distance_km ??
                    null;
                  const inviteeMatchTier =
                    inviteeScore != null ? getMatchTier(inviteeScore) : null;
                  const InviteeMatchIcon = inviteeMatchTier?.Icon ?? null;
                  const inviteeIsTeamMember = isCurrentTeamMember(inviteeId);
                  const locationLabel = getPersonLocationText(
                    inviteeProfile,
                    inviteeDistanceKm,
                  );
                  const invitationDate = formatDate(
                    invitation?.created_at ??
                    invitation?.createdAt ??
                    invitation?.date ??
                    invitation?.sent_at,
                  );
                  const inviteeTooltipName = firstName || displayName || "this invitee";
                  const inviteeTooltip = `Click to view ${toPossessive(inviteeTooltipName)} pending invitation for this role`;

                  return (
                    <Tooltip
                      key={invitation.id}
                      content={inviteeTooltip}
                      wrapperClassName="block w-full"
                    >
                      <button
                        type="button"
                        className={`flex items-start rounded-xl shadow p-4 gap-4 transition-all duration-200 hover:shadow-md cursor-pointer text-left w-full ${
                          inviteeIsTeamMember
                            ? "bg-green-50 hover:bg-green-100"
                            : "bg-white hover:bg-base-100"
                        }`}
                        onClick={() => {
                          setHighlightInviteeId(inviteeId);
                          setInvitationsModalOpen(true);
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
                          {InviteeMatchIcon && (
                            <div
                              className={`absolute -top-0.5 -left-0.5 w-[14px] h-[14px] rounded-full ring-2 ring-white flex items-center justify-center ${inviteeMatchTier.bg}`}
                              title={`${inviteeMatchTier.pct}% ${inviteeMatchTier.label.toLowerCase()}`}
                            >
                              <InviteeMatchIcon
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
                            </div>

                            <CardMetaRow>
                              {inviteeMatchTier && (
                                <div className="flex items-start gap-0.5 min-w-0">
                                  <InviteeMatchIcon
                                    size={10}
                                    className={`${inviteeMatchTier.text} shrink-0 mt-[3px]`}
                                  />
                                  <span className="text-base-content/60 leading-tight whitespace-nowrap">
                                    {inviteeMatchTier.pct}%
                                  </span>
                                </div>
                              )}
                              {invitationDate && (
                                <CardMetaItem icon={SendHorizontal}>
                                  {invitationDate}
                                </CardMetaItem>
                              )}
                              {inviteeIsTeamMember && (
                                <Tooltip
                                  content="Member of this team"
                                  wrapperClassName="flex items-start gap-0.5 min-w-0"
                                >
                                  <Users
                                    size={10}
                                    className="text-success shrink-0 mt-[3px]"
                                  />
                                </Tooltip>
                              )}
                              <CardMetaItem icon={MapPin}>
                                {locationLabel}
                              </CardMetaItem>
                            </CardMetaRow>
                          </div>
                        </div>
                      </button>
                    </Tooltip>
                  );
                })}
              </div>

              {sortedRoleInvitations.length > COLLAPSED_COUNT && (
                <button
                  type="button"
                  className="flex items-center gap-1 mt-3 text-sm text-base-content/50 hover:text-base-content/80 transition-colors"
                  onClick={() =>
                    setIsInvitationsExpanded((value) => !value)
                  }
                >
                  {isInvitationsExpanded ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                  {isInvitationsExpanded ? "Show less" : "Show all"}
                </button>
              )}
            </div>
          ) : null
        )}

        {canViewTeamMemberMatches && isRoleOpen && (
          teamMembersLoading ? (
            <div className="flex justify-center py-3">
              <span className="loading loading-spinner loading-sm text-primary"></span>
            </div>
          ) : roleTeamMembers.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Users size={18} className="mr-2 text-primary flex-shrink-0" />
                  <h3 className="font-medium">Existing team members</h3>
                </div>
                <span className="text-sm text-base-content/50">
                  ({roleTeamMembers.length})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {visibleRoleTeamMembers.map((memberRow) => {
                  const member = memberRow.member || {};
                  const memberId =
                    memberRow.memberId ??
                    member.id ??
                    member.userId ??
                    member.user_id ??
                    null;
                  const avatarUrl =
                    member.avatarUrl ?? member.avatar_url ?? null;
                  const displayName = getDisplayName(member);
                  const initials = getUserInitials(member);
                  const memberScore =
                    memberRow.matchScore != null
                      ? Number(memberRow.matchScore)
                      : null;
                  const memberMatchTier =
                    memberScore != null ? getMatchTier(memberScore) : null;
                  const MemberMatchIcon = memberMatchTier?.Icon ?? null;
                  const memberDistanceKm =
                    memberRow.matchDetails?.distanceKm ??
                    memberRow.matchDetails?.distance_km ??
                    null;
                  const locationLabel = getPersonLocationText(
                    member,
                    memberDistanceKm,
                  );
                  const memberTooltipName =
                    member.firstName ??
                    member.first_name ??
                    displayName ??
                    "this member";
                  const memberTooltip = `Click to view ${toPossessive(memberTooltipName)} profile matching score for this role`;

                  return (
                    <Tooltip
                      key={memberId ?? displayName}
                      content={memberTooltip}
                      wrapperClassName="block w-full"
                    >
                      <button
                        type="button"
                        className="flex items-start bg-green-50 rounded-xl shadow p-4 gap-4 transition-all duration-200 hover:bg-green-100 hover:shadow-md cursor-pointer text-left w-full"
                        onClick={() => handleTeamMemberClick(memberRow)}
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
                          {MemberMatchIcon && (
                            <div
                              className={`absolute -top-0.5 -left-0.5 w-[14px] h-[14px] rounded-full ring-2 ring-white flex items-center justify-center ${memberMatchTier.bg}`}
                              title={`${memberMatchTier.pct}% ${memberMatchTier.label.toLowerCase()}`}
                            >
                              <MemberMatchIcon
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
                            </div>

                            <CardMetaRow>
                              {memberMatchTier && (
                                <div className="flex items-start gap-0.5 min-w-0">
                                  <MemberMatchIcon
                                    size={10}
                                    className={`${memberMatchTier.text} shrink-0 mt-[3px]`}
                                  />
                                  <span className="text-base-content/60 leading-tight whitespace-nowrap">
                                    {memberMatchTier.pct}%
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
                    </Tooltip>
                  );
                })}
              </div>

              {roleTeamMembers.length > COLLAPSED_COUNT && (
                <button
                  type="button"
                  className="flex items-center gap-1 mt-3 text-sm text-base-content/50 hover:text-base-content/80 transition-colors"
                  onClick={() => setIsTeamMembersExpanded((value) => !value)}
                >
                  {isTeamMembersExpanded ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                  {isTeamMembersExpanded ? "Show less" : "Show all"}
                </button>
              )}
            </div>
          ) : null
        )}

        {!hideActions && (
          <>
            {effectiveViewerRoleInvitation ? (
              <div className="mt-6 border-t border-base-200 pt-4">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => setIsViewerInvitationDetailsOpen(true)}
                  icon={<Mail size={16} />}
                >
                  Click to view Invitation details
                </Button>
              </div>
            ) : onViewApplicationDetails ? (
              <div className="mt-6 border-t border-base-200 pt-4">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={onViewApplicationDetails}
                  icon={<SendHorizontal size={16} />}
                >
                  Click to view application details
                </Button>
              </div>
            ) : effectiveViewerRoleApplication ? (
              <div className="mt-6 border-t border-base-200 pt-4">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => setIsViewerApplicationDetailsOpen(true)}
                  icon={<SendHorizontal size={16} />}
                >
                  Click to view application details
                </Button>
              </div>
            ) : (
              <>
                {isAuthenticated &&
                  !viewerRoleStatusLoading &&
                  !isTeamMember &&
                  isRoleOpen && (
                  <div className="mt-6 border-t border-base-200 pt-4">
                    <TeamApplicationButton
                      team={applicationTeam}
                      teamId={teamId}
                      roleId={roleId}
                      className="w-full"
                      buttonLabel="Apply to join Team and to fill this Role"
                    />
                  </div>
                )}

                {isAuthenticated &&
                  !viewerRoleStatusLoading &&
                  isTeamMember &&
                  isRoleOpen &&
                  !applicationsLoading && (
                  <div className="mt-6 border-t border-base-200 pt-4">
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => setIsInternalApplicationOpen(true)}
                      icon={<UserSearch size={16} />}
                    >
                      Apply to fill this Role within your Team
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
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

    {isViewerApplicationDetailsOpen && effectiveViewerRoleApplication && (
      <TeamApplicationDetailsModal
        isOpen={isViewerApplicationDetailsOpen}
        application={effectiveViewerRoleApplication}
        onClose={() => setIsViewerApplicationDetailsOpen(false)}
        onCancel={handleViewerApplicationCancel}
      />
    )}

    {invitationsModalOpen && (
      <TeamInvitesModal
        isOpen={invitationsModalOpen}
        onClose={() => {
          setInvitationsModalOpen(false);
          setHighlightInviteeId(null);
        }}
        teamId={teamId}
        invitations={roleInvitations}
        onCancelInvitation={handleCancelInvitation}
        teamName={teamName}
        highlightUserId={highlightInviteeId}
      />
    )}

    {isViewerInvitationDetailsOpen && effectiveViewerRoleInvitation && (
      <TeamInvitationDetailsModal
        isOpen={isViewerInvitationDetailsOpen}
        invitation={effectiveViewerRoleInvitation}
        onClose={() => setIsViewerInvitationDetailsOpen(false)}
        onAccept={handleViewerInvitationAccept}
        onDecline={handleViewerInvitationDecline}
      />
    )}

    <TeamApplicationModal
      isOpen={isInternalApplicationOpen}
      onClose={() => setIsInternalApplicationOpen(false)}
      team={team}
      teamId={teamId}
      initialRoleId={roleId}
      isInternal={true}
      onSubmit={async (applicationData) => {
        try {
          await teamService.applyToJoinTeam(teamId, {
            ...applicationData,
            roleId: applicationData.roleId ?? roleId,
          });
        } catch (error) {
          throw new Error(
            error.response?.data?.message || "Failed to submit role application"
          );
        }
      }}
    />
    </>
  );
};

export default VacantRoleDetailsModal;
