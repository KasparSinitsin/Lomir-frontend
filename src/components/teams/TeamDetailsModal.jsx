import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import TeamRoleManager from "./TeamRoleManager";
import TeamEditForm from "./TeamEditForm";
import { useAuth } from "../../contexts/AuthContext";
import { teamService } from "../../services/teamService";
import { userService } from "../../services/userService";
import Button from "../common/Button";
import SendMessageButton from "../common/SendMessageButton";
import ScreenAlert from "../common/ScreenAlert";
import Tooltip from "../common/Tooltip";
import TagDisplay from "../common/TagDisplay";
import LocationDisplay from "../common/LocationDisplay";
import { uploadToImageKit } from "../../config/imagekit";
import {
  X,
  Edit,
  Users,
  UserSearch,
  Trash2,
  Eye,
  EyeClosed,
  Tag,
  LogOut,
  Mail,
  SendHorizontal,
  Archive,
  Calendar,
  Check,
  CheckCheck,
  FlaskConical,
} from "lucide-react";
import VisibilityToggle from "../common/VisibilityToggle";
import UserDetailsModal from "../users/UserDetailsModal";
import DemoAvatarOverlay from "../users/DemoAvatarOverlay";
import TagsDisplaySection from "../tags/TagsDisplaySection";
import { UI_TEXT } from "../../constants/uiText";
import { tagService } from "../../services/tagService";
import RoleBadgeDropdown from "./RoleBadgeDropdown";
import TeamApplicationButton from "./TeamApplicationButton";
import TeamApplicationDetailsModal from "./TeamApplicationDetailsModal";
import TeamInvitationDetailsModal from "./TeamInvitationDetailsModal";
import TeamMembersSection from "./TeamMembersSection";
import TeamFocusAreaSection from "./TeamFocusAreaSection";
import VacantRolesSection from "./VacantRolesSection";
import axios from "axios";
import Modal from "../common/Modal";
import ConfirmModal from "../common/ConfirmModal";
import LocationSection from "../common/LocationSection";
import TagAwardsModal from "../badges/TagAwardsModal";
import SupercategoryAwardsModal from "../badges/SupercategoryAwardsModal";
import BadgesDisplaySection from "../badges/BadgesDisplaySection";
import BadgeCategoryModal from "../badges/BadgeCategoryModal";
import useAwardModals from "../../hooks/useAwardModals";
import MatchScoreSection from "../common/MatchScoreSection";
import {
  buildViewerTeamMatchProfile,
  enrichTeamMatchData,
} from "../../utils/teamMatchUtils";
import { getMatchTier } from "../../utils/matchScoreUtils";
import {
  calculateDistanceKm,
  locationsHaveDifferentKnownParts,
} from "../../utils/locationUtils";
import { DEMO_TEAM_TOOLTIP, isSyntheticTeam } from "../../utils/userHelpers";

const getTeamMemberUserId = (member) =>
  member?.user_id ??
  member?.userId ??
  member?.user?.id ??
  member?.id ??
  null;

const idsMatch = (left, right) =>
  left != null && right != null && String(left) === String(right);

const normalizeTeamTagIds = (team) => {
  const raw = team?.tags ?? team?.tags_json ?? team?.selectedTags ?? [];

  const ids = (raw ?? [])
    .map((t) => {
      if (t == null) return null;

      if (typeof t === "object") {
        return t.id ?? t.tag_id ?? t.tagId ?? t.value ?? null;
      }

      return t;
    })
    .map((x) => Number(x))
    .filter((x) => Number.isFinite(x));

  return Array.from(new Set(ids));
};

const TeamDetailsModal = ({
  isOpen = true,
  teamId: propTeamId,
  initialTeamData = null,
  onClose,
  onUpdate,
  onDelete,
  onLeave,
  userRole,
  isFromSearch = false,
  hasPendingInvitation = false,
  pendingInvitation = null,
  hasPendingApplication = false,
  pendingApplication = null,
  onViewApplicationDetails,
  showMatchHighlights = false,
  roleMatchBadgeNames = null,
  matchScore = null,
  matchType = null,
  matchDetails = null,
  hideMatchData = false,
  membersRefreshKey = 0,
  zIndexStyle = null,
  boxZIndexStyle = null,
}) => {
  const navigate = useNavigate();
  const { id: urlTeamId } = useParams();
  const { user, isAuthenticated } = useAuth();

  const effectiveTeamId = useMemo(
    () => propTeamId || urlTeamId,
    [propTeamId, urlTeamId],
  );

  const [isModalVisible, setIsModalVisible] = useState(isOpen);
  const [loading, setLoading] = useState(!initialTeamData);
  const [notification, setNotification] = useState({
    type: null,
    message: null,
  });
  const [team, setTeam] = useState(initialTeamData); // Initialize with passed data
  const [teamRoles, setTeamRoles] = useState([]);

  // Track if we've done the full fetch (initial data may be partial)
  const [hasFullData, setHasFullData] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPublic: false, // Default is invisible
    maxMembers: 5,
    maxMembersMode: "preset",
    selectedTags: [],
    isRemote: false,
    postalCode: "",
    city: "",
    state: "",
    country: "",
  });

  const [formErrors, setFormErrors] = useState({});
  const [isOwner, setIsOwner] = useState(false);
  const [internalUserRole, setInternalUserRole] = useState(null);
  const [isPublic, setIsPublic] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const [currentUserTagIds, setCurrentUserTagIds] = useState(null); // Set<number>

  const [userTagIds, setUserTagIds] = useState(null); // Set<number>
  const [distanceViewerUser, setDistanceViewerUser] = useState(null);

  const [teamBadges, setTeamBadges] = useState(null);
  const [teamBadgesTotalCredits, setTeamBadgesTotalCredits] = useState(0);
  const [currentUserBadgeNames, setCurrentUserBadgeNames] = useState(null); // Set<string>

  const fetchTeamTagAwards = useCallback(
    () => teamService.getTeamBadgeAwards(effectiveTeamId),
    [effectiveTeamId],
  );
  const fetchTeamBadgeAwards = useCallback(
    () => teamService.getTeamMemberBadgeAwards(effectiveTeamId),
    [effectiveTeamId],
  );
  const {
    handleTagClick,
    handleSupercategoryClick,
    handleBadgeCategoryClick,
    handleBadgeClick,
    tagAwardsModalProps,
    supercategoryModalProps,
    badgeCategoryModalProps,
  } = useAwardModals({
    fetchTagAwards: fetchTeamTagAwards,
    fetchBadgeAwards: fetchTeamBadgeAwards,
    entityType: "team",
  });

  const userHasEditedTagsRef = useRef(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false);
  const [localPendingApplication, setLocalPendingApplication] = useState(null);
  // All fetched pending applications for this team (user may have both a team + a role application)
  const [fetchedPendingApplications, setFetchedPendingApplications] = useState([]);
  const [fetchedPendingInvitation, setFetchedPendingInvitation] = useState(null);
  const [isApplicationDetailsOpen, setIsApplicationDetailsOpen] =
    useState(false);
  const [selectedPendingApplication, setSelectedPendingApplication] =
    useState(null);

  const [teamImageError, setTeamImageError] = useState(false);
  const [teamDateIsNarrow, setTeamDateIsNarrow] = useState(false);
  const teamDateIsNarrowRef = useRef(false);
  teamDateIsNarrowRef.current = teamDateIsNarrow;
  const teamTitleContainerRef = useRef(null);
  const teamTitleProbeRef = useRef(null);
  const teamDateRef = useRef(null);
  const teamName = team?.name ?? "";

  useLayoutEffect(() => {
    const container = teamTitleContainerRef.current;
    const probe = teamTitleProbeRef.current;
    if (!container || !probe) return;

    const update = () => {
      const containerWidth = container.clientWidth;
      if (containerWidth === 0) return;
      const dateEl = teamDateRef.current;
      const reservedWidth =
        teamDateIsNarrowRef.current && dateEl ? dateEl.offsetWidth + 16 : 0;
      probe.textContent = teamName;
      setTeamDateIsNarrow(probe.scrollWidth > containerWidth - reservedWidth);
    };

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(container);
    if (teamDateRef.current) resizeObserver.observe(teamDateRef.current);
    update();

    return () => resizeObserver.disconnect();
  }, [teamName, isEditing, isModalVisible]);

  const showHighlightsForContext = !hideMatchData && (!isFromSearch || showMatchHighlights);
  const handledMembersRefreshKeyRef = useRef(0);
  // Tracks which teamId we last fetched application/invitation status for.
  // Prevents double-firing in React StrictMode (dev) where effects run twice.
  const statusFetchedForRef = useRef(null);

  const fetchTeamDetails = useCallback(
    async (forceRefresh = false) => {
      if (!effectiveTeamId) return null;

      // If we already have data and don't need a refresh, skip the loading state
      const hasExistingData = team !== null;

      try {
        // Only show loading spinner if we don't have any data yet
        if (!hasExistingData) {
          setLoading(true);
        }
        setNotification({ type: null, message: null });

        // Get the team details
        const response = await teamService.getTeamById(effectiveTeamId);

        // Get team data from response
        // response is already the JSON payload (not axios response)
        let teamData;
        if (response && typeof response === "object") {
          teamData =
            response.data && typeof response.data === "object"
              ? response.data
              : response;
        } else {
          teamData = {};
        }

        // Look for owner ID in multiple possible locations
        let ownerId = null;

        // 1. Try direct owner_id field
        if (teamData.owner_id !== undefined) {
          ownerId = parseInt(teamData.owner_id, 10);
        }
        // 2. Try ownerId field (camelCase variation)
        else if (teamData.ownerId !== undefined) {
          ownerId = parseInt(teamData.ownerId, 10);
        }

        // 3. If not found or invalid, check members array for owner role
        if (
          isNaN(ownerId) &&
          teamData.members &&
          Array.isArray(teamData.members)
        ) {
          const ownerMember = teamData.members.find(
            (m) => m.role === "owner" || m.role === "Owner",
          );

          if (ownerMember) {
            ownerId = parseInt(ownerMember.user_id || ownerMember.userId, 10);
          }
        }

        // 4. Ensure ownerId is valid, use logged-in user as fallback for owner's own teams
        if (isNaN(ownerId) && user && teamData.members) {
          const isCurrentUserOwner = teamData.members.some(
            (member) =>
              idsMatch(getTeamMemberUserId(member), user.id) &&
              (member.role === "owner" || member.role === "Owner"),
          );

          if (isCurrentUserOwner) {
            ownerId = parseInt(user.id, 10);
          }
        }

        // Process visibility - check both property names with OR logic
        const isPublicValue =
          teamData.is_public === true ||
          teamData.isPublic === true ||
          teamData.is_public === "true" ||
          teamData.isPublic === "true";

        const preservedDistanceKm =
          team?.distance_km ??
          team?.distanceKm ??
          initialTeamData?.distance_km ??
          initialTeamData?.distanceKm ??
          teamData.distance_km ??
          teamData.distanceKm ??
          null;

        // Enhance team data with normalized values
        const enhancedTeamData = {
          ...teamData,
          owner_id: ownerId,
          is_public: isPublicValue,

          // normalize for consistent UI usage
          is_remote: teamData.is_remote ?? teamData.isRemote ?? false,
          postal_code: teamData.postal_code ?? teamData.postalCode ?? null,
          city: teamData.city ?? null,
          state: teamData.state ?? null,
          country: teamData.country ?? null,
          distance_km: preservedDistanceKm,
          distanceKm: preservedDistanceKm,
          max_members:
            teamData.max_members !== undefined
              ? teamData.max_members
              : teamData.maxMembers !== undefined
                ? teamData.maxMembers
                : undefined,
        };

        // Store the enhanced team data
        setTeam(enhancedTeamData);
        setIsPublic(isPublicValue);

        // Determine if current user is owner
        const isUserAuthenticated = isAuthenticated && user && user.id;

        const isOwnerById =
          isUserAuthenticated &&
          !isNaN(ownerId) &&
          parseInt(user.id, 10) === ownerId;

        const isOwnerByRole =
          (isUserAuthenticated &&
            teamData.members?.some(
              (member) =>
                idsMatch(getTeamMemberUserId(member), user.id) &&
                (member.role === "owner" || member.role === "Owner"),
            )) ||
          false;

        const finalOwnerStatus =
          isUserAuthenticated && (isOwnerById || isOwnerByRole);

        setIsOwner(finalOwnerStatus);

        // Determine user's role from members list
        if (isUserAuthenticated && teamData.members) {
          const currentUserMember = teamData.members.find(
            (member) => idsMatch(getTeamMemberUserId(member), user.id),
          );
          if (currentUserMember) {
            setInternalUserRole(currentUserMember.role);
          }
        }

        // Determine the maxMembersMode based on current value
        // Determine the maxMembers value from backend data
        let currentMaxMembers;

        // Prefer camelCase (what your enhanced team data/logs show)
        // and allow it to be null for unlimited
        if (teamData.maxMembers !== undefined) {
          currentMaxMembers = teamData.maxMembers; // can be number OR null
        } else if (teamData.max_members !== undefined) {
          // Fallback in case snake_case is ever used
          currentMaxMembers = teamData.max_members;
        } else {
          // Only default if the field is truly missing
          currentMaxMembers = 5;
        }

        const presetValues = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20];

        let maxMembersMode;
        if (currentMaxMembers === null) {
          maxMembersMode = "unlimited";
        } else if (presetValues.includes(currentMaxMembers)) {
          maxMembersMode = "preset";
        } else {
          maxMembersMode = "custom";
        }

        // Set form data with the normalized values from team data
        // Location (support snake_case + camelCase)
        const isRemoteVal = enhancedTeamData.is_remote === true;

        // Set form data with the normalized values from team data
        setFormData({
          name: teamData.name || "",
          description: teamData.description || "",
          isPublic: isPublicValue,
          maxMembers: currentMaxMembers, // stays null for unlimited
          maxMembersMode: maxMembersMode, // 'unlimited' when null
          teamavatarUrl:
            teamData.teamavatar_url || teamData.teamavatarUrl || "",
          selectedTags: normalizeTeamTagIds(enhancedTeamData).map(String),

          // location fields
          isRemote: isRemoteVal === true,
          postalCode: (teamData.postal_code ?? teamData.postalCode ?? "") || "",
          city: (teamData.city ?? "") || "",
          state: (teamData.state ?? "") || "",
          country: (teamData.country ?? "") || "",
        });

        // Mark that we now have the full data
        setHasFullData(true);

        // Return the enhanced team data so callers know it completed
        return enhancedTeamData;
      } catch (err) {
        console.error("Error fetching team details:", err);
        // Only show error if we don't have any data to display
        if (!team) {
          setNotification({
            type: "error",
            message:
              "Server error: " +
              (err.response?.data?.error || err.message || "Unknown error"),
          });
        }
        return null;
      } finally {
        setLoading(false);
      }
    },
    [effectiveTeamId, initialTeamData, user, isAuthenticated, team],
  );

  useEffect(() => {
    setIsModalVisible(isOpen);
  }, [isOpen]);

  useEffect(() => {
    setLocalPendingApplication(null);
    setFetchedPendingApplications([]);
    setFetchedPendingInvitation(null);
    setIsApplicationDetailsOpen(false);
    setSelectedPendingApplication(null);
  }, [effectiveTeamId]);

  // Fetch the user's pending application and invitation for this team when not
  // supplied via props (e.g. when opened through TeamModalContext).
  // The ref guard prevents double-firing: React StrictMode (dev) remounts effects
  // synchronously, but refs survive the remount, so the second invocation is skipped.
  useEffect(() => {
    if (!isAuthenticated || !effectiveTeamId || !isModalVisible) return;
    if (statusFetchedForRef.current === effectiveTeamId) return; // already fetched this open-session

    statusFetchedForRef.current = effectiveTeamId;

    const fetchUserStatus = async () => {
      try {
        const [appsRes, invsRes] = await Promise.allSettled([
          teamService.getUserPendingApplications(),
          teamService.getUserReceivedInvitations(),
        ]);

        if (appsRes.status === "fulfilled") {
          const apps = appsRes.value?.data ?? appsRes.value ?? [];
          const matches = apps.filter(
            (a) => String(a.team?.id ?? a.teamId ?? a.team_id) === String(effectiveTeamId),
          );
          setFetchedPendingApplications(matches);
        }

        if (invsRes.status === "fulfilled") {
          const invs = invsRes.value?.data ?? invsRes.value ?? [];
          const match = invs.find(
            (i) => String(i.team?.id ?? i.teamId ?? i.team_id) === String(effectiveTeamId),
          );
          setFetchedPendingInvitation(match ?? null);
        }
      } catch {
        // Non-critical — silently ignore
      }
    };

    fetchUserStatus();
  }, [isAuthenticated, effectiveTeamId, isModalVisible]);

  useEffect(() => {
    if (isModalVisible && effectiveTeamId) {
      // If we have initial data but haven't fetched full details yet,
      // fetch complete data silently in background
      if (initialTeamData && !hasFullData) {
        fetchTeamDetails();
      }
      // If we have no data at all, fetch with loading state
      else if (!team) {
        fetchTeamDetails();
      }
    } else if (isModalVisible && !effectiveTeamId) {
      // Handle the case where teamId is not yet available (e.g., just created)
      setLoading(false); // Don't show loading indefinitely
    }
  }, [
    isModalVisible,
    effectiveTeamId,
    initialTeamData,
    hasFullData,
    team,
    fetchTeamDetails,
  ]);

  useEffect(() => {
    if (
      !isModalVisible ||
      !effectiveTeamId ||
      membersRefreshKey === 0 ||
      handledMembersRefreshKeyRef.current === membersRefreshKey
    ) {
      return;
    }

    handledMembersRefreshKeyRef.current = membersRefreshKey;
    fetchTeamDetails(true);
  }, [effectiveTeamId, fetchTeamDetails, isModalVisible, membersRefreshKey]);

  useEffect(() => {
    if (!isModalVisible || !isAuthenticated || !user?.id) return;

    const fetchUserTags = async () => {
      try {
        const tagsRes = await userService.getUserTags(user.id);
        const tagData = Array.isArray(tagsRes?.data)
          ? tagsRes.data
          : tagsRes?.data?.data || [];
        const ids = new Set(
          tagData
            .map((t) => Number(t.tagId ?? t.tag_id ?? t.id))
            .filter(Number.isFinite),
        );
        // Set both state vars from one request — avoids a second identical API call
        setUserTagIds(ids);
        setCurrentUserTagIds(ids);
      } catch (err) {
        console.warn("Could not fetch user tags for matching highlights:", err);
      }
    };

    fetchUserTags();
  }, [isModalVisible, isAuthenticated, user?.id]);

  useEffect(() => {
    // Reset state when modal closes
    if (!isModalVisible) {
      setNotification({ type: null, message: null });
      setFormErrors({});
      // Reset the status-fetch guard so the next open re-fetches fresh data
      statusFetchedForRef.current = null;
    }
  }, [isModalVisible]);

  // Use internal role state, fall back to prop
  const effectiveUserRole = internalUserRole || userRole;

  // Use independent isOwner state for more reliability
  const isTeamOwner = useMemo(() => isOwner, [isOwner]);

  const isTeamAdmin = useMemo(
    () => effectiveUserRole === "admin",
    [effectiveUserRole],
  );

  const canEditTeam = useMemo(() => {
    if (!isAuthenticated || !user || !team) {
      return false;
    }

    // Can't edit archived/deleted teams
    if (team?.archived_at || team?.status === "inactive") {
      return false;
    }

    // Owners can always edit
    if (isOwner) {
      return true;
    }

    // Admins can also edit (but not delete)
    if (effectiveUserRole === "admin") {
      return true;
    }

    return false;
  }, [isAuthenticated, user, team, isOwner, effectiveUserRole]);

  const canDeleteTeam = useMemo(() => {
    // Can't delete already archived/deleted teams
    if (team?.archived_at || team?.status === "inactive") {
      return false;
    }
    return isAuthenticated && user && team && isOwner;
  }, [isAuthenticated, user, team, isOwner]);

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

  // Helper function to determine if visibility status should be shown
  const shouldShowVisibilityStatus = () => {
    // Only show for authenticated users
    if (!isAuthenticated || !user) {
      return false;
    }

    // Show for owners
    if (isOwner) {
      return true;
    }

    // Show for team members
    if (team && team.members && Array.isArray(team.members)) {
      return team.members.some(
        (member) => idsMatch(getTeamMemberUserId(member), user.id),
      );
    }

    // Show if user has a role in the team
    if (userRole && userRole !== null) {
      return true;
    }

    return false;
  };

  const shouldAnonymizeMember = (member) => {
    const viewerId = user?.id;
    const memberId = member?.user_id ?? member?.userId;

    // Never anonymize your own entry
    if (
      viewerId != null &&
      memberId != null &&
      String(memberId) === String(viewerId)
    ) {
      return false;
    }

    // Determine profile visibility flags (support snake_case + camelCase)
    const memberIsPublic =
      member?.is_public === true || member?.isPublic === true;
    const memberIsPrivate =
      member?.is_public === false || member?.isPublic === false;

    // Public profile: always show full info
    if (memberIsPublic) return false;

    // Are we authenticated AND a member of this team?
    const viewerIsTeamMember =
      Boolean(isAuthenticated && viewerId != null) &&
      Array.isArray(team?.members) &&
      team.members.some((m) => {
        const id = m?.user_id ?? m?.userId;
        return id != null && String(id) === String(viewerId);
      });

    // Private (or unknown): show full info only to fellow team members
    // - logged out => anonymize
    // - logged in but not on this team => anonymize
    // - logged in and on this team => DO NOT anonymize
    if (memberIsPrivate || (!memberIsPublic && !memberIsPrivate)) {
      return !viewerIsTeamMember;
    }

    return false;
  };

  const handleClose = useCallback(() => {
    setIsEditing(false);
    setIsModalVisible(false);
    // Allow animation to complete before executing onClose
    setTimeout(() => {
      if (onClose) {
        onClose();
      } else if (urlTeamId) {
        // If we're on a team-specific route, navigate back to teams
        navigate("/teams/my-teams");
      }
    }, 300);
  }, [onClose, navigate, urlTeamId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Special handling for isPublic to ensure it's always a boolean
    if (name === "isPublic") {
      setFormData((prev) => ({
        ...prev,
        isPublic: checked, // Explicitly use the checked property
      }));
      return;
    }

    // Handle other form fields normally
    const newValue = type === "checkbox" ? checked : value;

    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "maxMembers"
          ? newValue === null
            ? null
            : parseInt(newValue, 10)
          : newValue,
    }));
  };

  const handleTagSelection = useCallback((selected) => {
    userHasEditedTagsRef.current = true; // mark as intentional user edit
    const ids = (selected ?? [])
      .map((t) => (typeof t === "object" ? (t.id ?? t.value ?? t) : t))
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x));

    setFormData((prev) => ({
      ...prev,
      selectedTags: Array.from(new Set(ids)),
    }));
  }, []);

  useEffect(() => {
    if (!isEditing) return;
    const ids = normalizeTeamTagIds(team);

    // Seed tags only once when editing starts (when selectedTags is still empty).
    // Using the functional updater means we don't need formData.selectedTags
    // as a dependency, so removing the last tag won't re-trigger this effect.
    setFormData((prev) => {
      if ((prev.selectedTags?.length ?? 0) > 0) return prev;
      return { ...prev, selectedTags: ids };
    });
  }, [isEditing, team]); // formData.selectedTags intentionally excluded

  // Fetch aggregated member badges when modal opens
  useEffect(() => {
    if (!isModalVisible || !effectiveTeamId) return;

    const fetchTeamBadges = async () => {
      try {
        const response = await teamService.getTeamMemberBadges(effectiveTeamId);
        const badges = response?.data || [];
        setTeamBadges(badges);
        setTeamBadgesTotalCredits(response?.meta?.totalCredits || 0);
      } catch (error) {
        console.warn("Could not fetch team member badges:", error);
        setTeamBadges([]);
      }
    };

    fetchTeamBadges();
  }, [isModalVisible, effectiveTeamId]);

  // Fetch current user's badge names for match highlighting
  useEffect(() => {
    if (!isModalVisible || !isAuthenticated || !user?.id) {
      return;
    }

    const fetchCurrentUserBadges = async () => {
      try {
        const response = await userService.getUserBadges(user.id);
        const rows = Array.isArray(response?.data) ? response.data : [];
        const names = new Set(
          rows
            .map((r) => (r.badgeName ?? r.badge_name ?? r.name ?? "").trim().toLowerCase())
            .filter(Boolean),
        );
        setCurrentUserBadgeNames(names);
      } catch (err) {
        console.warn("Could not fetch user badges for matching highlights:", err);
      }
    };

    fetchCurrentUserBadges();
  }, [isModalVisible, isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isModalVisible || !isAuthenticated || !user?.id) {
      setDistanceViewerUser(null);
      return;
    }

    let cancelled = false;

    const fetchDistanceViewerUser = async () => {
      try {
        const response = await userService.getUserById(user.id);
        const payload = response?.data ?? response;
        const viewerData =
          payload?.success !== undefined
            ? payload?.data
            : (payload?.data?.data ?? payload?.data ?? payload);

        if (!cancelled) {
          setDistanceViewerUser(viewerData ?? user);
        }
      } catch (err) {
        console.warn("Could not fetch current user details for distance fallback:", err);
        if (!cancelled) {
          setDistanceViewerUser(user);
        }
      }
    };

    fetchDistanceViewerUser();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isModalVisible, user]);

  // Fetch structured tags when modal opens (needed for display AND edit mode)
  useEffect(() => {
    // Only run when the modal is actually visible
    if (!isModalVisible) return;

    // If we already have tags, no need to fetch again
    if (allTags.length > 0) return;

    const fetchTags = async () => {
      try {
        const structuredTags = await tagService.getStructuredTags();
        setAllTags(structuredTags);
      } catch (error) {
        console.error("Error fetching tags:", error);
      }
    };

    fetchTags();
  }, [isModalVisible, allTags.length]);

  // Handle team tags update
  const handleTeamTagsUpdate = async (newTagIds) => {
    try {
      // Normalize tag IDs to numbers and format for the API
      const tagsPayload = newTagIds
        .map((tagId) => Number(tagId))
        .filter((id) => !Number.isNaN(id))
        .map((tag_id) => ({ tag_id }));

      await teamService.updateTeam(effectiveTeamId, { tags: tagsPayload });

      // Refresh team details to show updated tags
      await fetchTeamDetails();

      setNotification({
        type: "success",
        message: "Focus areas updated successfully!",
      });
    } catch (error) {
      console.error("Error updating team tags:", error);
      throw new Error("Failed to update team focus areas");
    }
  };

  const handleLeaveTeam = async () => {
    if (!user?.id || !team?.id) return;

    setLeaveLoading(true);
    try {
      const result = await teamService.removeTeamMember(team.id, user.id);
      const reopenedRoles = Array.isArray(result?.data?.reopenedRoles)
        ? result.data.reopenedRoles
        : [];

      setNotification({
        type: "success",
        message:
          reopenedRoles.length > 0
            ? `You have left the team. ${reopenedRoles.length} filled ${reopenedRoles.length === 1 ? "role was" : "roles were"} reopened.`
            : "You have left the team successfully.",
      });
      setIsLeaveDialogOpen(false);

      // Close modal and trigger leave callback after a short delay
      setTimeout(() => {
        if (onLeave) onLeave(team.id);
        if (onClose) onClose();
      }, 1500);
    } catch (error) {
      console.error("Error leaving team:", error);
      setNotification({
        type: "error",
        message:
          error.response?.data?.message ||
          "Failed to leave team. Please try again.",
      });
      setIsLeaveDialogOpen(false);
    } finally {
      setLeaveLoading(false);
    }
  };

  // Invitation response handlers
  const handleInvitationAccept = async (
    invitationId,
    responseMessage = "",
    fillRole = false,
    options = {},
  ) => {
    try {
      await teamService.respondToInvitation(
        invitationId,
        "accept",
        responseMessage,
        fillRole,
        options,
      );
      setNotification({
        type: "success",
        message: "Invitation accepted! You are now a member of this team.",
      });
      setIsInvitationModalOpen(false);
      // Refresh team details to show updated membership
      await fetchTeamDetails();
      // Close the modal after a short delay
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
    } catch (error) {
      console.error("Error accepting invitation:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to accept invitation. Please try again.",
      });
    }
  };

  const handleInvitationDecline = async (
    invitationId,
    responseMessage = "",
  ) => {
    try {
      await teamService.respondToInvitation(
        invitationId,
        "decline",
        responseMessage,
      );
      setNotification({
        type: "success",
        message: "Invitation declined.",
      });
      setIsInvitationModalOpen(false);
      // Close the modal after a short delay
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
    } catch (error) {
      console.error("Error declining invitation:", error);
      setNotification({
        type: "error",
        message: "Failed to decline invitation. Please try again.",
      });
    }
  };

  // Check if user can leave (is a member but not the sole owner)
  const canLeaveTeam = useMemo(() => {
    if (!user?.id || !team?.members) return false;

    const currentMember = team.members.find(
      (m) => idsMatch(getTeamMemberUserId(m), user.id),
    );

    if (!currentMember) return false;

    // If user is owner, check if they're the only owner
    if (currentMember.role === "owner") {
      const ownerCount = team.members.filter((m) => m.role === "owner").length;
      return ownerCount > 1; // Can only leave if there's another owner
    }

    return true; // Members and admins can always leave
  }, [user?.id, team?.members]);

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = "Team name is required";
    } else if (formData.name.trim().length < 3) {
      errors.name = "Team name must be at least 3 characters";
    }

    if (!formData.description.trim()) {
      errors.description = "Team description is required";
    } else if (formData.description.trim().length < 10) {
      errors.description = "Description must be at least 10 characters";
    }

    // Only validate maxMembers if it's not unlimited (null)
    if (formData.maxMembers !== null && formData.maxMembers < 2) {
      errors.maxMembers = "Team size must be at least 2 members";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    // Prevent non-owners from submitting form updates
    if (!canEditTeam) {
      setNotification({
        type: "error",
        message: "You do not have permission to edit this team.",
      });
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setNotification({ type: null, message: null });

      const isPublicBoolean = formData.isPublic === true;

      // Decide what to send for max_members based on the mode
      let maxMembersForSubmit = null;

      if (formData.maxMembersMode === "unlimited") {
        maxMembersForSubmit = null; // unlimited
      } else {
        const parsed =
          typeof formData.maxMembers === "number"
            ? formData.maxMembers
            : parseInt(formData.maxMembers, 10);

        maxMembersForSubmit = Number.isNaN(parsed) ? null : parsed;
      }

      // Prepare the submission data - PRESERVE EXISTING IMAGE URL
      const isRemoteBoolean = formData.isRemote === true;

      const submissionData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        is_public: isPublicBoolean,
        max_members: maxMembersForSubmit,
        teamavatar_url:
          formData.teamavatarUrl ||
          team?.teamavatar_url ||
          team?.teamavatarUrl ||
          null,
        is_remote: isRemoteBoolean,
        postal_code: isRemoteBoolean
          ? null
          : formData.postalCode?.trim() || null,
        city: isRemoteBoolean ? null : formData.city?.trim() || null,
        state: isRemoteBoolean ? null : formData.state?.trim() || null,
        country: isRemoteBoolean ? null : formData.country?.trim() || null,
      };

      // Handle avatar file upload if a new file was selected
      if (formData.teamavatarFile) {
        const uploadResult = await uploadToImageKit(
          formData.teamavatarFile,
          "teamAvatars",
        );

        if (uploadResult.success) {
          submissionData.teamavatar_url = uploadResult.url;
          submissionData.teamavatar_file_id = uploadResult.fileId;
        } else {
          console.error("Error uploading team avatar:", uploadResult.error);
          // Continue with the update even if image upload fails
          setNotification({
            type: "warning",
            message: "Team updated but avatar upload failed.",
          });
        }
      }

      // Always send tags
      submissionData.tags = (formData.selectedTags ?? [])
        .map((t) =>
          typeof t === "object"
            ? (t.id ?? t.tag_id ?? t.tagId ?? t.tagID ?? t.value)
            : t,
        )
        .map((x) => Number(x))
        .filter((id) => Number.isFinite(id) && id > 0)
        .map((tag_id) => ({ tag_id }));

      const response = await teamService.updateTeam(
        effectiveTeamId,
        submissionData,
      );

      // Update our local state with the new visibility value
      setIsPublic(isPublicBoolean);

      // Create a properly updated team object to return to parent
      const updatedTeam = {
        ...team,
        ...submissionData,
        is_public: isPublicBoolean,
      };

      setNotification({
        type: "success",
        message: "Team updated successfully!",
      });

      setIsEditing(false);

      // After updating, fetch the latest data to ensure we have the most up-to-date info
      await fetchTeamDetails();

      // Update the parent component if callback is provided
      if (onUpdate) {
        onUpdate(updatedTeam);
      }
    } catch (err) {
      console.error("Error updating team:", err);

      let errorMessage = "Failed to update team. Please try again.";
      if (err.response?.data?.errors && err.response.data.errors.length > 0) {
        errorMessage = `Error: ${err.response.data.errors[0]}`;
      } else if (err.response?.data?.message) {
        errorMessage = `Error: ${err.response.data.message}`;
      } else if (err.message) {
        errorMessage = `Error: ${err.message}`;
      }

      setNotification({
        type: "error",
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = () => {
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteTeamDialog = () => {
    if (loading) return;
    setIsDeleteDialogOpen(false);
  };

  const confirmDeleteTeam = async () => {
    try {
      setLoading(true);

      let success = false;
      if (onDelete) {
        success = await onDelete(effectiveTeamId);
      } else {
        await teamService.deleteTeam(effectiveTeamId);
        success = true;
      }

      if (success) {
        setIsDeleteDialogOpen(false);
        handleClose();
        // If we're on a team-specific route, navigate away
        if (urlTeamId) {
          navigate("/teams/my-teams");
        }
      }
    } catch (err) {
      console.error("Error deleting team:", err);
      setNotification({
        type: "error",
        message: "Failed to delete team. Please try again.",
      });
      setLoading(false);
    }
  };

  const isTeamMember = useMemo(() => {
    if (!team || !user) return false;
    return (
      team.members?.some((member) => idsMatch(getTeamMemberUserId(member), user.id)) ||
      isOwner || // Make sure this matches your variable name
      Boolean(effectiveUserRole)
    );
  }, [team, user, isOwner, effectiveUserRole]);

  const currentUserIsListedTeamMember = useMemo(
    () =>
      Boolean(
        team?.members?.some((member) =>
          idsMatch(getTeamMemberUserId(member), user?.id),
        ),
      ),
    [team?.members, user?.id],
  );

  const isTeamArchived = Boolean(
    team?.archived_at || team?.status === "inactive",
  );
  // Primary application used by CTA / details modal (prefer locally submitted or prop-supplied)
  const effectivePendingApplication =
    localPendingApplication ?? pendingApplication ?? fetchedPendingApplications[0] ?? null;
  const applicationDetailsRecord =
    selectedPendingApplication ?? effectivePendingApplication;
  const effectivePendingInvitation = pendingInvitation ?? fetchedPendingInvitation;
  const effectiveHasPendingInvitation = hasPendingInvitation || Boolean(fetchedPendingInvitation);
  const hasActivePendingApplication = Boolean(
    (hasPendingApplication || effectivePendingApplication) &&
      !currentUserIsListedTeamMember,
  );
  // Separate flags for subline icons (team-join vs role-fill)
  const allPendingApplications = [
    ...(localPendingApplication ? [localPendingApplication] : []),
    ...(pendingApplication && !localPendingApplication ? [pendingApplication] : []),
    ...fetchedPendingApplications,
  ].filter(
    (a, i, arr) => arr.findIndex((b) => String(b.id) === String(a.id)) === i,
  );
  // Classify each application:
  //   combined  = external applicant with a role (team join + role fill in one)  → violet
  //   role-only = existing member applying for a role                            → orange
  //   team-only = no role attached                                               → blue/info
  const pendingCombinedApplication = !currentUserIsListedTeamMember
    ? allPendingApplications.find(
        (a) => Boolean(a.role) && !(a.isInternalRoleApplication || a.is_internal_role_application),
      )
    : null;
  const pendingInternalRoleApplication = !currentUserIsListedTeamMember
    ? allPendingApplications.find(
        (a) => Boolean(a.isInternalRoleApplication || a.is_internal_role_application),
      )
    : null;
  const pendingTeamOnlyApplication = !currentUserIsListedTeamMember
    ? allPendingApplications.find(
        (a) => !a.role && !(a.isInternalRoleApplication || a.is_internal_role_application),
      )
    : null;
  const hasPendingTeamApplication = Boolean(pendingTeamOnlyApplication);
  const hasPendingRoleApplication = Boolean(pendingCombinedApplication || pendingInternalRoleApplication);
  const openApplicationDetails = (application = null) => {
    const applicationToOpen = application ?? effectivePendingApplication;
    if (applicationToOpen) {
      setSelectedPendingApplication(application);
      setIsApplicationDetailsOpen(true);
      return;
    }

    onViewApplicationDetails?.();
  };
  const shouldShowHeaderApplyButton =
    isAuthenticated &&
    Boolean(team && effectiveTeamId) &&
    !currentUserIsListedTeamMember &&
    !isTeamArchived &&
    !(effectiveHasPendingInvitation && effectivePendingInvitation) &&
    !hasActivePendingApplication &&
    !hasPendingTeamApplication &&
    !hasPendingRoleApplication;

  const handleTeamApplicationSuccess = useCallback(
    (applicationData, submitResponse) => {
      const submittedApplication = submitResponse?.data ?? {};
      setLocalPendingApplication({
        id: submittedApplication.applicationId,
        applicationId: submittedApplication.applicationId,
        status: submittedApplication.status ?? "pending",
        message: applicationData.message,
        created_at: new Date().toISOString(),
        team: team ?? { id: effectiveTeamId },
        isInternalRoleApplication:
          submittedApplication.isInternalRoleApplication ?? false,
        is_internal_role_application:
          submittedApplication.isInternalRoleApplication ?? false,
      });
      setNotification({
        type: "success",
        message: applicationData.isDraft
          ? "Draft saved successfully"
          : "Application sent successfully!",
      });
    },
    [effectiveTeamId, team],
  );

  const renderJoinButton = () => {
    if (!isAuthenticated) return null;

    const isMember = currentUserIsListedTeamMember;

    if (isTeamArchived && !isMember) {
      return null;
    }

    if (effectiveHasPendingInvitation && effectivePendingInvitation) {
      return (
        <div className="mt-6 border-t border-base-200 pt-4">
          <Button
            variant="primary"
            onClick={() => setIsInvitationModalOpen(true)}
            className="w-full"
            icon={<Mail size={16} />}
          >
            Open Invite to Respond
          </Button>
        </div>
      );
    }

    // Pending application CTA
    const hasApp = hasActivePendingApplication;

    if (hasApp) {
      return (
        <div className="mt-6 border-t border-base-200 pt-4">
          <Button
            variant="primary"
            onClick={() => openApplicationDetails()}
            className="w-full"
            icon={<SendHorizontal size={16} />}
          >
            View Application Details
          </Button>
        </div>
      );
    }

    return (
      <div className="mt-6 border-t border-base-200 pt-4">
        {isMember ? (
          <div className="flex items-center gap-2">
            {/* Send Message to Team Button */}
            <SendMessageButton
              type="team"
              teamId={team?.id}
              teamName={team?.name}
              variant="primary"
              className="flex-1"
            >
              Send Message to Team
            </SendMessageButton>

            {/* Leave Team Button */}
            {canLeaveTeam && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsLeaveDialogOpen(true)}
                className="hover:bg-red-100 hover:text-red-700 p-2"
                aria-label="Leave team"
                title="Leave team"
              >
                <LogOut size={20} />
              </Button>
            )}
          </div>
        ) : (
          <TeamApplicationButton
            team={team}
            teamId={effectiveTeamId}
            disabled={loading}
            className="w-full"
            onAfterSubmit={fetchTeamDetails}
            onSuccess={handleTeamApplicationSuccess}
          />
        )}
      </div>
    );
  };

  const renderNotification = () => {
    if (!notification.type || !notification.message) return null;

    return (
      <ScreenAlert
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification({ type: null, message: null })}
      />
    );
  };

  const handleMemberClick = (memberId) => {
    setSelectedUserId(memberId);
    setIsUserModalOpen(true);
  };

  const handleUserModalClose = () => {
    setIsUserModalOpen(false);
    setSelectedUserId(null);
  };

  // Create custom title with buttons
  const effectiveTeamMatch = useMemo(() => {
    const shouldResolveMatchData =
      !hideMatchData &&
      (showMatchHighlights ||
        matchScore > 0 ||
        matchType != null ||
        matchDetails != null ||
        (!isFromSearch && (teamBadges?.length > 0 || team?.tags?.length > 0)));

    if (!shouldResolveMatchData || !team || !user) {
      return { matchScore, matchType, matchDetails };
    }

    const viewerProfile = buildViewerTeamMatchProfile({
      user,
      userTags: Array.from(currentUserTagIds ?? userTagIds ?? []),
      userBadges: Array.from(currentUserBadgeNames ?? []),
    });
    const enrichedTeam = enrichTeamMatchData({
      team: {
        ...team,
        bestMatchScore: matchScore,
        best_match_score: matchScore,
        matchType,
        match_type: matchType,
        matchDetails,
        match_details: matchDetails,
      },
      viewerProfile,
      teamBadges,
    });

    return {
      matchScore: enrichedTeam.bestMatchScore ?? matchScore,
      matchType: enrichedTeam.matchType ?? matchType,
      matchDetails: enrichedTeam.matchDetails ?? matchDetails,
    };
  }, [
    currentUserBadgeNames,
    currentUserTagIds,
    hideMatchData,
    isFromSearch,
    matchDetails,
    matchScore,
    matchType,
    showMatchHighlights,
    team,
    teamBadges,
    user,
    userTagIds,
  ]);

  const effectiveTeamDistanceKm = useMemo(() => {
    const rawDistance = team?.distance_km ?? team?.distanceKm;
    const numericDistance =
      rawDistance != null ? Number(rawDistance) : null;
    const viewerForDistance = distanceViewerUser ?? user;
    const computedDistance = viewerForDistance
      ? calculateDistanceKm(viewerForDistance, team)
      : null;
    const rawZeroLooksWrong =
      Number.isFinite(numericDistance) &&
      numericDistance <= 0.5 &&
      viewerForDistance &&
      locationsHaveDifferentKnownParts(viewerForDistance, team);

    if (Number.isFinite(numericDistance) && numericDistance < 999999) {
      if (rawZeroLooksWrong) {
        return computedDistance;
      }

      return numericDistance;
    }

    if (computedDistance != null) {
      return computedDistance;
    }

    return null;
  }, [distanceViewerUser, team, user]);

  const teamMatchTier =
    effectiveTeamMatch.matchScore != null
      ? getMatchTier(effectiveTeamMatch.matchScore)
      : null;

  const modalTitle = (
    <h2 className="text-xl font-medium text-primary flex items-center gap-2">
      {isEditing ? <Edit size={20} className="flex-shrink-0" /> : <Users size={20} className="flex-shrink-0" />}
      {isEditing ? "Edit Team" : "Team Details"}
    </h2>
  );

  const getTeamCreatedDate = () => {
    const createdAt = team?.created_at ?? team?.createdAt;
    if (!createdAt) return null;

    try {
      return {
        short: format(new Date(createdAt), "MM/yy"),
        narrow: format(new Date(createdAt), "MM/yy"),
        full: format(new Date(createdAt), "MMMM d, yyyy"),
      };
    } catch (error) {
      console.error("Error formatting team creation date:", error);
      return null;
    }
  };

  const modalHeaderActions = !isEditing ? (
    <div className="flex items-center gap-1">
      {canEditTeam && (
        <Tooltip
          content="Edit this team's details, focus areas, location, and visibility."
          position="bottom"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              userHasEditedTagsRef.current = false;
              setFormData((prev) => ({
                ...prev,
                selectedTags:
                  (prev.selectedTags?.length ?? 0) > 0
                    ? prev.selectedTags
                    : normalizeTeamTagIds(team),
              }));
              setIsEditing(true);
            }}
            className="hover:bg-[#7ace82] hover:text-[#036b0c]"
            icon={<Edit size={16} />}
            aria-label="Edit team details"
          >
            <span className="hidden sm:inline">Edit</span>
          </Button>
        </Tooltip>
      )}
      {shouldShowHeaderApplyButton && (
        <Tooltip content="Apply to join this team." position="bottom">
          <TeamApplicationButton
            team={team}
            teamId={effectiveTeamId}
            disabled={loading}
            variant="ghost"
            size="sm"
            className="flex items-center gap-1"
            buttonIcon={<SendHorizontal size={16} />}
            buttonLabel={<span className="hidden sm:inline">Apply</span>}
            ariaLabel="Apply to join team"
            onAfterSubmit={fetchTeamDetails}
            onSuccess={handleTeamApplicationSuccess}
          />
        </Tooltip>
      )}
    </div>
  ) : null;

  if (!isModalVisible) return null;

  return (
    <>
      {/* Main Modal using Modal.jsx component */}
      <Modal
        isOpen={isModalVisible}
        onClose={handleClose}
        title={modalTitle}
        headerActions={modalHeaderActions}
        position="center"
        size="default"
        maxHeight="max-h-[90vh]"
        minHeight="min-h-[300px]"
        closeOnBackdrop={true}
        closeOnEscape={true}
        showCloseButton={true}
        closeButtonTooltip="Close team details and return to the previous view."
        zIndexStyle={zIndexStyle}
        boxZIndexStyle={boxZIndexStyle}
      >
        {renderNotification()}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="loading loading-spinner loading-lg text-primary"></div>
          </div>
        ) : (
          <>
            {isEditing ? (
              <TeamEditForm
                team={team}
                formData={formData}
                setFormData={setFormData}
                formErrors={formErrors}
                setFormErrors={setFormErrors}
                onSubmit={handleSubmit}
                onCancel={() => setIsEditing(false)}
                onDelete={canDeleteTeam ? handleDeleteTeam : undefined}
                loading={loading}
                isOwner={isOwner}
                onAvatarDeleted={() => {
                  // Refresh team details after avatar deletion
                  fetchTeamDetails();
                  setNotification({
                    type: "success",
                    message: "Team picture removed successfully!",
                  });
                }}
              />
            ) : (
              <div className="space-y-6">
                {/* Team header with avatar */}
                <div className="relative flex items-start space-x-4 mb-6">
                  <div className="avatar placeholder relative">
                    <div className="bg-[var(--color-primary-focus)] text-primary-content rounded-full w-20 h-20 relative flex items-center justify-center overflow-hidden">
                      {(team?.teamavatar_url || team?.teamavatarUrl) &&
                      !teamImageError ? (
                        <img
                          src={team?.teamavatar_url || team?.teamavatarUrl}
                          alt="Team"
                          className="rounded-full object-cover w-full h-full"
                          onError={() => setTeamImageError(true)}
                        />
                      ) : (
                        <span className="text-2xl">{getTeamInitials()}</span>
                      )}
                      {isSyntheticTeam(team) && (
                        <DemoAvatarOverlay
                          textClassName="text-[9px]"
                          textTranslateClassName="-translate-y-[4px]"
                        />
                      )}
                    </div>
                    {teamMatchTier && (
                      <Tooltip
                        content={`${teamMatchTier.pct}% ${teamMatchTier.label.toLowerCase()}`}
                        position="bottom"
                        wrapperClassName={`absolute -top-1 -left-1 w-6 h-6 rounded-full ring-2 ring-white flex items-center justify-center cursor-help ${teamMatchTier.bg}`}
                      >
                        <teamMatchTier.Icon
                          size={12}
                          className="text-white"
                          strokeWidth={2.5}
                        />
                      </Tooltip>
                    )}
                  </div>
                  <div className="flex-1">
                    <h1
                      ref={teamTitleContainerRef}
                      className="text-2xl font-bold leading-[110%] mb-[0.2em] relative"
                    >
                      {teamName}
                      <span
                        ref={teamTitleProbeRef}
                        className="invisible absolute whitespace-nowrap pointer-events-none left-0 top-0 font-bold"
                        aria-hidden="true"
                      />
                    </h1>
                    {/* Members count and visibility */}
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-sm leading-[110%]">
                      <div className="flex items-center gap-1 text-base-content/70">
                        <Users size={14} className="text-primary flex-shrink-0" />
                        <span>
                          {team.current_members_count ??
                            team.currentMembersCount ??
                            team.members?.length ??
                            0}
                          {""}/
                          {team.max_members === null
                            ? "∞"
                            : (team.max_members ?? team.maxMembers ?? "∞")}
                        </span>
                      </div>

                      {teamRoles.filter((r) => r.status === "open").length > 0 && (
                        <Tooltip
                          content="Vacant roles"
                          position="bottom"
                          wrapperClassName="flex items-center gap-1 text-base-content/70 cursor-help"
                        >
                          <UserSearch size={14} className="text-orange-500 flex-shrink-0" />
                          <span>
                            {teamRoles.filter((r) => r.status === "open").length}
                          </span>
                        </Tooltip>
                      )}

                      {/* Pending invitation indicator */}
                      {effectiveHasPendingInvitation && effectivePendingInvitation && (
                        <Tooltip
                          content={
                            (effectivePendingInvitation.isInternal ?? effectivePendingInvitation.is_internal)
                              ? `You were invited to fill a role in this team${(effectivePendingInvitation.createdAt ?? effectivePendingInvitation.created_at) ? `
on ${format(new Date((effectivePendingInvitation.createdAt ?? effectivePendingInvitation.created_at)), "MMM d, yyyy")}` : ""}`
                              : `You were invited to join this team${(effectivePendingInvitation.createdAt ?? effectivePendingInvitation.created_at) ? `
on ${format(new Date((effectivePendingInvitation.createdAt ?? effectivePendingInvitation.created_at)), "MMM d, yyyy")}` : ""}`
                          }
                          position="bottom"
                          wrapperClassName="inline-flex"
                        >
                          <button
                            type="button"
                            className="group flex items-center gap-1 cursor-pointer rounded-sm transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            onClick={() => setIsInvitationModalOpen(true)}
                          >
                            <Mail
                              size={14}
                              className={`flex-shrink-0 ${(effectivePendingInvitation.isInternal ?? effectivePendingInvitation.is_internal) ? "text-orange-500" : "text-pink-500"}`}
                            />
                            {(effectivePendingInvitation.createdAt ?? effectivePendingInvitation.created_at) && (
                              <span className="text-base-content/50 transition-colors group-hover:text-primary group-focus-visible:text-primary">{format(new Date((effectivePendingInvitation.createdAt ?? effectivePendingInvitation.created_at)), "MM/dd/yy")}</span>
                            )}
                          </button>
                        </Tooltip>
                      )}

                      {/* Pending application indicators */}
                      {/* Combined team+role application → violet */}
                      {pendingCombinedApplication && (
                        <Tooltip
                          content={`You applied to join this team and fill a role${(pendingCombinedApplication.createdAt ?? pendingCombinedApplication.created_at) ? `\non ${format(new Date((pendingCombinedApplication.createdAt ?? pendingCombinedApplication.created_at)), "MMM d, yyyy")}` : ""}`}
                          position="bottom"
                          wrapperClassName="inline-flex"
                        >
                          <button
                            type="button"
                            className="group flex items-center gap-1 cursor-pointer rounded-sm transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            onClick={() => openApplicationDetails(pendingCombinedApplication)}
                          >
                            <SendHorizontal size={14} className="flex-shrink-0 text-violet-500" />
                            {(pendingCombinedApplication.createdAt ?? pendingCombinedApplication.created_at) && (
                              <span className="text-base-content/50 transition-colors group-hover:text-primary group-focus-visible:text-primary">{format(new Date((pendingCombinedApplication.createdAt ?? pendingCombinedApplication.created_at)), "MM/dd/yy")}</span>
                            )}
                          </button>
                        </Tooltip>
                      )}
                      {/* Role-only application for existing members → orange */}
                      {pendingInternalRoleApplication && (
                        <Tooltip
                          content={`You applied to fill a role in this team${(pendingInternalRoleApplication.createdAt ?? pendingInternalRoleApplication.created_at) ? `\non ${format(new Date((pendingInternalRoleApplication.createdAt ?? pendingInternalRoleApplication.created_at)), "MMM d, yyyy")}` : ""}`}
                          position="bottom"
                          wrapperClassName="inline-flex"
                        >
                          <button
                            type="button"
                            className="group flex items-center gap-1 cursor-pointer rounded-sm transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            onClick={() => openApplicationDetails(pendingInternalRoleApplication)}
                          >
                            <SendHorizontal size={14} className="flex-shrink-0 text-orange-500" />
                            {(pendingInternalRoleApplication.createdAt ?? pendingInternalRoleApplication.created_at) && (
                              <span className="text-base-content/50 transition-colors group-hover:text-primary group-focus-visible:text-primary">{format(new Date((pendingInternalRoleApplication.createdAt ?? pendingInternalRoleApplication.created_at)), "MM/dd/yy")}</span>
                            )}
                          </button>
                        </Tooltip>
                      )}
                      {/* Team-only application → blue */}
                      {pendingTeamOnlyApplication && (
                        <Tooltip
                          content={`You applied to join this team${(pendingTeamOnlyApplication.createdAt ?? pendingTeamOnlyApplication.created_at) ? `\non ${format(new Date((pendingTeamOnlyApplication.createdAt ?? pendingTeamOnlyApplication.created_at)), "MMM d, yyyy")}` : ""}`}
                          position="bottom"
                          wrapperClassName="inline-flex"
                        >
                          <button
                            type="button"
                            className="group flex items-center gap-1 cursor-pointer rounded-sm transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            onClick={() => openApplicationDetails(pendingTeamOnlyApplication)}
                          >
                            <SendHorizontal size={14} className="flex-shrink-0 text-info" />
                            {(pendingTeamOnlyApplication.createdAt ?? pendingTeamOnlyApplication.created_at) && (
                              <span className="text-base-content/50 transition-colors group-hover:text-primary group-focus-visible:text-primary">{format(new Date((pendingTeamOnlyApplication.createdAt ?? pendingTeamOnlyApplication.created_at)), "MM/dd/yy")}</span>
                            )}
                          </button>
                        </Tooltip>
                      )}

                      {/* Archived status - ALWAYS show for archived teams */}
                      {(team?.archived_at || team?.status === "inactive") && (
                        <div className="flex items-center gap-1 text-base-content/70">
                          <Archive size={14} className="flex-shrink-0" />
                          <span>Archived</span>
                        </div>
                      )}

                      {/* Public/Private status - only for members of NON-archived teams */}
                      {shouldShowVisibilityStatus() &&
                        !(team?.archived_at || team?.status === "inactive") && (
                          <Tooltip
                            content={isPublic ? "Public — visible to everyone" : "Private — only visible to members"}
                            position="bottom"
                            wrapperClassName="flex items-center gap-1 text-base-content/70 cursor-help"
                          >
                            {isPublic ? (
                              <>
                                <Eye
                                  size={14}
                                  className="text-green-600 flex-shrink-0"
                                />
                                {!teamDateIsNarrow && <span>Public</span>}
                              </>
                            ) : (
                              <>
                                <EyeClosed
                                  size={14}
                                  className="text-gray-500 flex-shrink-0"
                                />
                                {!teamDateIsNarrow && <span>Private</span>}
                              </>
                            )}
                          </Tooltip>
                        )}

                      {((teamDateIsNarrow && getTeamCreatedDate()) || isSyntheticTeam(team)) && (
                        <span className="flex items-center gap-3 flex-shrink-0">
                          {teamDateIsNarrow && getTeamCreatedDate() && (
                            <Tooltip
                              content={`Created on ${getTeamCreatedDate().full}`}
                              position="bottom"
                              wrapperClassName="flex items-center text-base-content/70 flex-shrink-0 cursor-help"
                            >
                              <Calendar size={14} className="mr-1" />
                              <span>{getTeamCreatedDate().narrow}</span>
                            </Tooltip>
                          )}
                          {isSyntheticTeam(team) && (
                            <Tooltip
                              content={DEMO_TEAM_TOOLTIP}
                              wrapperClassName="flex items-start text-base-content/50"
                            >
                              <FlaskConical size={14} className={`flex-shrink-0 mt-px${teamDateIsNarrow ? "" : " mr-0.5"}`} />
                              {!teamDateIsNarrow && <span className="leading-[1.15]">Demo Team</span>}
                            </Tooltip>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  {getTeamCreatedDate() && (
                    <div
                      ref={teamDateRef}
                      className={`flex-shrink-0${teamDateIsNarrow ? " absolute opacity-0 pointer-events-none" : ""}`}
                    >
                      <Tooltip
                        content={`Created on ${getTeamCreatedDate().full}`}
                        position="bottom"
                        wrapperClassName="flex items-center text-base-content/70 cursor-help"
                      >
                        <Calendar size={14} className="mr-1" />
                        <span>{getTeamCreatedDate().short}</span>
                      </Tooltip>
                    </div>
                  )}
                </div>

                <div className="space-y-8">
                  {/* Team description */}
                  {team?.description && (
                    <div>
                      <p className="text-base-content/90 my-6">
                        {team.description}
                      </p>
                    </div>
                  )}

                  {/* Match Score */}
                  <MatchScoreSection
                    matchScore={effectiveTeamMatch.matchScore}
                    matchType={effectiveTeamMatch.matchType}
                    matchDetails={effectiveTeamMatch.matchDetails}
                    comparisonLabel="this team"
                  />

                  {/* Team Location */}
                  <LocationSection
                    entity={team}
                    entityType="team"
                    distance={showHighlightsForContext ? effectiveTeamDistanceKm : null}
                    showDefaultHeaderRight={showHighlightsForContext}
                  />

                  {/* Team Focus Areas */}
                  {!isEditing && (
                    <TagsDisplaySection
                      title={UI_TEXT.focusAreas.title}
                      tags={team?.tags || []}
                      matchingTagIds={showHighlightsForContext ? currentUserTagIds : null}
                      allTags={allTags}
                      canEdit={false}
                      onSave={undefined}
                      onTagClick={handleTagClick}
                      onSupercategoryClick={handleSupercategoryClick}
                      entityType="team"
                      emptyMessage={UI_TEXT.focusAreas.emptyTeam}
                      placeholder={UI_TEXT.focusAreas.placeholderTeam}
                      headerRight={showHighlightsForContext && currentUserTagIds && currentUserTagIds.size > 0 ? (() => {
                        const teamTags = team?.tags || [];
                        if (!Array.isArray(teamTags) || teamTags.length === 0) return null;
                        const total = teamTags.length;
                        const matchCount = teamTags.filter((t) => {
                          const tagId = Number(t.id ?? t.tag_id ?? t.tagId);
                          return currentUserTagIds.has(tagId);
                        }).length;
                        if (matchCount > 0) {
                          const MatchIcon = matchCount === total ? CheckCheck : Check;
                          return (
                            <span className="flex items-center gap-1.5 text-sm text-success">
                              <MatchIcon size={14} className="flex-shrink-0" />
                              <span>{matchCount}/{total} in common</span>
                            </span>
                          );
                        }
                        return (
                          <span className="flex items-center gap-1.5 text-sm text-slate-500">
                            <X size={14} className="flex-shrink-0" />
                            <span>None in common</span>
                          </span>
                        );
                      })() : null}
                    />
                  )}

                  {/* Team Badges */}
                  {!isEditing && teamBadges && teamBadges.length > 0 && (
                    <BadgesDisplaySection
                      title="Badges"
                      badges={teamBadges}
                      emptyMessage="No badges earned yet"
                      maxVisible={10}
                      groupByCategory={true}
                      showCredits={true}
                      onCategoryClick={handleBadgeCategoryClick}
                      onBadgeClick={handleBadgeClick}
                      matchingBadgeNames={showHighlightsForContext ? (roleMatchBadgeNames || currentUserBadgeNames) : null}
                      headerRight={showHighlightsForContext && (roleMatchBadgeNames || currentUserBadgeNames) ? (() => {
                        const activeMatchNames = roleMatchBadgeNames || currentUserBadgeNames;
                        const total = teamBadges.length;
                        const matchCount = teamBadges.filter((b) =>
                          activeMatchNames.has((b.name ?? "").trim().toLowerCase())
                        ).length;
                        if (matchCount > 0) {
                          const MatchIcon = matchCount === total ? CheckCheck : Check;
                          return (
                            <span className="flex items-center gap-1.5 text-sm text-success">
                              <MatchIcon size={14} className="flex-shrink-0" />
                              <span>{matchCount}/{total} in common</span>
                            </span>
                          );
                        }
                        return (
                          <span className="flex items-center gap-1.5 text-sm text-slate-500">
                            <X size={14} className="flex-shrink-0" />
                            <span>None in common</span>
                          </span>
                        );
                      })() : null}
                    />
                  )}

                  {/* Team Members */}
                  <TeamMembersSection
                    team={team}
                    isEditing={isEditing}
                    isAuthenticated={isAuthenticated}
                    user={user}
                    onMemberClick={handleMemberClick}
                    shouldAnonymizeMember={shouldAnonymizeMember}
                    isOwner={isOwner}
                    onRoleChange={fetchTeamDetails}
                    onMemberRemoved={fetchTeamDetails}
                    roles={teamRoles}
                  />

                  {/* Vacant Team Roles */}
                  <VacantRolesSection
                    team={team}
                    teamId={effectiveTeamId}
                    canManage={isOwner || effectiveUserRole === "admin"}
                    isTeamMember={isTeamMember}
                    isEditing={isEditing}
                    onRolesLoaded={setTeamRoles}
                    suppressMatchScores={hideMatchData}
                  />
                </div>

                {/* Join / Leave / Message Buttons */}
                {renderJoinButton()}
              </div>
            )}
          </>
        )}
      </Modal>

      {/* User Details Modal */}
      {isUserModalOpen && selectedUserId && (
        <UserDetailsModal
          isOpen={isUserModalOpen}
          userId={selectedUserId}
          onClose={handleUserModalClose}
          mode="view"
          filledRoleName={(() => {
            const r = teamRoles.find((r) => {
              if (String(r.status ?? "").toLowerCase() !== "filled") return false;
              const fid = r.filledByUserId ?? r.filled_by_user_id ?? r.filledBy ?? r.filled_by ?? null;
              return fid != null && String(fid) === String(selectedUserId);
            });
            return r?.roleName ?? r?.role_name ?? null;
          })()}
          teamName={team?.name ?? null}
        />
      )}

      <ConfirmModal
        isOpen={isDeleteDialogOpen}
        onClose={closeDeleteTeamDialog}
        onConfirm={confirmDeleteTeam}
        title="Delete Team"
        loading={loading}
        confirmLabel="Delete Team"
        loadingLabel="Deleting..."
        confirmVariant="error"
        confirmIcon={<Trash2 size={16} />}
      >
        <p className="text-sm text-base-content/80">
          Delete this team? This action cannot be undone.
        </p>
      </ConfirmModal>

      {/* Leave Team Confirmation Dialog */}
      <ConfirmModal
        isOpen={isLeaveDialogOpen}
        onClose={() => setIsLeaveDialogOpen(false)}
        onConfirm={handleLeaveTeam}
        title="Leave Team"
        loading={leaveLoading}
        confirmLabel="Leave Team"
        loadingLabel="Leaving..."
        confirmVariant="error"
      >
        <p className="text-sm text-base-content/80">
          Really want to leave this team?
        </p>
        {isOwner && (
          <p className="text-warning text-sm mt-2">
            Note: As an owner, you can only leave if there&apos;s another owner
            to manage the team. Pass ownership before leaving.
          </p>
        )}
      </ConfirmModal>
      <TagAwardsModal {...tagAwardsModalProps} />
      <SupercategoryAwardsModal {...supercategoryModalProps} />

      {/* Badge Category Modal */}
      <BadgeCategoryModal
        {...badgeCategoryModalProps}
        onOpenUser={handleMemberClick}
      />

      {/* Invitation Details Modal */}
      {effectivePendingInvitation && (
        <TeamInvitationDetailsModal
          isOpen={isInvitationModalOpen}
          invitation={effectivePendingInvitation}
          onClose={() => setIsInvitationModalOpen(false)}
          onAccept={handleInvitationAccept}
          onDecline={handleInvitationDecline}
        />
      )}

      {applicationDetailsRecord && (
        <TeamApplicationDetailsModal
          isOpen={isApplicationDetailsOpen}
          application={applicationDetailsRecord}
          onClose={() => {
            setIsApplicationDetailsOpen(false);
            setSelectedPendingApplication(null);
          }}
          onCancel={async (applicationId) => {
            await teamService.cancelApplication(applicationId);
            setLocalPendingApplication(null);
            setSelectedPendingApplication(null);
            setFetchedPendingApplications((prev) =>
              prev.filter((a) => String(a.id) !== String(applicationId)),
            );
            setIsApplicationDetailsOpen(false);
            await fetchTeamDetails(true);
          }}
        />
      )}
    </>
  );
};

export default TeamDetailsModal;
