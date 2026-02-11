import React from "react";
import { getUserInitials, getDisplayName } from "../../utils/userHelpers";

/**
 * Renders: "Label (avatar) Full Name" as a single reusable clickable user link.
 *
 * Props:
 * - user: user-ish object (id, first/last, avatar_url, etc.)
 * - label: optional string prefix ("Awarded by", "Invite sent by", ...)
 * - onOpenUser: function(userId) -> opens user details modal
 * - avatarSize: tailwind size class for avatar circle (default: w-4 h-4)
 * - textClassName: optional text styling
 */
const InlineUserLink = ({
  user,
  label,
  onOpenUser,
  avatarSize = "w-4 h-4",
  textClassName = "font-medium text-base-content/80 hover:text-primary",
  className = "",
}) => {
  if (!user) return null;

  const userId = user?.id || user?.user_id || user?.userId;
  const avatarUrl = user?.avatar_url || user?.avatarUrl || null;
  const name = getDisplayName(user) || "Unknown";

  const handleClick = (e) => {
    // Important if this sits inside another clickable card
    e.stopPropagation();
    if (userId && onOpenUser) onOpenUser(userId);
  };

  return (
    <div className={`flex items-center text-xs text-base-content/60 ${className}`}>
      {label ? <span className="mr-1">{label}</span> : null}

      {/* Avatar */}
      <div
        className="avatar cursor-pointer hover:opacity-80 transition-opacity mr-1"
        onClick={handleClick}
        title="View profile"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" ? handleClick(e) : null)}
      >
        <div className={`${avatarSize} rounded-full relative`}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="object-cover w-full h-full rounded-full"
              onError={(e) => {
                e.target.style.display = "none";
                const fallback =
                  e.target.parentElement.querySelector(".avatar-fallback");
                if (fallback) fallback.style.display = "flex";
              }}
            />
          ) : null}

          <div
            className="avatar-fallback bg-primary text-primary-content flex items-center justify-center w-full h-full rounded-full absolute inset-0"
            style={{
              display: avatarUrl ? "none" : "flex",
              fontSize: "8px",
            }}
          >
            <span className="font-medium">{getUserInitials(user)}</span>
          </div>
        </div>
      </div>

      {/* Name */}
      <span
        className={`cursor-pointer transition-colors ${textClassName}`}
        onClick={handleClick}
        title="View profile"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" ? handleClick(e) : null)}
      >
        {name}
      </span>
    </div>
  );
};

export default InlineUserLink;
