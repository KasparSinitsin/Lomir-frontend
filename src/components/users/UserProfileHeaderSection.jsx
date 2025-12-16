import React, { useState } from "react";
import { Eye, EyeClosed } from "lucide-react";

/**
 * UserProfileHeaderSection Component
 * Displays user avatar, name, username, and visibility indicator
 *
 * Extracted from UserDetailsModal to improve code organization
 */
const UserProfileHeaderSection = ({
  user,
  currentUser = null,
  isAuthenticated = false,
  className = "",
}) => {
  const [imageError, setImageError] = useState(false);
  // Helper function to get the avatar image URL or return null for fallback
  const getProfileImage = () => {
    // Check snake_case (from API)
    if (user?.avatar_url) {
      return user.avatar_url;
    }
    // Check camelCase (from frontend state)
    if (user?.avatarUrl) {
      return user.avatarUrl;
    }
    return null; // Return null to use fallback initials
  };

  // Helper to determine if visibility indicator should show
  const shouldShowVisibilityIndicator = () => {
    if (!currentUser || !isAuthenticated || !user) {
      return false;
    }
    // Only show for the user's own profile
    return currentUser.id === user.id;
  };

  // Helper to check if profile is public
  const isUserProfilePublic = () => {
    if (!user) return false;

    // Check both property name formats
    if (user.is_public === true) return true;
    if (user.isPublic === true) return true;
    if (user.is_public === false) return false;
    if (user.isPublic === false) return false;

    // Default to private
    return false;
  };

  // Get user's initials for avatar fallback (2 letters: "VL" for Valentina Lopez)
  const getUserInitials = () => {
    const firstName = user?.first_name || user?.firstName;
    const lastName = user?.last_name || user?.lastName;

    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    if (firstName) {
      return firstName.charAt(0).toUpperCase();
    }
    if (user?.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return "?";
  };

  // Get full display name
  const getDisplayName = () => {
    if (user?.first_name || user?.firstName) {
      return `${user?.first_name || user?.firstName} ${
        user?.last_name || user?.lastName
      }`;
    }
    return user?.username;
  };

  return (
    <div className={`flex items-start space-x-4 ${className}`}>
      {/* Avatar */}
      <div className="avatar">
        <div className="w-20 h-20 rounded-full">
          {getProfileImage() && !imageError ? (
            <img
              src={getProfileImage()}
              alt="Profile"
              className="object-cover w-full h-full rounded-full"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="bg-primary text-primary-content flex items-center justify-center w-full h-full rounded-full">
              <span className="text-2xl">{getUserInitials()}</span>
            </div>
          )}
        </div>
      </div>

      {/* User Info */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold">{getDisplayName()}</h1>
        <div className="flex items-center space-x-4 text-sm">
          <span className="text-base-content/70">@{user?.username}</span>

          {/* Visibility Indicator - Only show for own profile */}
          {shouldShowVisibilityIndicator() && (
            <div className="flex items-center text-base-content/70">
              {isUserProfilePublic() ? (
                <>
                  <Eye size={16} className="mr-1 text-green-600" />
                  <span>Public</span>
                </>
              ) : (
                <>
                  <EyeClosed size={16} className="mr-1 text-gray-500" />
                  <span>Private</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileHeaderSection;
