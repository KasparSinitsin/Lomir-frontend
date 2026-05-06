import { Link, useLocation, useNavigate } from "react-router-dom";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import LomirLogo from "../../assets/images/Lomir-logowordmark-color.svg";
import { Bell, MessageCircle, Search, User, Settings, LogOut } from "lucide-react";
import Colors from "../../utils/Colors";
import DemoAvatarOverlay from "../users/DemoAvatarOverlay";
import { getUserInitials, isSyntheticUser } from "../../utils/userHelpers";
import { messageService } from "../../services/messageService";
import { notificationService } from "../../services/notificationService";
import socketService from "../../services/socketService";
import NotificationBadge from "../common/NotificationBadge";
import {
  getMessageConversationTarget,
  isMessageForCurrentChatPath,
  isOwnMessage,
} from "../../utils/messageNotificationUtils";

const buildMessageTooltip = (count, teamCount, senderCount) => {
  if (!count) return undefined;
  const msg = `${count} unread message${count !== 1 ? "s" : ""}`;
  const parts = [];
  if (teamCount > 0) parts.push(`in ${teamCount} team${teamCount !== 1 ? "s" : ""}`);
  if (senderCount > 0) parts.push(`from ${senderCount} person${senderCount !== 1 ? "s" : ""}`);
  return parts.length ? `${msg}\n${parts.join(" and ")}` : msg;
};

const buildNotificationTooltip = (count, types) => {
  if (!count || !types) return undefined;
  const p = (n, s) => `${n} ${s}${n !== 1 ? "s" : ""}`;
  const lines = [
    types.invitationReceived && `${p(types.invitationReceived, "team invitation")} for you`,
    types.applicationReceived && `${p(types.applicationReceived, "team application")} to review`,
    types.applicationApproved && `${p(types.applicationApproved, "team")} joined successfully`,
    types.applicationRejected && `${p(types.applicationRejected, "team application")} rejected`,
    types.badgeAwarded && `${p(types.badgeAwarded, "new badge award")} for you`,
    types.memberJoined && `${p(types.memberJoined, "new member")} joined your team${types.memberJoined !== 1 ? "s" : ""}`,
    types.memberLeft && `${p(types.memberLeft, "member")} left your team${types.memberLeft !== 1 ? "s" : ""}`,
    types.memberRemoved && `Removed from ${p(types.memberRemoved, "team")}`,
    types.roleChanged && `${p(types.roleChanged, "role change")} in your team${types.roleChanged !== 1 ? "s" : ""}`,
    types.ownershipTransferred && `${p(types.ownershipTransferred, "ownership transfer")}`,
    types.teamDeleted && `${p(types.teamDeleted, "team")} deleted`,
    types.invitationDeclined && `${p(types.invitationDeclined, "invitation")} declined`,
    types.invitationCancelled && `${p(types.invitationCancelled, "invitation")} cancelled`,
    types.applicationCancelled && `${p(types.applicationCancelled, "application")} cancelled`,
  ].filter(Boolean);
  return lines.length ? lines.join("\n") : `${p(count, "notification")}`;
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

  // Initial fetch and socket setup for messages
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

    let detachSocketListeners = null;

    const attachSocketListeners = (socket) => {
      if (!socket) return;

      if (detachSocketListeners) {
        detachSocketListeners();
      }

      const handleNewMessage = (message) => {
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
      };

      const handleMessagesRead = () => {
        fetchUnreadMessageCount();
      };

      const handleMessageDeleted = () => {
        fetchUnreadMessageCount();
      };

      socket.on("message:received", handleNewMessage);
      socket.on("messages:read", handleMessagesRead);
      socket.on("message:deleted", handleMessageDeleted);

      detachSocketListeners = () => {
        socket.off("message:received", handleNewMessage);
        socket.off("messages:read", handleMessagesRead);
        socket.off("message:deleted", handleMessageDeleted);
      };
    };

    const unsubscribeSocketReady = socketService.onSocketReady(attachSocketListeners);

    return () => {
      unsubscribeSocketReady();
      if (detachSocketListeners) {
        detachSocketListeners();
      }
    };
  }, [isAuthenticated, fetchUnreadMessageCount, user?.id]);

  // Initial fetch and socket setup for notifications
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadNotificationCount(0);
      setFirstUnreadNotification(null);
      setNotificationTypeCounts({});
      return;
    }

    lastNotificationFetchRef.current = Date.now();
    fetchUnreadNotificationCount();

    let detachNotificationListener = null;

    const attachNotificationListener = (socket) => {
      if (!socket) return;

      if (detachNotificationListener) {
        detachNotificationListener();
      }

      const handleNewNotification = () => {
        // Refetch to get the latest count and firstUnread
        fetchUnreadNotificationCount();
      };

      socket.on("notification:new", handleNewNotification);
      socket.on("notification:updated", handleNewNotification);
      socket.on("notification:deleted", handleNewNotification);

      detachNotificationListener = () => {
        socket.off("notification:new", handleNewNotification);
        socket.off("notification:updated", handleNewNotification);
        socket.off("notification:deleted", handleNewNotification);
      };
    };

    const unsubscribeSocketReady = socketService.onSocketReady(attachNotificationListener);

    return () => {
      unsubscribeSocketReady();
      if (detachNotificationListener) {
        detachNotificationListener();
      }
    };
  }, [isAuthenticated, fetchUnreadNotificationCount]);

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
                  count={unreadNotificationCount}
                  title={buildNotificationTooltip(unreadNotificationCount, notificationTypeCounts)}
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
                  title={buildMessageTooltip(unreadMessageCount, messageTeamCount, messageSenderCount)}
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
                  {(user.avatarUrl || user.avatar_url) && !imageError ? (
                    <img
                      src={user.avatarUrl || user.avatar_url}
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
