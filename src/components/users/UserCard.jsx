import React from "react";
import Card from "../common/Card";
import Button from "../common/Button";
import Tooltip from "../common/Tooltip";
import {
  Eye,
  EyeClosed,
  MapPin,
  Globe,
  Tag,
  Award,
  Ruler,
  User,
  FlaskConical,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useUserModal } from "../../contexts/UserModalContext";
import {
  DEMO_PROFILE_TOOLTIP,
  getUserInitials,
  isSyntheticUser,
} from "../../utils/userHelpers";
import DemoAvatarOverlay from "./DemoAvatarOverlay";
import LocationDistanceTagsRow from "../common/LocationDistanceTagsRow";
import SearchResultTypeOverlay from "../common/SearchResultTypeOverlay";
import { getMatchTier } from "../../utils/matchScoreUtils";
import { getResultMatchScore } from "../../utils/teamMatchUtils";

/**
 * UserCard Component
 *
 * Displays a user card in search results.
 * Uses UserModalContext for opening user details modals, ensuring proper
 * z-index stacking with other modals throughout the app.
 */
const UserCard = ({
  user,
  roleMatchTagIds,
  roleMatchBadgeNames,
  roleMatchName = null,
  roleMatchMaxDistanceKm = null,
  invitationPrefillTeamId = null,
  invitationPrefillRoleId = null,
  invitationPrefillTeamName = null,
  invitationPrefillRoleName = null,
  showMatchHighlights = false,
  showMatchScore = false,
  viewMode = "card",
  activeFilters = {},
  showSearchResultTypeOverlay = false,
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
    const rawScore = showMatchScore ? getResultMatchScore(user) : null;
    openUserModal(user.id, {
      roleMatchTagIds,
      roleMatchBadgeNames,
      roleMatchName,
      roleMatchMaxDistanceKm,
      showMatchHighlights,
      matchScore: rawScore,
      matchType: user.matchType ?? user.match_type ?? null,
      matchDetails: user.matchDetails ?? user.match_details ?? null,
      distanceKm: user.distance_km ?? user.distanceKm ?? null,
      invitationPrefillTeamId,
      invitationPrefillRoleId,
      invitationPrefillTeamName,
      invitationPrefillRoleName,
    });
  };

  // ============ MATCH SCORE ============
  const rawScore = showMatchScore ? getResultMatchScore(user) : null;
  const showScore = showMatchScore && rawScore != null;

  let matchTier = null;
  let matchOverlay = null;
  let scoreSubtitleItem = null;
  let matchTooltipText = null;

  if (showScore) {
    matchTier = getMatchTier(rawScore);

    const matchType = user.matchType ?? user.match_type;
    const matchDetails = user.matchDetails ?? user.match_details;

    if (matchType === "role_match" && matchDetails) {
      const tagPct = Math.round(
        (matchDetails.tagScore ?? matchDetails.tag_score ?? 0) * 100,
      );
      const badgePct = Math.round(
        (matchDetails.badgeScore ?? matchDetails.badge_score ?? 0) * 100,
      );
      const distPct = Math.round(
        (matchDetails.distanceScore ?? matchDetails.distance_score ?? 0) * 100,
      );
      matchTooltipText = `${matchTier.pct}% role match — Tags ${tagPct}% · Badges ${badgePct}% · Location ${distPct}%`;
    } else if (matchDetails) {
      const sharedTags =
        matchDetails.sharedTagCount ?? matchDetails.shared_tag_count ?? 0;
      const sharedBadges =
        matchDetails.sharedBadgeCount ?? matchDetails.shared_badge_count ?? 0;
      matchTooltipText = `${matchTier.pct}% profile match — ${sharedTags} shared tags, ${sharedBadges} shared badges`;
    } else {
      matchTooltipText = `${matchTier.pct}% profile match`;
    }

    const iconSizeSubtitle =
      viewMode === "list" ? 10 : viewMode === "mini" ? 11 : 12;
    scoreSubtitleItem = (
      <Tooltip content={matchTooltipText}>
        <span className="flex items-center gap-0.5">
          <matchTier.Icon size={iconSizeSubtitle} className={matchTier.text} />
          <span className="text-base-content">{matchTier.pct}%</span>
        </span>
      </Tooltip>
    );

    const badgeSize =
      viewMode === "list"
        ? "w-[14px] h-[14px]"
        : "w-5 h-5";
    const badgeIconSize =
      viewMode === "list" ? 7 : 10;
    matchOverlay = (
      <div
        className={`absolute -top-0.5 -left-0.5 rounded-full ring-2 ring-white flex items-center justify-center ${matchTier.bg} ${badgeSize}`}
      >
        <matchTier.Icon size={badgeIconSize} className="text-white" strokeWidth={2.5} />
      </div>
    );
  }

  const avatarOverlay = showSearchResultTypeOverlay ? (
    <SearchResultTypeOverlay
      icon={User}
      bgClassName={matchTier?.bg ?? "bg-success"}
      tooltip="Person"
      viewMode={viewMode}
    />
  ) : (
    matchOverlay
  );
  const demoAvatarOverlay = isSyntheticUser(user) ? (
    <DemoAvatarOverlay
      textClassName={
        viewMode === "list"
          ? "text-[5px]"
          : viewMode === "mini"
            ? "text-[9px]"
            : "text-[10px]"
      }
      textTranslateClassName={viewMode === "list" ? "-translate-y-px" : undefined}
    />
  ) : null;

  // ============ LIST VIEW ============
  if (viewMode === "list") {
    const locationText =
      user.is_remote || user.isRemote
        ? "Remote"
        : [user.city, user.country].filter(Boolean).join(", ");
    const distance = user.distance_km ?? user.distanceKm;
    const showDistance = distance != null && distance < 999999 && !(user.is_remote || user.isRemote);

    const tagNames = (user.tags || [])
      .map((t) => (typeof t === "string" ? t : t.name || t.tag || ""))
      .filter(Boolean);
    const maxInlineTags = 3;
    const visibleTags = tagNames.slice(0, maxInlineTags);
    const remainingTags = tagNames.length - maxInlineTags;
    const tagsSummary =
      visibleTags.length > 0
        ? visibleTags.join(", ") + (remainingTags > 0 ? ` +${remainingTags}` : "")
        : "";

    const badgeNames = (user.badges || [])
      .map((b) => b.name || "")
      .filter(Boolean);
    const maxInlineBadges = 3;
    const visibleBadges = badgeNames.slice(0, maxInlineBadges);
    const remainingBadges = badgeNames.length - maxInlineBadges;
    const badgesSummary =
      visibleBadges.length > 0
        ? visibleBadges.join(", ") + (remainingBadges > 0 ? ` +${remainingBadges}` : "")
        : "";

    const listSubtitle = (
      scoreSubtitleItem ||
      user.username ||
      isSyntheticUser(user) ||
      shouldShowVisibilityIcon()
    ) ? (
      <span className="flex min-w-0 flex-nowrap items-center gap-1 overflow-hidden whitespace-nowrap text-base-content/60">
        {scoreSubtitleItem}
        {user.username && <span>@{user.username}</span>}
        {isSyntheticUser(user) && (
          <Tooltip
            content={DEMO_PROFILE_TOOLTIP}
            wrapperClassName="flex items-center gap-0.5 whitespace-nowrap text-base-content/50"
          >
            <FlaskConical className="h-[11px] w-auto flex-shrink-0" />
            <span>Demo</span>
          </Tooltip>
        )}
        {shouldShowVisibilityIcon() && (
          <Tooltip content={isUserProfilePublic() ? "Public Profile - visible for everyone" : "Private Profile - only visible for you"}>
            {isUserProfilePublic() ? (
              <Eye size={11} className="text-green-600" />
            ) : (
              <EyeClosed size={11} className="text-gray-500" />
            )}
          </Tooltip>
        )}
      </span>
    ) : null;

    return (
      <Card
        title={displayName()}
        subtitle={listSubtitle}
        image={getProfileImage()}
        imageFallback={getUserInitials(user)}
        imageAlt={`${user.username || "User"}'s profile`}
        onClick={openUserDetails}
        viewMode="list"
        className=""
        clickTooltip="Click to view User details"
        imageOverlay={avatarOverlay}
        imageInnerOverlay={demoAvatarOverlay}
      >
        <div className="w-56 flex-shrink-0 flex items-center gap-3 overflow-hidden">
          <div className="w-16 flex-shrink-0 overflow-hidden">
            {showDistance && (
              <div className="text-xs text-base-content flex items-center gap-1 overflow-hidden">
                <Tooltip content={`${Math.round(distance)} km away from you`}>
                  <div className="flex items-center gap-1">
                    <Ruler size={11} className="flex-shrink-0" />
                    <span className="whitespace-nowrap">{Math.round(distance)} km</span>
                  </div>
                </Tooltip>
              </div>
            )}
          </div>
          {locationText && (
            <div className="min-w-0 text-xs text-base-content/60 flex items-center gap-1 overflow-hidden">
              <Tooltip content={locationText}>
                <div className="flex items-center gap-1 overflow-hidden">
                  {user.is_remote || user.isRemote ? (
                    <Globe size={11} className="flex-shrink-0" />
                  ) : (
                    <MapPin size={11} className="flex-shrink-0" />
                  )}
                  <span className="truncate">{locationText}</span>
                </div>
              </Tooltip>
            </div>
          )}
        </div>
        <div className="w-52 flex-shrink-0 text-xs text-base-content/60 hidden sm:flex items-center gap-1 overflow-hidden">
          {tagsSummary && (
            <Tooltip content={tagNames.join(", ")} wrapperClassName="flex items-center gap-1 min-w-0 overflow-hidden w-full">
              <Tag size={11} className="flex-shrink-0" />
              <span className="truncate">{tagsSummary}</span>
            </Tooltip>
          )}
        </div>
        <div className="w-48 flex-shrink-0 text-xs text-base-content/60 hidden sm:flex items-center gap-1 overflow-hidden">
          {badgesSummary && (
            <Tooltip content={badgeNames.join(", ")} wrapperClassName="flex items-center gap-1 min-w-0 overflow-hidden w-full">
              <Award size={11} className="flex-shrink-0" />
              <span className="truncate">{badgesSummary}</span>
            </Tooltip>
          )}
        </div>
      </Card>
    );
  }

  // ============ CARD / MINI CARD VIEW ============
  return (
    <Card
      title={displayName()}
      subtitle={
        <span
          className={`flex items-center flex-wrap leading-snug text-base-content/70 ${viewMode === "mini" ? "text-xs gap-x-1 gap-y-px w-full" : "text-sm gap-x-1.5 gap-y-px"}`}
        >
          {scoreSubtitleItem}
          {user.username && <span>@{user.username}</span>}
          {isSyntheticUser(user) && (
            <Tooltip
              content={DEMO_PROFILE_TOOLTIP}
              wrapperClassName="flex items-start text-base-content/50"
            >
              <FlaskConical
                className={`w-auto mr-0.5 flex-shrink-0 ${viewMode === "mini" ? "h-3 mt-px" : "h-[13px] mt-px"}`}
              />
              <span className="leading-[1.15]">
                {viewMode === "mini" ? "Demo" : "Demo Profile"}
              </span>
            </Tooltip>
          )}
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
            (user.is_remote || user.isRemote || user.city || user.country) && (
              <span className="flex items-start">
                {user.is_remote || user.isRemote ? (
                  <Globe size={12} className="mr-0.5 flex-shrink-0 mt-0.5" />
                ) : (
                  <MapPin size={12} className="mr-0.5 flex-shrink-0 mt-0.5" />
                )}
                <span>
                  {user.is_remote || user.isRemote
                    ? "Remote"
                    : [user.city, user.country].filter(Boolean).join(", ")}
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
      clickTooltip="Click to view User details"
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
      imageOverlay={avatarOverlay}
      imageInnerOverlay={demoAvatarOverlay}
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
