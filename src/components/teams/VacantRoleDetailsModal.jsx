import React, { useState, useEffect, useMemo, useLayoutEffect, useRef } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  MapPin,
  Globe,
  UserSearch,
  UserCheck,
  UserX,
  Tag,
  Award,
  Calendar,
  Users,
  Mail,
  CircleDot,
  Check,
  CheckCheck,
  X,
  ChevronRight,
  ChevronUp,
  SendHorizontal,
  FlaskConical,
  Edit,
  Trash2,
  XCircle,
  CheckCircle,
  PenLine,
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
import {
  fetchUserBadges,
  fetchUserProfile,
  fetchUserTags,
  userBadgesQueryKey,
  useUserBadges,
  useUserProfile,
  useUserTags,
  userProfileQueryKey,
  userTagsQueryKey,
} from "../../hooks/useUserQueries";
import { teamService } from "../../services/teamService";
import { vacantRoleService } from "../../services/vacantRoleService";
import { messageService } from "../../services/messageService";
import useViewerPendingRequests from "../../hooks/useViewerPendingRequests";
import { buildRoleInvitationAcceptedMessage } from "../../utils/roleEventMessages";
import { getMatchTier } from "../../utils/matchScoreUtils";
import {
  DEMO_PROFILE_TOOLTIP,
  DEMO_ROLE_TOOLTIP,
  getDisplayName,
  getUserInitials,
  isSyntheticRole,
  isSyntheticUser,
} from "../../utils/userHelpers";
import {
  normalizeLocationData,
  formatLocation,
} from "../../utils/locationUtils";
import {
  buildBadgeLookup,
  buildTagLookup,
  computeRoleUserMatch,
} from "../../utils/matchHelpers";
import { formatDisplayName } from "../../utils/nameFormatters";
import { resolveFilledRoleUser } from "../../utils/vacantRoleUtils";
import { useUserModalSafe } from "../../contexts/UserModalContext";
import { useTeamModalSafe } from "../../contexts/TeamModalContext";
import { useChildModalZIndex } from "../../contexts/ModalLayerContext";

const COLLAPSED_COUNT = 4;
const EMPTY_TEAM_MEMBERS = [];
const roleMemberMatchDataQueryKey = (memberId) => [
  "users",
  memberId ?? null,
  "roleMemberMatchData",
];

const toPossessive = (value) =>
  !value ? "your" : value.endsWith("s") ? `${value}'` : `${value}'s`;

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
  showMatchScore = true,
  canManage = false,
  isTeamMember = false,
  viewAsUserId = null,
  viewAsUser = null,
  onViewApplicationDetails = null,
  hideActions = false,
  onEdit = null,
  onDelete = null,
  onStatusChange = null,
}) => {
  const { user: currentUser, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
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
  const [roleInvitations, setRoleInvitations] = useState([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invitationsModalOpen, setInvitationsModalOpen] = useState(false);
  const [highlightInviteeId, setHighlightInviteeId] = useState(null);
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
  const [filledRoleUserIds, setFilledRoleUserIds] = useState(new Set());
  const [viewerTeamRoleLoading, setViewerTeamRoleLoading] = useState(false);
  const [isViewerApplicationDetailsOpen, setIsViewerApplicationDetailsOpen] =
    useState(false);
  const [isViewerInvitationDetailsOpen, setIsViewerInvitationDetailsOpen] =
    useState(false);
  const [roleDateIsNarrow, setRoleDateIsNarrow] = useState(false);
  const roleDateIsNarrowRef = useRef(false);
  roleDateIsNarrowRef.current = roleDateIsNarrow;
  const roleTitleContainerRef = useRef(null);
  const roleTitleProbeRef = useRef(null);
  const roleDateRef = useRef(null);
  const roleId = role?.id;
  const teamId = role?.teamId ?? role?.team_id ?? team?.id;
  const teamMembers = Array.isArray(team?.members) ? team.members : EMPTY_TEAM_MEMBERS;
  const currentTeamMemberIds = new Set(
    teamMembers
      .map((member) => member?.userId ?? member?.user_id ?? null)
      .filter((id) => id != null)
      .map(String),
  );
  const viewerIsTeamMember = Boolean(
    isTeamMember ||
      canManage ||
      (currentUser?.id != null && currentTeamMemberIds.has(String(currentUser.id))),
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
  const canViewTeamMemberMatches = canManage || viewerIsTeamMember;
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
      setRoleInvitations([]);
      setInvitationsLoading(false);
      setInvitationsModalOpen(false);
      setHighlightInviteeId(null);
      setRoleTeamMembers([]);
      setTeamMembersLoading(false);
      setIsApplicationsExpanded(false);
      setIsInvitationsExpanded(false);
      setIsTeamMembersExpanded(false);
      setViewerRoleApplicationRecord(null);
      setViewerRoleInvitationRecord(null);
      setViewerRoleStatusLoading(false);
      setFilledRoleUserIds(new Set());
      setViewerTeamRoleLoading(false);
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
  const isClosedRole = String(status ?? "").toLowerCase() === "closed";
  const shouldShowRoleMatchScore = showMatchScore || isFilledRole;
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
  const shouldFetchComparisonData = Boolean(
    isOpen &&
      isAuthenticated &&
      comparisonUserId &&
      shouldShowRoleMatchScore,
  );
  const comparisonUserProfileQuery = useUserProfile(comparisonUserId, {
    enabled: shouldFetchComparisonData,
  });
  const comparisonUserTagsQuery = useUserTags(comparisonUserId, {
    enabled: shouldFetchComparisonData,
  });
  const comparisonUserBadgesQuery = useUserBadges(comparisonUserId, {
    enabled: shouldFetchComparisonData,
  });
  const {
    data: viewerPendingData,
    isLoading: viewerPendingLoading,
    isFetching: viewerPendingFetching,
    error: viewerPendingError,
  } = useViewerPendingRequests(currentUser?.id, {
    enabled: Boolean(isOpen && isAuthenticated && currentUser?.id),
  });
  const roleMemberEntries = useMemo(
    () => [
      ...new Map(
        teamMembers
          .map((member) => {
            const memberId = member?.userId ?? member?.user_id ?? null;
            return memberId != null ? [String(memberId), member] : null;
          })
          .filter(Boolean),
      ).entries(),
    ],
    [teamMembers],
  );
  const roleMatchTags = useMemo(
    () =>
      displayRole?.tags?.length > 0
        ? displayRole.tags
        : displayRole?.desiredTags || [],
    [displayRole],
  );
  const roleMatchBadges = useMemo(
    () =>
      displayRole?.badges?.length > 0
        ? displayRole.badges
        : displayRole?.desiredBadges || [],
    [displayRole],
  );
  const shouldFetchRoleMemberMatches = Boolean(
    isOpen &&
      displayRole &&
      canViewTeamMemberMatches &&
      isRoleOpen &&
      isTeamMembersExpanded &&
      roleMemberEntries.length > 0,
  );
  const roleMemberMatchQueries = useQueries({
    queries: roleMemberEntries.map(([memberId, member]) => ({
      queryKey: roleMemberMatchDataQueryKey(memberId),
      queryFn: async () => {
        const [profile, tags, badges] = await Promise.all([
          queryClient.fetchQuery({
            queryKey: userProfileQueryKey(memberId),
            queryFn: () => fetchUserProfile(memberId),
            staleTime: 30_000,
          }),
          queryClient.fetchQuery({
            queryKey: userTagsQueryKey(memberId),
            queryFn: () => fetchUserTags(memberId),
            staleTime: 30_000,
          }),
          queryClient.fetchQuery({
            queryKey: userBadgesQueryKey(memberId),
            queryFn: () => fetchUserBadges(memberId),
            staleTime: 30_000,
          }),
        ]);

        return {
          memberId,
          member: {
            ...(member || {}),
            ...(profile || {}),
          },
          teamRole: member?.role ?? null,
          userTagMap: buildTagLookup(tags),
          userBadgeMap: buildBadgeLookup(badges),
        };
      },
      enabled: shouldFetchRoleMemberMatches,
      staleTime: 30_000,
    })),
  });
  const roleMemberMatchQuerySignature = roleMemberMatchQueries
    .map(
      (query) =>
        `${query.status}:${query.dataUpdatedAt ?? 0}:${query.errorUpdatedAt ?? 0}`,
    )
    .join("|");
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
          { isInternalRoleApplication: viewerIsTeamMember },
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
          { isInternal: viewerIsTeamMember },
        )
      : null;

    setViewerRoleApplicationRecord(seededApplication);
    setViewerRoleInvitationRecord(seededInvitation);

    if (viewerPendingLoading || viewerPendingFetching) {
      setViewerRoleStatusLoading(true);
      return;
    }

    if (viewerPendingError) {
      console.warn("Could not fetch viewer role status:", viewerPendingError);
      setViewerRoleStatusLoading(false);
      return;
    }

    let nextApplication = seededApplication;
    let nextInvitation = seededInvitation;

    const pendingApplications = Array.isArray(viewerPendingData?.applications)
      ? viewerPendingData.applications
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
          { isInternalRoleApplication: viewerIsTeamMember },
        )
      : null;

    const receivedInvitations = Array.isArray(viewerPendingData?.invitations)
      ? viewerPendingData.invitations
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
          { isInternal: viewerIsTeamMember },
        )
      : null;

    setViewerRoleApplicationRecord(nextApplication);
    setViewerRoleInvitationRecord(nextInvitation);
    setViewerRoleStatusLoading(false);
  }, [
    displayRole,
    isAuthenticated,
    isOpen,
    viewerIsTeamMember,
    viewerPendingData,
    viewerPendingError,
    viewerPendingFetching,
    viewerPendingLoading,
    role,
    roleId,
    roleNameForStatusMatch,
    team,
    teamId,
  ]);

  useEffect(() => {
    if (!isOpen || !isAuthenticated || !viewerIsTeamMember || !teamId || !currentUser?.id) {
      setFilledRoleUserIds(new Set());
      setViewerTeamRoleLoading(false);
      return;
    }

    let cancelled = false;
    setViewerTeamRoleLoading(true);

    const checkViewerHoldsRole = async () => {
      try {
        const response = await vacantRoleService.getVacantRoles(teamId, "filled");
        if (cancelled) return;
        const filledRoles = Array.isArray(response?.data) ? response.data : [];
        const ids = new Set(
          filledRoles
            .map((r) => r.filledBy ?? r.filled_by ?? r.filledByUser?.id ?? r.filled_by_user?.id ?? null)
            .filter((id) => id != null)
            .map(String),
        );
        setFilledRoleUserIds(ids);
      } catch {
        setFilledRoleUserIds(new Set());
      } finally {
        if (!cancelled) setViewerTeamRoleLoading(false);
      }
    };

    checkViewerHoldsRole();

    return () => {
      cancelled = true;
    };
  }, [isOpen, isAuthenticated, viewerIsTeamMember, teamId, currentUser?.id]);

  useEffect(() => {
    if (!shouldFetchComparisonData) {
      setComparisonUserProfile(null);
      setLoadingComparisonData(false);
      setComparisonDataLoaded(false);
      setUserTagMap(new Map());
      setUserBadgeMap(new Map());
      return;
    }

    const fallbackComparisonUser = comparisonUserSeedJson
      ? JSON.parse(comparisonUserSeedJson)
      : null;
    const queries = [
      comparisonUserProfileQuery,
      comparisonUserTagsQuery,
      comparisonUserBadgesQuery,
    ];
    const hasPendingQuery = queries.some(
      (query) => query.isLoading || query.isFetching,
    );

    setLoadingComparisonData(hasPendingQuery);

    if (hasPendingQuery) {
      setComparisonDataLoaded(false);
      return;
    }

    if (queries.some((query) => query.isError)) {
      console.warn("Could not fetch user data for matching highlights:", {
        profileError: comparisonUserProfileQuery.error ?? null,
        tagsError: comparisonUserTagsQuery.error ?? null,
        badgesError: comparisonUserBadgesQuery.error ?? null,
      });
    }

    setComparisonUserProfile({
      ...(fallbackComparisonUser || {}),
      ...(comparisonUserProfileQuery.data || {}),
    });
    setUserTagMap(buildTagLookup(comparisonUserTagsQuery.data ?? []));
    setUserBadgeMap(buildBadgeLookup(comparisonUserBadgesQuery.data ?? []));
    setLoadingComparisonData(false);
    setComparisonDataLoaded(true);
  }, [
    comparisonUserBadgesQuery.data,
    comparisonUserBadgesQuery.error,
    comparisonUserBadgesQuery.isError,
    comparisonUserBadgesQuery.isFetching,
    comparisonUserBadgesQuery.isLoading,
    comparisonUserProfileQuery.data,
    comparisonUserProfileQuery.error,
    comparisonUserProfileQuery.isError,
    comparisonUserProfileQuery.isFetching,
    comparisonUserProfileQuery.isLoading,
    comparisonUserTagsQuery.data,
    comparisonUserTagsQuery.error,
    comparisonUserTagsQuery.isError,
    comparisonUserTagsQuery.isFetching,
    comparisonUserTagsQuery.isLoading,
    comparisonUserSeedJson,
    shouldFetchComparisonData,
  ]);

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
    if (!shouldFetchRoleMemberMatches) {
      setRoleTeamMembers((prev) => (prev.length === 0 ? prev : []));
      setTeamMembersLoading(false);
      return;
    }

    const hasPendingQuery = roleMemberMatchQueries.some(
      (query) => query.isLoading || query.isFetching,
    );

    setTeamMembersLoading(hasPendingQuery);
    if (hasPendingQuery) return;

    const nextRows = roleMemberMatchQueries
      .map((query) => {
        if (query.isError) {
          console.warn("Could not fetch team member match data for role:", query.error);
          return null;
        }
        if (!query.data) return null;

        const memberMatch = computeRoleUserMatch({
          role: displayRole,
          tags: roleMatchTags,
          badges: roleMatchBadges,
          user: query.data.member,
          userTagMap: query.data.userTagMap,
          userBadgeMap: query.data.userBadgeMap,
        });

        return {
          memberId: query.data.memberId,
          member: query.data.member,
          teamRole: query.data.teamRole,
          matchScore: memberMatch?.matchScore ?? null,
          matchDetails: memberMatch?.matchDetails ?? null,
        };
      })
      .filter(Boolean)
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
    setTeamMembersLoading(false);
  }, [
    displayRole,
    roleMatchBadges,
    roleMatchTags,
    roleMemberMatchQuerySignature,
    shouldFetchRoleMemberMatches,
  ]);

  const handleApplicationAction = async (applicationId, action, response = "", fillRole = false) => {
    const result = await teamService.handleTeamApplication(applicationId, action, response, fillRole);
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
    return result;
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

  const handleCancelRoleInvitation = async (invitationId) => {
    await teamService.cancelRoleInvitation(invitationId);
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
    options = {},
  ) => {
    const roleForMessage = viewerRoleInvitationRecord?.role ?? displayRole;
    const response = await teamService.respondToInvitation(
      invitationId,
      "accept",
      responseMessage,
      fillRole,
      options,
    );

    if (teamId && !response?.data?.roleSwitched) {
      try {
        await messageService.sendMessage(
          teamId,
          buildRoleInvitationAcceptedMessage({
            teamId,
            teamName,
            role: roleForMessage,
            invitee: currentUser,
            inviter: viewerRoleInvitationRecord?.inviter ?? null,
            fillRole,
          }),
          "team",
        );
      } catch (messageError) {
        console.warn("Invitation accepted, but chat event could not be sent:", messageError);
      }
    }

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

  const layoutRoleName =
    displayRole?.roleName ?? displayRole?.role_name ?? "Vacant Role";
  const layoutRolePostedDate =
    displayRole?.createdAt ?? displayRole?.created_at ?? null;

  useLayoutEffect(() => {
    if (!displayRole) return;

    const container = roleTitleContainerRef.current;
    const probe = roleTitleProbeRef.current;
    if (!container || !probe) return;

    const update = () => {
      const containerWidth = container.clientWidth;
      if (containerWidth === 0) return;
      const dateEl = roleDateRef.current;
      const reservedWidth =
        roleDateIsNarrowRef.current && dateEl ? dateEl.offsetWidth + 16 : 0;
      probe.textContent = layoutRoleName;
      setRoleDateIsNarrow(probe.scrollWidth > containerWidth - reservedWidth);
    };

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(container);
    if (roleDateRef.current) resizeObserver.observe(roleDateRef.current);
    update();

    return () => resizeObserver.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayRole, layoutRoleName, !!layoutRolePostedDate]);

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
  const roleTeam = displayRole.team ?? {};
  const teamMemberCount =
    displayRole.teamMemberCount ??
    displayRole.team_member_count ??
    displayRole.current_members_count ??
    displayRole.currentMembersCount ??
    displayRole.member_count ??
    displayRole.memberCount ??
    displayRole.members_count ??
    displayRole.membersCount ??
    roleTeam.current_members_count ??
    roleTeam.currentMembersCount ??
    roleTeam.member_count ??
    roleTeam.memberCount ??
    roleTeam.members_count ??
    roleTeam.membersCount ??
    (Array.isArray(roleTeam.members) ? roleTeam.members.length : undefined);
  const teamMaxMembers =
    displayRole.teamMaxMembers ??
    displayRole.team_max_members ??
    displayRole.max_members ??
    displayRole.maxMembers ??
    roleTeam.max_members ??
    roleTeam.maxMembers;
  const teamDescription =
    displayRole.teamDescription ?? displayRole.team_description ?? "";
  const teamAvatarUrl =
    displayRole.teamavatar_url ??
    displayRole.teamavatarUrl ??
    displayRole.teamAvatarUrl ??
    displayRole.team_avatar_url ??
    null;
  const teamIsRemote =
    team?.isRemote ??
    team?.is_remote ??
    displayRole.teamIsRemote ??
    displayRole.team_is_remote ??
    roleTeam.isRemote ??
    roleTeam.is_remote;
  const teamCity =
    team?.city ?? displayRole.teamCity ?? displayRole.team_city ?? roleTeam.city;
  const teamCountry =
    team?.country ??
    displayRole.teamCountry ??
    displayRole.team_country ??
    roleTeam.country;
  const teamIsSynthetic =
    team?.is_synthetic ??
    team?.isSynthetic ??
    displayRole.teamIsSynthetic ??
    displayRole.team_is_synthetic ??
    roleTeam.is_synthetic ??
    roleTeam.isSynthetic;
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
      team?.members_count ??
      team?.membersCount ??
      teamMemberCount,
    max_members: team?.max_members ?? team?.maxMembers ?? teamMaxMembers,
    is_remote: teamIsRemote,
    city: teamCity,
    country: teamCountry,
    is_synthetic: teamIsSynthetic,
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
  const creatorDisplayName = creatorName
    ? formatDisplayName({
        first_name: creatorFirstName,
        last_name: creatorLastName,
        username: creatorUsername,
      })
    : null;
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
  const filledRoleCompactDisplayName = filledRoleUser
    ? formatDisplayName(filledRoleUser)
    : filledRoleDisplayName;
  const filledRoleAvatarUrl =
    filledRoleUser?.avatarUrl ?? filledRoleUser?.avatar_url ?? null;
  const filledAt =
    displayRole.filledAt ??
    displayRole.filled_at ??
    updatedAt ??
    createdAt;
  const serverRoleMatchScore =
    shouldShowRoleMatchScore
      ? matchScore ??
        displayRole.matchScore ??
        displayRole.match_score ??
        null
      : null;
  const serverRoleMatchDetails =
    shouldShowRoleMatchScore
      ? matchDetails ??
        displayRole.matchDetails ??
        displayRole.match_details ??
        displayRole.scoreBreakdown ??
        null
      : null;
  const computedRoleMatch =
    shouldShowRoleMatchScore &&
    comparisonDataLoaded &&
    comparisonUserId &&
    comparisonUser
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

  const modalStatusTitle = isFilledRole ? "Filled Role" : isClosedRole ? "Closed Role" : "Vacant Role";
  const demoAvatarOverlay = isSyntheticRole(displayRole) ? (
    <DemoAvatarOverlay
      textClassName="text-[9px]"
      textTranslateClassName="-translate-y-[4px]"
    />
  ) : null;
  const ModalStatusIcon = isFilledRole ? UserCheck : isClosedRole ? UserX : UserSearch;
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
    shouldShowRoleMatchScore &&
    isAuthenticated &&
    comparisonUserId &&
    comparisonDataLoaded;
  const locationMatchText = comparisonShortName
    ? `Matches ${comparisonPossessive} location`
    : "Matches your location";
  const locationMismatchText = comparisonShortName
    ? `Outside ${comparisonPossessive} location range`
    : "Outside your location range";
  const normalizePostalCode = (value) =>
    value == null ? "" : String(value).trim().toLowerCase();
  const rolePostalCode = normalizePostalCode(
    normalizeLocationData(displayRole).postalCode,
  );
  const comparisonPostalCode = normalizePostalCode(
    normalizeLocationData(comparisonUser).postalCode,
  );
  const postalCodesMatch =
    rolePostalCode &&
    comparisonPostalCode &&
    rolePostalCode === comparisonPostalCode;
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
    return teamMemberScoreMap[key] ?? null;
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
  const viewerHoldsTeamRole =
    currentUser?.id != null && filledRoleUserIds.has(String(currentUser.id));
  const availableRoleTeamMembers = roleTeamMembers.filter((memberRow) => {
    const memberId = String(
      memberRow.memberId ??
        memberRow.member?.id ??
        memberRow.member?.userId ??
        memberRow.member?.user_id ??
        "",
    );
    return !filledRoleUserIds.has(memberId);
  });
  const visibleRoleTeamMembers = isTeamMembersExpanded
    ? availableRoleTeamMembers
    : availableRoleTeamMembers.slice(0, COLLAPSED_COUNT);
  const viewerRoleApplicationDate = (() => {
    const dateVal =
      effectiveViewerRoleApplication?.createdAt ??
      effectiveViewerRoleApplication?.created_at ??
      effectiveViewerRoleApplication?.appliedAt ??
      effectiveViewerRoleApplication?.applied_at ??
      effectiveViewerRoleApplication?.submittedAt ??
      effectiveViewerRoleApplication?.submitted_at;
    if (!dateVal) return null;

    const date = new Date(dateVal);
    if (Number.isNaN(date.getTime())) return null;

    const isInternalRoleApplication = Boolean(
      effectiveViewerRoleApplication?.isInternalRoleApplication ??
        effectiveViewerRoleApplication?.is_internal_role_application,
    );

    return {
      short: format(date, "MM/dd/yy"),
      full: format(date, "MMM d, yyyy"),
      label: isInternalRoleApplication
        ? "You applied to fill this role"
        : "You applied to join this team and fill this role",
      iconClassName: isInternalRoleApplication ? "text-orange-500" : "text-violet-500",
    };
  })();
  const viewerRoleInvitationDate = (() => {
    const dateVal =
      effectiveViewerRoleInvitation?.createdAt ??
      effectiveViewerRoleInvitation?.created_at ??
      effectiveViewerRoleInvitation?.invitedAt ??
      effectiveViewerRoleInvitation?.invited_at ??
      effectiveViewerRoleInvitation?.sentAt ??
      effectiveViewerRoleInvitation?.sent_at ??
      effectiveViewerRoleInvitation?.date;
    if (!dateVal) return null;

    const date = new Date(dateVal);
    if (Number.isNaN(date.getTime())) return null;

    const isInternalInvitation = Boolean(
      effectiveViewerRoleInvitation?.isInternal ??
        effectiveViewerRoleInvitation?.is_internal,
    );

    return {
      short: format(date, "MM/dd/yy"),
      full: format(date, "MMM d, yyyy"),
      label: isInternalInvitation
        ? "You were invited to fill this role"
        : "You were invited to join this team and fill this role",
      iconClassName: isInternalInvitation ? "text-orange-500" : "text-pink-500",
    };
  })();
  const rolePostedDate = (() => {
    if (!createdAt) return null;
    try {
      const date = new Date(createdAt);
      return {
        short: format(date, "MM/yy"),
        full: format(date, "MMMM d, yyyy"),
        label: "Posted on",
      };
    } catch {
      return null;
    }
  })();

  const modalTitle = (
    <h2 className="text-xl font-medium text-primary leading-[110%] flex items-start gap-2 whitespace-nowrap">
      <ModalStatusIcon
        className="flex-shrink-0 mt-0.5"
        size={20}
      />
      {modalStatusTitle}
    </h2>
  );
  const canShowRoleManagementActions = canManage && !hideActions;
  const canFindRoleMatches =
    canShowRoleManagementActions && !isFilledRole && !isClosedRole;
  const hasRoleHeaderActions =
    canShowRoleManagementActions && (onEdit || onStatusChange || canFindRoleMatches);

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      position="center"
      size="default"
      maxHeight="max-h-[90vh]"
      minHeight="min-h-[300px]"
      closeOnBackdrop={true}
      closeOnEscape={true}
      showCloseButton={true}
      headerActions={
        hasRoleHeaderActions ? (
          <div className="flex items-center gap-1">
            {onEdit && (
              <Tooltip content="Edit this role's details">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { onClose(); onEdit(displayRole); }}
                  className="hover:bg-[#7ace82] hover:text-[#036b0c]"
                  icon={<Edit size={16} />}
                />
              </Tooltip>
            )}
            {isRoleOpen && onStatusChange && (
              <Tooltip content="Close this role — stop accepting new applicants">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { onClose(); onStatusChange(roleId, "closed"); }}
                  className="hover:bg-yellow-100 hover:text-yellow-700"
                  icon={<XCircle size={16} />}
                />
              </Tooltip>
            )}
            {!isRoleOpen && onStatusChange && (
              <Tooltip content="Reopen this role to accept new applicants">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { onClose(); onStatusChange(roleId, "open"); }}
                  className="hover:bg-green-100 hover:text-green-700"
                  icon={<CheckCircle size={16} />}
                />
              </Tooltip>
            )}
            {canFindRoleMatches && (
              <Tooltip content="Find matching people outside this team">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(buildSearchUrl(), "_blank")}
                  className="flex items-center gap-1"
                >
                  <UserSearch size={16} />
                  <span className="hidden sm:inline">Find Matches</span>
                </Button>
              </Tooltip>
            )}
          </div>
        ) : null
      }
    >
      <div className="space-y-6">
        {loadingRoleDetails && !hydratedRole && (
          <div className="text-sm text-base-content/50">
            Loading full role details...
          </div>
        )}

        {/* Header — avatar + role name + status */}
        <div className="relative flex items-start space-x-4 mb-6">
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
                  className="avatar-fallback bg-[var(--color-primary-focus)] text-white rounded-full w-full h-full flex items-center justify-center absolute inset-0"
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
            {MatchTierIcon && (
              <Tooltip
                content={`${matchTier.pct}% ${matchTier.label.toLowerCase()}`}
                position="bottom"
                wrapperClassName={`absolute -top-1 -left-1 w-6 h-6 rounded-full ring-2 ring-white flex items-center justify-center cursor-help ${matchTier.bg}`}
              >
                <MatchTierIcon
                  size={12}
                  className="text-white"
                  strokeWidth={2.5}
                />
              </Tooltip>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 ref={roleTitleContainerRef} className="text-2xl font-bold leading-[110%] mb-[0.2em] relative">
              {roleName}
              <span
                ref={roleTitleProbeRef}
                className="invisible absolute whitespace-nowrap pointer-events-none left-0 top-0 font-bold"
                aria-hidden="true"
              />
            </h1>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-sm leading-[110%]">
              {teamMemberCount != null && (
                <div className="flex items-center gap-1 text-base-content/70">
                  <Users size={14} className="text-primary flex-shrink-0" />
                  <span>
                    {teamMemberCount}/{teamMaxMembers ?? "∞"}
                  </span>
                </div>
              )}

              {creatorName && (
                <span className="flex min-w-0 max-w-[12rem] items-center gap-1 text-base-content/50 sm:max-w-[16rem]">
                  <PenLine size={14} className="flex-shrink-0" />
                  {creatorUserId ? (
                    <Tooltip
                      content={`Created by ${creatorName}. Click to view their profile`}
                      wrapperClassName="inline-flex min-w-0 max-w-full items-center"
                    >
                      <button
                        type="button"
                        className="min-w-0 max-w-full truncate font-medium hover:text-primary transition-colors"
                        onClick={handleCreatorUserClick}
                      >
                        {creatorDisplayName}
                      </button>
                    </Tooltip>
                  ) : (
                    <span className="min-w-0 max-w-full truncate">{creatorDisplayName}</span>
                  )}
                </span>
              )}

              {isFilledRole && filledRoleDisplayName && (
                <span className="flex min-w-0 max-w-[12rem] items-center gap-1 text-base-content/50 sm:max-w-[16rem]">
                  <UserCheck size={14} className="flex-shrink-0 text-success" />
                  {filledRoleUser?.id ? (
                    <Tooltip
                      content={`Filled by ${filledRoleDisplayName}. Click to view their profile`}
                      wrapperClassName="inline-flex min-w-0 max-w-full items-center"
                    >
                      <button
                        type="button"
                        className="min-w-0 max-w-full truncate font-medium hover:text-primary transition-colors"
                        onClick={handleFilledUserClick}
                      >
                        {filledRoleCompactDisplayName}
                      </button>
                    </Tooltip>
                  ) : (
                    <span className="min-w-0 max-w-full truncate">
                      {filledRoleCompactDisplayName}
                    </span>
                  )}
                </span>
              )}

              {teamName && (
                <span className="flex min-w-0 max-w-[calc(100%-2rem)] items-center gap-1 text-base-content/50">
                  <Users size={14} className="flex-shrink-0" />
                  {canOpenTeamModal ? (
                    <Tooltip
                      content={`Click to view ${teamName}`}
                      wrapperClassName="inline-flex min-w-0 max-w-full items-center"
                    >
                      <button
                        type="button"
                        className="min-w-0 max-w-full truncate font-medium hover:text-primary transition-colors"
                        onClick={handleTeamClick}
                      >
                        {teamName}
                      </button>
                    </Tooltip>
                  ) : (
                    <span className="min-w-0 max-w-full truncate">{teamName}</span>
                  )}
                </span>
              )}

              {viewerRoleApplicationDate && (
                <Tooltip
                  content={`${viewerRoleApplicationDate.label}\non ${viewerRoleApplicationDate.full}`}
                  position="bottom"
                  wrapperClassName="inline-flex"
                >
                  <button
                    type="button"
                    className="group flex items-center gap-1 cursor-pointer rounded-sm transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    aria-label={`${viewerRoleApplicationDate.label} on ${viewerRoleApplicationDate.full}. Open application details`}
                    onClick={() => {
                      if (onViewApplicationDetails) {
                        onViewApplicationDetails();
                        return;
                      }

                      setIsViewerApplicationDetailsOpen(true);
                    }}
                  >
                    <SendHorizontal
                      size={14}
                      className={`flex-shrink-0 ${viewerRoleApplicationDate.iconClassName}`}
                    />
                    <span className="text-base-content/50 transition-colors group-hover:text-primary group-focus-visible:text-primary">
                      {viewerRoleApplicationDate.short}
                    </span>
                  </button>
                </Tooltip>
              )}

              {viewerRoleInvitationDate && (
                <Tooltip
                  content={`${viewerRoleInvitationDate.label}\non ${viewerRoleInvitationDate.full}`}
                  position="bottom"
                  wrapperClassName="inline-flex"
                >
                  <button
                    type="button"
                    className="group flex items-center gap-1 cursor-pointer rounded-sm transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    aria-label={`${viewerRoleInvitationDate.label} on ${viewerRoleInvitationDate.full}. Open invitation details`}
                    onClick={() => setIsViewerInvitationDetailsOpen(true)}
                  >
                    <Mail
                      size={14}
                      className={`flex-shrink-0 ${viewerRoleInvitationDate.iconClassName}`}
                    />
                    <span className="text-base-content/50 transition-colors group-hover:text-primary group-focus-visible:text-primary">
                      {viewerRoleInvitationDate.short}
                    </span>
                  </button>
                </Tooltip>
              )}

              {(rolePostedDate || isSyntheticRole(displayRole)) && (
                <span className="flex items-center gap-3 flex-shrink-0">
                  {rolePostedDate && (
                    <Tooltip
                      content={`${rolePostedDate.label} ${rolePostedDate.full}`}
                      position="bottom"
                      wrapperClassName={`items-center text-base-content/70 flex-shrink-0 cursor-help ${roleDateIsNarrow ? "flex" : "flex sm:hidden"}`}
                    >
                      <Calendar size={14} className="mr-1" />
                      <span>{rolePostedDate.short}</span>
                    </Tooltip>
                  )}
                  {isSyntheticRole(displayRole) && (
                    <Tooltip
                      content={DEMO_ROLE_TOOLTIP}
                      wrapperClassName="flex items-start text-base-content/50 whitespace-nowrap"
                    >
                      <FlaskConical size={14} className={`flex-shrink-0 mt-px${roleDateIsNarrow ? "" : " sm:mr-0.5"}`} />
                      {!roleDateIsNarrow && <span className="hidden sm:inline leading-[1.15]">Demo Role</span>}
                    </Tooltip>
                  )}
                </span>
              )}
            </div>
          </div>

          {rolePostedDate && (
            <div
              ref={roleDateRef}
              className={`flex-shrink-0${roleDateIsNarrow ? " absolute opacity-0 pointer-events-none" : " hidden sm:block"}`}
            >
              <Tooltip
                content={`${rolePostedDate.label} ${rolePostedDate.full}`}
                position="bottom"
                wrapperClassName="flex items-center text-base-content/70 cursor-help"
              >
                <Calendar size={14} className="mr-1" />
                <span>{rolePostedDate.short}</span>
              </Tooltip>
            </div>
          )}
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
            const compactComparisonName =
              comparisonUser && comparisonShortName
                ? formatDisplayName(comparisonUser)
                : comparisonShortName;
            const compactComparisonPossessive =
              isComparisonSelf
                ? "your"
                : toPossessive(compactComparisonName);
            const matchSummaryText = isFilledRole
              ? `${pct}% matching score for ${filledRoleCompactDisplayName || "this member"} with this role`
              : `${pct}% match with ${compactComparisonPossessive} profile`;
            const fullMatchSummaryText = isFilledRole
              ? `${pct}% matching score for ${filledRoleDisplayName || "this member"} with this role`
              : `${pct}% match with ${comparisonPossessive} profile`;

            const tierColor = {
              bg: "bg-base-200/50",
              border: "border-base-300",
              text: matchTier?.text ?? "text-base-content/70",
            };

            return (
              <div
                className={`rounded-xl p-4 ${tierColor.bg} border ${tierColor.border}`}
              >
                <div className="flex min-w-0 items-start gap-2 mb-3">
                  {MatchTierIcon ? (
                    <MatchTierIcon size={16} className={`${tierColor.text} mt-px flex-shrink-0`} />
                  ) : null}
                  <Tooltip
                    content={fullMatchSummaryText}
                    wrapperClassName="min-w-0"
                  >
                    <span className={`block min-w-0 overflow-hidden text-sm font-semibold leading-[115%] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] ${tierColor.text}`}>
                      {matchSummaryText}
                    </span>
                  </Tooltip>
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
            <div className="flex items-start gap-2 mb-2">
              {isRemote ? (
                <Globe size={18} className="mt-0.5 text-primary flex-shrink-0" />
              ) : (
                <MapPin size={18} className="mt-0.5 text-primary flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <h3 className="font-medium leading-5">
                  <span className="sm:hidden">Location</span>
                  <span className="hidden sm:inline">Location Preference</span>
                </h3>
                {shouldShowComparisonSummary && (() => {
                  let status = null;
                  if (isRemote) {
                    status = (
                      <span className="flex items-center gap-1.5 text-sm text-success">
                        <CheckCheck size={14} className="flex-shrink-0" />
                        <span>No location boundaries</span>
                      </span>
                    );
                  } else if (distanceKm !== null && withinRange !== null) {
                    if (withinRange) {
                      const LocationMatchIcon = postalCodesMatch
                        ? CheckCheck
                        : Check;
                      status = (
                        <span className="flex items-center gap-1.5 text-sm text-success">
                          <LocationMatchIcon
                            size={14}
                            className="flex-shrink-0"
                          />
                          <span className="sm:hidden">Match</span>
                          <span className="hidden sm:inline">
                            {locationMatchText}
                          </span>
                        </span>
                      );
                    } else {
                      status = (
                        <span className="flex items-center gap-1.5 text-sm text-slate-500">
                          <X size={14} className="flex-shrink-0" />
                          <span>{locationMismatchText}</span>
                        </span>
                      );
                    }
                  }

                  if (!status) return null;

                  return (
                    <div className="flex items-center justify-end gap-2 text-right whitespace-nowrap">
                      {status}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-base-content/70">
              <span className="min-w-0">{locationText}</span>
              {!isRemote && maxDistanceKm && (
                <span className="flex items-center gap-1 text-base-content/50 whitespace-nowrap">
                  <CircleDot size={14} />
                  <span className="sm:hidden">&lt; {maxDistanceKm} km</span>
                  <span className="hidden sm:inline">
                    within {maxDistanceKm} km from Role Location
                  </span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Desired Focus Areas */}
        <div>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-start gap-2 min-w-0">
              <Tag size={18} className="mt-0.5 text-primary flex-shrink-0" />
              <h3 className="font-medium leading-5">
                <span className="sm:hidden">Focus Areas</span>
                <span className="hidden sm:inline">Desired Focus Areas</span>
              </h3>
            </div>
            {shouldShowComparisonSummary && tags.length > 0 && (() => {
              const matchCount = tags.filter((t) => {
                const tagId = Number(t.tagId ?? t.tag_id ?? t.id);
                return userTagMap.has(tagId);
              }).length;
              const total = tags.length;
              if (matchCount > 0) {
                const MatchIcon = matchCount === total ? CheckCheck : Check;
                const compactLabel =
                  matchCount === total
                    ? "All in common"
                    : `${matchCount}/${total} in common`;
                return (
                  <span className="flex items-center gap-1.5 text-sm text-success">
                    <MatchIcon size={14} className="flex-shrink-0" />
                    <span className="sm:hidden">{compactLabel}</span>
                    <span className="hidden sm:inline">
                      {matchCount}/{total} in common{summarySuffix}
                    </span>
                  </span>
                );
              }
              return (
                <span className="flex items-center gap-1.5 text-sm text-slate-500">
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
                          const isMatch =
                            shouldShowComparisonSummary && !!userTag;
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
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-start gap-2 min-w-0">
              <Award size={18} className="mt-0.5 text-primary flex-shrink-0" />
              <h3 className="font-medium leading-5">
                <span className="sm:hidden">Badges</span>
                <span className="hidden sm:inline">Desired Badges</span>
              </h3>
            </div>
            {shouldShowComparisonSummary && badges.length > 0 && (() => {
              const matchCount = badges.filter((b) => {
                const badgeKey = (b.name ?? b.badgeName ?? b.badge_name ?? "").trim().toLowerCase();
                return userBadgeMap.has(badgeKey);
              }).length;
              const total = badges.length;
              if (matchCount > 0) {
                const MatchIcon = matchCount === total ? CheckCheck : Check;
                const compactLabel =
                  matchCount === total
                    ? "All in common"
                    : `${matchCount}/${total} in common`;
                return (
                  <span className="flex items-center gap-1.5 text-sm text-success">
                    <MatchIcon size={14} className="flex-shrink-0" />
                    <span className="sm:hidden">{compactLabel}</span>
                    <span className="hidden sm:inline">
                      {matchCount}/{total} in common{summarySuffix}
                    </span>
                  </span>
                );
              }
              return (
                <span className="flex items-center gap-1.5 text-sm text-slate-500">
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
                        const isMatch =
                          shouldShowComparisonSummary && !!userBadge;
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
                  const applicantProfile = {
                    ...(applicant || {}),
                    ...(applicantMatch || {}),
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
                      <div
                        className={`flex items-start rounded-xl shadow p-4 gap-4 transition-all duration-200 hover:shadow-md cursor-pointer ${
                          applicantIsTeamMember
                            ? "bg-green-50 hover:bg-green-100"
                            : "bg-base-200 hover:bg-base-300"
                        }`}
                        onClick={() => {
                          setHighlightApplicantId(applicantId);
                          setApplicationsModalOpen(true);
                        }}
                      >
                        <div className="avatar relative">
                          <div className="w-14 h-14 rounded-full relative overflow-hidden">
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
                              className="avatar-fallback placeholder bg-[var(--color-primary-focus)] text-primary-content rounded-full w-full h-full absolute inset-0 flex items-center justify-center"
                              style={{ display: avatarUrl ? "none" : "flex" }}
                            >
                              <span className="text-xl">{initials}</span>
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
                            <div className="flex min-w-0 items-center gap-1">
                              <h3 className="min-w-0 flex-1 truncate font-medium text-base leading-[120%]">
                                {displayName}
                              </h3>
                            </div>

                            <CardMetaRow>
                              {applicantMatchTier && (
                                <div className="flex items-center gap-1 min-w-0">
                                  <ApplicantMatchIcon
                                    size={10}
                                    className={`${applicantMatchTier.text} shrink-0`}
                                  />
                                  <span className="text-base-content/60 leading-[1.05] whitespace-nowrap">
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
                                  wrapperClassName="flex items-center gap-1 min-w-0"
                                >
                                  <Users
                                    size={10}
                                    className="text-success shrink-0"
                                  />
                                </Tooltip>
                              )}
                              <CardMetaItem icon={MapPin}>
                                {locationLabel}
                              </CardMetaItem>
                            </CardMetaRow>
                          </div>
                        </div>
                      </div>
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
                  const inviteeProfile = {
                    ...(invitee || {}),
                    ...(inviteeMatch || {}),
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
                      <div
                        className={`flex items-start rounded-xl shadow p-4 gap-4 transition-all duration-200 hover:shadow-md cursor-pointer ${
                          inviteeIsTeamMember
                            ? "bg-green-50 hover:bg-green-100"
                            : "bg-base-200 hover:bg-base-300"
                        }`}
                        onClick={() => {
                          setHighlightInviteeId(inviteeId);
                          setInvitationsModalOpen(true);
                        }}
                      >
                        <div className="avatar relative">
                          <div className="w-14 h-14 rounded-full relative overflow-hidden">
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
                              className="avatar-fallback placeholder bg-[var(--color-primary-focus)] text-primary-content rounded-full w-full h-full absolute inset-0 flex items-center justify-center"
                              style={{ display: avatarUrl ? "none" : "flex" }}
                            >
                              <span className="text-xl">{initials}</span>
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
                            <div className="flex min-w-0 items-center gap-1">
                              <h3 className="min-w-0 flex-1 truncate font-medium text-base leading-[120%]">
                                {displayName}
                              </h3>
                            </div>

                            <CardMetaRow>
                              {inviteeMatchTier && (
                                <div className="flex items-center gap-1 min-w-0">
                                  <InviteeMatchIcon
                                    size={10}
                                    className={`${inviteeMatchTier.text} shrink-0`}
                                  />
                                  <span className="text-base-content/60 leading-[1.05] whitespace-nowrap">
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
                                  wrapperClassName="flex items-center gap-1 min-w-0"
                                >
                                  <Users
                                    size={10}
                                    className="text-success shrink-0"
                                  />
                                </Tooltip>
                              )}
                              <CardMetaItem icon={MapPin}>
                                {locationLabel}
                              </CardMetaItem>
                            </CardMetaRow>
                          </div>
                        </div>
                      </div>
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

        {canViewTeamMemberMatches &&
          isRoleOpen &&
          roleMemberEntries.length > 0 &&
          !isTeamMembersExpanded && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Users size={18} className="mr-2 text-primary flex-shrink-0" />
                  <h3 className="font-medium">Available team members</h3>
                </div>
                <span className="text-sm text-base-content/50">
                  ({roleMemberEntries.length})
                </span>
              </div>

              <button
                type="button"
                className="flex items-center gap-1 text-sm text-base-content/50 hover:text-base-content/80 transition-colors"
                onClick={() => setIsTeamMembersExpanded(true)}
              >
                <ChevronRight size={14} />
                Show matches
              </button>
            </div>
          )}

        {canViewTeamMemberMatches && isRoleOpen && isTeamMembersExpanded && (
          teamMembersLoading ? (
            <div className="flex justify-center py-3">
              <span className="loading loading-spinner loading-sm text-primary"></span>
            </div>
          ) : availableRoleTeamMembers.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Users size={18} className="mr-2 text-primary flex-shrink-0" />
                  <h3 className="font-medium">Available team members</h3>
                </div>
                <span className="text-sm text-base-content/50">
                  ({availableRoleTeamMembers.length})
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
                  const showDemoAvatarOverlay = isSyntheticUser(member);
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
                      <div
                        className="flex items-start bg-green-50 rounded-xl shadow p-4 gap-4 transition-all duration-200 hover:bg-green-100 hover:shadow-md cursor-pointer"
                        onClick={() => handleTeamMemberClick(memberRow)}
                      >
                        <div className="avatar relative">
                          <div className="w-14 h-14 rounded-full relative overflow-hidden">
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
                              className="avatar-fallback placeholder bg-[var(--color-primary-focus)] text-primary-content rounded-full w-full h-full absolute inset-0 flex items-center justify-center"
                              style={{ display: avatarUrl ? "none" : "flex" }}
                            >
                              <span className="text-xl">{initials}</span>
                            </div>
                            {showDemoAvatarOverlay && (
                              <DemoAvatarOverlay textClassName="text-[8px]" />
                            )}
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
                            <div className="flex min-w-0 items-center gap-1">
                              <h3 className="min-w-0 flex-1 truncate font-medium text-base leading-[120%]">
                                {displayName}
                              </h3>
                            </div>

                            <CardMetaRow>
                              {memberMatchTier && (
                                <div className="flex items-center gap-1 min-w-0">
                                  <MemberMatchIcon
                                    size={10}
                                    className={`${memberMatchTier.text} shrink-0`}
                                  />
                                  <span className="text-base-content/60 leading-[1.05] whitespace-nowrap">
                                    {memberMatchTier.pct}%
                                  </span>
                                </div>
                              )}
                              <CardMetaItem icon={MapPin}>
                                {locationLabel}
                              </CardMetaItem>
                              {showDemoAvatarOverlay && (
                                <Tooltip
                                  content={DEMO_PROFILE_TOOLTIP}
                                  wrapperClassName="flex items-center gap-1 text-base-content/50"
                                >
                                  <FlaskConical
                                    size={10}
                                    className="shrink-0"
                                  />
                                </Tooltip>
                              )}
                            </CardMetaRow>
                          </div>
                        </div>
                      </div>
                    </Tooltip>
                  );
                })}
              </div>

              {availableRoleTeamMembers.length > COLLAPSED_COUNT && (
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
                  !viewerIsTeamMember &&
                  isRoleOpen && (
                  <div className="mt-6 border-t border-base-200 pt-4">
                    <TeamApplicationButton
                      team={applicationTeam}
                      teamId={teamId}
                      roleId={roleId}
                      className="w-full"
                      buttonLabel="Apply to join team and to fill this role"
                      onSuccess={(applicationData, submitResponse) => {
                        const submittedApplication = submitResponse?.data ?? {};
                        setViewerRoleApplicationRecord(
                          buildRoleStatusRecord(
                            {
                              id: submittedApplication.applicationId,
                              applicationId: submittedApplication.applicationId,
                              status: submittedApplication.status ?? "pending",
                              message: applicationData.message,
                              created_at: new Date().toISOString(),
                              roleId,
                              role_id: roleId,
                              teamId,
                              team_id: teamId,
                              isInternalRoleApplication: false,
                              is_internal_role_application: false,
                            },
                            applicationTeam,
                            displayRole,
                            { isInternalRoleApplication: false },
                          ),
                        );
                      }}
                    />
                  </div>
                )}

                {isAuthenticated &&
                  !viewerRoleStatusLoading &&
                  !viewerTeamRoleLoading &&
                  viewerIsTeamMember &&
                  !viewerHoldsTeamRole &&
                  isRoleOpen &&
                  !applicationsLoading && (
                  <div className="mt-6 border-t border-base-200 pt-4">
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => setIsInternalApplicationOpen(true)}
                      icon={<UserSearch size={16} />}
                    >
                      Apply to fill this role within your team
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
        onCancelRoleInvitation={handleCancelRoleInvitation}
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
      team={applicationTeam}
      teamId={teamId}
      initialRoleId={roleId}
      isInternal={true}
      onSubmit={async (applicationData) => {
        try {
          const submitResponse = await teamService.applyToJoinTeam(teamId, {
            ...applicationData,
            roleId: applicationData.roleId ?? roleId,
          });
          const submittedApplication = submitResponse?.data ?? {};
          setViewerRoleApplicationRecord(
            buildRoleStatusRecord(
              {
                id: submittedApplication.applicationId,
                applicationId: submittedApplication.applicationId,
                status: submittedApplication.status ?? "pending",
                message: applicationData.message,
                created_at: new Date().toISOString(),
                roleId,
                role_id: roleId,
                teamId,
                team_id: teamId,
                isInternalRoleApplication: true,
                is_internal_role_application: true,
              },
              applicationTeam,
              displayRole,
              { isInternalRoleApplication: true },
            ),
          );
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
