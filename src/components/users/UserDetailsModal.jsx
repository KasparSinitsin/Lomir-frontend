import React, { useState, useEffect, useCallback } from "react";
import Modal from "../common/Modal";
import UserBioSection from "./UserBioSection";
import UserLocationSection from "./UserLocationSection";
import TagsDisplaySection from "../tags/TagsDisplaySection";
import UserProfileHeaderSection from "./UserProfileHeaderSection";
import { messageService } from "../../services/messageService";
import { userService } from "../../services/userService";
import Button from "../common/Button";
import TagSelector from "../tags/TagSelector";
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
  const { user: currentUser, isAuthenticated, updateUser } = useAuth();
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

  const isOwnProfile = () => {
    return currentUser && user && currentUser.id === user.id;
  };

  const fetchUserDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await userService.getUserById(userId);
      const userData = response.data;

      console.log("Full user details from API:", userData);

      setUser(userData);

      setFormData({
        firstName: userData.first_name || userData.firstName || "",
        lastName: userData.last_name || userData.lastName || "",
        bio: userData.bio || "",
        postalCode: userData.postal_code || userData.postalCode || "",
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

  // eslint-disable-next-line no-unused-vars
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // eslint-disable-next-line no-unused-vars
  const handleTagSelection = (
    selectedTags,
    experienceLevels,
    interestLevels
  ) => {
    setFormData((prev) => ({
      ...prev,
      selectedTags,
      tagExperienceLevels: experienceLevels,
      tagInterestLevels: interestLevels,
    }));
  };

  // eslint-disable-next-line no-unused-vars
  const handleSubmit = async (e) => {
    if (e) e.preventDefault(); // Prevent form submission

    try {
      setLoading(true);
      setError(null);

      const submissionData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        bio: formData.bio,
        postal_code: formData.postalCode,
        tags: formData.selectedTags.map((tagId) => ({
          tag_id: tagId,
          experience_level: formData.tagExperienceLevels[tagId] || "beginner",
          interest_level: formData.tagInterestLevels[tagId] || "medium",
        })),
      };

      const response = await userService.updateUser(userId, submissionData);

      setUser(response.data);
      setIsEditing(false);

      // If this is the current user's own profile, update the global context
      if (isOwnProfile() && currentUser) {
        updateUser(response.data);
      }

      if (onUpdate) {
        onUpdate(response.data);
      }
    } catch (err) {
      console.error("Error updating user:", err);
      setError("Failed to update user. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (!user?.id) {
      console.error("User ID is required to start chat");
      return;
    }

    try {
      console.log("Starting chat with user:", user.id);

      // Create conversation with the user and send an empty message to ensure it appears
      const conversationResponse = await messageService.startConversation(
        user.id,
        ""
      );
      console.log("Conversation created:", conversationResponse);

      // Give a bit more time for the conversation to be created
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Open chat in new tab with direct message type
      const chatUrl = `${window.location.origin}/chat/${user.id}?type=direct`;
      console.log("Opening chat URL:", chatUrl);

      window.open(chatUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Error starting conversation:", error);

      // Fallback: still open chat page even if API call fails
      const chatUrl = `${window.location.origin}/chat/${user.id}?type=direct`;
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
              // Navigate to profile page for comprehensive editing
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onClose(); // Close the modal first
                  navigate("/profile"); // Then navigate to profile page
                }}
                icon={<Edit size={16} />}
              >
                Edit Profile
              </Button>
            ) : (
              // Show invite and chat buttons for other users' profiles
              <>
                {isAuthenticated && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleInviteToTeam}
                    icon={<UserPlus size={16} />}
                    title="Invite to team"
                  />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStartChat}
                  icon={<MessageCircle size={16} />}
                  title="Send message"
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );

  // FOOTER for Send Message button (only for other users)
  const footer =
    !isOwnProfile() && !loading && user ? (
      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={handleStartChat}
          className="w-full"
          icon={<MessageCircle size={16} />}
        >
          Send Message
        </Button>
      </div>
    ) : null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={customHeader}
        footer={footer}
        // PRESERVE ORIGINAL STYLING
        position="center"
        size="default" // max-w-2xl
        // Standard modal settings
        closeOnBackdrop={true}
        closeOnEscape={true}
        showCloseButton={true}
      >
        {/* CONTENT - All business logic preserved */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="loading loading-spinner loading-lg text-primary"></div>
          </div>
        ) : error ? (
          <Alert type="error" message={error} />
        ) : isEditing ? (
          // EDIT MODE - Future implementation could use TagSelector here
          <div className="space-y-6">
            <p className="text-base-content/70">
              For comprehensive profile editing, you'll be redirected to the
              full profile page.
            </p>
            {/* Future: Add TagSelector and form fields here */}
            {/* <TagSelector onSelectionChange={handleTagSelection} /> */}
          </div>
        ) : (
          // VIEW MODE - User profile information
          <div className="space-y-6">
            {/* User Profile Header */}
            <UserProfileHeaderSection
              user={user}
              currentUser={currentUser}
              isAuthenticated={isAuthenticated}
            />

            {/* Bio */}
            <UserBioSection bio={user?.bio || user?.biography} />

            {/* Location and Skills */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UserLocationSection user={user} />
            </div>

            <TagsDisplaySection
              title="Skills & Interests"
              tags={user?.tags}
              emptyMessage="No tags yet"
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
          inviteeAvatar={user.avatar_url || user.avatarUrl}
        />
      )}
    </>
  );
};

export default UserDetailsModal;
