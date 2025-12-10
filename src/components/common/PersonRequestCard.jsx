import React from "react";
import { Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import LocationDisplay from "./LocationDisplay";

/**
 * PersonRequestCard Component
 *
 * A reusable card for displaying user information in request lists
 * (applications, invitations, etc.)
 *
 * Used by: TeamApplicationsModal, TeamInvitesModal
 *
 * @param {Object} props
 * @param {Object} props.user - User data object (applicant, invitee, etc.)
 * @param {string} props.date - Date string (created_at, sent_at, etc.)
 * @param {string} props.message - Optional message content
 * @param {string} props.messageLabel - Label for the message (e.g., "Application message:")
 * @param {React.ReactNode} props.messageIcon - Icon to show next to message label
 * @param {Function} props.onUserClick - Callback when user avatar/name is clicked
 * @param {React.ReactNode} props.actions - Action buttons to render at the bottom
 * @param {React.ReactNode} props.extraContent - Additional content (e.g., response textarea, tags)
 * @param {React.ReactNode} props.footerLeft - Content for the left side of the footer (e.g., inviter info)
 * @param {boolean} props.clickable - Whether user elements are clickable (default: true)
 * @param {boolean} props.showLocation - Whether to show location info (default: true)
 */
const PersonRequestCard = ({
  user,
  date,
  message,
  messageLabel = "Message:",
  messageIcon,
  onUserClick,
  actions,
  extraContent,
  footerLeft,
  clickable = true,
  showLocation = true,
}) => {
  // ============ Helper Functions ============

  // Get avatar URL - handles both snake_case and camelCase
  const getAvatarUrl = () => {
    if (!user) return null;
    return user.avatar_url || user.avatarUrl || null;
  };

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user) return "?";

    const firstName = user.first_name || user.firstName;
    const lastName = user.last_name || user.lastName;
    const username = user.username;

    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    if (firstName) {
      return firstName.charAt(0).toUpperCase();
    }
    if (username) {
      return username.charAt(0).toUpperCase();
    }
    return "?";
  };

  // Get display name
  const getDisplayName = () => {
    if (!user) return "Unknown User";

    const firstName = user.first_name || user.firstName || "";
    const lastName = user.last_name || user.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();

    if (fullName.length > 0) return fullName;
    return user.username || "Unknown User";
  };

  // Format date
  const formatDate = () => {
    if (!date) return "Unknown date";

    try {
      return format(new Date(date), "MMM d, yyyy");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Unknown date";
    }
  };

  // Get postal code
  const getPostalCode = () => {
    return user?.postal_code || user?.postalCode || null;
  };

  // Handle click on user elements
  const handleUserClick = () => {
    if (clickable && onUserClick && user?.id) {
      onUserClick(user.id);
    }
  };

  // Clickable styles
  const clickableStyles = clickable
    ? "cursor-pointer hover:opacity-80 transition-opacity"
    : "";

  const clickableTextStyles = clickable
    ? "cursor-pointer hover:text-primary transition-colors"
    : "";

  // ============ Render ============

  return (
    <div className="bg-base-200/30 rounded-lg border border-base-300 p-4">
      {/* User Info Header */}
      <div className="flex items-start space-x-4 mb-4">
        {/* Avatar */}
        <div
          className={`avatar ${clickableStyles}`}
          onClick={handleUserClick}
          title={clickable ? "View profile" : undefined}
        >
          <div className="w-12 h-12 rounded-full relative">
            {getAvatarUrl() ? (
              <img
                src={getAvatarUrl()}
                alt={user?.username || "User"}
                className="object-cover w-full h-full rounded-full"
                onError={(e) => {
                  e.target.style.display = "none";
                  const fallback =
                    e.target.parentElement.querySelector(".avatar-fallback");
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            {/* Fallback initials */}
            <div
              className="avatar-fallback bg-primary text-primary-content flex items-center justify-center w-full h-full rounded-full absolute inset-0"
              style={{
                display: getAvatarUrl() ? "none" : "flex",
              }}
            >
              <span className="text-lg font-medium">{getUserInitials()}</span>
            </div>
          </div>
        </div>

        {/* Name and Details */}
        <div className="flex-1 min-w-0">
          <h4
            className={`font-medium text-base-content ${clickableTextStyles}`}
            onClick={handleUserClick}
            title={clickable ? "View profile" : undefined}
          >
            {getDisplayName()}
          </h4>

          {/* Username (if different from display name) */}
          {user?.username && getDisplayName() !== user.username && (
            <p
              className={`text-sm text-base-content/70 ${clickableTextStyles}`}
              onClick={handleUserClick}
              title={clickable ? "View profile" : undefined}
            >
              @{user.username}
            </p>
          )}

          {/* Location if available and showLocation is true */}
          {showLocation && getPostalCode() && (
            <div className="flex items-center text-sm text-base-content/60 mt-1">
              <MapPin size={14} className="mr-1" />
              <LocationDisplay postalCode={getPostalCode()} />
            </div>
          )}
        </div>

        {/* Date - top right */}
        <div className="flex items-center text-xs text-base-content/60 flex-shrink-0">
          <Calendar size={12} className="mr-1" />
          <span>{formatDate()}</span>
        </div>
      </div>

      {/* Bio if available */}
      {user?.bio && (
        <div className="mb-5 text-sm text-base-content/80">
          <p className="line-clamp-2">{user.bio}</p>
        </div>
      )}

      {/* Message if provided */}
      {message && (
        <div className="mb-5">
          <p className="text-xs text-base-content/60 mb-1 flex items-center">
            {messageIcon}
            {messageLabel}
          </p>
          <p className="text-sm text-base-content/90">{message}</p>
        </div>
      )}

      {/* Extra content slot (e.g., tags, response textarea) */}
      {extraContent}

      {/* Footer with optional left content and actions */}
      <div className="flex items-center justify-between">
        {/* Left side (e.g., inviter info) */}
        {footerLeft || <div />}

        {/* Right side - action buttons */}
        {actions}
      </div>
    </div>
  );
};

export default PersonRequestCard;
