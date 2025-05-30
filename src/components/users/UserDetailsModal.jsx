// src/components/users/UserDetailsModal.jsx
import { messageService } from '../../services/messageService';
import React, { useState, useEffect, useCallback } from "react";
import LocationDisplay from "../common/LocationDisplay";
import {
  X,
  Edit,
  MessageCircle,
  MapPin,
  Tag,
  Eye,
  EyeClosed,
} from "lucide-react";
import { userService } from "../../services/userService";
import Button from "../common/Button";
import TagSelector from "../tags/TagSelector";
import Alert from "../common/Alert";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

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

  // Helper function to determine if we should show the visibility indicator
  const shouldShowVisibilityIndicator = () => {
    // Only show for authenticated users viewing their own profile
    if (!currentUser || !isAuthenticated || !user) {
      return false;
    }

    // Only show if this modal represents the current user's profile
    return currentUser.id === user.id;
  };

  const isUserProfilePublic = () => {
    if (!user) return false;

    // Check both possible property names for is_public
    if (user.is_public === true) return true;
    if (user.isPublic === true) return true;
    if (user.is_public === false) return false;
    if (user.isPublic === false) return false;

    // Default to private if not specified
    return false;
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
        selectedTags: [], // Since tags are now strings, we can't easily convert back to IDs
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

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
    try {
      // Start a new conversation
      const response = await messageService.startConversation(user.id, "");
      
      // Close the modal
      onClose();
      
      // Navigate to the chat page with this conversation
      navigate(`/chat/${response.data.conversationId}`);
    } catch (error) {
      console.error("Error starting chat:", error);
      setError("Failed to start conversation. Please try again.");
    }
  };

  // Helper function to get the avatar image URL or fallback to initials
  const getProfileImage = () => {
    if (user?.avatar_url) {
      return user.avatar_url;
    }

    if (user?.avatarUrl) {
      return user.avatarUrl;
    }

    return null; // Return null if no image found
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-40"
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-2xl max-h-[90vh] rounded-xl overflow-hidden">
        <div className="bg-base-100 h-full flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
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
                    // Show chat button for other users' profiles
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleStartChat} // FIXED: Changed from handleStartChatMock to handleStartChat
                      icon={<MessageCircle size={16} />}
                    ></Button>
                  )}
                </>
              )}

              <button
                onClick={onClose}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-auto p-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="loading loading-spinner loading-lg text-primary"></div>
              </div>
            ) : error ? (
              <Alert type="error" message={error} />
            ) : isEditing ? (
              // Edit Mode (form for user to edit data)
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Form inputs here */}
                <div className="space-y-4">
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="input input-bordered w-full"
                    placeholder="First Name"
                  />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="input input-bordered w-full"
                    placeholder="Last Name"
                  />
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    className="textarea textarea-bordered w-full"
                    placeholder="Bio"
                    rows="4"
                  />
                  <input
                    type="text"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    className="input input-bordered w-full"
                    placeholder="Postal Code"
                  />
                  <div>
                    <label className="label">
                      <span className="label-text">Skills & Interests</span>
                    </label>
                    <TagSelector
                      selectedTags={formData.selectedTags}
                      onTagsSelected={handleTagSelection}
                      tagExperienceLevels={formData.tagExperienceLevels}
                      tagInterestLevels={formData.tagInterestLevels}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            ) : (
              // View Mode (display user data)
              <div className="space-y-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="avatar placeholder">
                    <div className="bg-primary text-primary-content rounded-full w-16 h-16">
                      {getProfileImage() ? (
                        <img
                          src={getProfileImage()}
                          alt={`${user?.username || "User"}'s profile`}
                          className="rounded-full object-cover w-full h-full"
                        />
                      ) : (
                        <span className="text-2xl">
                          {user?.first_name?.charAt(0) ||
                            user?.firstName?.charAt(0) ||
                            user?.username?.charAt(0) ||
                            "?"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">
                      {(user?.first_name || user?.firstName) &&
                      (user?.last_name || user?.lastName)
                        ? `${user?.first_name || user?.firstName} ${
                            user?.last_name || user?.lastName
                          }`
                        : user?.username}
                    </h1>
                    <p className="text-base-content/70">@{user?.username}</p>

                    {/* VISIBILITY INDICATOR - Only show for own profile */}
                    {shouldShowVisibilityIndicator() && (
                      <div className="mt-2 flex items-center">
                        {isUserProfilePublic() ? (
                          <>
                            <Eye size={16} className="text-green-600 mr-2" />
                            <span className="text-sm text-base-content/70">
                              Public Profile
                            </span>
                          </>
                        ) : (
                          <>
                            <EyeClosed
                              size={16}
                              className="text-orange-600 mr-2"
                            />
                            <span className="text-sm text-base-content/70">
                              Private Profile
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {(user?.bio || user?.biography) && (
                  <div>
                    <p className="text-base-content/90">
                      {user?.bio || user?.biography}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-2">
                    <MapPin
                      size={18}
                      className="mt-1 text-primary flex-shrink-0"
                    />
                    <div>
                      <h3 className="font-medium">Location</h3>
                      <div>
                        {user?.postal_code || user?.postalCode ? (
                          <LocationDisplay
                            postalCode={user.postal_code || user.postalCode}
                            className="bg-base-200/50 py-1"
                            showIcon={false} // Hide icon in modal
                            showPostalCode={true} // Show postal code in the display
                            displayType="detailed"
                          />
                        ) : (
                          <p>Not specified</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center mb-2">
                    <Tag
                      size={18}
                      className="mr-2 text-primary flex-shrink-0"
                    />
                    <h3 className="font-medium">Skills & Interests</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {user?.tags && user.tags.trim() ? (
                      typeof user.tags === "string" ? (
                        // Handle tags as a string (comma-separated list)
                        user.tags.split(",").map((tag, index) => (
                          <span
                            key={index}
                            className="badge badge-primary badge-outline p-3"
                          >
                            {tag.trim()}
                          </span>
                        ))
                      ) : (
                        // Handle tags as an array of objects (fallback)
                        user.tags.map((tag) => (
                          <span
                            key={typeof tag === "object" ? tag.id : tag}
                            className="badge badge-primary badge-outline p-3"
                          >
                            {typeof tag === "object" ? tag.name : tag}
                          </span>
                        ))
                      )
                    ) : (
                      <span className="badge badge-warning">No tags yet</span>
                    )}
                  </div>
                </div>

                {/* Hide message/chat button for own profile */}
                {!isOwnProfile() && (
                  <div className="mt-6">
                    <Button
                      variant="primary"
                      onClick={handleStartChat} // FIXED: Changed from handleStartChatMock to handleStartChat
                      className="w-full"
                      icon={<MessageCircle size={16} />}
                    >
                      Send Message
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;