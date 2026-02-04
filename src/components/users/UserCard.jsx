import React, { useState } from "react";
import Card from "../common/Card";
import Button from "../common/Button";
import Tooltip from "../common/Tooltip";
import { Tag, Eye, EyeClosed } from "lucide-react";
import UserDetailsModal from "./UserDetailsModal";
import { useAuth } from "../../contexts/AuthContext";
import { getUserInitials } from "../../utils/userHelpers";
import LocationSection from "../common/LocationSection";

const UserCard = ({ user, onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user: currentUser, isAuthenticated } = useAuth();

  // Create a display name with fallbacks
  const displayName = () => {
    const firstName = user.first_name || user.firstName || "";
    const lastName = user.last_name || user.lastName || "";

    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else if (lastName) {
      return lastName;
    } else if (user.username) {
      return user.username;
    } else {
      return "User";
    }
  };

  // Get the profile image
  const getProfileImage = () => {
    // Explicitly look for avatar_url in snake_case format from API
    if (user.avatar_url) {
      console.log("Found avatar_url:", user.avatar_url);
      return user.avatar_url;
    }

    // Try camelCase format (from frontend state)
    if (user.avatarUrl) {
      console.log("Found avatarUrl:", user.avatarUrl);
      return user.avatarUrl;
    }

    // Use initial as fallback
    return (
      (user.first_name || user.firstName)?.charAt(0) ||
      user.username?.charAt(0) ||
      "?"
    );
  };

  // Fix the shouldShowVisibilityIcon function
  const shouldShowVisibilityIcon = () => {
    // Only show for authenticated users viewing their own profile
    if (!currentUser || !isAuthenticated) {
      return false;
    }

    // Only show if this card represents the current user's profile
    return currentUser.id === user.id;
  };

  // Helper function to check if user profile is public
  const isUserProfilePublic = () => {
    // Check both possible property names for is_public
    if (user.is_public === true) return true;
    if (user.isPublic === true) return true;
    if (user.is_public === false) return false;
    if (user.isPublic === false) return false;

    // Default to private if not specified
    return false;
  };

  const openUserDetails = () => {
    setIsModalOpen(true);
  };

  const closeUserDetails = () => {
    setIsModalOpen(false);
  };

  const handleUserUpdate = (updatedUser) => {
    if (onUpdate) {
      onUpdate(updatedUser);
    }
  };

  console.log("UserCard data:", user, "distance_km:", user.distance_km);

  return (
    <>
      <Card
        title={displayName()}
        subtitle={
          <span className="flex items-center text-base-content/70 text-sm gap-1.5">
            {user.username && <span>@{user.username}</span>}
            {shouldShowVisibilityIcon() && (
              <Tooltip
                content={
                  isUserProfilePublic()
                    ? "Public Profile - visible for everyone"
                    : "Private Profile - only visible for you"
                }
              >
                {isUserProfilePublic() ? (
                  <Eye size={14} className="text-green-600" />
                ) : (
                  <EyeClosed size={14} className="text-gray-500" />
                )}
              </Tooltip>
            )}
          </span>
        }
        hoverable
        image={getProfileImage()}
        imageFallback={getUserInitials(user)}
        imageAlt={`${user.username || "User"}'s profile`}
        imageSize="medium"
        imageShape="circle"
        onClick={openUserDetails}
        truncateContent={true}
      >
        {(user.bio || user.biography) && (
          <p className="text-base-content/80 mb-4">
            {user.bio || user.biography}
          </p>
        )}

        <div className="space-y-2 mb-4">
          {/* Location and Distance */}
          <LocationSection
            entity={user}
            entityType="user"
            compact={true}
            distance={user.distance_km ?? user.distanceKm}
          />

          {/* Tags / Interests & Skills */}
          {((Array.isArray(user.tags) && user.tags.length > 0) ||
            (typeof user.tags === "string" && user.tags.trim().length > 0)) && (
            <div className="flex items-start text-sm text-base-content/70">
              <Tag size={16} className="mr-1 flex-shrink-0 mt-0.5" />
              <span>
                {(() => {
                  const tagsArray = Array.isArray(user.tags)
                    ? user.tags.map((tag) =>
                        typeof tag === "string"
                          ? tag
                          : tag.name || tag.tag || "",
                      )
                    : typeof user.tags === "string"
                      ? user.tags
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean)
                      : [];

                  const maxVisible = 5;
                  const visibleTags = tagsArray.slice(0, maxVisible);
                  const remainingCount = tagsArray.length - maxVisible;

                  return (
                    <>
                      {visibleTags.join(", ")}
                      {remainingCount > 0 && ` +${remainingCount}`}
                    </>
                  );
                })()}
              </span>
            </div>
          )}
        </div>

        <div className="mt-auto">
          <Button
            variant="primary"
            size="sm"
            onClick={openUserDetails}
            className="w-full"
          >
            View Details
          </Button>
        </div>
      </Card>

      <UserDetailsModal
        isOpen={isModalOpen}
        userId={user.id}
        onClose={closeUserDetails}
        onUpdate={handleUserUpdate}
        mode="profile"
      />
    </>
  );
};

export default UserCard;
