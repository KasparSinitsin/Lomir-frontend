import React, { useState } from "react";
import Card from "../common/Card";
import Button from "../common/Button";
import Tooltip from "../common/Tooltip";
import { Eye, EyeClosed, MapPin, Globe } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useUserModal } from "../../contexts/UserModalContext";
import { getUserInitials } from "../../utils/userHelpers";
import LocationDistanceTagsRow from "../common/LocationDistanceTagsRow";

/**
 * UserCard Component
 *
 * Displays a user card in search results.
 * Uses UserModalContext for opening user details modals, ensuring proper
 * z-index stacking with other modals throughout the app.
 */
const UserCard = ({
  user,
  onUpdate,
  roleMatchTagIds,
  roleMatchBadgeNames,
  showMatchHighlights = false,
  viewMode = "card",
  activeFilters = {},
}) => {
  const { user: currentUser, isAuthenticated } = useAuth();
  const { openUserModal } = useUserModal();

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
      return user.avatar_url;
    }

    // Try camelCase format (from frontend state)
    if (user.avatarUrl) {
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

  // Open user details via global context
  const openUserDetails = () => {
    openUserModal(user.id, {
      roleMatchTagIds,
      roleMatchBadgeNames,
      showMatchHighlights,
    });
  };

  return (
    <Card
      title={displayName()}
      subtitle={
        <span
          className={`flex items-center flex-wrap text-base-content/70 ${viewMode === "mini" ? "text-xs gap-x-1 gap-y-0.5 w-full" : "text-sm gap-1.5"}`}
        >
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
                <Eye
                  size={viewMode === "mini" ? 12 : 14}
                  className="text-green-600"
                />
              ) : (
                <EyeClosed
                  size={viewMode === "mini" ? 12 : 14}
                  className="text-gray-500"
                />
              )}
            </Tooltip>
          )}
          {viewMode === "mini" &&
            !activeFilters.showLocation &&
            (user.city || user.country) && (
              <span className="flex items-center">
                <MapPin size={12} className="mr-0.5 flex-shrink-0" />
                <span>
                  {[user.city, user.country].filter(Boolean).join(", ")}
                </span>
              </span>
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
      contentClassName={
        viewMode === "mini"
          ? `!pt-0 !px-4 sm:!px-5 ${activeFilters.showLocation || activeFilters.showTags || activeFilters.showBadges ? "!pb-4 sm:!pb-5" : "!pb-0"}`
          : ""
      }
      headerClassName={
        viewMode === "mini"
          ? `!p-4 sm:!p-5 ${activeFilters.showLocation || activeFilters.showTags || activeFilters.showBadges ? "!pb-4" : "!pb-0"}`
          : ""
      }
      imageWrapperClassName={viewMode === "mini" ? "mb-0 pb-0" : ""}
      titleClassName={
        viewMode === "mini" ? "text-base mb-0.5 leading-[110%]" : ""
      }
      marginClassName={viewMode === "mini" ? "mb-2" : ""}
    >
      {viewMode !== "mini" && (user.bio || user.biography) && (
        <p className="text-base-content/80 mb-4">
          {user.bio || user.biography}
        </p>
      )}

      <LocationDistanceTagsRow
        entity={user}
        entityType="user"
        distance={user.distance_km ?? user.distanceKm}
        tags={viewMode === "mini" && !activeFilters.showTags ? null : user.tags}
        badges={
          viewMode === "mini" && !activeFilters.showBadges ? null : user.badges
        }
        hideLocation={viewMode === "mini" && !activeFilters.showLocation}
        compact={viewMode === "mini"}
      />

      {/* <div className="mt-auto">
        <Button
          variant="primary"
          size={viewMode === "mini" ? "xs" : "sm"}
          onClick={openUserDetails}
          className="w-full"
        >
          View Details
        </Button>
      </div> */}
    </Card>
  );
};

export default UserCard;
