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
import ListViewRow from "../common/ListViewRow";
import MatchScoreOverlay from "../common/MatchScoreOverlay";
import MatchScoreSubtitle from "../common/MatchScoreSubtitle";
import { getMatchTier, getMatchTooltipText } from "../../utils/matchScoreUtils";
import { getResultMatchScore } from "../../utils/teamMatchUtils";
import { extractNames, summarizeList } from "../../utils/listSummaryUtils";
import {
  formatListLocation,
  formatLocation,
  normalizeLocationData,
} from "../../utils/locationUtils";

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
      isFromSearch: true,
      showMatchHighlights,
      matchScore: rawScore,
      matchType: user.matchType ?? user.match_type ?? null,
      matchDetails: user.matchDetails ?? user.match_details ?? null,
      distanceKm: user.distanceKm ?? user.distance_km ?? null,
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

    matchTooltipText = getMatchTooltipText(matchTier, matchDetails, {
      breakdownLabel: matchType === "role_match" ? "role match" : "match",
    });

    const iconSizeSubtitle =
      viewMode === "list" ? 9 : viewMode === "mini" ? 10 : 13;
    scoreSubtitleItem = (
      <MatchScoreSubtitle
        matchTier={matchTier}
        tooltipText={matchTooltipText}
        iconSize={iconSizeSubtitle}
      />
    );

    const badgeSize =
      viewMode === "list"
        ? "w-[14px] h-[14px]"
        : "w-5 h-5";
    const badgeIconSize =
      viewMode === "list" ? 7 : 10;
    matchOverlay = (
      <MatchScoreOverlay
        matchTier={matchTier}
        tooltipText={matchTooltipText}
        sizeClassName={badgeSize}
        iconSize={badgeIconSize}
        positionClassName="absolute -top-0.5 -left-0.5 z-10"
      />
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
  const userLocation = normalizeLocationData(user);
  const locationText =
    user.is_remote || user.isRemote
      ? "Remote"
      : formatLocation(userLocation, {
          displayType: "short",
          showState: true,
          showCountry: true,
          showCountryCode: viewMode !== "card" && viewMode !== "mini",
        });

  const demoAvatarOverlay = isSyntheticUser(user) ? (
    <DemoAvatarOverlay viewMode={viewMode} />
  ) : null;

  // ============ LIST VIEW ============
  if (viewMode === "list") {
    const { short: listLocationTextShort, full: listLocationText } =
      formatListLocation(user, {
        isRemote: user.is_remote || user.isRemote,
      });

    const distance = user.distanceKm ?? user.distance_km;
    const showDistance = distance != null && distance < 999999 && !(user.is_remote || user.isRemote);

    const tagNames = extractNames(user.tags);
    const { summary: tagsSummary, tooltip: tagsTooltip } =
      summarizeList(tagNames);

    const badgeNames = extractNames(user.badges);
    const { summary: badgesSummary, tooltip: badgesTooltip } =
      summarizeList(badgeNames);

    const listSubtitle = (
      scoreSubtitleItem ||
      user.username ||
      isSyntheticUser(user) ||
      shouldShowVisibilityIcon()
    ) ? (
      <span className="flex min-w-0 flex-nowrap items-center gap-1 overflow-hidden text-base-content/60">
        {scoreSubtitleItem && <span className="flex-shrink-0">{scoreSubtitleItem}</span>}
        {user.username && <span className="truncate min-w-0">@{user.username}</span>}
        {shouldShowVisibilityIcon() && (
          <Tooltip content={isUserProfilePublic() ? "Public Profile - visible for everyone" : "Private Profile - only visible for you"}>
            {isUserProfilePublic() ? (
              <Eye size={9} className="text-green-600" />
            ) : (
              <EyeClosed size={9} className="text-gray-500" />
            )}
          </Tooltip>
        )}
        {isSyntheticUser(user) && (
          <Tooltip
            content={DEMO_PROFILE_TOOLTIP}
            wrapperClassName="flex items-center whitespace-nowrap text-base-content/50"
          >
            <FlaskConical size={9} className="flex-shrink-0" />
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
        <ListViewRow
          locationText={listLocationTextShort}
          locationTooltip={listLocationText}
          isRemote={user.is_remote || user.isRemote}
          distance={showDistance ? Math.round(distance) : null}
          tagsSummary={tagsSummary}
          tagsTooltip={tagsTooltip}
          badgesSummary={badgesSummary}
          badgesTooltip={badgesTooltip}
        />
      </Card>
    );
  }

  // ============ CARD / MINI CARD VIEW ============
  return (
    <Card
      title={displayName()}
      subtitle={
        <span
          className={`mt-0.5 flex max-h-[2.75em] items-center flex-wrap overflow-hidden leading-[110%] text-base-content/70 ${viewMode === "mini" ? "text-xs gap-x-1 gap-y-px w-full" : "text-sm gap-x-1.5 gap-y-px"}`}
        >
          {scoreSubtitleItem}
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
                  size={viewMode === "mini" ? 10 : 13}
                  className="text-green-600"
                />
              ) : (
                <EyeClosed
                  size={viewMode === "mini" ? 10 : 13}
                  className="text-gray-500"
                />
              )}
            </Tooltip>
          )}
          {viewMode === "mini" &&
            !activeFilters.showLocation &&
            locationText && (
              <span className="flex items-start">
                {user.is_remote || user.isRemote ? (
                  <Globe size={10} className="mr-0.5 flex-shrink-0 mt-0.5" />
                ) : (
                  <MapPin size={10} className="mr-0.5 flex-shrink-0 mt-0.5" />
                )}
                <span>
                  {locationText}
                </span>
              </span>
            )}
          {isSyntheticUser(user) && (
            <Tooltip
              content={DEMO_PROFILE_TOOLTIP}
              wrapperClassName="flex items-center gap-1 text-base-content/50"
            >
              <FlaskConical
                size={viewMode === "mini" ? 10 : 13}
                className="flex-shrink-0"
              />
            </Tooltip>
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
          ? "!p-4 sm:!p-5 !pb-4 sm:!pb-5"
          : ""
      }
      imageWrapperClassName={viewMode === "mini" ? "mb-0 pb-0" : ""}
      titleClassName={
        viewMode === "mini" ? "text-base mb-0 leading-[110%]" : ""
      }
      marginClassName="mb-0"
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
        distance={user.distanceKm ?? user.distance_km}
        tags={viewMode === "mini" && !activeFilters.showTags ? null : user.tags}
        badges={
          viewMode === "mini" && !activeFilters.showBadges ? null : user.badges
        }
        hideLocation={viewMode === "mini" && !activeFilters.showLocation}
        compact={viewMode === "mini"}
        showCountryCode={viewMode !== "card" && viewMode !== "mini"}
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
