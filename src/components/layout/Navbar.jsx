import { Link, useLocation, useNavigate } from "react-router-dom";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import LomirLogo from "../../assets/images/Lomir-logowordmark-color.svg";
import {
  AlertTriangle,
  Award,
  Bell,
  CheckCheck,
  CircleX,
  Crown,
  LogOut,
  Mail,
  MessageCircle,
  Pencil,
  Search,
  Settings,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  UserSearch,
} from "lucide-react";
import Colors from "../../utils/Colors";
import DemoAvatarOverlay from "../users/DemoAvatarOverlay";
import { getUserInitials, isSyntheticUser } from "../../utils/userHelpers";
import { messageService } from "../../services/messageService";
import { notificationService } from "../../services/notificationService";
import useSocketEvents from "../../hooks/useSocketEvents";
import NotificationBadge from "../common/NotificationBadge";
import {
  getMessageConversationTarget,
  isMessageForCurrentChatPath,
  isOwnMessage,
} from "../../utils/messageNotificationUtils";

const buildMessageTooltip = (count, teamCount, senderCount, mentionCount) => {
  if (!count && !mentionCount) return undefined;
  const parts = [];
  if (count) {
    parts.push(`${count} unread message${count !== 1 ? "s" : ""}`);
    if (teamCount > 0) parts.push(`in ${teamCount} team${teamCount !== 1 ? "s" : ""}`);
    if (senderCount > 0) parts.push(`from ${senderCount} person${senderCount !== 1 ? "s" : ""}`);
  }
  if (mentionCount) parts.push(`${mentionCount} mention${mentionCount !== 1 ? "s" : ""}`);
  return parts.join("\n");
};

// tc = number of distinct teams for this notification type
const teamSuffix = (tc) => tc > 1 ? ` in ${tc} teams` : "";
const inYourTeam = (tc) => tc > 1 ? `in ${tc} of your teams` : "in one of your teams";
const yourTeams = (tc) => tc > 1 ? `in ${tc} of your teams` : "one of your teams";

const NOTIFICATION_TYPE_META = [
  { keys: ["invitationReceived", "invitation_received"],             Icon: Mail,          text: (p, n, tc) => `${p(n, "team invitation")} for you${teamSuffix(tc)}` },
  { keys: ["roleInvitation", "role_invitation"],                     Icon: UserSearch,    text: (p, n, tc) => `${p(n, "role invitation")} for you${teamSuffix(tc)}` },
  { keys: ["roleApplicationDeferredInvite", "role_application_deferred_invite"], Icon: UserSearch, text: (p, n, tc) => `${p(n, "role offer")} created${teamSuffix(tc)}` },
  { keys: ["roleAssigned", "role_assigned"],                         Icon: UserCheck,     text: (p, n, tc) => `${p(n, "role assignment")} ${inYourTeam(tc)}` },
  { keys: ["invitationAccepted", "invitation_accepted"],             Icon: UserCheck,     text: (p, n, tc) => `${p(n, "invitation")} accepted${teamSuffix(tc)}` },
  { keys: ["applicationReceived", "application_received"],           Icon: Mail,          text: (p, n, tc) => `${p(n, "team application")} to review${teamSuffix(tc)}` },
  { keys: ["applicationApproved", "application_approved"],           Icon: UserPlus,      text: (p, n, tc) => `${p(n, "team")} joined successfully${teamSuffix(tc)}` },
  { keys: ["applicationRejected", "application_rejected"],           Icon: CircleX,       text: (p, n, tc) => `Your team application${n !== 1 ? `s (${n})` : ""} rejected${teamSuffix(tc)}` },
  { keys: ["badgeAwarded", "badge_awarded"],                         Icon: Award,         text: (p, n)     => `${p(n, "new badge award")} for you` },
  { keys: ["memberJoined", "member_joined"],                         Icon: UserPlus,      text: (p, n, tc) => `${p(n, "new member")} joined ${yourTeams(tc)}` },
  { keys: ["memberLeft", "member_left"],                             Icon: LogOut,        text: (p, n, tc) => `${p(n, "member")} left ${yourTeams(tc)}` },
  { keys: ["memberRemoved", "member_removed"],                       Icon: UserMinus,     text: (p, n, tc) => `Removed from ${tc > 1 ? `${tc} of your teams` : "a team"}` },
  { keys: ["roleChanged", "role_changed"],                           Icon: Pencil,        text: (p, n, tc) => `${p(n, "role change")} ${inYourTeam(tc)}` },
  { keys: ["roleCreated", "role_created"],                           Icon: UserSearch,    text: (p, n, tc) => `${p(n, "new role")} opened ${inYourTeam(tc)}` },
  { keys: ["roleUpdated", "role_updated"],                           Icon: Pencil,        text: (p, n, tc) => `${n} role${n !== 1 ? "s" : ""} edited ${inYourTeam(tc)}` },
  { keys: ["roleDeleted", "role_deleted"],                           Icon: UserMinus,     text: (p, n, tc) => `${p(n, "role")} deleted ${inYourTeam(tc)}` },
  { keys: ["roleClosed", "role_closed"],                             Icon: CircleX,       text: (p, n, tc) => `${p(n, "role")} closed ${inYourTeam(tc)}` },
  { keys: ["roleFilled", "role_filled"],                             Icon: UserCheck,     text: (p, n, tc) => `${p(n, "role")} filled ${inYourTeam(tc)}` },
  { keys: ["roleReopened", "role_reopened", "role_reopened_admin"],  Icon: UserSearch,    text: (p, n, tc) => `${p(n, "role")} reopened ${inYourTeam(tc)}` },
  { keys: ["ownershipTransferred", "ownership_transferred"],         Icon: Crown,         text: (p, n)     => `${p(n, "ownership transfer")}` },
  { keys: ["teamDeleted", "team_deleted"],                           Icon: AlertTriangle, text: (p, n)     => `${p(n, "team")} deleted` },
  { keys: ["invitationDeclined", "invitation_declined"],             Icon: CircleX,       text: (p, n, tc) => `Your invitation${n !== 1 ? `s (${n})` : ""} declined${teamSuffix(tc)}` },
  { keys: ["invitationCancelled", "invitation_cancelled"],           Icon: CircleX,       text: (p, n, tc) => `Your invitation${n !== 1 ? `s (${n})` : ""} cancelled${teamSuffix(tc)}` },
  { keys: ["applicationCancelled", "application_cancelled"],               Icon: CircleX,       text: (p, n, tc) => `${p(n, "team application")} withdrawn${teamSuffix(tc)}` },
  { keys: ["roleApplicationCancelled", "role_application_cancelled"],      Icon: CircleX,       text: (p, n, tc) => `${p(n, "role application")} withdrawn${teamSuffix(tc)}` },
  { keys: ["roleStatusChangedApplicant", "role_status_changed_applicant"], Icon: Pencil,        text: (p, n)     => `${p(n, "role")} you applied for changed` },
  { keys: ["roleStatusChangedInvitee",   "role_status_changed_invitee"],   Icon: Pencil,        text: (p, n)     => `${p(n, "role")} you were invited to changed` },
];

const buildNotificationTooltip = (count, types, teamCounts, onGroupClick) => {
  if (!count || !types) return undefined;
  const p = (n, s) => `${n} ${s}${n !== 1 ? "s" : ""}`;
  const typeCount = (...keys) =>
    keys.reduce((sum, key) => sum + (Number(types[key]) || 0), 0);
  const typeTeamCount = (...keys) =>
    keys.reduce((max, key) => Math.max(max, Number(teamCounts?.[key]) || 0), 0);

  const lines = NOTIFICATION_TYPE_META.map(({ keys, Icon, text }) => {
    const n = typeCount(...keys);
    const tc = typeTeamCount(...keys);
    return n ? { keys, Icon, label: text(p, n, tc) } : null;
  }).filter(Boolean);

  if (!lines.length) return `${p(count, "notification")}`;

  // Each type-group is a button: clicking it jumps to that group's oldest unread
  // notification. Hover shifts to the lighter primary green.
  return (
    <div className="flex flex-col gap-0.5">
      {lines.map(({ keys, Icon: NotificationIcon, label }, i) => (
        <button
          key={i}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onGroupClick?.(keys);
          }}
          className="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-[var(--color-primary-focus)] transition-colors hover:text-[var(--color-primary)]"
        >
          {React.createElement(NotificationIcon, {
            size: 11,
            strokeWidth: 2.5,
            className: "flex-shrink-0 opacity-70",
          })}
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
};

// Wraps a badge's tooltip summary with a clickable "Mark all as read" action at
// the top. The tooltip must be interactive (pointer-events enabled) for this.
const withMarkAllRead = (summary, onMarkAll) => (
  <div className="flex min-w-[150px] flex-col">
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onMarkAll();
      }}
      className="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left font-semibold text-[var(--color-primary-focus)] transition-colors hover:text-[var(--color-primary)]"
    >
      <CheckCheck size={12} strokeWidth={2.5} className="flex-shrink-0" />
      <span>Mark all as read</span>
    </button>
    <div className="mt-2 border-t border-base-300 pt-2">
      {typeof summary === "string" ? (
        <span className="whitespace-pre-line">{summary}</span>
      ) : (
        summary
      )}
    </div>
  </div>
);

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [imageError, setImageError] = useState(false);
  // Message notification state
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [firstUnreadMessage, setFirstUnreadMessage] = useState(null);
  const [messageTeamCount, setMessageTeamCount] = useState(0);
  const [messageSenderCount, setMessageSenderCount] = useState(0);

  // General notification state (invitations, applications, etc.)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [firstUnreadNotification, setFirstUnreadNotification] = useState(null);
  const [notificationTypeCounts, setNotificationTypeCounts] = useState({});
  const [notificationTypeTeamCounts, setNotificationTypeTeamCounts] = useState({});
  // Oldest unread notification per type ({ [type]: { id, createdAt, navigateTo } }),
  // so a tooltip type-group can jump straight to its oldest entry.
  const [notificationTypeFirstUnread, setNotificationTypeFirstUnread] = useState(
    {},
  );
  const location = useLocation();
  const navigate = useNavigate();
  const lastMessageFetchRef = useRef(0);
  const lastNotificationFetchRef = useRef(0);
  const locationPathRef = useRef(location.pathname);
  const locationSearchRef = useRef(location.search);

  // Define Tailwind class strings using CSS variables for consistent colors
  const iconClasses =
    "inline-flex items-center text-[var(--color-primary)] hover:text-[var(--color-primary-focus)] hover:drop-shadow-neon transition duration-200";
  const navLinkClasses =
    "text-[var(--color-primary)] text-center border-2 border-transparent rounded-full px-2 py-1 transition-all duration-300";
  const messageMentionNotificationCount =
    notificationTypeCounts.messageMention ||
    notificationTypeCounts.message_mention ||
    0;
  // The bell badge excludes @mentions (those surface on the chat icon).
  const bellNotificationCount =
    unreadNotificationCount - messageMentionNotificationCount;
  // The chat icon has something to clear when there are unread messages or
  // pending @mention alerts.
  const hasChatActivity =
    unreadMessageCount > 0 || messageMentionNotificationCount > 0;

  // Fetch unread message count
  const fetchUnreadMessageCount = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await messageService.getUnreadCount();
      setUnreadMessageCount(response.data?.count ?? response.count ?? 0);
      setFirstUnreadMessage(response.data?.firstUnread ?? response.firstUnread ?? null);
      setMessageTeamCount(response.data?.teamCount ?? 0);
      setMessageSenderCount(response.data?.senderCount ?? 0);
    } catch (error) {
      console.error("Error fetching unread message count:", error);
    }
  }, [isAuthenticated]);

  // Fetch unread notification count. The response also carries the oldest
  // unread notification per type, which feeds the per-group navigation targets
  // in the bell tooltip.
  const fetchUnreadNotificationCount = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await notificationService.getUnreadCount();
      setUnreadNotificationCount(response.data?.count || 0);
      setFirstUnreadNotification(response.data?.firstUnread || null);
      setNotificationTypeCounts(response.data?.typeCounts || {});
      setNotificationTypeTeamCounts(response.data?.typeTeamCounts || {});
      setNotificationTypeFirstUnread(response.data?.typeFirstUnread || {});
    } catch (error) {
      console.error("Error fetching unread notification count:", error);
    }
  }, [isAuthenticated]);

  const throttledMessageFetch = useCallback(() => {
    const now = Date.now();
    if (now - lastMessageFetchRef.current > 30000) {
      lastMessageFetchRef.current = now;
      fetchUnreadMessageCount();
    }
  }, [fetchUnreadMessageCount]);

  const throttledNotificationFetch = useCallback(() => {
    const now = Date.now();
    if (now - lastNotificationFetchRef.current > 30000) {
      lastNotificationFetchRef.current = now;
      fetchUnreadNotificationCount();
    }
  }, [fetchUnreadNotificationCount]);

  useEffect(() => {
    locationPathRef.current = location.pathname;
    locationSearchRef.current = location.search;
  }, [location.pathname, location.search]);

  // Initial fetch for messages
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadMessageCount(0);
      setFirstUnreadMessage(null);
      setMessageTeamCount(0);
      setMessageSenderCount(0);
      return;
    }

    lastMessageFetchRef.current = Date.now();
    fetchUnreadMessageCount();
  }, [isAuthenticated, fetchUnreadMessageCount, user?.id]);

  const handleNewMessage = useCallback((message) => {
    if (isOwnMessage(message, user?.id)) return;

    const isInThisConversation = isMessageForCurrentChatPath(
      message,
      locationPathRef.current,
      locationSearchRef.current,
      user?.id,
    );

    if (!isInThisConversation) {
      setUnreadMessageCount((prev) => prev + 1);
      setFirstUnreadMessage(getMessageConversationTarget(message, user?.id));
    }
  }, [user?.id]);

  useSocketEvents(
    isAuthenticated
      ? {
          "message:received": handleNewMessage,
          "messages:read": fetchUnreadMessageCount,
          "message:deleted": fetchUnreadMessageCount,
        }
      : null,
    [isAuthenticated, handleNewMessage, fetchUnreadMessageCount],
  );

  // Initial fetch for notifications
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadNotificationCount(0);
      setFirstUnreadNotification(null);
      setNotificationTypeCounts({});
      setNotificationTypeTeamCounts({});
      setNotificationTypeFirstUnread({});
      return;
    }

    lastNotificationFetchRef.current = Date.now();
    fetchUnreadNotificationCount();
  }, [isAuthenticated, fetchUnreadNotificationCount]);

  const handleNewNotification = useCallback(() => {
    // Team events often create both a bell notification and a system chat
    // message, so refresh both badge sources.
    fetchUnreadNotificationCount();
    fetchUnreadMessageCount();
  }, [fetchUnreadMessageCount, fetchUnreadNotificationCount]);

  useSocketEvents(
    isAuthenticated
      ? {
          "notification:new": handleNewNotification,
          "notification:updated": handleNewNotification,
          "notification:deleted": handleNewNotification,
        }
      : null,
    [isAuthenticated, handleNewNotification],
  );

  // Refetch message count when path changes
  useEffect(() => {
    if (location.pathname.startsWith("/chat/")) {
      // When entering/changing a conversation, wait a moment for messages to be marked as read
      const timer = setTimeout(() => {
        fetchUnreadMessageCount();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // When not in a specific conversation, refetch immediately
      throttledMessageFetch();
    }
  }, [location.pathname, fetchUnreadMessageCount, throttledMessageFetch]);

  // Refetch notification count when on my-teams page (after viewing invitations/applications)
  useEffect(() => {
    if (location.pathname.startsWith("/teams/my-teams")) {
      const timer = setTimeout(() => {
        throttledNotificationFetch();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, location.search, throttledNotificationFetch]);

  // Handle notification badge click
  const handleNotificationClick = async () => {
    // Always fetch fresh data before navigating so we never land on a deleted entity
    let freshFirst = null;
    try {
      const response = await notificationService.getUnreadCount();
      const fresh = response.data;
      setUnreadNotificationCount(fresh?.count || 0);
      setFirstUnreadNotification(fresh?.firstUnread || null);
      setNotificationTypeCounts(fresh?.typeCounts || {});
      setNotificationTypeTeamCounts(fresh?.typeTeamCounts || {});
      freshFirst = fresh?.firstUnread || null;
    } catch (error) {
      console.error("Error fetching notifications:", error);
      // Fall back to cached state on error
      freshFirst = firstUnreadNotification;
    }

    if (freshFirst) {
      try {
        await notificationService.markAsRead(freshFirst.id);
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }

      const canNavigate =
        freshFirst.referenceId != null && Boolean(freshFirst.navigateTo);

      if (canNavigate) {
        navigate(freshFirst.navigateTo);
      } else {
        navigate("/teams/my-teams");
      }

      // Refetch after navigation to update the badge to the next unread
      setTimeout(() => {
        fetchUnreadNotificationCount();
      }, 1000);
    } else {
      navigate("/teams/my-teams");
    }
  };

  // Handle message badge click
  const handleMessageClick = () => {
    if (unreadMessageCount > 0 && firstUnreadMessage) {
      navigate(
        `/chat/${firstUnreadMessage.conversationId}?type=${firstUnreadMessage.type}`
      );
      // Refetch after a delay to get the NEXT unread conversation
      setTimeout(() => {
        fetchUnreadMessageCount();
      }, 1000);
    } else {
      navigate("/chat");
    }
  };

  // Mark all general (bell) notifications as read. Clears the badge + tooltip
  // optimistically, then persists; re-syncs from the server on failure.
  const handleMarkAllNotificationsRead = useCallback(async () => {
    setUnreadNotificationCount(0);
    setFirstUnreadNotification(null);
    setNotificationTypeCounts({});
    setNotificationTypeTeamCounts({});
    setNotificationTypeFirstUnread({});
    try {
      await notificationService.markAllAsRead();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      fetchUnreadNotificationCount();
    }
  }, [fetchUnreadNotificationCount]);

  // Click a tooltip type-group: jump to its OLDEST unread notification, mark it
  // read (so the group counter drops by one), and step to the next-oldest on the
  // next click. Optimistic; reconciles with the server after navigation.
  const handleNotificationGroupClick = useCallback(
    async (keys) => {
      // A group can span several types (e.g. role_reopened + role_reopened_admin);
      // pick the oldest entry across the ones present.
      const target = keys
        .map((key) =>
          notificationTypeFirstUnread[key]
            ? { type: key, ...notificationTypeFirstUnread[key] }
            : null,
        )
        .filter(Boolean)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )[0];

      if (!target) {
        // Map is stale (nothing left for this group locally) — refresh and let
        // the user click again.
        fetchUnreadNotificationCount();
        return;
      }

      // Optimistically drop this one so the counter falls and a quick repeat
      // click does not re-target the same (now read) notification.
      setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
      setNotificationTypeCounts((prev) => {
        const current = Number(prev[target.type]) || 0;
        if (current <= 0) return prev;
        return { ...prev, [target.type]: current - 1 };
      });
      setNotificationTypeFirstUnread((prev) => {
        if (!prev[target.type]) return prev;
        const next = { ...prev };
        delete next[target.type];
        return next;
      });

      try {
        await notificationService.markAsRead(target.id);
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }

      navigate(target.navigateTo || "/teams/my-teams");

      // Reconcile counts + per-type targets with the server (repopulates the
      // next-oldest for this type) once navigation settles.
      setTimeout(() => {
        fetchUnreadNotificationCount();
      }, 1000);
    },
    [notificationTypeFirstUnread, navigate, fetchUnreadNotificationCount],
  );

  // Mark every conversation (direct + team) as read, plus @mention alerts. The
  // backend also emits messages:read-all so the chat page's conversation list
  // clears. We drop the local badge/tooltip immediately for instant feedback.
  const handleMarkAllMessagesRead = useCallback(async () => {
    setUnreadMessageCount(0);
    setFirstUnreadMessage(null);
    setMessageTeamCount(0);
    setMessageSenderCount(0);
    // The mention line on the chat tooltip is fed by notification counts; drop
    // it locally too (the backend marks those notifications read).
    setNotificationTypeCounts((prev) => {
      if (!prev.messageMention && !prev.message_mention) return prev;
      const next = { ...prev };
      delete next.messageMention;
      delete next.message_mention;
      return next;
    });
    setNotificationTypeFirstUnread((prev) => {
      if (!prev.message_mention) return prev;
      const next = { ...prev };
      delete next.message_mention;
      return next;
    });
    try {
      await messageService.markAllAsRead();
    } catch (error) {
      console.error("Error marking all messages as read:", error);
      fetchUnreadMessageCount();
      fetchUnreadNotificationCount();
    }
  }, [fetchUnreadMessageCount, fetchUnreadNotificationCount]);

  // z-30 keeps the navbar above page content, which sits at z-20 and below,
  // while staying under the tooltip layer (40/41 in index.css) and modals
  // (50+), both of which have to cover it.
  return (
    <div className="navbar glass-navbar sticky top-0 z-30">
      <div className="content-container flex justify-between items-center w-full">
        {/* Logo - Left aligned */}
        <div className="flex-none">
          <Link to="/" className="flex items-center">
            <img src={LomirLogo} alt="Lomir Logo" className="h-6 sm:h-8 mr-2" />
          </Link>
        </div>

        {/* Navigation & Auth - Right aligned */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-4">
            {/* Notification Bell */}
            {isAuthenticated && (
              <div
                onClick={handleNotificationClick}
                className={`${iconClasses} cursor-pointer`}
              >
                <NotificationBadge
                  variant="alert"
                  count={bellNotificationCount}
                  interactive={bellNotificationCount > 0}
                  title={
                    bellNotificationCount > 0
                      ? withMarkAllRead(
                          buildNotificationTooltip(
                            bellNotificationCount,
                            notificationTypeCounts,
                            notificationTypeTeamCounts,
                            handleNotificationGroupClick,
                          ),
                          handleMarkAllNotificationsRead,
                        )
                      : undefined
                  }
                >
                  <Bell size={22} strokeWidth={2.2} />
                </NotificationBadge>
              </div>
            )}

            {/* Message Icon */}
            {isAuthenticated && !location.pathname.startsWith("/chat") && (
              <div
                onClick={handleMessageClick}
                className={`${iconClasses} cursor-pointer`}
              >
                <NotificationBadge
                  variant="message"
                  count={unreadMessageCount}
                  interactive={hasChatActivity}
                  title={
                    hasChatActivity
                      ? withMarkAllRead(
                          buildMessageTooltip(
                            unreadMessageCount,
                            messageTeamCount,
                            messageSenderCount,
                            messageMentionNotificationCount,
                          ),
                          handleMarkAllMessagesRead,
                        )
                      : undefined
                  }
                >
                  <MessageCircle size={22} strokeWidth={2.2} />
                </NotificationBadge>
              </div>
            )}

            {!location.pathname.startsWith("/search") && (
              <Link to="/search" className={iconClasses}>
                <Search size={22} strokeWidth={2.2} />
              </Link>
            )}
          </div>

          {isAuthenticated && !location.pathname.startsWith("/teams/my-teams") && (
            <nav className="flex space-x-1 text-sm sm:text-base">
              <Link to="/teams/my-teams" className={`${navLinkClasses} neon`}>
                My Teams
              </Link>
            </nav>
          )}

          {isAuthenticated ? (
            <div className="dropdown dropdown-end">
              <label
                tabIndex={0}
                className="btn btn-circle avatar bg-primary text-white btn-sm sm:btn-md"
              >
                <div className="rounded-full flex items-center justify-center text-sm sm:text-base relative overflow-hidden w-full h-full">
                  {user.avatarUrl && !imageError ? (
                    <img
                      src={user.avatarUrl}
                      alt="Profile"
                      className="rounded-full object-cover w-full h-full"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <span>{getUserInitials(user)}</span>
                  )}
                  {isSyntheticUser(user) && (
                    <DemoAvatarOverlay textClassName="text-[7px]" />
                  )}
                </div>
              </label>
              <ul
                tabIndex={0}
                className="mt-3 z-[1] p-2 menu menu-sm dropdown-content w-auto profile-dropdown"
              >
                <li>
                  <Link to="/profile">Profile<User size={12} /></Link>
                </li>
                <li>
                  <Link to="/settings">Settings<Settings size={12} /></Link>
                </li>
                <li>
                  <button onClick={logout}>Logout<LogOut size={12} /></button>
                </li>
              </ul>
            </div>
          ) : (
            <div className="flex space-x-4">
              <Link to="/login" className="neon btn-outline btn-sm">
                Login
              </Link>
              <Link to="/register" className="neon btn-sm">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
