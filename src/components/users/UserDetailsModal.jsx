import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { userService } from "../../services/userService";
import Button from "../common/Button";
import Alert from "../common/Alert";
import { useAuth } from "../../contexts/AuthContext";
import { Edit, MessageCircle, UserPlus, Award, Check, X } from "lucide-react";
import TeamInviteModal from "../teams/TeamInviteModal";
import BadgeAwardModal from "../badges/BadgeAwardModal";
import SupercategoryAwardsModal from "../badges/SupercategoryAwardsModal";
import useAwardModals from "../../hooks/useAwardModals";
import MatchScoreSection from "../common/MatchScoreSection";
import {
  buildViewerTeamMatchProfile,
  enrichUserMatchData,
} from "../../utils/teamMatchUtils";
import { calculateDistanceKm } from "../../utils/locationUtils";

const UserDetailsModal = ({
  isOpen,
  userId,
  onClose,
  onUpdate,
  mode,
  onOpenUser,
  zIndexClass,
  boxZIndexClass,
  zIndexStyle,
  boxZIndexStyle,
  roleMatchTagIds,     // Set<number> | null — role's required tag IDs
  roleMatchBadgeNames, // Set<string> | null — role's required badge names (lowercase)
  roleMatchName = null,
  showMatchHighlights = false,
  matchScore = null,
  matchType = null,
  matchDetails = null,
  distanceKm = null,
}) => {
  const { user: currentUser, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(mode === "edit");

  const [userTags, setUserTags] = useState([]);
  const [currentUserTagIds, setCurrentUserTagIds] = useState(null); // Set<number>
  const [currentUserBadgeNames, setCurrentUserBadgeNames] = useState(null); // Set<string>
  const [distanceViewerUser, setDistanceViewerUser] = useState(null);

  const [formData, setFormData] = useState({
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

  const {
    handleBadgeCategoryClick,
    handleBadgeClick,
    handleTagClick,
    handleSupercategoryClick,
    badgeCategoryModalProps,
    tagAwardsModalProps,
    supercategoryModalProps,
  } = useAwardModals(userId);

  // Determine if this modal is showing the current user (more reliable than comparing fetched user)
  const ownProfile =
    !!currentUser?.id && !!userId && Number(currentUser.id) === Number(userId);

  const showEdit = !isEditing && isAuthenticated && ownProfile;
  const showChatInvite = !isEditing && isAuthenticated && !ownProfile;

  const fetchUserDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await userService.getUserById(userId);

      // Robust unwrap: axios response + API wrapper { success, data }
      const payload = response?.data ?? response;
      const userData =
        payload?.success !== undefined
          ? payload?.data
          : (payload?.data?.data ?? payload?.data ?? payload);

      const preservedDistanceKm =
        distanceKm ??
        user?.distance_km ??
        user?.distanceKm ??
        userData?.distance_km ??
        userData?.distanceKm ??
        null;

      setUser({
        ...userData,
        distance_km: preservedDistanceKm,
        distanceKm: preservedDistanceKm,
      });

      // Fetch full tag objects (with badge_credits)
      try {
        const tagsResponse = await userService.getUserTags(userId);
        setUserTags(tagsResponse?.data || []);
      } catch (tagErr) {
        console.error("Error fetching user tags:", tagErr);
        setUserTags([]);
      }

      setFormData({
        firstName: userData?.first_name || userData?.firstName || "",
        lastName: userData?.last_name || userData?.lastName || "",
        bio: userData?.bio || "",
        postalCode: userData?.postal_code || userData?.postalCode || "",
        selectedTags: [],
        tagExperienceLevels: {},
        tagInterestLevels: {},
      });
    } catch (err) {
      console.error("Error fetching user details:", err);
      setError("Failed to load user details. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [distanceKm, user?.distanceKm, user?.distance_km, userId]);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetails();
    }
  }, [isOpen, userId, fetchUserDetails]);

  // Fetch CURRENT user's tags/badges for overlap highlighting (not the viewed user's)
  useEffect(() => {
    if (!showMatchHighlights && !roleMatchTagIds && !roleMatchBadgeNames) return;
    if (!isOpen || !isAuthenticated || !currentUser?.id) return;
    // Don't highlight own profile
    if (Number(currentUser.id) === Number(userId)) return;
    // Skip when role context provides the matching data
    if (roleMatchTagIds || roleMatchBadgeNames) return;

    const fetchCurrentUserData = async () => {
      try {
        const tagsRes = await userService.getUserTags(currentUser.id);
        const tagData = Array.isArray(tagsRes?.data)
          ? tagsRes.data
          : tagsRes?.data?.data || [];
        const tagIds = new Set(
          tagData
            .map((t) => Number(t.tagId ?? t.tag_id ?? t.id))
            .filter(Number.isFinite),
        );
        setCurrentUserTagIds(tagIds);

        const badgesRes = await userService.getUserBadges(currentUser.id);
        const badgeData = Array.isArray(badgesRes?.data)
          ? badgesRes.data
          : badgesRes?.data?.data || [];
        const badgeNames = new Set(
          badgeData
            .map((b) =>
              (b.badgeName ?? b.badge_name ?? b.name ?? "")
                .trim()
                .toLowerCase(),
            )
            .filter(Boolean),
        );
        setCurrentUserBadgeNames(badgeNames);
      } catch (err) {
        console.warn(
          "Could not fetch current user data for matching highlights:",
          err,
        );
      }
    };

    fetchCurrentUserData();
  }, [isOpen, isAuthenticated, currentUser?.id, userId, roleMatchTagIds, roleMatchBadgeNames, showMatchHighlights]);

  useEffect(() => {
    if (!isOpen || !isAuthenticated || !currentUser?.id || !showMatchHighlights) {
      setDistanceViewerUser(null);
      return;
    }

    let cancelled = false;

    const fetchDistanceViewerUser = async () => {
      try {
        const response = await userService.getUserById(currentUser.id);
        const payload = response?.data ?? response;
        const viewerData =
          payload?.success !== undefined
            ? payload?.data
            : (payload?.data?.data ?? payload?.data ?? payload);

        if (!cancelled) {
          setDistanceViewerUser(viewerData ?? currentUser);
        }
      } catch (err) {
        console.warn("Could not fetch current user details for distance fallback:", err);
        if (!cancelled) {
          setDistanceViewerUser(currentUser);
        }
      }
    };

    fetchDistanceViewerUser();

    return () => {
      cancelled = true;
    };
  }, [currentUser, currentUser?.id, isAuthenticated, isOpen, showMatchHighlights]);

  useEffect(() => {
    setIsEditing(mode === "edit");
  }, [mode]);

  const handleStartChat = async () => {
    if (!isAuthenticated) {
      console.warn("Attempted to start chat while not authenticated");
      return;
    }
    if (!userId) return;

    try {
      // Create conversation with the user and send an empty message to ensure it appears
      await messageService.startConversation(userId, "");

      // Give a bit more time for the conversation to be created
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Open chat in new tab with direct message type
      const chatUrl = `${window.location.origin}/chat/${userId}?type=direct`;
      window.open(chatUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Error starting conversation:", error);

      // Fallback: still open chat page even if API call fails
      const chatUrl = `${window.location.origin}/chat/${userId}?type=direct`;
      window.open(chatUrl, "_blank", "noopener,noreferrer");
    }
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
    const shouldResolveMatchData =
      showMatchHighlights ||
      matchScore > 0 ||
      matchType != null ||
      matchDetails != null;

    if (!shouldResolveMatchData || !user || !currentUser) {
      return { matchScore, matchType, matchDetails };
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
    matchDetails,
    matchScore,
    matchType,
    showMatchHighlights,
    user,
    userTags,
  ]);

  const effectiveDistanceKm = useMemo(() => {
    const rawDistance = distanceKm ?? user?.distance_km ?? user?.distanceKm;
    const numericDistance = Number(rawDistance);
    const viewerForDistance = distanceViewerUser ?? currentUser;
    const computedDistance = viewerForDistance
      ? calculateDistanceKm(viewerForDistance, user)
      : null;

    if (computedDistance != null) {
      return computedDistance;
    }

    if (Number.isFinite(numericDistance) && numericDistance < 999999) {
      return numericDistance;
    }

    return null;
  }, [currentUser, distanceKm, distanceViewerUser, user]);

  // =================================================

  // Title node (TeamDetailsModal style)
  const modalTitle = (
    <div className="flex justify-between items-center w-full">
      <h2 className="text-xl font-medium text-primary">
        {isEditing ? "Edit Profile" : "User Details"}
      </h2>

      <div className="flex items-center space-x-2">
        {!isEditing && (
          <>
            {showEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  window.open("/profile?mode=edit", "_blank", "noopener,noreferrer");
                  onClose?.();
                }}
                className="hover:bg-[#7ace82] hover:text-[#036b0c]"
                icon={<Edit size={16} />}
              >
                Edit
              </Button>
            )}

            {showChatInvite && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStartChat}
                  className="flex items-center gap-1"
                >
                  <MessageCircle size={16} />
                  <span className="hidden sm:inline">Chat</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleInviteToTeam}
                  className="flex items-center gap-1"
                >
                  <UserPlus size={16} />
                  <span className="hidden sm:inline">Invite</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsBadgeAwardModalOpen(true)}
                  className="flex items-center gap-1"
                >
                  <Award size={16} />
                  <span className="hidden sm:inline">Award</span>
                </Button>
              </>
            )}
          </>
        )}
      </div>
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
        minHeight="min-h-[300px]"
        closeOnBackdrop={true}
        closeOnEscape={true}
        showCloseButton={true}
        zIndexClass={zIndexClass}
        boxZIndexClass={boxZIndexClass}
        zIndexStyle={zIndexStyle}
        boxZIndexStyle={boxZIndexStyle}
      >
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="loading loading-spinner loading-lg text-primary"></div>
          </div>
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
            />

            {/* Focus Areas */}
            <TagsDisplaySection
              title={UI_TEXT.focusAreas.title}
              tags={userTags.length > 0 ? userTags : user?.tags}
              emptyMessage={UI_TEXT.focusAreas.empty}
              onTagClick={handleTagClick}
              onSupercategoryClick={handleSupercategoryClick}
              matchingTagIds={roleMatchTagIds || currentUserTagIds}
              headerRight={(() => {
                const effectiveMatchIds = roleMatchTagIds || currentUserTagIds;
                if (!effectiveMatchIds || effectiveMatchIds.size === 0) return null;
                const displayTags = userTags.length > 0 ? userTags : (user?.tags || []);
                if (!Array.isArray(displayTags) || displayTags.length === 0) return null;
                const total = displayTags.length;
                const matchCount = displayTags.filter((t) => {
                  const tagId = Number(t.tagId ?? t.tag_id ?? t.id);
                  return effectiveMatchIds.has(tagId);
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
              })()}
            />

            {/* Badges */}
            <BadgesDisplaySection
              title="Badges"
              badges={user?.badges}
              emptyMessage="No badges earned yet"
              maxVisible={8}
              groupByCategory={true}
              showCredits={true}
              onCategoryClick={handleBadgeCategoryClick}
              onBadgeClick={handleBadgeClick}
              onOpenUser={onOpenUser}
              matchingBadgeNames={roleMatchBadgeNames || currentUserBadgeNames}
              headerRight={(() => {
                const effectiveMatchNames = roleMatchBadgeNames || currentUserBadgeNames;
                if (!effectiveMatchNames || effectiveMatchNames.size === 0) return null;
                const badgeList = user?.badges || [];
                if (!Array.isArray(badgeList) || badgeList.length === 0) return null;
                const total = badgeList.length;
                const matchCount = badgeList.filter((b) => {
                  const name = (b.name ?? b.badgeName ?? b.badge_name ?? "").trim().toLowerCase();
                  return effectiveMatchNames.has(name);
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
        />
      )}

      {/* Badge Category Modal */}
      <BadgeCategoryModal
        {...badgeCategoryModalProps}
        onOpenUser={onOpenUser}
      />

      {/* Tag Awards Modal */}
      <TagAwardsModal {...tagAwardsModalProps} onOpenUser={onOpenUser} />

      {/* Supercategory Awards Modal */}
      <SupercategoryAwardsModal
        {...supercategoryModalProps}
        onOpenUser={onOpenUser}
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
          onAwardComplete={() => {
            // Refresh user details to show updated badges
            fetchUserDetails();
          }}
        />
      )}
    </>
  );
};

export default UserDetailsModal;
