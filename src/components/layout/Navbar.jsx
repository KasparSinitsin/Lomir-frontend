import { Link, useLocation, useNavigate } from "react-router-dom";
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import LomirLogo from "../../assets/images/Lomir-logowordmark-color.svg";
import { Bell, MessageCircle, Search } from "lucide-react";
import Colors from "../../utils/Colors";
import { getUserInitials } from "../../utils/userHelpers";
import { messageService } from "../../services/messageService";
import socketService from "../../services/socketService";
import NotificationBadge from "../common/NotificationBadge";

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [imageError, setImageError] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [firstUnread, setFirstUnread] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Define Tailwind class strings using CSS variables for consistent colors
  const iconClasses =
    "text-[var(--color-primary)] hover:text-[var(--color-primary-focus)] hover:drop-shadow-neon transition duration-200";
  const navLinkClasses =
    "text-[var(--color-primary)] text-center border-2 border-transparent rounded-full px-2 py-1 transition-all duration-300";

  // Fetch unread message count
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await messageService.getUnreadCount();
      setUnreadCount(response.data?.count || 0);
      setFirstUnread(response.data?.firstUnread || null);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  }, [isAuthenticated]);

  // Initial fetch and socket setup
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      setFirstUnread(null);
      return;
    }

    fetchUnreadCount();

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
          setUnreadCount((prev) => prev + 1);
          // Set this as the first unread conversation
          const isTeamMessage = !!(message.teamId || message.team_id);
          setFirstUnread({
            conversationId: isTeamMessage
              ? message.teamId || message.team_id
              : message.conversationId || message.senderId,
            type: isTeamMessage ? "team" : "direct",
          });
        }
      };

      const handleMessagesRead = () => {
        // Refetch count when messages are marked as read
        fetchUnreadCount();
      };

      socket.on("message:received", handleNewMessage);
      socket.on("messages:read", handleMessagesRead);

      return () => {
        socket.off("message:received", handleNewMessage);
        socket.off("messages:read", handleMessagesRead);
      };
    }
  }, [isAuthenticated, fetchUnreadCount, location.pathname]);

  // Refetch when path changes (entering chat, changing conversations, or leaving chat)
  // Use a small delay when entering a chat conversation to allow messages to be marked as read first
  useEffect(() => {
    if (location.pathname.startsWith("/chat/")) {
      // When entering/changing a conversation, wait a moment for messages to be marked as read
      const timer = setTimeout(() => {
        fetchUnreadCount();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // When not in a specific conversation, refetch immediately
      fetchUnreadCount();
    }
  }, [location.pathname, fetchUnreadCount]);

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
            <nav>
              {isAuthenticated && (
                <div className={`${iconClasses} cursor-pointer`}>
                  <Bell size={22} strokeWidth={2.2} />
                </div>
              )}
            </nav>

            <nav>
              {isAuthenticated && (
                <div
                  onClick={() => {
                    // Navigate directly to the conversation with unread messages
                    if (unreadCount > 0 && firstUnread) {
                      navigate(
                        `/chat/${firstUnread.conversationId}?type=${firstUnread.type}`
                      );
                      // Refetch after a delay to get the NEXT unread conversation
                      // (allows time for current messages to be marked as read)
                      setTimeout(() => {
                        fetchUnreadCount();
                      }, 1000);
                    } else {
                      navigate("/chat");
                    }
                  }}
                  className={`${iconClasses} cursor-pointer`}
                >
                  <NotificationBadge variant="message" count={unreadCount}>
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
