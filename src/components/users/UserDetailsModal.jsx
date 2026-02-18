import React, { useState, useEffect, useCallback } from "react";
import { UI_TEXT } from "../../constants/uiText";
import Modal from "../common/Modal";
import UserBioSection from "./UserBioSection";
import LocationSection from "../common/LocationSection";
import TagsDisplaySection from "../tags/TagsDisplaySection";
import BadgesDisplaySection from "../badges/BadgesDisplaySection";
import BadgeCategoryModal from "../badges/BadgeCategoryModal";
import UserProfileHeaderSection from "./UserProfileHeaderSection";
import { messageService } from "../../services/messageService";
import { userService } from "../../services/userService";
import Button from "../common/Button";
import Alert from "../common/Alert";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Edit, MessageCircle, UserPlus } from "lucide-react";
import TeamInviteModal from "../teams/TeamInviteModal";

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
}) => {
  const { user: currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(mode === "edit");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    bio: "",
    postalCode: "",
    selectedTags: [],
    tagExperienceLevels: {},
    tagInterestLevels: {},
  });

  // ========= Badge Category Modal state =========
  const [badgeCategoryModal, setBadgeCategoryModal] = useState({
    isOpen: false,
    category: null,
    color: null,
    badges: [],
    totalCredits: 0,
    focusedBadgeName: null,
  });
  const [detailedBadgeAwards, setDetailedBadgeAwards] = useState([]);
  const [badgeModalLoading, setBadgeModalLoading] = useState(false);
  // ==============================================

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

      setUser(userData);

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
  }, [userId]);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetails();
    }
  }, [isOpen, userId, fetchUserDetails]);

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

  // ========= Badge Category Modal handlers =========
  const handleBadgeCategoryClick = async (
    category,
    color,
    badges,
    totalCredits,
  ) => {
    setBadgeCategoryModal({
      isOpen: true,
      category,
      color,
      badges,
      totalCredits,
      focusedBadgeName: null, // Show all badges in category
    });
    setBadgeModalLoading(true);

    try {
      const response = await userService.getUserBadges(userId);

      const payload =
        response?.success !== undefined
          ? response
          : response?.data?.success !== undefined
            ? response.data
            : (response?.data ?? response);

      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

      const categoryAwards = rows.filter((award) => {
        const c =
          award.badgeCategory ??
          award.badge_category ??
          award.category ??
          award.badge_category_name;
        return String(c ?? "").trim() === String(category ?? "").trim();
      });

      setDetailedBadgeAwards(categoryAwards);
    } catch (error) {
      console.error("Error fetching detailed badge awards:", error);
      setDetailedBadgeAwards([]);
    } finally {
      setBadgeModalLoading(false);
    }
  };

  // Handler for clicking on individual badge pills
  const handleBadgeClick = async (badge, category, color) => {
    // Calculate total credits for just this badge
    const badgeCredits = badge.total_credits ?? badge.totalCredits ?? 0;

    setBadgeCategoryModal({
      isOpen: true,
      category,
      color,
      badges: [badge],
      totalCredits: badgeCredits,
      focusedBadgeName: badge.name, // Track which badge to focus on
    });
    setBadgeModalLoading(true);

    try {
      const response = await userService.getUserBadges(userId);

      const payload =
        response?.success !== undefined
          ? response
          : response?.data?.success !== undefined
            ? response.data
            : (response?.data ?? response);

      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

      // Filter to only this badge's awards
      const badgeAwards = rows.filter((award) => {
        const awardBadgeName =
          award.badgeName ?? award.badge_name ?? award.name;
        return (
          String(awardBadgeName ?? "").trim() ===
          String(badge.name ?? "").trim()
        );
      });

      setDetailedBadgeAwards(badgeAwards);
    } catch (error) {
      console.error("Error fetching badge awards:", error);
      setDetailedBadgeAwards([]);
    } finally {
      setBadgeModalLoading(false);
    }
  };

  const closeBadgeCategoryModal = () => {
    setBadgeCategoryModal({
      isOpen: false,
      category: null,
      color: null,
      badges: [],
      totalCredits: 0,
      focusedBadgeName: null,
    });
    setDetailedBadgeAwards([]);
  };

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
                onClick={() => navigate("/profile")}
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
          <div className="space-y-6">
            {/* User Profile Header */}
            <UserProfileHeaderSection
              user={user}
              currentUser={currentUser}
              isAuthenticated={isAuthenticated}
              memberSince={user?.created_at || user?.createdAt}
            />

            {/* Bio */}
            <UserBioSection bio={user?.bio || user?.biography} />

            {/* Location */}
            <LocationSection entity={user} entityType="user" className="mb-6" />

            {/* Focus Areas */}
            <TagsDisplaySection
              title={UI_TEXT.focusAreas.title}
              tags={user?.tags}
              emptyMessage={UI_TEXT.focusAreas.empty}
            />

            {/* Badges */}
            <BadgesDisplaySection
              title={`Badges${
                Number.isFinite(user?.total_badge_credits)
                  ? ` · ${user.total_badge_credits} ct.`
                  : ""
              }`}
              badges={user?.badges}
              emptyMessage="No badges earned yet"
              maxVisible={8}
              groupByCategory={true}
              showCredits={false}
              onCategoryClick={handleBadgeCategoryClick}
              onBadgeClick={handleBadgeClick}
              onOpenUser={onOpenUser}
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
        isOpen={badgeCategoryModal.isOpen}
        onClose={closeBadgeCategoryModal}
        category={badgeCategoryModal.category}
        color={badgeCategoryModal.color}
        badges={badgeCategoryModal.badges}
        detailedAwards={detailedBadgeAwards}
        totalCredits={badgeCategoryModal.totalCredits}
        loading={badgeModalLoading}
        focusedBadgeName={badgeCategoryModal.focusedBadgeName}
        onOpenUser={onOpenUser}
      />
    </>
  );
};

export default UserDetailsModal;
