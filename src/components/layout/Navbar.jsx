import { Link, useLocation, useNavigate } from "react-router-dom";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import LomirLogo from "../../assets/images/Lomir-logowordmark-color.svg";
import {
  AlertTriangle,
  Award,
  Bell,
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

const buildNotificationTooltip = (count, types, teamCounts) => {
  if (!count || !types) return undefined;
  const p = (n, s) => `${n} ${s}${n !== 1 ? "s" : ""}`;
  const typeCount = (...keys) =>
    keys.reduce((sum, key) => sum + (Number(types[key]) || 0), 0);
  const typeTeamCount = (...keys) =>
    keys.reduce((max, key) => Math.max(max, Number(teamCounts?.[key]) || 0), 0);

  const lines = NOTIFICATION_TYPE_META.map(({ keys, Icon, text }) => {
    const n = typeCount(...keys);
    const tc = typeTeamCount(...keys);
    return n ? { Icon, label: text(p, n, tc) } : null;
  }).filter(Boolean);

  if (!lines.length) return `${p(count, "notification")}`;

  return (
    <div className="flex flex-col gap-1">
      {lines.map(({ Icon, label }, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Icon size={11} strokeWidth={2.5} className="flex-shrink-0 opacity-70" />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
};

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

  // Fetch unread notification count
  const fetchUnreadNotificationCount = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await notificationService.getUnreadCount();
      setUnreadNotificationCount(response.data?.count || 0);
      setFirstUnreadNotification(response.data?.firstUnread || null);
      setNotificationTypeCounts(response.data?.typeCounts || {});
      setNotificationTypeTeamCounts(response.data?.typeTeamCounts || {});
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

  return (
    <div className="navbar glass-navbar sticky top-0 z-10">
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
                  count={unreadNotificationCount - messageMentionNotificationCount}
                  title={buildNotificationTooltip(unreadNotificationCount - messageMentionNotificationCount, notificationTypeCounts, notificationTypeTeamCounts)}
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
                  title={buildMessageTooltip(unreadMessageCount, messageTeamCount, messageSenderCount, messageMentionNotificationCount)}
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
              {isAuthenticated && (
                <>
                  {/* <Link to="/garden" className={`${navLinkClasses} neon`}>Garden</Link>
                <Link to="/badges" className={`${navLinkClasses} neon`}>Badges</Link> */}
                </>
              )}
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
