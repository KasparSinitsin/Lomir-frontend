import React, { useState, useEffect, useCallback } from "react";
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
  mode = "view",
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
  });
  const [detailedBadgeAwards, setDetailedBadgeAwards] = useState([]);
  const [badgeModalLoading, setBadgeModalLoading] = useState(false);
  // ==============================================

  const isOwnProfile = () => {
    return currentUser && user && currentUser.id === user.id;
  };

  const fetchUserDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await userService.getUserById(userId);

      // Robustly unwrap common response shapes:
      // - axios: response.data
      // - API wrapper: { success, message, data: user }
      const payload = response?.data ?? response;
      const userData =
        payload?.success !== undefined
          ? payload?.data
          : (payload?.data?.data ?? payload?.data ?? payload);

      console.log("Full user details from API:", userData);

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

    try {
      console.log("Starting chat with user:", user?.id);

      const conversationResponse = await messageService.startConversation(
        user?.id,
        "",
      );
      console.log("Conversation created:", conversationResponse);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const chatUrl = `${window.location.origin}/chat/${user?.id}?type=direct`;
      console.log("Opening chat URL:", chatUrl);

      window.open(chatUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Error starting conversation:", error);

      const chatUrl = `${window.location.origin}/chat/${user?.id}?type=direct`;
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

  const closeBadgeCategoryModal = () => {
    setBadgeCategoryModal({
      isOpen: false,
      category: null,
      color: null,
      badges: [],
      totalCredits: 0,
    });
    setDetailedBadgeAwards([]);
  };

  const handleOpenUserFromBadgeModal = (clickedUserId) => {
    if (!clickedUserId) return;

    // Close modals first to avoid stacked modals / focus traps
    closeBadgeCategoryModal();
    onClose?.();

    // Navigate to user page (adjust route if needed)
    navigate(`/users/${clickedUserId}`);
  };
  // =================================================

  // CUSTOM HEADER with dynamic title and action buttons
  const customHeader = (
    <div className="flex justify-between items-center w-full">
      <h2 className="text-xl font-medium text-primary">
        {isEditing ? "Edit Profile" : "User Details"}
      </h2>
      <div className="flex items-center space-x-2">
        {!isEditing && (
          <>
            {isOwnProfile() ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/profile")}
                className="flex items-center gap-1"
              >
                <Edit size={16} />
                <span className="hidden sm:inline">Edit</span>
              </Button>
            ) : (
              isAuthenticated && (
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
              )
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
        customHeader={customHeader}
        size="md"
      >
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="loading loading-spinner loading-lg text-primary"></div>
          </div>
        ) : error ? (
          <Alert type="error" message={error} />
        ) : isEditing ? (
          <div className="space-y-6">
            <p className="text-base-content/70">
              For comprehensive profile editing, you'll be redirected to the
              full profile page.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <UserProfileHeaderSection
              user={user}
              currentUser={currentUser}
              isAuthenticated={isAuthenticated}
              memberSince={user?.created_at || user?.createdAt}
            />

            <UserBioSection bio={user?.bio || user?.biography} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LocationSection
                entity={user}
                entityType="user"
                className="mb-6"
              />
            </div>

            <TagsDisplaySection
              title="Skills & Interests"
              tags={user?.tags}
              emptyMessage="No tags yet"
            />

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
            />
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
        onOpenUser={handleOpenUserFromBadgeModal}
      />
    </>
  );
};

export default UserDetailsModal;
