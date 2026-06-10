import React from "react";
import DemoAvatarOverlay from "../users/DemoAvatarOverlay";
import { getTeamInitials, isSyntheticTeam } from "../../utils/userHelpers";

const TeamAvatar = ({
  team,
  sizeClass = "w-14 h-14",
  className = "",
  clickable = false,
  onClick,
  title,
  initialsClassName = "text-xl font-medium",
  showDemoOverlay = false,
  demoOverlayTextClassName = "text-[8px]",
  demoOverlayTextTranslateClassName = "-translate-y-[2px]",
}) => {
  const avatarUrl =
    team?.teamavatar_url ||
    team?.teamavatarUrl ||
    team?.avatar_url ||
    team?.avatarUrl ||
    null;
  const teamName = team?.name || "Team";
  const showSyntheticOverlay = showDemoOverlay && isSyntheticTeam(team);

  return (
    <div
      className={`${clickable ? "cursor-pointer hover:opacity-80 transition-opacity" : ""} ${className}`}
      onClick={clickable ? onClick : undefined}
      title={title}
    >
      <div className={`${sizeClass} rounded-full relative overflow-hidden`}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={teamName}
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
          className="avatar-fallback bg-[var(--color-primary-focus)] text-primary-content flex items-center justify-center w-full h-full rounded-full absolute inset-0"
          style={{ display: avatarUrl ? "none" : "flex" }}
        >
          <span className={initialsClassName}>
            {getTeamInitials(team)}
          </span>
        </div>

        {showSyntheticOverlay && (
          <DemoAvatarOverlay
            textClassName={demoOverlayTextClassName}
            textTranslateClassName={demoOverlayTextTranslateClassName}
          />
        )}
      </div>
    </div>
  );
};

export default TeamAvatar;
