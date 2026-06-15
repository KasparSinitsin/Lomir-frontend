import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UI_TEXT } from "../../constants/uiText";
import Modal from "../common/Modal";
import UserBioSection from "./UserBioSection";
import LocationSection from "../common/LocationSection";
import TagsDisplaySection from "../tags/TagsDisplaySection";
import BadgesDisplaySection from "../badges/BadgesDisplaySection";
import BadgeCategoryModal from "../badges/BadgeCategoryModal";
import TagAwardsModal from "../badges/TagAwardsModal";
import UserProfileHeaderSection from "./UserProfileHeaderSection";
import { messageService } from "../../services/messageService";
import { geocodingService } from "../../services/geocodingService";
import { userService } from "../../services/userService";
import { teamService } from "../../services/teamService";
import {
  useUserBadges,
  useUserProfile,
  useUserTags,
  userBadgesQueryKey,
  userProfileQueryKey,
} from "../../hooks/useUserQueries";
import Button from "../common/Button";
import Alert from "../common/Alert";
import Tooltip from "../common/Tooltip";
import { useAuth } from "../../contexts/AuthContext";
import { Edit, MessageCircle, UserPlus, Award, Check, CheckCheck, X, Ruler, User } from "lucide-react";
import TeamInviteModal from "../teams/TeamInviteModal";
import BadgeAwardModal from "../badges/BadgeAwardModal";
import SupercategoryAwardsModal from "../badges/SupercategoryAwardsModal";
import useAwardModals from "../../hooks/useAwardModals";
import MatchScoreSection from "../common/MatchScoreSection";
import DeletedUserProfilePlaceholder from "./DeletedUserProfilePlaceholder";
import {
  buildViewerTeamMatchProfile,
  enrichUserMatchData,
  enrichUserRoleMatchData,
} from "../../utils/teamMatchUtils";
import {
  calculateDistanceKm,
  locationsHaveDifferentKnownParts,
} from "../../utils/locationUtils";

const normalizeNumericSet = (values) => {
  if (values == null) return null;

  const items =
    values instanceof Set
      ? Array.from(values)
      : Array.isArray(values)
        ? values
        : [values];

  return new Set(items.map((value) => Number(value)).filter(Number.isFinite));
};

const normalizeStringSet = (values) => {
  if (values == null) return null;

  const items =
    values instanceof Set
      ? Array.from(values)
      : Array.isArray(values)
        ? values
        : [values];

  return new Set(
    items
      .map((value) =>
        typeof value === "string" ? value.trim().toLowerCase() : "",
      )
      .filter(Boolean),
  );
};

const getInitialUserId = (source) =>
  source?.userId ??
  source?.user_id ??
  source?.memberId ??
  source?.member_id ??
  source?.user?.id ??
  source?.id ??
  null;

const extractUserTags = (source) => {
  if (!source || typeof source !== "object") return [];

  const candidates = [
    source.tags,
    source.userTags,
    source.user_tags,
    source.focusAreas,
    source.focus_areas,
    source.focusAreaTags,
    source.focus_area_tags,
    source.profile?.tags,
    source.user?.tags,
    source.user?.userTags,
    source.user?.user_tags,
    source.user?.focusAreas,
    source.user?.focus_areas,
  ];

  const match = candidates.find((value) => Array.isArray(value) && value.length > 0);
  return match ?? [];
};

const getAwardTargetUserId = (award) => {
  const awardedToSource =
    award?.awardedTo ??
    award?.awarded_to ??
    award?.awardedToUser ??
    award?.awarded_to_user ??
    award?.awardee ??
    award?.awardeeUser ??
    award?.awardee_user ??
    {};

  return (
    award?.awardedToUserId ??
    award?.awarded_to_user_id ??
    award?.awardeeUserId ??
    award?.awardee_user_id ??
    awardedToSource?.id ??
    awardedToSource?.userId ??
    awardedToSource?.user_id ??
    null
  );
};

const getAwardTargetUsername = (award) => {
  const awardedToSource =
    award?.awardedTo ??
    award?.awarded_to ??
    award?.awardedToUser ??
    award?.awarded_to_user ??
    award?.awardee ??
    award?.awardeeUser ??
    award?.awardee_user ??
    {};

  return (
    award?.awardedToUsername ??
    award?.awarded_to_username ??
    award?.awardeeUsername ??
    award?.awardee_username ??
    awardedToSource?.username ??
    null
  );
};

const mergeProfileWithInitialUser = (profile, initialUserData) => {
  if (!initialUserData) return profile;
  if (!profile) return initialUserData;

  const initialTags = extractUserTags(initialUserData);
  const profileTags = extractUserTags(profile);
  const initialBadges = Array.isArray(initialUserData.badges)
    ? initialUserData.badges
    : [];
  const profileBadges = Array.isArray(profile.badges) ? profile.badges : [];

  return {
    ...initialUserData,
    ...profile,
    tags: profileTags.length > 0 ? profileTags : initialTags,
    badges: profileBadges.length > 0 ? profileBadges : initialBadges,
  };
};

const unwrapRows = (response) => {
  if (!response) return [];
  if (Array.isArray(response)) return response;

  const payload =
    response?.success !== undefined
      ? response
      : response?.data?.success !== undefined
        ? response.data
        : (response?.data ?? response);

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;

  return [];
};

const UserDetailsModal = ({
  isOpen,
  userId,
  onClose,
  mode,
  onOpenUser,
  zIndexClass,
  boxZIndexClass,
  zIndexStyle,
  boxZIndexStyle,
  roleMatchTagIds,     // Set<number> | null — role's required tag IDs
  roleMatchBadgeNames, // Set<string> | null — role's required badge names (lowercase)
  roleMatchName = null,
  roleMatchMaxDistanceKm = null,
  isFromSearch = false,
  showMatchHighlights = false,
  matchScore = null,
  matchType = null,
  matchDetails = null,
  distanceKm = null,
  filledRoleName = null,
  teamName = null,
  invitationPrefillTeamId = null,
  invitationPrefillRoleId = null,
  invitationPrefillTeamName = null,
  invitationPrefillRoleName = null,
  initialUserData = null,
  sharedTeamId = null,
}) => {
  const { user: currentUser, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const normalizedRoleMatchTagIds = useMemo(
    () => normalizeNumericSet(roleMatchTagIds),
    [roleMatchTagIds],
  );
  const normalizedRoleMatchBadgeNames = useMemo(
    () => normalizeStringSet(roleMatchBadgeNames),
    [roleMatchBadgeNames],
  );
  const hasRoleMatchTagIds = (normalizedRoleMatchTagIds?.size ?? 0) > 0;
  const hasRoleMatchBadgeNames =
    (normalizedRoleMatchBadgeNames?.size ?? 0) > 0;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [showDeletedUserPlaceholder, setShowDeletedUserPlaceholder] =
    useState(false);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(mode === "edit");

  const [userTags, setUserTags] = useState([]);
  const [currentUserTagIds, setCurrentUserTagIds] = useState(null); // Set<number>
  const [currentUserBadgeNames, setCurrentUserBadgeNames] = useState(null); // Set<string>
  const [distanceViewerUser, setDistanceViewerUser] = useState(null);

  const [_formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    bio: "",
    postalCode: "",
    selectedTags: [],
    tagExperienceLevels: {},
    tagInterestLevels: {},
  });

  // ========= Badge Award Modal state =========
  const [isBadgeAwardModalOpen, setIsBadgeAwardModalOpen] = useState(false);

  // =====================================================

  const initialUserId = getInitialUserId(initialUserData);
  const targetUsername =
    initialUserData?.username ?? user?.username ?? user?.userName ?? null;
  const filterAwardsToViewedUser = useCallback(
    (rows) =>
      rows.filter((award) => {
        const awardeeId = getAwardTargetUserId(award);

        if (awardeeId != null && userId != null) {
          return String(awardeeId) === String(userId);
        }

        if (awardeeId != null && initialUserId != null) {
          return String(awardeeId) === String(initialUserId);
        }

        const awardeeUsername = getAwardTargetUsername(award);
        return Boolean(
          awardeeUsername &&
            targetUsername &&
            String(awardeeUsername).toLowerCase() ===
              String(targetUsername).toLowerCase(),
        );
      }),
    [initialUserId, targetUsername, userId],
  );
  const fetchUserTagAwards = useCallback(async () => {
    if (!sharedTeamId) {
      return userService.getUserBadges(userId);
    }

    const rows = unwrapRows(
      await teamService.getTeamMemberBadgeAwards(sharedTeamId),
    );
    return filterAwardsToViewedUser(rows);
  }, [filterAwardsToViewedUser, sharedTeamId, userId]);
  const fetchUserBadgeAwards = useCallback(async () => {
    if (!sharedTeamId) {
      return userService.getUserBadges(userId);
    }

    const rows = unwrapRows(
      await teamService.getTeamMemberBadgeAwards(sharedTeamId),
    );
    return filterAwardsToViewedUser(rows);
  }, [filterAwardsToViewedUser, sharedTeamId, userId]);
  const {
    handleBadgeCategoryClick,
    handleBadgeClick,
    handleTagClick,
    handleSupercategoryClick,
    badgeCategoryModalProps,
    tagAwardsModalProps,
    supercategoryModalProps,
  } = useAwardModals({
    fetchTagAwards: fetchUserTagAwards,
    fetchBadgeAwards: fetchUserBadgeAwards,
    subjectUserId: userId,
  });

  // Determine if this modal is showing the current user (more reliable than comparing fetched user)
  const ownProfile =
    !!currentUser?.id && !!userId && Number(currentUser.id) === Number(userId);

  const showEdit = !isEditing && isAuthenticated && ownProfile;
  const showChatInvite = !isEditing && isAuthenticated && !ownProfile;
  const isNumericUserId = /^\d+$/.test(String(userId ?? "").trim());
  const visibleUserBadges = Array.isArray(user?.badges) ? user.badges : [];
  const hiddenAwardIds = user?.hidden_award_ids ?? user?.hiddenAwardIds ?? [];
  const viewedUserProfileQuery = useUserProfile(userId, {
    enabled: Boolean(isOpen && userId),
  });
  const viewedUserTagsQuery = useUserTags(userId, {
    enabled: Boolean(isOpen && userId),
  });
  const shouldFetchCurrentUserMatchData =
    Boolean(
      isOpen &&
        isAuthenticated &&
        currentUser?.id &&
        Number(currentUser.id) !== Number(userId) &&
        (showMatchHighlights || hasRoleMatchTagIds || hasRoleMatchBadgeNames),
    ) &&
    !hasRoleMatchTagIds &&
    !hasRoleMatchBadgeNames;
  const currentUserTagsQuery = useUserTags(currentUser?.id, {
    enabled: shouldFetchCurrentUserMatchData,
  });
  const currentUserBadgesQuery = useUserBadges(currentUser?.id, {
    enabled: shouldFetchCurrentUserMatchData,
  });
  const currentUserProfileQuery = useUserProfile(currentUser?.id, {
    enabled: Boolean(
      isOpen && isAuthenticated && currentUser?.id && showMatchHighlights,
    ),
  });

  useEffect(() => {
    setLoading(viewedUserProfileQuery.isLoading);
  }, [viewedUserProfileQuery.isLoading]);

  // Force a fresh fetch whenever this modal opens so that privacy access level
  // is always evaluated against the current auth state (avoids stale cache).
  useEffect(() => {
    if (isOpen && userId) {
      queryClient.invalidateQueries({ queryKey: userProfileQueryKey(userId) });
    }
  }, [isOpen, userId, queryClient]);

  useEffect(() => {
    if (!isOpen || !userId) return;
    if (!viewedUserProfileQuery.data) return;

    const userData = mergeProfileWithInitialUser(
      viewedUserProfileQuery.data,
      initialUserData,
    );
    const preservedDistanceKm =
      distanceKm ??
      user?.distanceKm ??
      user?.distance_km ??
      userData?.distanceKm ??
      userData?.distance_km ??
      null;

    setError(null);
    setShowDeletedUserPlaceholder(false);
    setUser({
      ...userData,
      distance_km: preservedDistanceKm,
      distanceKm: preservedDistanceKm,
    });

    setFormData({
      firstName: userData?.first_name || userData?.firstName || "",
      lastName: userData?.last_name || userData?.lastName || "",
      bio: userData?.bio || "",
      postalCode: userData?.postal_code || userData?.postalCode || "",
      selectedTags: [],
      tagExperienceLevels: {},
      tagInterestLevels: {},
    });
  }, [
    distanceKm,
    isOpen,
    user?.distanceKm,
    user?.distance_km,
    userId,
    viewedUserProfileQuery.data,
    initialUserData,
  ]);

  useEffect(() => {
    if (!isOpen || !userId) return;
    const fallbackTags = extractUserTags(initialUserData);
    const fetchedTags = viewedUserTagsQuery.data ?? [];
    setUserTags(fetchedTags.length > 0 ? fetchedTags : fallbackTags);
  }, [initialUserData, isOpen, userId, viewedUserTagsQuery.data]);

  useEffect(() => {
    if (!isOpen || !sharedTeamId || !userId || userTags.length > 0) return;

    let cancelled = false;

    const fetchSharedTeamMemberTags = async () => {
      try {
        const response = await teamService.getTeamById(sharedTeamId);
        const teamData = response?.data ?? response;
        const members = Array.isArray(teamData?.members) ? teamData.members : [];
        const matchingMember = members.find((member) => {
          const memberId = getInitialUserId(member);
          return memberId != null && String(memberId) === String(userId);
        });
        const memberTags = extractUserTags(matchingMember);

        if (!cancelled && memberTags.length > 0) {
          setUserTags(memberTags);
          setUser((prev) => {
            if (!prev || extractUserTags(prev).length > 0) return prev;
            return { ...prev, tags: memberTags };
          });
        }
      } catch (error) {
        console.warn("Could not fetch shared team member tags:", error);
      }
    };

    fetchSharedTeamMemberTags();

    return () => {
      cancelled = true;
    };
  }, [isOpen, sharedTeamId, userId, userTags.length]);

  useEffect(() => {
    if (!viewedUserProfileQuery.error) return;

    console.error("Error fetching user details:", viewedUserProfileQuery.error);
    if (viewedUserProfileQuery.error.response?.status === 404 && isNumericUserId) {
      setUser(null);
      setUserTags([]);
      setError(null);
      setShowDeletedUserPlaceholder(true);
      return;
    }

    setShowDeletedUserPlaceholder(false);
    setError("Failed to load user details. Please try again.");
  }, [isNumericUserId, viewedUserProfileQuery.error]);

  useEffect(() => {
    if (!viewedUserTagsQuery.error) return;

    console.error("Error fetching user tags:", viewedUserTagsQuery.error);
    setUserTags([]);
  }, [viewedUserTagsQuery.error]);

  // Enrich postal-code-only locations with city, district, and state.
  // The geocoding service has an in-memory cache so repeated lookups are free.
  useEffect(() => {
    if (!user) return;
    const postalCode = user.postal_code || user.postalCode;
    if (!postalCode) return;

    const hasAllLocationDetails =
      user.city &&
      user.state &&
      (user.district || user.suburb || user.borough || user.cityDistrict);
    if (hasAllLocationDetails) return;

    const country = user.country; // may be null; geocodingService.detectCountryCode will fall back
    geocodingService
      .getLocationFromPostalCode(postalCode, country || null)
      .then((locationInfo) => {
        if (!locationInfo) return;
        setUser((prev) => {
          if (!prev) return prev;

          const nextDistrict =
            prev.district ||
            locationInfo.district ||
            locationInfo.suburb ||
            locationInfo.borough ||
            locationInfo.cityDistrict;
          const nextUser = {
            ...prev,
            city: prev.city || locationInfo.city,
            state: prev.state || locationInfo.state,
            country: prev.country || locationInfo.country,
            district: nextDistrict,
          };

          return nextUser.city === prev.city &&
            nextUser.state === prev.state &&
            nextUser.country === prev.country &&
            nextUser.district === prev.district
            ? prev
            : nextUser;
        });
      })
      .catch(() => {}); // silently fail — location falls back to known profile fields
  }, [
    user?.id,
    user?.postal_code,
    user?.postalCode,
    user?.city,
    user?.state,
    user?.district,
    user?.suburb,
    user?.borough,
    user?.cityDistrict,
  ]);

  // Resolve CURRENT user's tags/badges for overlap highlighting (not the viewed user's)
  useEffect(() => {
    if (!shouldFetchCurrentUserMatchData) return;

    const tagIds = new Set(
      (currentUserTagsQuery.data ?? [])
        .map((t) => Number(t.tagId ?? t.tag_id ?? t.id))
        .filter(Number.isFinite),
    );
    setCurrentUserTagIds(tagIds);

    const badgeNames = new Set(
      (currentUserBadgesQuery.data ?? [])
        .map((b) =>
          (b.badgeName ?? b.badge_name ?? b.name ?? "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    );
    setCurrentUserBadgeNames(badgeNames);
  }, [
    currentUserBadgesQuery.data,
    currentUserTagsQuery.data,
    shouldFetchCurrentUserMatchData,
  ]);

  useEffect(() => {
    if (!isOpen || !isAuthenticated || !currentUser?.id || !showMatchHighlights) {
      setDistanceViewerUser(null);
      return;
    }

    setDistanceViewerUser(currentUserProfileQuery.data ?? currentUser);
  }, [
    currentUser,
    currentUser?.id,
    currentUserProfileQuery.data,
    isAuthenticated,
    isOpen,
    showMatchHighlights,
  ]);

  useEffect(() => {
    if (!currentUserTagsQuery.error && !currentUserBadgesQuery.error) return;

    console.warn("Could not fetch current user data for matching highlights:", {
      tagsError: currentUserTagsQuery.error ?? null,
      badgesError: currentUserBadgesQuery.error ?? null,
    });
  }, [currentUserBadgesQuery.error, currentUserTagsQuery.error]);

  useEffect(() => {
    if (!currentUserProfileQuery.error) return;

    console.warn(
      "Could not fetch current user details for distance fallback:",
      currentUserProfileQuery.error,
    );
    setDistanceViewerUser(currentUser);
  }, [currentUser, currentUserProfileQuery.error]);

  useEffect(() => {
    setIsEditing(mode === "edit");
  }, [mode]);

  const handleStartChat = () => {
    if (!isAuthenticated) {
      console.warn("Attempted to start chat while not authenticated");
      return;
    }
    if (!userId) return;

    const chatUrl = `${window.location.origin}/chat/${userId}?type=direct`;
    window.open(chatUrl, "_blank", "noopener,noreferrer");
  };

  const handleInviteToTeam = () => {
    setIsInviteModalOpen(true);
  };

  const handleInviteModalClose = () => {
    setIsInviteModalOpen(false);
  };

  const getUserDisplayName = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user?.username || "User";
  };

  const getUserComparisonLabel = () => {
    if (user?.first_name) return user.first_name;
    if (user?.firstName) return user.firstName;
    if (user?.username) return user.username;
    return "this person";
  };

  const effectiveUserMatch = useMemo(() => {
    const isRoleMatchContext =
      matchType === "role_match" ||
      hasRoleMatchTagIds ||
      hasRoleMatchBadgeNames;

    const shouldResolveMatchData =
      showMatchHighlights ||
      matchScore > 0 ||
      matchType != null ||
      matchDetails != null;

    if (!shouldResolveMatchData || !user || !currentUser) {
      return { matchScore, matchType, matchDetails };
    }

    if (isFromSearch && matchScore != null && isRoleMatchContext) {
      return { matchScore, matchType, matchDetails };
    }

    if (isRoleMatchContext) {
      const enrichedUser = enrichUserRoleMatchData({
        user: {
          ...user,
          bestMatchScore: matchScore,
          best_match_score: matchScore,
          matchType,
          match_type: matchType,
          matchDetails,
          match_details: matchDetails,
          tags: userTags.length > 0 ? userTags : user?.tags,
        },
        requiredTagIds: normalizedRoleMatchTagIds,
        requiredBadgeNames: normalizedRoleMatchBadgeNames,
      });

      return {
        matchScore: enrichedUser.bestMatchScore ?? matchScore,
        matchType: enrichedUser.matchType ?? matchType,
        matchDetails: enrichedUser.matchDetails ?? matchDetails,
      };
    }

    const viewerProfile = buildViewerTeamMatchProfile({
      user: currentUser,
      userTags: Array.from(currentUserTagIds ?? []),
      userBadges: Array.from(currentUserBadgeNames ?? []),
    });
    const enrichedUser = enrichUserMatchData({
      user: {
        ...user,
        bestMatchScore: matchScore,
        best_match_score: matchScore,
        matchType,
        match_type: matchType,
        matchDetails,
        match_details: matchDetails,
        tags: userTags.length > 0 ? userTags : user?.tags,
      },
      viewerProfile,
    });

    return {
      matchScore: enrichedUser.bestMatchScore ?? matchScore,
      matchType: enrichedUser.matchType ?? matchType,
      matchDetails: enrichedUser.matchDetails ?? matchDetails,
    };
  }, [
    currentUser,
    currentUserBadgeNames,
    currentUserTagIds,
    isFromSearch,
    matchDetails,
    matchScore,
    matchType,
    hasRoleMatchBadgeNames,
    hasRoleMatchTagIds,
    normalizedRoleMatchBadgeNames,
    normalizedRoleMatchTagIds,
    showMatchHighlights,
    user,
    userTags,
  ]);

  const effectiveDistanceKm = useMemo(() => {
    const rawRoleDistance =
      effectiveUserMatch.matchType === "role_match"
        ? effectiveUserMatch.matchDetails?.distanceKm ??
          effectiveUserMatch.matchDetails?.distance_km ??
          matchDetails?.distanceKm ??
          matchDetails?.distance_km ??
          null
        : null;
    const roleDistance =
      rawRoleDistance != null ? Number(rawRoleDistance) : null;
    const rawDistance = distanceKm ?? user?.distanceKm ?? user?.distance_km;
    const numericDistance =
      rawDistance != null ? Number(rawDistance) : null;
    const viewerForDistance = distanceViewerUser ?? currentUser;
    const computedDistance = viewerForDistance
      ? calculateDistanceKm(viewerForDistance, user)
      : null;
    const rawZeroLooksWrong =
      Number.isFinite(numericDistance) &&
      numericDistance <= 0.5 &&
      viewerForDistance &&
      locationsHaveDifferentKnownParts(viewerForDistance, user);

    if (roleDistance != null && Number.isFinite(roleDistance) && roleDistance < 999999) {
      return roleDistance;
    }

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
  }, [
    currentUser,
    distanceKm,
    distanceViewerUser,
    effectiveUserMatch.matchDetails,
    effectiveUserMatch.matchType,
    matchDetails,
    user,
  ]);

  const roleMatchLocationHeaderRight = useMemo(() => {
    const isRoleMatchContext = effectiveUserMatch.matchType === "role_match";
    const configuredLimitKm = Number(
      roleMatchMaxDistanceKm ??
        effectiveUserMatch.matchDetails?.maxDistanceKm ??
        effectiveUserMatch.matchDetails?.max_distance_km ??
        matchDetails?.maxDistanceKm ??
        matchDetails?.max_distance_km,
    );
    const roundedDistanceKm =
      effectiveDistanceKm != null ? Math.round(effectiveDistanceKm) : null;

    if (
      !isRoleMatchContext ||
      !Number.isFinite(configuredLimitKm) ||
      configuredLimitKm <= 0 ||
      roundedDistanceKm == null
    ) {
      return null;
    }

    const withinRangeRaw =
      effectiveUserMatch.matchDetails?.isWithinRange ??
      effectiveUserMatch.matchDetails?.is_within_range ??
      matchDetails?.isWithinRange ??
      matchDetails?.is_within_range;
    const isWithinRange =
      typeof withinRangeRaw === "boolean"
        ? withinRangeRaw
        : roundedDistanceKm <= configuredLimitKm;

    return (
      <span
        className={`flex items-center gap-1.5 text-sm ${
          isWithinRange ? "text-success" : "text-slate-500"
        }`}
      >
        <Ruler size={14} className="flex-shrink-0" />
        <span>
          {roundedDistanceKm} km away ({isWithinRange ? "<" : ">"}
          {" "}
          {Math.round(configuredLimitKm)} km)
        </span>
      </span>
    );
  }, [
    effectiveDistanceKm,
    effectiveUserMatch.matchDetails,
    effectiveUserMatch.matchType,
    matchDetails,
    roleMatchMaxDistanceKm,
  ]);

  // =================================================

  const modalTitle = (
    <h2 className="text-xl font-medium text-primary leading-[110%] flex items-center gap-2">
      {isEditing ? <Edit size={20} className="flex-shrink-0" /> : <User size={20} className="flex-shrink-0" />}
      {isEditing ? "Edit Profile" : "User Details"}
    </h2>
  );

  const modalHeaderActions = !isEditing && !showDeletedUserPlaceholder ? (
    <div className="flex items-center gap-1">
      {showEdit && (
        <Tooltip
          content="Open your profile editor in a new tab and close these details."
          position="bottom"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              window.open("/profile?mode=edit", "_blank", "noopener,noreferrer");
              onClose?.();
            }}
            className="hover:bg-[#7ace82] hover:text-[#036b0c]"
            icon={<Edit size={16} />}
            aria-label="Edit your profile"
          >
            <span className="hidden sm:inline">Edit</span>
          </Button>
        </Tooltip>
      )}
      {showChatInvite && (
        <>
          <Tooltip content="Start a private chat with this person." position="bottom">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartChat}
              className="flex items-center gap-1"
              aria-label="Start chat"
            >
              <MessageCircle size={16} />
              <span className="hidden sm:inline">Chat</span>
            </Button>
          </Tooltip>
          <Tooltip content="Invite this person to one of your teams." position="bottom">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleInviteToTeam}
              className="flex items-center gap-1"
              aria-label="Invite to team"
            >
              <UserPlus size={16} />
              <span className="hidden sm:inline">Invite</span>
            </Button>
          </Tooltip>
          <Tooltip
            content="Award this person a badge for their skills or contributions."
            position="bottom"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsBadgeAwardModalOpen(true)}
              className="flex items-center gap-1"
              aria-label="Award badge"
            >
              <Award size={16} />
              <span className="hidden sm:inline">Award</span>
            </Button>
          </Tooltip>
        </>
      )}
    </div>
  ) : null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={modalTitle}
        headerActions={modalHeaderActions}
        position="center"
        size="default"
        maxHeight="max-h-[90vh]"
        minHeight="min-h-[300px]"
        closeOnBackdrop={true}
        closeOnEscape={true}
        showCloseButton={true}
        closeButtonTooltip="Close user details and return to the previous view."
        zIndexClass={zIndexClass}
        boxZIndexClass={boxZIndexClass}
        zIndexStyle={zIndexStyle}
        boxZIndexStyle={boxZIndexStyle}
      >
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="loading loading-spinner loading-lg text-primary"></div>
          </div>
        ) : showDeletedUserPlaceholder ? (
          <DeletedUserProfilePlaceholder onNavigateAway={onClose} />
        ) : error ? (
          <Alert type="error" message={error} />
        ) : isEditing ? (
          // EDIT MODE - Future implementation could use TagInput here (canonical focus area selector)
          <div className="space-y-6">
            <p className="text-base-content/70">
              For comprehensive profile editing, you'll be redirected to the
              full profile page.
            </p>
          </div>
        ) : (!ownProfile && !sharedTeamId && (user?.profileAccess === "limited" || user?.profile_access === "limited")) ? (
          // PRIVATE PROFILE - non-owner, non-teammate viewing a private account
          <div className="text-center text-base-content/60 py-8">
            <p className="text-lg font-medium">{user.username}</p>
            <p className="text-sm mt-2">This profile is private.</p>
          </div>
        ) : (
          // VIEW MODE - User profile information
          <div className="space-y-8">
            {/* User Profile Header */}
            <UserProfileHeaderSection
              user={user}
              currentUser={currentUser}
              isAuthenticated={isAuthenticated}
              memberSince={user?.created_at || user?.createdAt}
              matchScore={effectiveUserMatch.matchScore}
              filledRoleName={filledRoleName}
              teamName={teamName}
            />

            {/* Bio */}
            <UserBioSection bio={user?.bio || user?.biography} />

            {/* Match Score */}
            <MatchScoreSection
              matchScore={effectiveUserMatch.matchScore}
              matchType={effectiveUserMatch.matchType}
              matchDetails={effectiveUserMatch.matchDetails}
              comparisonLabel={getUserComparisonLabel()}
              roleLabel={roleMatchName}
            />

            {/* Location */}
            <LocationSection
              entity={user}
              entityType="user"
              className=""
              distance={showMatchHighlights ? effectiveDistanceKm : null}
              headerRight={roleMatchLocationHeaderRight}
              showCountryCode={false}
            />

            {/* Focus Areas */}
            <TagsDisplaySection
              title={UI_TEXT.focusAreas.title}
              tags={userTags.length > 0 ? userTags : user?.tags}
              emptyMessage={UI_TEXT.focusAreas.empty}
              onTagClick={handleTagClick}
              onSupercategoryClick={handleSupercategoryClick}
              matchingTagIds={
                hasRoleMatchTagIds
                  ? normalizedRoleMatchTagIds
                  : currentUserTagIds
              }
              headerRight={(() => {
                const effectiveMatchIds = hasRoleMatchTagIds
                  ? normalizedRoleMatchTagIds
                  : currentUserTagIds;
                if (!effectiveMatchIds || effectiveMatchIds.size === 0) return null;
                const displayTags = userTags.length > 0 ? userTags : (user?.tags || []);
                if (!Array.isArray(displayTags) || displayTags.length === 0) return null;
                const userTagIds = new Set(
                  displayTags
                    .map((t) => Number(t.tagId ?? t.tag_id ?? t.id))
                    .filter(Number.isFinite),
                );
                const isRoleMatchContext = hasRoleMatchTagIds;
                const total = isRoleMatchContext
                  ? normalizedRoleMatchTagIds.size
                  : displayTags.length;
                const matchCount = isRoleMatchContext
                  ? Array.from(normalizedRoleMatchTagIds).filter((tagId) =>
                      userTagIds.has(Number(tagId)),
                    ).length
                  : displayTags.filter((t) => {
                      const tagId = Number(t.tagId ?? t.tag_id ?? t.id);
                      return effectiveMatchIds.has(tagId);
                    }).length;
                if (matchCount > 0) {
                  const MatchIcon = matchCount === total ? CheckCheck : Check;
                  return (
                    <span className="flex items-center gap-1.5 text-sm text-success">
                      <MatchIcon size={14} className="flex-shrink-0" />
                      <span>{matchCount}/{total} matching</span>
                    </span>
                  );
                }
                return (
                  <span className="flex items-center gap-1.5 text-sm text-slate-500">
                    <X size={14} className="flex-shrink-0" />
                    <span className="leading-[1.1]">None matching</span>
                  </span>
                );
              })()}
            />

            {/* Badges */}
            <BadgesDisplaySection
              title="Badges"
              badges={visibleUserBadges}
              emptyMessage="No badges earned yet"
              maxVisible={8}
              groupByCategory={true}
              showCredits={true}
              onCategoryClick={handleBadgeCategoryClick}
              onBadgeClick={handleBadgeClick}
              onOpenUser={onOpenUser}
              matchingBadgeNames={
                hasRoleMatchBadgeNames
                  ? normalizedRoleMatchBadgeNames
                  : currentUserBadgeNames
              }
              headerRight={(() => {
                const effectiveMatchNames = hasRoleMatchBadgeNames
                  ? normalizedRoleMatchBadgeNames
                  : currentUserBadgeNames;
                if (!effectiveMatchNames || effectiveMatchNames.size === 0) return null;
                const badgeList = visibleUserBadges;
                if (!Array.isArray(badgeList) || badgeList.length === 0) return null;
                const userBadgeNames = new Set(
                  badgeList
                    .map((b) =>
                      (b.name ?? b.badgeName ?? b.badge_name ?? "")
                        .trim()
                        .toLowerCase(),
                    )
                    .filter(Boolean),
                );
                const isRoleMatchContext = hasRoleMatchBadgeNames;
                const total = isRoleMatchContext
                  ? normalizedRoleMatchBadgeNames.size
                  : badgeList.length;
                const matchCount = isRoleMatchContext
                  ? Array.from(normalizedRoleMatchBadgeNames).filter((name) =>
                      userBadgeNames.has(name),
                    ).length
                  : badgeList.filter((b) => {
                      const name = (b.name ?? b.badgeName ?? b.badge_name ?? "")
                        .trim()
                        .toLowerCase();
                      return effectiveMatchNames.has(name);
                    }).length;
                if (matchCount > 0) {
                  const MatchIcon = matchCount === total ? CheckCheck : Check;
                  return (
                    <span className="flex items-center gap-1.5 text-sm text-success">
                      <MatchIcon size={14} className="flex-shrink-0" />
                      <span>{matchCount}/{total} matching</span>
                    </span>
                  );
                }
                return (
                  <span className="flex items-center gap-1.5 text-sm text-slate-500">
                    <X size={14} className="flex-shrink-0" />
                    <span className="leading-[1.1]">None matching</span>
                  </span>
                );
              })()}
            />

            {/* Bottom CTA (TeamDetailsModal style) */}
            {showChatInvite && (
              <div className="mt-6 border-t border-base-200 pt-4">
                <Button
                  variant="primary"
                  onClick={handleStartChat}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <MessageCircle size={18} />
                  Send Chat Message
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Team Invite Modal */}
      {isInviteModalOpen && user && (
        <TeamInviteModal
          isOpen={isInviteModalOpen}
          onClose={handleInviteModalClose}
          inviteeId={user.id}
          inviteeName={getUserDisplayName()}
          inviteeFirstName={user.first_name || user.firstName}
          inviteeLastName={user.last_name || user.lastName}
          inviteeUsername={user.username}
          inviteeAvatar={user.avatar_url || user.avatarUrl}
          inviteeBio={user.bio}
          inviteeIsSynthetic={user.is_synthetic ?? user.isSynthetic}
          inviteeIsPublic={
            user.is_public ??
            user.isPublic ??
            user.profile_is_public ??
            user.profileIsPublic ??
            user.public_profile ??
            user.publicProfile
          }
          inviteeIsPrivate={
            user.is_private ??
            user.isPrivate ??
            user.profile_is_private ??
            user.profileIsPrivate ??
            user.private_profile ??
            user.privateProfile
          }
          inviteeCity={user.city}
          inviteeCountry={user.country}
          inviteeJoinedAt={user.created_at || user.createdAt}
          prefillTeamId={invitationPrefillTeamId}
          prefillRoleId={invitationPrefillRoleId}
          prefillTeamName={invitationPrefillTeamName}
          prefillRoleName={invitationPrefillRoleName}
        />
      )}

      {/* Badge Category Modal */}
      <BadgeCategoryModal
        {...badgeCategoryModalProps}
        onOpenUser={onOpenUser}
        hiddenAwardIds={hiddenAwardIds}
        showHiddenBadgeAwards={ownProfile}
        canViewPrivateAwardees={Boolean(sharedTeamId)}
        showAwarderAtBottom
      />

      {/* Tag Awards Modal */}
      <TagAwardsModal
        {...tagAwardsModalProps}
        onOpenUser={onOpenUser}
        hiddenAwardIds={hiddenAwardIds}
        showHiddenBadgeAwards={ownProfile}
        canViewPrivateAwardees={Boolean(sharedTeamId)}
        showAwarderAtBottom
      />

      {/* Supercategory Awards Modal */}
      <SupercategoryAwardsModal
        {...supercategoryModalProps}
        onOpenUser={onOpenUser}
        hiddenAwardIds={hiddenAwardIds}
        showHiddenBadgeAwards={ownProfile}
        canViewPrivateAwardees={Boolean(sharedTeamId)}
        showAwarderAtBottom
      />

      {/* Badge Award Modal */}
      {isBadgeAwardModalOpen && user && (
        <BadgeAwardModal
          isOpen={isBadgeAwardModalOpen}
          onClose={() => setIsBadgeAwardModalOpen(false)}
          awardeeId={user.id}
          awardeeFirstName={user.first_name || user.firstName}
          awardeeLastName={user.last_name || user.lastName}
          awardeeUsername={user.username}
          awardeeAvatar={user.avatar_url || user.avatarUrl}
          awardeeBio={user.bio}
          awardeeIsDemo={!!(user.is_synthetic ?? user.isSynthetic)}
          awardeeCity={user.city}
          awardeeCountry={user.country}
          awardeeJoinedAt={user.created_at || user.createdAt}
          onAwardComplete={() => {
            queryClient.invalidateQueries({
              queryKey: userProfileQueryKey(user.id),
            });
            queryClient.invalidateQueries({
              queryKey: userBadgesQueryKey(user.id),
            });
          }}
        />
      )}
    </>
  );
};

export default UserDetailsModal;
