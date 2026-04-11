import React, { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";
import { useUserModalSafe } from "../../contexts/UserModalContext";
import { userService } from "../../services/userService";
import Tooltip from "../common/Tooltip";
import { DEMO_PROFILE_TOOLTIP } from "../../utils/userHelpers";
import {
  getDisplayName,
  isDeletedUser,
} from "../../utils/deletedUser";
import UserAvatar from "./UserAvatar";

const inlineUserProfileCache = new Map();

const extractProfilePayload = (response) => {
  const payload = response?.data ?? response;

  if (!payload) return null;
  if (payload?.success !== undefined) return payload?.data ?? null;

  return payload?.data?.data ?? payload?.data ?? payload;
};

const getCachedInlineUserProfile = async (userId) => {
  const cacheKey = String(userId);

  if (inlineUserProfileCache.has(cacheKey)) {
    return inlineUserProfileCache.get(cacheKey);
  }

  const request = (async () => {
    const response = await userService.getUserById(userId);
    return extractProfilePayload(response);
  })();

  inlineUserProfileCache.set(cacheKey, request);

  try {
    const result = await request;
    inlineUserProfileCache.set(cacheKey, Promise.resolve(result));
    return result;
  } catch (error) {
    inlineUserProfileCache.delete(cacheKey);
    throw error;
  }
};

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
  const [resolvedInlineProfile, setResolvedInlineProfile] = useState(null);

  // Normalize user ID from various possible field names
  const userId = user?.id || user?.user_id || user?.userId;
  const isFormerUser = isDeletedUser(user);
  const hasInlineAvatar = Boolean(user?.avatar_url || user?.avatarUrl);
  const hasInlineSyntheticFlag =
    user?.is_synthetic != null || user?.isSynthetic != null;
  const needsInlineHydration =
    !isFormerUser && Boolean(userId) && (!hasInlineAvatar || !hasInlineSyntheticFlag);

  useEffect(() => {
    if (!needsInlineHydration) {
      setResolvedInlineProfile(null);
      return;
    }

    let cancelled = false;

    getCachedInlineUserProfile(userId)
      .then((profile) => {
        if (!cancelled) {
          setResolvedInlineProfile(profile);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedInlineProfile(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [needsInlineHydration, userId]);

  if (!user) return null;

  // Determine if we can handle clicks
  const canClick = !isFormerUser && userId && (userModalContext || onOpenUser);
  const inlineUser = mergeInlineUserData(user, resolvedInlineProfile);
  const name = getDisplayName(inlineUser) || "Unknown";
  const showDemoIndicator = !isFormerUser && Boolean(inlineUser?.is_synthetic || inlineUser?.isSynthetic);

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
          user={inlineUser}
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
