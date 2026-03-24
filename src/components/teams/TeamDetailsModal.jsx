import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import TeamRoleManager from "./TeamRoleManager";
import TeamEditForm from "./TeamEditForm";
import { useAuth } from "../../contexts/AuthContext";
import { teamService } from "../../services/teamService";
import { userService } from "../../services/userService";
import Button from "../common/Button";
import SendMessageButton from "../common/SendMessageButton";
import Alert from "../common/Alert";
import TagDisplay from "../common/TagDisplay";
import LocationDisplay from "../common/LocationDisplay";
import { uploadToCloudinary } from "../../config/cloudinary";
import {
  X,
  Edit,
  Users,
  Trash2,
  Eye,
  EyeClosed,
  Tag,
  LogOut,
  Mail,
  SendHorizontal,
  Archive,
  Check,
} from "lucide-react";
import VisibilityToggle from "../common/VisibilityToggle";
import UserDetailsModal from "../users/UserDetailsModal";
import TagsDisplaySection from "../tags/TagsDisplaySection";
import { UI_TEXT } from "../../constants/uiText";
import { tagService } from "../../services/tagService";
import RoleBadgeDropdown from "./RoleBadgeDropdown";
import TeamApplicationButton from "./TeamApplicationButton";
import TeamInvitationDetailsModal from "./TeamInvitationDetailsModal";
import TeamMembersSection from "./TeamMembersSection";
import TeamFocusAreaSection from "./TeamFocusAreaSection";
import VacantRolesSection from "./VacantRolesSection";
import axios from "axios";
import Modal from "../common/Modal";
import LocationSection from "../common/LocationSection";
import TagAwardsModal from "../badges/TagAwardsModal";
import SupercategoryAwardsModal from "../badges/SupercategoryAwardsModal";
import BadgesDisplaySection from "../badges/BadgesDisplaySection";
import BadgeCategoryModal from "../badges/BadgeCategoryModal";
import useTeamAwardModals from "../../hooks/useTeamAwardModals";
import MatchScoreSection from "../common/MatchScoreSection";
import {
  buildViewerTeamMatchProfile,
  enrichTeamMatchData,
} from "../../utils/teamMatchUtils";
import { getMatchTier } from "../../utils/matchScoreUtils";
import { calculateDistanceKm } from "../../utils/locationUtils";

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

  // Team focus-area award modals (parallel to useAwardModals for users)
  const {
    handleTagClick,
    handleSupercategoryClick,
    handleBadgeCategoryClick,
    handleBadgeClick,
    tagAwardsModalProps,
    supercategoryModalProps,
    badgeCategoryModalProps,
  } = useTeamAwardModals(effectiveTeamId);

  const userHasEditedTagsRef = useRef(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false);

  const [teamImageError, setTeamImageError] = useState(false);

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
        console.log(`Fetching details for team ID: ${effectiveTeamId}`);
        const response = await teamService.getTeamById(effectiveTeamId);

        // Log full response for debugging
        console.log("Raw API response:", response);

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

        console.log("Team data extracted:", teamData);

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
          console.log(
            "Searching for owner in members array:",
            teamData.members,
          );

          const ownerMember = teamData.members.find(
            (m) => m.role === "owner" || m.role === "Owner",
          );

          if (ownerMember) {
            ownerId = parseInt(ownerMember.user_id || ownerMember.userId, 10);
            console.log("Found owner ID from members array:", ownerId);
          }
        }

        // 4. Ensure ownerId is valid, use logged-in user as fallback for owner's own teams
        if (isNaN(ownerId) && user && teamData.members) {
          const isCurrentUserOwner = teamData.members.some(
            (member) =>
              (member.user_id === user.id || member.userId === user.id) &&
              (member.role === "owner" || member.role === "Owner"),
          );

          if (isCurrentUserOwner) {
            ownerId = parseInt(user.id, 10);
            console.log("Using current user as owner ID:", ownerId);
          }
        }

        console.log("Final owner ID determination:", ownerId);

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

        console.log("Enhanced team data:", enhancedTeamData);

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
                (member.user_id === user.id || member.userId === user.id) &&
                (member.role === "owner" || member.role === "Owner"),
            )) ||
          false;

        const finalOwnerStatus =
          isUserAuthenticated && (isOwnerById || isOwnerByRole);

        console.log("Owner check:", {
          isUserAuthenticated,
          userId: user?.id,
          ownerId,
          isOwnerById,
          isOwnerByRole,
          finalOwnerStatus,
        });

        setIsOwner(finalOwnerStatus);

        // Determine user's role from members list
        if (isUserAuthenticated && teamData.members) {
          const currentUserMember = teamData.members.find(
            (member) => member.user_id === user.id || member.userId === user.id,
          );
          if (currentUserMember) {
            setInternalUserRole(currentUserMember.role);
            console.log("User role set to:", currentUserMember.role);
          }
        }

        console.log("Team tags data:", teamData.tags);

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

  // Add effect to check team data after it's set
  useEffect(() => {
    if (team) {
      console.log("Current team data in state:", team);
      console.log("Team visibility value:", team.is_public);
      console.log("Team owner:", team.owner_id, "Current user:", user?.id);
    }
  }, [team, user]);

  useEffect(() => {
    if (team) {
      console.log("TeamDetailsModal - Team data:", {
        name: team.name,
        current_members_count: team.current_members_count,
        max_members: team.max_members,
        max_members_type: typeof team.max_members,
        members_length: team.members?.length,
      });
    }
  }, [team]);

  useEffect(() => {
    setIsModalVisible(isOpen);
  }, [isOpen]);

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
        setUserTagIds(ids);
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
        (member) => member.user_id === user.id || member.userId === user.id,
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

      // Debug logging
      console.log(`Changed isPublic to: ${checked} (${typeof checked})`);
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

  // Fetch current user's tag IDs for overlap highlighting on team focus areas
  useEffect(() => {
    if (!showMatchHighlights) return;
    if (!isModalVisible || !isAuthenticated || !user?.id) return;

    const fetchCurrentUserTags = async () => {
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
        setCurrentUserTagIds(ids);
      } catch (err) {
        console.warn("Could not fetch user tags for matching highlights:", err);
      }
    };

    fetchCurrentUserTags();
  }, [isModalVisible, isAuthenticated, user?.id, showMatchHighlights]);

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
    if (!isModalVisible || !isAuthenticated || !user?.id || !showMatchHighlights) {
      setCurrentUserBadgeNames(null);
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
  }, [isModalVisible, isAuthenticated, user?.id, showMatchHighlights]);

  useEffect(() => {
    if (!isModalVisible || !isAuthenticated || !user?.id || !showMatchHighlights) {
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
  }, [isAuthenticated, isModalVisible, showMatchHighlights, user]);

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
      await teamService.removeTeamMember(team.id, user.id);
      setNotification({
        type: "success",
        message: "You have left the team successfully.",
      });
      setIsLeaveDialogOpen(false);

      // Close modal and trigger leave callback after a short delay
      setTimeout(() => {
        console.log(
          "TeamDetailsModal: about to call onLeave with team.id:",
          team.id,
        );
        console.log("TeamDetailsModal: onLeave is:", onLeave);
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
  const handleInvitationAccept = async (invitationId, responseMessage = "") => {
    try {
      await teamService.respondToInvitation(
        invitationId,
        "accept",
        responseMessage,
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
        message: "Failed to accept invitation. Please try again.",
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
      (m) => m.user_id === user.id || m.userId === user.id,
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

      console.log("Form data before submission:", formData);

      const isPublicBoolean = formData.isPublic === true;
      console.log(
        "Visibility value computed:",
        isPublicBoolean,
        typeof isPublicBoolean,
      );

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

      console.log("Edit Team - mode:", formData.maxMembersMode);
      console.log("Edit Team - maxMembersForSubmit:", maxMembersForSubmit);

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
        const uploadResult = await uploadToCloudinary(
          formData.teamavatarFile,
          "teamAvatars",
        );

        if (uploadResult.success) {
          submissionData.teamavatar_url = uploadResult.url;
          console.log("New avatar uploaded:", submissionData.teamavatar_url);
        } else {
          console.error("Error uploading team avatar:", uploadResult.error);
          // Continue with the update even if image upload fails
          setNotification({
            type: "warning",
            message: "Team updated but avatar upload failed.",
          });
        }
      } else {
        console.log(
          "No new image selected, preserving existing avatar URL:",
          submissionData.teamavatar_url,
        );
      }

      console.log("Final submission data:", submissionData);

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

      console.log("Final submission data with tags:", submissionData);

      const response = await teamService.updateTeam(
        effectiveTeamId,
        submissionData,
      );

      console.log("Update response:", response);

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

  const handleDeleteTeam = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete this team? This action cannot be undone.",
      )
    ) {
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
    }
  };

  const isTeamMember = useMemo(() => {
    if (!team || !user) return false;
    return (
      team.members?.some((member) => member.user_id === user.id) ||
      isOwner || // Make sure this matches your variable name
      userRole
    );
  }, [team, user, isOwner, userRole]);

  const renderJoinButton = () => {
    if (!isAuthenticated) return null;

    const isMember = team?.members?.some(
      (m) => m.user_id === user?.id || m.userId === user?.id,
    );

    const isTeamArchived = team?.archived_at || team?.status === "inactive";

    if (isTeamArchived && !isMember) {
      return null;
    }

    if (hasPendingInvitation && pendingInvitation) {
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
    const hasApp = Boolean((hasPendingApplication || pendingApplication) && !isMember);

    if (hasApp) {
      return (
        <div className="mt-6 border-t border-base-200 pt-4">
          <Button
            variant="primary"
            onClick={() => onViewApplicationDetails?.()}
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
            onSuccess={(applicationData) => {
              setNotification({
                type: "success",
                message: applicationData.isDraft
                  ? "Draft saved successfully"
                  : "Application sent successfully!",
              });
            }}
          />
        )}
      </div>
    );
  };

  const renderNotification = () => {
    if (!notification.type || !notification.message) return null;

    return (
      <Alert
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification({ type: null, message: null })}
        className="mb-4"
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

  // Add detailed debugging
  console.log("Team Details Debug:", {
    // User information
    "Current User ID": user?.id,
    "User Object": user,

    // Team information
    "Team Owner ID": team?.owner_id,
    "Team Object": team,

    // Role information
    "User Role": userRole,

    // Computed values
    "Is Owner": isOwner,
    "Is Admin": userRole === "admin",
    "Can Edit": canEditTeam,
    "Is Public": isPublic,

    // Modal state
    "Is Editing": isEditing,
    "Is Modal Visible": isModalVisible,

    // Form Data
    "Form Data": formData,
  });

  // Create custom title with buttons
  const effectiveTeamMatch = useMemo(() => {
    const shouldResolveMatchData =
      showMatchHighlights ||
      matchScore > 0 ||
      matchType != null ||
      matchDetails != null;

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
    const numericDistance = Number(rawDistance);
    const viewerForDistance = distanceViewerUser ?? user;
    const computedDistance = viewerForDistance
      ? calculateDistanceKm(viewerForDistance, team)
      : null;

    if (computedDistance != null) {
      return computedDistance;
    }

    if (Number.isFinite(numericDistance) && numericDistance < 999999) {
      return numericDistance;
    }

    return null;
  }, [distanceViewerUser, team, user]);

  const teamMatchTier =
    effectiveTeamMatch.matchScore != null
      ? getMatchTier(effectiveTeamMatch.matchScore)
      : null;

  const modalTitle = (
    <div className="flex justify-between items-center w-full">
      <h2 className="text-xl font-medium text-primary">
        {isEditing ? "Edit Team" : "Team Details"}
      </h2>
      <div className="flex items-center space-x-2">
        {!isEditing && (
          <>
            {canEditTeam && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  userHasEditedTagsRef.current = false; // fresh edit session
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
              >
                Edit
              </Button>
            )}
            {canDeleteTeam && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteTeam}
                disabled={loading}
                className="hover:bg-red-100 hover:text-red-700"
                icon={<Trash2 size={16} />}
                aria-label="Delete team"
              >
                Delete
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );

  if (!isModalVisible) return null;

  return (
    <>
      {/* Main Modal using Modal.jsx component */}
      <Modal
        isOpen={isModalVisible}
        onClose={handleClose}
        title={modalTitle}
        position="center"
        size="default"
        maxHeight="max-h-[90vh]"
        minHeight="min-h-[300px]"
        closeOnBackdrop={true}
        closeOnEscape={true}
        showCloseButton={true}
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
                {console.log("Team avatar debug:", {
                  teamavatar_url: team?.teamavatar_url,
                  teamavatarUrl: team?.teamavatarUrl,
                  fullTeam: team,
                })}
                <div className="flex items-start space-x-4 mb-6">
                  <div className="avatar placeholder relative">
                    <div className="bg-primary text-primary-content rounded-full w-16 h-16 flex items-center justify-center">
                      {(team?.teamavatar_url || team?.teamavatarUrl) &&
                      !teamImageError ? (
                        <img
                          src={team?.teamavatar_url || team?.teamavatarUrl}
                          alt="Team"
                          className="rounded-full object-cover w-full h-full"
                          onError={() => setTeamImageError(true)}
                        />
                      ) : (
                        <span className="text-xl">{getTeamInitials()}</span>
                      )}
                    </div>
                    {teamMatchTier && (
                      <div
                        className={`absolute -top-1 -left-1 w-6 h-6 rounded-full ring-2 ring-white flex items-center justify-center ${teamMatchTier.bg}`}
                        title={`${teamMatchTier.pct}% ${teamMatchTier.label.toLowerCase()}`}
                      >
                        <teamMatchTier.Icon
                          size={12}
                          className="text-white"
                          strokeWidth={2.5}
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold leading-[120%] mb-[0.2em]">
                      {team?.name}
                    </h1>
                    {/* Members count and visibility */}
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <Users size={18} className="text-primary" />
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

                      {/* Archived status - ALWAYS show for archived teams */}
                      {(team?.archived_at || team?.status === "inactive") && (
                        <div className="flex items-center text-base-content/70">
                          <Archive size={16} className="mr-1" />
                          <span>Archived</span>
                        </div>
                      )}

                      {/* Public/Private status - only for members of NON-archived teams */}
                      {shouldShowVisibilityStatus() &&
                        !(team?.archived_at || team?.status === "inactive") && (
                          <div className="flex items-center text-base-content/70">
                            {isPublic ? (
                              <>
                                <Eye
                                  size={16}
                                  className="mr-1 text-green-600"
                                />
                                <span>Public</span>
                              </>
                            ) : (
                              <>
                                <EyeClosed
                                  size={16}
                                  className="mr-1 text-gray-500"
                                />
                                <span>Private</span>
                              </>
                            )}
                          </div>
                        )}
                    </div>
                  </div>
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
                    distance={showMatchHighlights ? effectiveTeamDistanceKm : null}
                    showDefaultHeaderRight={showMatchHighlights}
                  />

                  {/* Team Focus Areas */}
                  {console.log("Team tags for FocusAreasSection:", team?.tags)}
                  {!isEditing && (
                    <TagsDisplaySection
                      title={UI_TEXT.focusAreas.title}
                      tags={team?.tags || []}
                      matchingTagIds={currentUserTagIds}
                      allTags={allTags}
                      canEdit={false}
                      onSave={undefined}
                      onTagClick={handleTagClick}
                      onSupercategoryClick={handleSupercategoryClick}
                      entityType="team"
                      emptyMessage={UI_TEXT.focusAreas.emptyTeam}
                      placeholder={UI_TEXT.focusAreas.placeholderTeam}
                      headerRight={showMatchHighlights && currentUserTagIds && currentUserTagIds.size > 0 ? (() => {
                        const teamTags = team?.tags || [];
                        if (!Array.isArray(teamTags) || teamTags.length === 0) return null;
                        const total = teamTags.length;
                        const matchCount = teamTags.filter((t) => {
                          const tagId = Number(t.id ?? t.tag_id ?? t.tagId);
                          return currentUserTagIds.has(tagId);
                        }).length;
                        if (matchCount > 0) {
                          return (
                            <span className="flex items-center gap-1.5 text-sm text-success">
                              <Check size={14} className="flex-shrink-0" />
                              <span>{matchCount}/{total} in common</span>
                            </span>
                          );
                        }
                        return (
                          <span className="flex items-center gap-1.5 text-sm text-error/70">
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
                      matchingBadgeNames={roleMatchBadgeNames || currentUserBadgeNames}
                      headerRight={showMatchHighlights && (roleMatchBadgeNames || currentUserBadgeNames) ? (() => {
                        const activeMatchNames = roleMatchBadgeNames || currentUserBadgeNames;
                        const total = teamBadges.length;
                        const matchCount = teamBadges.filter((b) =>
                          activeMatchNames.has((b.name ?? "").trim().toLowerCase())
                        ).length;
                        if (matchCount > 0) {
                          return (
                            <span className="flex items-center gap-1.5 text-sm text-success">
                              <Check size={14} className="flex-shrink-0" />
                              <span>{matchCount}/{total} in common</span>
                            </span>
                          );
                        }
                        return (
                          <span className="flex items-center gap-1.5 text-sm text-error/70">
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
                    canManage={isOwner || internalUserRole === "admin"}
                    isTeamMember={isTeamMember}
                    isEditing={isEditing}
                    onRolesLoaded={setTeamRoles}
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

      {/* Leave Team Confirmation Dialog */}
      {isLeaveDialogOpen && (
        <Modal
          isOpen={isLeaveDialogOpen}
          onClose={() => setIsLeaveDialogOpen(false)}
          title="Leave Team"
          position="center"
          size="small"
          closeOnBackdrop={!leaveLoading}
          closeOnEscape={!leaveLoading}
          showCloseButton={!leaveLoading}
        >
          <div className="py-4">
            <p className="text-base-content">Really want to leave this team?</p>
            {isOwner && (
              <p className="text-warning text-sm mt-2">
                Note: As an owner, you can only leave if there's another owner
                to manage the team. Pass ownership before leaving.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="ghost"
              onClick={() => setIsLeaveDialogOpen(false)}
              disabled={leaveLoading}
            >
              Cancel
            </Button>
            <Button
              variant="error"
              onClick={handleLeaveTeam}
              disabled={leaveLoading}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {leaveLoading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                "Leave Team"
              )}
            </Button>
          </div>
        </Modal>
      )}
      <TagAwardsModal {...tagAwardsModalProps} />
      <SupercategoryAwardsModal {...supercategoryModalProps} />

      {/* Badge Category Modal */}
      <BadgeCategoryModal
        {...badgeCategoryModalProps}
        onOpenUser={handleMemberClick}
      />

      {/* Invitation Details Modal */}
      {pendingInvitation && (
        <TeamInvitationDetailsModal
          isOpen={isInvitationModalOpen}
          invitation={pendingInvitation}
          onClose={() => setIsInvitationModalOpen(false)}
          onAccept={handleInvitationAccept}
          onDecline={handleInvitationDecline}
        />
      )}
    </>
  );
};

export default TeamDetailsModal;
