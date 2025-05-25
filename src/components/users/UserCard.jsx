import React, { useState } from "react";
import Card from "../common/Card";
import Button from "../common/Button";
import { Tag, MapPin, MessageCircle, Eye, EyeClosed } from "lucide-react";
import UserDetailsModal from "./UserDetailsModal";
import { useAuth } from "../../contexts/AuthContext"; // Add this import

const UserCard = ({ user, onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user: currentUser, isAuthenticated } = useAuth(); // Add this line

  // For debugging
  console.log("User data in UserCard:", user);

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

  return (
    <>
      <Card
        title={displayName()}
        subtitle={user.username ? `@${user.username}` : ""}
        hoverable
        image={getProfileImage()}
        imageAlt={`${user.username || "User"}'s profile`}
        imageSize="medium"
      >
        {(user.bio || user.biography) && (
          <p className="text-base-content/80 mb-4">
            {user.bio || user.biography}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Visibility indicator - only show for current user's own profile */}
          {shouldShowVisibilityIcon() && (
            <div className="flex items-center text-sm text-base-content/70 bg-base-200/50 py-1 rounded-full">
              {isUserProfilePublic() ? (
                <>
                  <Eye size={16} className="mr-1 text-green-600" />
                  <span>Public</span>
                </>
              ) : (
                <>
                  <EyeClosed size={16} className="mr-1 text-grey-600" />
                  <span>Private</span>
                </>
              )}
            </div>
          )}

          {(user.postal_code || user.postalCode) && (
            <div className="flex items-center text-sm text-base-content/70">
              <MapPin size={16} className="mr-1" />
              <span>{user.postal_code || user.postalCode}</span>
            </div>
          )}

          {user.tags && (
            <div className="flex items-center text-sm text-base-content/70">
              <Tag size={16} className="mr-1" />
              <span>{user.tags}</span>
            </div>
          )}

          {/* Debug info - add this AFTER the existing elements in the flex container
          {import.meta.env.DEV && currentUser && (
            <div className="text-xs bg-blue-100 px-2 py-1 rounded text-black">
              Debug: CurrentUser={currentUser.id}, CardUser={user.id},
              ShouldShow={shouldShowVisibilityIcon()}, IsPublic=
              {isUserProfilePublic()}
            </div>
          )} */}
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
