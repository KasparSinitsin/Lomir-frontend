import React, { useState } from "react";
import Tooltip from "../common/Tooltip";
import {
  Eye,
  EyeClosed,
  Calendar,
  UserCheck,
  FlaskConical,
} from "lucide-react";
import {
  DEMO_PROFILE_TOOLTIP,
  getUserInitials,
  isSyntheticUser,
} from "../../utils/userHelpers";
import DemoAvatarOverlay from "./DemoAvatarOverlay";
import { getMatchTier } from "../../utils/matchScoreUtils";
import { format } from "date-fns";

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
  memberSince = null,
  matchScore = null,
  className = "",
  filledRoleName = null,
  teamName = null,
}) => {
  const [imageError, setImageError] = useState(false);
  const showMatchBadge = matchScore != null;
  const matchTier = showMatchBadge ? getMatchTier(matchScore) : null;
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

  // Format member since date
  const getMemberSinceDate = () => {
    if (!memberSince) return null;
    try {
      return {
        short: format(new Date(memberSince), "MMM yyyy"),
        full: format(new Date(memberSince), "MMMM yyyy"),
      };
    } catch (error) {
      console.error("Error formatting member since date:", error);
      return null;
    }
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
      <div className="avatar relative">
        <div className="w-20 h-20 rounded-full relative overflow-hidden">
          {getProfileImage() && !imageError ? (
            <img
              src={getProfileImage()}
              alt="Profile"
              className="object-cover w-full h-full rounded-full"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="bg-primary text-primary-content flex items-center justify-center w-full h-full rounded-full">
              <span className="text-2xl">{getUserInitials(user)}</span>
            </div>
          )}
          {isSyntheticUser(user) && (
            <DemoAvatarOverlay
              textClassName="text-[9px]"
              textTranslateClassName="-translate-y-[4px]"
            />
          )}
        </div>
        {matchTier && (
          <div
            className={`absolute -top-1 -left-1 w-6 h-6 rounded-full ring-2 ring-white flex items-center justify-center ${matchTier.bg}`}
            title={`${matchTier.pct}% ${matchTier.label.toLowerCase()}`}
          >
            <matchTier.Icon
              size={12}
              className="text-white"
              strokeWidth={2.5}
            />
          </div>
        )}
      </div>

      {/* User Info */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold leading-[120%] mb-[0.2em]">
          {getDisplayName()}
        </h1>
        <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-sm">
          <span className="text-base-content/70">@{user?.username}</span>
          {isSyntheticUser(user) && (
            <Tooltip
              content={DEMO_PROFILE_TOOLTIP}
              wrapperClassName="flex items-start text-base-content/50 text-sm"
            >
              <FlaskConical className="h-3.5 w-auto mr-0.5 flex-shrink-0 mt-px" />
              <span className="leading-[1.15]">Demo Profile</span>
            </Tooltip>
          )}

          {filledRoleName && (
            <span className="flex items-center gap-1 text-base-content/70">
              <UserCheck size={12} className="flex-shrink-0" />
              <span>
                {filledRoleName}
                {teamName && <span className="text-base-content/50"> in {teamName}</span>}
              </span>
            </span>
          )}

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

      {/* Member Since - top right */}
      {getMemberSinceDate() && (
        <div
          className="flex items-center text-xs text-base-content/60 flex-shrink-0 tooltip tooltip-bottom tooltip-lomir cursor-help"
          data-tip={`Joined Lomir in ${getMemberSinceDate().full}`}
        >
          <Calendar size={12} className="mr-1" />
          <span>{getMemberSinceDate().short}</span>
        </div>
      )}
    </div>
  );
};

export default UserProfileHeaderSection;
