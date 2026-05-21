import React, { useRef, useLayoutEffect, useState, useEffect } from "react";
import { Calendar, MapPin, FlaskConical } from "lucide-react";
import { format } from "date-fns";
import Tooltip from "./Tooltip";
import {
  DEMO_PROFILE_TOOLTIP,
  getUserInitials,
  isSyntheticUser,
} from "../../utils/userHelpers";
import DemoAvatarOverlay from "../users/DemoAvatarOverlay";
import { formatDisplayName } from "../../utils/nameFormatters";

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
}) => {
  // ============ Helper Functions ============

  // Get avatar URL - handles both snake_case and camelCase
  const getAvatarUrl = () => {
    if (!user) return null;
    return user.avatar_url || user.avatarUrl || null;
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
  const showUsername =
    user?.username &&
    (getDisplayName() !== user.username || isSyntheticUser(user));
  const showDemoProfile = isSyntheticUser(user);

  // ============ Adaptive name (full → abbreviated → CSS truncate) ============
  const nameContainerRef = useRef(null);
  const probeRef = useRef(null);
  const dateRef = useRef(null);
  const fullName = getDisplayName();
  const abbrevName = user ? formatDisplayName(user) : fullName;
  const [displayedName, setDisplayedName] = useState(fullName);
  const displayedNameRef = useRef(fullName);
  displayedNameRef.current = displayedName;
  const forceNarrowRef = useRef(forceNarrow);
  forceNarrowRef.current = forceNarrow;

  useLayoutEffect(() => {
    if (fullName === abbrevName) { setDisplayedName(fullName); return; }
    const container = nameContainerRef.current;
    const probe = probeRef.current;
    if (!container || !probe) return;
    const update = () => {
      // Date is absolute (out of flow) when either this card or any sibling card is narrow.
      // Subtract its width + gap back so the measurement is always against the same
      // effective width, preventing oscillation.
      const isDateAbsolute = displayedNameRef.current !== fullName || forceNarrowRef.current;
      const dateEl = dateRef.current;
      const dateReservedWidth = isDateAbsolute && dateEl ? dateEl.offsetWidth + 16 : 0; // 16 = space-x-4 gap
      probe.textContent = fullName;
      setDisplayedName(probe.scrollWidth <= container.clientWidth - dateReservedWidth ? fullName : abbrevName);
    };
    const ro = new ResizeObserver(update);
    ro.observe(container);
    update();
    return () => ro.disconnect();
  }, [fullName, abbrevName]);

  const isNarrow = displayedName !== fullName;
  const dateIsNarrow = isNarrow || forceNarrow;

  // Report narrow state to parent for cross-card sync
  useEffect(() => { onNarrowChange?.(isNarrow); }, [isNarrow]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============ Render ============

  return (
    <div className="bg-base-200/30 rounded-lg border border-base-300 p-4">
      {/* User Info Header */}
      <div className="flex items-start space-x-4 mb-4 relative">
        {/* Avatar */}
        <Tooltip
          content={clickable ? "View profile" : undefined}
          wrapperClassName={`avatar ${clickableStyles}`}
        >
          <div className="w-12 h-12 rounded-full relative overflow-hidden" onClick={handleUserClick}>
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
              className="avatar-fallback bg-[var(--color-primary-focus)] text-primary-content flex items-center justify-center w-full h-full rounded-full absolute inset-0"
              style={{
                display: getAvatarUrl() ? "none" : "flex",
              }}
            >
              <span className="text-xl font-medium">
                {getUserInitials(user)}
              </span>
            </div>
            {isSyntheticUser(user) && <DemoAvatarOverlay textClassName="text-[8px]" />}
          </div>
        </Tooltip>

        {/* Name and Details */}
        <div className="flex-1 min-w-0">
          <h4 ref={nameContainerRef} className="font-medium text-base-content leading-[120%] mb-[0.2em] truncate relative">
            {clickable ? (
              <Tooltip content="View profile" wrapperClassName="cursor-pointer hover:text-primary transition-colors">
                <span onClick={handleUserClick}>{displayedName}</span>
              </Tooltip>
            ) : (
              displayedName
            )}
            <span ref={probeRef} className="invisible absolute whitespace-nowrap pointer-events-none left-0 top-0 font-medium" aria-hidden="true" />
          </h4>

          {(dateIsNarrow || showUsername || (showLocation && (user?.city || user?.country || getPostalCode())) || sublineExtra || showDemoProfile) && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0 overflow-hidden text-xs" style={{ maxHeight: "2.1em" }}>
              {dateIsNarrow ? (
                <div className="flex shrink-0 items-center gap-1 text-base-content/60">
                  <Calendar size={10} className="shrink-0" />
                  <span className="leading-[1.05] whitespace-nowrap">{formatDate()}</span>
                </div>
              ) : showUsername && (
                clickable ? (
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
              {showLocation && (user?.city || user?.country || getPostalCode()) && (
                <div className="flex min-w-0 max-w-[calc(100%-1.5rem)] flex-[0_1_auto] items-center gap-1 overflow-hidden">
                  <MapPin size={10} className="text-base-content/60 shrink-0" />
                  <span className="min-w-0 truncate text-base-content/60 leading-[1.05]">
                    {[user?.city, user?.country].filter(Boolean).join(", ") || getPostalCode()}
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

        {/* Date - top right; absolute (out of flow) when narrow so subline gets full width,
            but still rendered so its width can be measured for stable name-fit calculation */}
        <div
          ref={dateRef}
          className={`flex items-center text-xs text-base-content/60 flex-shrink-0${dateIsNarrow ? " absolute opacity-0 pointer-events-none" : ""}`}
        >
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
