import React from "react";
import { FlaskConical } from "lucide-react";
import { useUserModalSafe } from "../../contexts/UserModalContext";
import { useUserProfile } from "../../hooks/useUserQueries";
import Tooltip from "../common/Tooltip";
import { DEMO_PROFILE_TOOLTIP } from "../../utils/userHelpers";
import {
  getDisplayName,
  isDeletedUser,
} from "../../utils/deletedUser";
import UserAvatar from "./UserAvatar";

const mergeInlineUserData = (user, profile) => {
  if (!profile) return user;

  const resolvedAvatarUrl =
    user?.avatar_url ??
    user?.avatarUrl ??
    profile?.avatar_url ??
    profile?.avatarUrl ??
    null;
  const resolvedSyntheticStatus =
    user?.is_synthetic ??
    user?.isSynthetic ??
    profile?.is_synthetic ??
    profile?.isSynthetic ??
    undefined;

  return {
    ...profile,
    ...user,
    avatar_url: resolvedAvatarUrl,
    avatarUrl:
      user?.avatarUrl ??
      user?.avatar_url ??
      profile?.avatarUrl ??
      profile?.avatar_url ??
      null,
    is_synthetic: resolvedSyntheticStatus,
    isSynthetic: resolvedSyntheticStatus,
  };
};

const normalizeBooleanFlag = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
  }
  return null;
};

const isPrivateProfile = (user) =>
  normalizeBooleanFlag(user?.is_public) === false ||
  normalizeBooleanFlag(user?.isPublic) === false ||
  normalizeBooleanFlag(user?.is_private) === true ||
  normalizeBooleanFlag(user?.isPrivate) === true;

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
  displayName,
}) => {
  // Try to get global modal context (returns null if not available)
  const userModalContext = useUserModalSafe();

  // Normalize user ID from various possible field names
  const userId = user?.id || user?.user_id || user?.userId;
  const isFormerUser = isDeletedUser(user);
  const isPrivateUser = isPrivateProfile(user);
  // Only hydrate when the parent didn't pass enough to render a name —
  // missing avatar / synthetic flag alone aren't worth a network round trip,
  // since UserAvatar falls back to initials and the synthetic indicator is
  // only meaningful for demo users.
  const hasDisplayableName = Boolean(
    user?.username ||
      user?.first_name ||
      user?.firstName ||
      user?.last_name ||
      user?.lastName,
  );
  const needsInlineHydration =
    !isFormerUser && !isPrivateUser && Boolean(userId) && !hasDisplayableName;
  const { data: resolvedInlineProfile = null } = useUserProfile(userId, {
    enabled: needsInlineHydration,
  });

  if (!user) return null;

  // Determine if we can handle clicks
  const canClick =
    !isFormerUser &&
    !isPrivateUser &&
    userId &&
    (userModalContext || onOpenUser);
  const inlineUser = mergeInlineUserData(user, resolvedInlineProfile);
  const name = isFormerUser
    ? getDisplayName(inlineUser)
    : isPrivateUser
      ? "Private Profile"
      : displayName ?? getDisplayName(inlineUser);
  const showDemoIndicator =
    !isFormerUser &&
    !isPrivateUser &&
    Boolean(inlineUser?.is_synthetic || inlineUser?.isSynthetic);

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
        <Tooltip
          content={canClick ? "View profile" : null}
          wrapperClassName="inline-flex mr-1"
        >
          <UserAvatar
            user={inlineUser}
            deleted={isFormerUser}
            privateProfile={!isFormerUser && isPrivateUser}
            sizeClass={avatarSize}
            clickable={Boolean(canClick)}
            onClick={handleClick}
            iconSize={avatarSize === "w-4 h-4" ? 10 : 12}
            initialsClassName={
              avatarSize === "w-4 h-4"
                ? "text-[8px] font-medium"
                : "text-[10px] font-medium"
            }
            fallbackText={!isFormerUser && isPrivateUser ? "PP" : undefined}
          />
        </Tooltip>
      )}

      {/* Name */}
      <Tooltip
        content={canClick ? "View profile" : null}
        wrapperClassName="inline-flex min-w-0"
      >
        <span
          className={`font-medium truncate ${
            isFormerUser || isPrivateUser
              ? "text-base-content/50"
              : "text-base-content/80"
          } ${canClick ? "cursor-pointer hover:text-primary transition-colors" : ""}`}
          onClick={canClick ? handleClick : undefined}
        >
          {name}
        </span>
      </Tooltip>
      {showDemoIndicator && (
        <Tooltip
          content={DEMO_PROFILE_TOOLTIP}
          wrapperClassName="ml-1 flex items-center text-base-content/50"
        >
          <FlaskConical size={10} className="shrink-0" />
        </Tooltip>
      )}
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
