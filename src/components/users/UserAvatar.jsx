import React from "react";
import { User } from "lucide-react";
import { getUserInitials } from "../../utils/userHelpers";
import {
  getDisplayName,
  isDeletedUser,
  DELETED_USER_DISPLAY_NAME,
} from "../../utils/deletedUser";

const UserAvatar = ({
  user,
  deleted = false,
  sizeClass = "w-4 h-4",
  className = "",
  clickable = false,
  onClick,
  title,
  iconSize = 12,
  initialsClassName = "text-[10px] font-medium",
}) => {
  const isFormerUser = deleted || isDeletedUser(user);
  const avatarUrl =
    !isFormerUser && (user?.avatar_url || user?.avatarUrl || null);
  const displayName = getDisplayName(user, DELETED_USER_DISPLAY_NAME);

  return (
    <div
      className={`avatar ${
        clickable ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
      } ${className}`}
      onClick={clickable ? onClick : undefined}
      title={title}
    >
      <div className={`${sizeClass} rounded-full relative overflow-hidden`}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
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
          className={`avatar-fallback flex items-center justify-center w-full h-full rounded-full absolute inset-0 ${
            isFormerUser
              ? "bg-base-300 text-base-content/30"
              : "bg-primary text-primary-content"
          }`}
          style={{ display: avatarUrl ? "none" : "flex" }}
        >
          {isFormerUser ? (
            <User size={iconSize} />
          ) : (
            <span className={initialsClassName}>{getUserInitials(user)}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserAvatar;
