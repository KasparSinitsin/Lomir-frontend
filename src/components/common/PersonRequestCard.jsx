import React, { useRef, useLayoutEffect, useState, useEffect } from "react";
import { Calendar, MapPin, FlaskConical } from "lucide-react";
import { format } from "date-fns";
import Tooltip from "./Tooltip";
import {
  DEMO_PROFILE_TOOLTIP,
  getDisplayName as getUserDisplayName,
  isSyntheticUser,
} from "../../utils/userHelpers";
import UserAvatar from "../users/UserAvatar";
import { formatDisplayName } from "../../utils/nameFormatters";
import { formatListLocation } from "../../utils/locationUtils";
import { isPrivateProfileUser } from "../../utils/teamRequestUtils";

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
 * @param {React.ReactNode} props.messageBubbleExtra - Extra content rendered inside the speech bubble, after the message text (e.g., a role card)
 * @param {React.ReactNode} props.sublineExtra - Extra content rendered in the subline row, before the demo badge (e.g., a "Team member" badge)
 * @param {React.ReactNode} props.footerLeft - Content for the left side of the footer (e.g., inviter info)
 * @param {boolean} props.clickable - Whether user elements are clickable (default: true)
 * @param {boolean} props.showLocation - Whether to show location info (default: true)
 * @param {boolean} props.privateProfile - Whether to render this user as a private profile
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
  messageBubbleExtra,
  sublineExtra,
  footerLeft,
  clickable = true,
  showLocation = true,
  onNarrowChange,
  forceNarrow = false,
  privateProfile,
}) => {
  // ============ Helper Functions ============
  const isPrivateUser = privateProfile ?? isPrivateProfileUser(user);
  const displayUser = isPrivateUser
    ? {
        ...(user ?? {}),
        first_name: "Private",
        firstName: "Private",
        last_name: "Profile",
        lastName: "Profile",
        username: null,
        avatar_url: null,
        avatarUrl: null,
        is_public: false,
        isPublic: false,
        is_private: true,
        isPrivate: true,
      }
    : user;
  const effectiveClickable = clickable && !isPrivateUser;

  // Get display name
  const getDisplayName = () => {
    if (isPrivateUser) return "Private Profile";

    const displayName = getUserDisplayName(user);
    return displayName === "Unknown" ? "Unknown User" : displayName;
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
    if (effectiveClickable && onUserClick && user?.id) {
      onUserClick(user.id);
    }
  };

  // Clickable styles
  const clickableStyles = effectiveClickable
    ? "cursor-pointer hover:opacity-80 transition-opacity"
    : "";

  const showUsername =
    !isPrivateUser &&
    user?.username &&
    (getDisplayName() !== user.username || isSyntheticUser(user));
  const showDemoProfile = !isPrivateUser && isSyntheticUser(user);

  // ============ Adaptive name (full → abbreviated → CSS truncate) ============
  const nameContainerRef = useRef(null);
  const probeRef = useRef(null);
  const dateRef = useRef(null);
  const fullName = getDisplayName();
  const abbrevName = displayUser ? formatDisplayName(displayUser) : fullName;
  const hasLocation =
    !isPrivateUser &&
    (user?.city || user?.country || getPostalCode());
  const [displayedName, setDisplayedName] = useState(fullName);
  const [isOverflow, setIsOverflow] = useState(false);
  const isOverflowRef = useRef(false);
  isOverflowRef.current = isOverflow;
  const forceNarrowRef = useRef(forceNarrow);
  forceNarrowRef.current = forceNarrow;

  useLayoutEffect(() => {
    const container = nameContainerRef.current;
    const probe = probeRef.current;
    if (!container || !probe) return;
    const update = () => {
      // Date is absolute (out of flow) when either this card or any sibling card is narrow.
      // Subtract its width + gap back so the measurement is always against the same
      // effective width, preventing oscillation.
      const isDateAbsolute = isOverflowRef.current || forceNarrowRef.current;
      const dateEl = dateRef.current;
      const dateReservedWidth = isDateAbsolute && dateEl ? dateEl.offsetWidth + 16 : 0;
      probe.textContent = fullName;
      const overflows = probe.scrollWidth > container.clientWidth - dateReservedWidth;
      setIsOverflow(overflows);
      setDisplayedName(overflows && fullName !== abbrevName ? abbrevName : fullName);
    };
    const ro = new ResizeObserver(update);
    ro.observe(container);
    update();
    return () => ro.disconnect();
  }, [fullName, abbrevName]);

  const isNarrow = isOverflow;
  const dateIsNarrow = isOverflow || forceNarrow;

  // Report narrow state to parent for cross-card sync
  useEffect(() => { onNarrowChange?.(isNarrow); }, [isNarrow]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============ Render ============

  return (
    <div className="bg-base-200/30 rounded-lg border border-base-300 p-4">
      {/* User Info Header */}
      <div className="relative flex items-start justify-between gap-4 mb-4">
        <div className="flex min-w-0 flex-1 items-start space-x-4">
          {/* Avatar */}
          <Tooltip
            content={effectiveClickable ? "View profile" : undefined}
            wrapperClassName={`avatar ${clickableStyles}`}
          >
            <UserAvatar
              user={displayUser}
              sizeClass="w-12 h-12"
              initialsClassName="text-xl font-medium"
              clickable={effectiveClickable}
              onClick={handleUserClick}
              privateProfile={isPrivateUser}
              showDemoOverlay={showDemoProfile}
              demoOverlayTextClassName="text-[8px]"
            />
          </Tooltip>

          {/* Name and Details */}
          <div className="flex-1 min-w-0">
            <h4 ref={nameContainerRef} className="font-medium text-base-content leading-[120%] mb-[0.2em] truncate relative">
              {effectiveClickable ? (
                <Tooltip content="View profile" wrapperClassName="cursor-pointer hover:text-primary transition-colors">
                  <span onClick={handleUserClick}>{displayedName}</span>
                </Tooltip>
              ) : (
                displayedName
              )}
              <span ref={probeRef} className="invisible absolute whitespace-nowrap pointer-events-none left-0 top-0 font-medium" aria-hidden="true" />
            </h4>

            {(showUsername || dateIsNarrow || (showLocation && hasLocation) || sublineExtra || showDemoProfile) && (
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0 overflow-hidden text-xs" style={{ maxHeight: "2.1em" }}>
                {showUsername && (
                  effectiveClickable ? (
                    <div className="min-w-0 flex-[0_1_auto] overflow-hidden">
                      <Tooltip content="View profile" wrapperClassName="block truncate leading-[1.05] text-base-content/70 cursor-pointer hover:text-primary transition-colors">
                        <span onClick={handleUserClick}>@{user.username}</span>
                      </Tooltip>
                    </div>
                  ) : (
                    <div className="min-w-0 flex-[0_1_auto] overflow-hidden">
                      <span className="block truncate leading-[1.05] text-base-content/70">@{user.username}</span>
                    </div>
                  )
                )}
                {dateIsNarrow && (
                  <div className="flex shrink-0 items-center gap-1 text-base-content/60">
                    <Calendar size={10} className="shrink-0" />
                    <span className="leading-[1.05] whitespace-nowrap">{formatDate()}</span>
                  </div>
                )}
                {showLocation && hasLocation && (
                  <div className="flex min-w-0 max-w-[calc(100%-1.5rem)] flex-[0_1_auto] items-center gap-1 overflow-hidden">
                    <MapPin size={10} className="text-base-content/60 shrink-0" />
                    <span className="min-w-0 truncate text-base-content/60 leading-[1.05]">
                      {formatListLocation(user, { isRemote: user?.is_remote || user?.isRemote }).short || getPostalCode()}
                    </span>
                  </div>
                )}
                {sublineExtra}
                {showDemoProfile && (
                  <Tooltip
                    content={DEMO_PROFILE_TOOLTIP}
                    wrapperClassName="flex shrink-0 items-center gap-0.5 text-base-content/50"
                  >
                    <FlaskConical size={10} className="flex-shrink-0" />
                  </Tooltip>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Date - top right; absolute (out of flow) when narrow so subline gets full width,
            but still rendered so its width can be measured for stable name-fit calculation */}
        <div
          ref={dateRef}
          className={`flex items-center text-xs text-base-content/60 whitespace-nowrap flex-shrink-0${dateIsNarrow ? " absolute opacity-0 pointer-events-none" : ""}`}
        >
          <Calendar size={12} className="mr-1" />
          <span>{formatDate()}</span>
        </div>
      </div>

      {/* Bio if available */}
      {!isPrivateUser && user?.bio && (
        <div className="mb-5 text-sm text-base-content/80">
          <p className="line-clamp-2">{user.bio}</p>
        </div>
      )}

      {/* Message bubble */}
      {(message || messageBubbleExtra) && (
        <div className="mb-5">
          {message && (
            <p className="text-xs text-base-content/60 mb-1 flex items-center">
              {messageIcon}
              {messageLabel}
            </p>
          )}
          <div className="w-fit max-w-full bg-base-200 rounded-lg rounded-bl-none p-3">
            {message && (
              <p className="text-sm text-base-content/90">{message}</p>
            )}
            {messageBubbleExtra && (
              <div className={`max-w-[300px] ${message ? "mt-3" : ""}`}>
                {messageBubbleExtra}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Extra content slot (e.g., tags, response textarea) */}
      {extraContent}

      {/* Footer with optional left content and actions */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-8 -mx-4 -mb-4 px-4 pb-4 pt-3 border-t border-base-200 bg-base-100/80 rounded-b-lg">
        {/* Left side (e.g., inviter info) */}
        {footerLeft}

        {/* Right side - action buttons */}
        {actions && <div className="ml-auto">{actions}</div>}
      </div>
    </div>
  );
};

export default PersonRequestCard;
