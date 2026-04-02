import React from "react";
import { useUserModalSafe } from "../../contexts/UserModalContext";
import {
  getDisplayName,
  isDeletedUser,
} from "../../utils/deletedUser";
import UserAvatar from "./UserAvatar";

/**
 * InlineUserLink Component
 *
 * Renders a clickable user reference in the format:
 *   "[Label] [Avatar] Full Name"
 *
 * Examples:
 *   - "Awarded by [👤] Jane Smith"
 *   - "Invited by [👤] John Doe"
 *   - "Sent by [👤] Alice Brown"
 *   - "Received by [👤] Bob Wilson"
 *   - "[👤] Username" (no label)
 *
 * Click behavior:
 *   1. If UserModalContext is available, uses global modal stack
 *   2. Falls back to onOpenUser prop if provided
 *   3. Does nothing if neither is available
 *
 * Styling matches the established pattern from:
 *   - TeamApplicationDetailsModal "Received by"
 *   - TeamInvitesModal "Invited by"
 *   - BadgeCategoryModal "Awarded by"
 *
 * Props:
 * @param {Object} user - User object with id, name fields, avatar_url, etc.
 * @param {string} [label] - Optional prefix text ("Awarded by", "Invited by", etc.)
 * @param {Function} [onOpenUser] - Legacy callback: onOpenUser(userId)
 * @param {string} [avatarSize] - Tailwind size class for avatar (default: "w-4 h-4")
 * @param {string} [className] - Additional container class
 * @param {boolean} [showAvatar=true] - Whether to show the avatar
 */
const InlineUserLink = ({
  user,
  label,
  onOpenUser,
  avatarSize = "w-4 h-4",
  className = "",
  showAvatar = true,
}) => {
  // Try to get global modal context (returns null if not available)
  const userModalContext = useUserModalSafe();

  if (!user) return null;

  // Normalize user ID from various possible field names
  const userId = user?.id || user?.user_id || user?.userId;
  const name = getDisplayName(user) || "Unknown";
  const isFormerUser = isDeletedUser(user);

  // Determine if we can handle clicks
  const canClick = !isFormerUser && userId && (userModalContext || onOpenUser);

  const handleClick = (e) => {
    if (!canClick) return;

    // Prevent event bubbling (important when inside clickable cards)
    e.stopPropagation();

    // Prefer global context, fall back to prop
    if (userModalContext) {
      userModalContext.openUserModal(userId);
    } else if (onOpenUser) {
      onOpenUser(userId);
    }
  };

  return (
    <div
      className={`flex items-center text-xs text-base-content/60 ${className}`}
    >
      {/* Label (e.g., "Awarded by", "Invited by") */}
      {label && <span className="mr-1">{label}</span>}

      {/* Avatar */}
      {showAvatar && (
        <UserAvatar
          user={user}
          deleted={isFormerUser}
          sizeClass={avatarSize}
          className="mr-1"
          clickable={Boolean(canClick)}
          onClick={handleClick}
          title={canClick ? "View profile" : undefined}
          iconSize={avatarSize === "w-4 h-4" ? 10 : 12}
          initialsClassName={
            avatarSize === "w-4 h-4"
              ? "text-[8px] font-medium"
              : "text-[10px] font-medium"
          }
        />
      )}

      {/* Name */}
      <span
        className={`font-medium ${
          isFormerUser ? "text-base-content/50" : "text-base-content/80"
        } ${canClick ? "cursor-pointer hover:text-primary transition-colors" : ""}`}
        onClick={canClick ? handleClick : undefined}
        title={canClick ? "View profile" : undefined}
      >
        {name}
      </span>
    </div>
  );
};

/**
 * Preset variants for common use cases
 */

// "Awarded by [avatar] Name"
export const AwardedByLink = ({ user, ...props }) => (
  <InlineUserLink user={user} label="Awarded by" {...props} />
);

// "Invited by [avatar] Name"
export const InvitedByLink = ({ user, ...props }) => (
  <InlineUserLink user={user} label="Invited by" {...props} />
);

// "Sent by [avatar] Name"
export const SentByLink = ({ user, ...props }) => (
  <InlineUserLink user={user} label="Sent by" {...props} />
);

// "From [avatar] Name"
export const FromUserLink = ({ user, ...props }) => (
  <InlineUserLink user={user} label="From" {...props} />
);

// "Applied by [avatar] Name"
export const AppliedByLink = ({ user, ...props }) => (
  <InlineUserLink user={user} label="Applied by" {...props} />
);

// "Received by [avatar] Name"
export const ReceivedByLink = ({ user, ...props }) => (
  <InlineUserLink user={user} label="Received by" {...props} />
);

// Just "[avatar] Name" (no label)
export const UserLink = (props) => <InlineUserLink {...props} />;

export default InlineUserLink;
