import { Link, useLocation, useNavigate } from "react-router-dom";
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import LomirLogo from "../../assets/images/Lomir-logowordmark-color.svg";
import { Bell, MessageCircle, Search } from "lucide-react";
import Colors from "../../utils/Colors";
import { getUserInitials } from "../../utils/userHelpers";
import { messageService } from "../../services/messageService";
import { notificationService } from "../../services/notificationService";
import socketService from "../../services/socketService";
import NotificationBadge from "../common/NotificationBadge";

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [imageError, setImageError] = useState(false);
  // Message notification state
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [firstUnreadMessage, setFirstUnreadMessage] = useState(null);

  // General notification state (invitations, applications, etc.)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [firstUnreadNotification, setFirstUnreadNotification] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  // Define Tailwind class strings using CSS variables for consistent colors
  const iconClasses =
    "text-[var(--color-primary)] hover:text-[var(--color-primary-focus)] hover:drop-shadow-neon transition duration-200";
  const navLinkClasses =
    "text-[var(--color-primary)] text-center border-2 border-transparent rounded-full px-2 py-1 transition-all duration-300";

  // Fetch unread message count
  const fetchUnreadMessageCount = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await messageService.getUnreadCount();
      setUnreadMessageCount(response.data?.count || 0);
      setFirstUnreadMessage(response.data?.firstUnread || null);
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
    } catch (error) {
      console.error("Error fetching unread notification count:", error);
    }
  }, [isAuthenticated]);

  // Initial fetch and socket setup for messages
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadMessageCount(0);
      setFirstUnreadMessage(null);
      return;
    }

    fetchUnreadMessageCount();

    // Set up socket listener for new messages
    const socket = socketService.getSocket();

    if (socket) {
      const handleNewMessage = (message) => {
        // Only increment if we're not currently in that conversation
        const currentPath = location.pathname;
        const currentConversationId = currentPath.startsWith("/chat/")
          ? currentPath.split("/chat/")[1]?.split("?")[0]
          : null;

        const messageConversationId =
          message.teamId ||
          message.team_id ||
          message.conversationId ||
          message.senderId;
        const isInThisConversation =
          currentConversationId &&
          String(currentConversationId) === String(messageConversationId);

        if (!isInThisConversation) {
          setUnreadMessageCount((prev) => prev + 1);
          // Set this as the first unread conversation
          const isTeamMessage = !!(message.teamId || message.team_id);
          setFirstUnreadMessage({
            conversationId: isTeamMessage
              ? message.teamId || message.team_id
              : message.conversationId || message.senderId,
            type: isTeamMessage ? "team" : "direct",
          });
        }
      };

      const handleMessagesRead = () => {
        // Refetch count when messages are marked as read
        fetchUnreadMessageCount();
      };

      socket.on("message:received", handleNewMessage);
      socket.on("messages:read", handleMessagesRead);

      return () => {
        socket.off("message:received", handleNewMessage);
        socket.off("messages:read", handleMessagesRead);
      };
    }
  }, [isAuthenticated, fetchUnreadMessageCount, location.pathname]);

  // Initial fetch and socket setup for notifications
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadNotificationCount(0);
      setFirstUnreadNotification(null);
      return;
    }

    fetchUnreadNotificationCount();

    // Set up socket listener for new notifications
    const socket = socketService.getSocket();

    if (socket) {
      const handleNewNotification = () => {
        // Refetch to get the latest count and firstUnread
        fetchUnreadNotificationCount();
      };

      socket.on("notification:new", handleNewNotification);

      return () => {
        socket.off("notification:new", handleNewNotification);
      };
    }
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
      fetchUnreadMessageCount();
    }
  }, [location.pathname, fetchUnreadMessageCount]);

  // Refetch notification count when on my-teams page (after viewing invitations/applications)
  useEffect(() => {
    if (location.pathname.startsWith("/teams/my-teams")) {
      const timer = setTimeout(() => {
        fetchUnreadNotificationCount();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, location.search, fetchUnreadNotificationCount]);

  // Handle notification badge click
  const handleNotificationClick = async () => {
    if (unreadNotificationCount > 0 && firstUnreadNotification) {
      // Mark this notification as read
      try {
        await notificationService.markAsRead(firstUnreadNotification.id);
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }

      // Navigate to the notification target
      navigate(firstUnreadNotification.navigateTo);

      // Refetch after a delay to get the NEXT unread notification
      setTimeout(() => {
        fetchUnreadNotificationCount();
      }, 1000);
    } else {
      // No unread notifications, go to my-teams page
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
            <nav>
              {isAuthenticated && (
                <div
                  onClick={handleNotificationClick}
                  className={`${iconClasses} cursor-pointer`}
                >
                  <NotificationBadge
                    variant="alert"
                    count={unreadNotificationCount}
                  >
                    <Bell size={22} strokeWidth={2.2} />
                  </NotificationBadge>
                </div>
              )}
            </nav>

            {/* Message Icon */}
            <nav>
              {isAuthenticated && (
                <div
                  onClick={handleMessageClick}
                  className={`${iconClasses} cursor-pointer`}
                >
                  <NotificationBadge
                    variant="message"
                    count={unreadMessageCount}
                  >
                    <MessageCircle size={22} strokeWidth={2.2} />
                  </NotificationBadge>
                </div>
              )}
            </nav>

            <Link to="/search" className={iconClasses}>
              <Search size={22} strokeWidth={2.2} />
            </Link>
          </div>

          {isAuthenticated && (
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
                <div className="rounded-full flex items-center justify-center text-sm sm:text-base">
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
                </div>
              </label>
              <ul
                tabIndex={0}
                className="mt-3 z-[1] p-2 shadow-lg glass-navbar menu menu-sm dropdown-content rounded-box w-30"
              >
                <li>
                  <Link to="/profile">Profile</Link>
                </li>
                <li>
                  <Link to="/settings">Settings</Link>
                </li>
                <li>
                  <button onClick={logout}>Logout</button>
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
