import React from "react";
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

  // Get user's initial for avatar fallback
  const getUserInitial = () => {
    return (
      user?.first_name?.charAt(0) ||
      user?.firstName?.charAt(0) ||
      user?.username?.charAt(0) ||
      "?"
    );
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
          {getProfileImage() ? (
            <img
              src={getProfileImage()}
              alt="Profile"
              className="object-cover"
            />
          ) : (
            <div className="bg-primary text-primary-content flex items-center justify-center">
              <span className="text-2xl">{getUserInitial()}</span>
            </div>
          )}
        </div>
      </div>

      {/* User Info */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold">{getDisplayName()}</h1>
        <p className="text-base-content/70">@{user?.username}</p>

        {/* Visibility Indicator - Only show for own profile */}
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
                <EyeClosed size={16} className="text-orange-600 mr-2" />
                <span className="text-sm text-base-content/70">
                  Private Profile
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfileHeaderSection;