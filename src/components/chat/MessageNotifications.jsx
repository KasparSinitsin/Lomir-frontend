import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  CircleX,
  Clock,
  Crown,
  FileText,
  LogOut,
  MessageCircle,
  Pencil,
  Shield,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  UserSearch,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import socketService from '../../services/socketService';
import { messageService } from '../../services/messageService';
import { useAuth } from '../../contexts/AuthContext';
import { getEventPreview } from '../../utils/eventPreview';
import {
  getMessageSenderDisplayName,
  getMessageConversationTarget,
  getMessagePreviewText,
  isMessageForCurrentChatPath,
  isOwnMessage,
} from '../../utils/messageNotificationUtils';

const EVENT_PREVIEW_ICONS = {
  AlertTriangle,
  CircleX,
  Crown,
  FileText,
  LogOut,
  Pencil,
  Shield,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  UserSearch,
};

const NOTIFICATION_VISIBLE_MS = 20000;
const NOTIFICATION_FADE_MS = 700;

const EVENT_CONTENT_KEYS = [
  "content",
  "message",
  "text",
  "body",
  "lastMessage",
  "last_message",
  "latestMessage",
  "latest_message",
];

const pickEventContent = (message) => {
  for (const key of EVENT_CONTENT_KEYS) {
    const value = message?.[key];
    if (typeof value === "string" && value.trim()) return value;
    if (value && typeof value === "object") {
      const nested = pickEventContent(value);
      if (nested) return nested;
    }
  }

  return "";
};

const getFallbackRoleEventPreview = (content) => {
  const text = String(content || "");
  const actorCreatedRoleMatch = text.match(
    /^(.+?)\s+created\s+(?:a\s+)?(?:new\s+)?role:\s*(.+)$/i,
  );

  if (actorCreatedRoleMatch) {
    const roleName = actorCreatedRoleMatch[2]?.trim() || "Vacant Role";
    return {
      text: `New role ${roleName} created.`,
      icon: "UserSearch",
      color: "#f59e0b",
      roleName,
      senderPrefix: "by ",
    };
  }

  const previewPhraseMatch = text.match(
    /^(New role open|Vacant role created|Role updated|Role edited|Role removed|Role deleted|Role closed|Role reopened):\s*(.+)$/i,
  );

  if (previewPhraseMatch) {
    const label = previewPhraseMatch[1].toLowerCase();
    const roleName = previewPhraseMatch[2]?.trim() || "Vacant Role";
    const icon =
      label === "role updated" || label === "role edited"
        ? "Pencil"
        : label === "role removed" || label === "role deleted"
          ? "UserMinus"
          : label === "role closed"
            ? "CircleX"
            : "UserSearch";

    return {
      text:
        label === "role updated" || label === "role edited"
          ? `Role edited: ${roleName}`
          : label === "new role open" || label === "vacant role created"
            ? `New role ${roleName} created.`
          : label === "role removed" || label === "role deleted"
            ? `Role deleted: ${roleName}`
          : text,
      icon,
      color:
        label === "role removed" || label === "role deleted" || label === "role closed"
          ? "#6b7280"
          : "#f59e0b",
      roleName,
      senderPrefix:
        label === "new role open" ||
        label === "vacant role created" ||
        label === "role removed" ||
        label === "role deleted" ||
        label === "role closed" ||
        label === "role reopened"
          ? "by "
          : undefined,
    };
  }

  const filledPhraseMatch = text.match(/^(?:The role\s+)?(.+?)\s+(?:was marked as filled|has been marked filled)\.?$/i);
  if (filledPhraseMatch) {
    const roleName = filledPhraseMatch[1]?.trim() || "Vacant Role";
    return {
      text: `The role ${roleName} has been marked filled.`,
      icon: "UserCheck",
      color: "#f59e0b",
      roleName,
    };
  }

  const reopenedPhraseMatch = text.match(/^(.+?)\s+is open again\.?$/i);
  if (reopenedPhraseMatch) {
    return {
      text,
      icon: "UserSearch",
      color: "#f59e0b",
      roleName: reopenedPhraseMatch[1]?.trim() || "Vacant Role",
    };
  }

  const roleEventMatch = text.match(
    /(?:ROLE_CREATED|ROLE_UPDATED|ROLE_DELETED|ROLE_CLOSED|ROLE_FILLED|ROLE_REOPENED_ADMIN|ROLE_REOPENED):\s*(.+?)\s+\|\s+(.+?)(?:\s+\|\s+(.+?))?(?:\s+\|\s+(.+))?$/,
  );

  if (!roleEventMatch) return null;

  const eventType = roleEventMatch[0].split(":")[0].replace(/[^\w]/g, "");
  const roleToken = roleEventMatch[2] || "";
  const roleName = roleToken.includes(":")
    ? roleToken.split(":").slice(1).join(":").trim()
    : roleToken.trim();
  const filledUserToken = eventType === "ROLE_FILLED" ? roleEventMatch[3] || "" : "";
  const filledByToken = eventType === "ROLE_FILLED" ? roleEventMatch[4] || "" : "";
  const filledUserName = filledUserToken.includes(":")
    ? filledUserToken.split(":").slice(1).join(":").trim()
    : filledUserToken.trim();
  const filledByName = filledByToken.includes(":")
    ? filledByToken.split(":").slice(1).join(":").trim()
    : filledByToken.trim();

  const labels = {
    ROLE_CREATED: `New role ${roleName || "Vacant Role"} created.`,
    ROLE_UPDATED: `Role edited: ${roleName || "Vacant Role"}`,
    ROLE_DELETED: `Role deleted: ${roleName || "Vacant Role"}`,
    ROLE_CLOSED: `Role closed: ${roleName || "Vacant Role"}`,
    ROLE_FILLED: filledUserName && filledByName
      ? `The role ${roleName || "Vacant Role"} has been filled by ${filledUserName}, approved by ${filledByName}.`
      : filledUserName
        ? `The role ${roleName || "Vacant Role"} has been filled by ${filledUserName}.`
        : `The role ${roleName || "Vacant Role"} has been marked filled.`,
    ROLE_REOPENED: `Role reopened: ${roleName || "Vacant Role"}`,
    ROLE_REOPENED_ADMIN: `Role reopened: ${roleName || "Vacant Role"}`,
  };

  return {
    text: labels[eventType] || `Role event: ${roleName || "Vacant Role"}`,
    icon:
      eventType === "ROLE_FILLED"
        ? "UserCheck"
        : eventType === "ROLE_DELETED"
          ? "UserMinus"
          : eventType === "ROLE_CLOSED"
            ? "CircleX"
            : eventType === "ROLE_UPDATED"
              ? "Pencil"
              : "UserSearch",
    color: eventType === "ROLE_DELETED" || eventType === "ROLE_CLOSED"
      ? "#6b7280"
      : "#f59e0b",
    senderPrefix:
      eventType === "ROLE_UPDATED" || eventType === "ROLE_CREATED"
        || eventType === "ROLE_DELETED" ||
        eventType === "ROLE_CLOSED" ||
        eventType === "ROLE_FILLED" ||
        eventType === "ROLE_REOPENED" ||
        eventType === "ROLE_REOPENED_ADMIN"
        ? "by "
        : undefined,
  };
};

const getRoleEventTypePreview = (message) => {
  const rawType =
    message?.eventType ??
    message?.event_type ??
    message?.notificationType ??
    message?.notification_type ??
    message?.type;
  const type = String(rawType || "").toLowerCase();

  if (!type.startsWith("role_")) return null;

  const roleName =
    message?.roleName ??
    message?.role_name ??
    message?.role?.roleName ??
    message?.role?.role_name ??
    "Vacant Role";
  const filledUserName =
    message?.filledUserName ??
    message?.filled_user_name ??
    message?.filledByUserName ??
    message?.filled_by_user_name ??
    message?.filledByUser?.name ??
    message?.filled_by_user?.name ??
    null;
  const filledActorName =
    message?.filledByName ??
    message?.filled_by_name ??
    message?.actorName ??
    message?.actor_name ??
    null;
  const labels = {
    role_created: `New role ${roleName} created.`,
    role_updated: `Role edited: ${roleName}`,
    role_deleted: `Role deleted: ${roleName}`,
    role_closed: `Role closed: ${roleName}`,
    role_filled: filledUserName && filledActorName
      ? `The role ${roleName} has been filled by ${filledUserName}, approved by ${filledActorName}.`
      : filledUserName
        ? `The role ${roleName} has been filled by ${filledUserName}.`
        : `The role ${roleName} has been marked filled.`,
    role_reopened: `Role reopened: ${roleName}`,
    role_reopened_admin: `Role reopened: ${roleName}`,
  };

  if (!labels[type]) return null;

  return {
    text: labels[type],
    icon:
      type === "role_filled"
        ? "UserCheck"
        : type === "role_deleted"
          ? "UserMinus"
          : type === "role_closed"
            ? "CircleX"
            : type === "role_updated"
              ? "Pencil"
              : "UserSearch",
    color:
      type === "role_deleted" || type === "role_closed"
        ? "#6b7280"
        : "#f59e0b",
    senderPrefix:
      type === "role_updated" ||
      type === "role_created" ||
      type === "role_deleted" ||
      type === "role_closed" ||
      type === "role_filled" ||
      type === "role_reopened" ||
      type === "role_reopened_admin"
        ? "by "
        : undefined,
  };
};

const MENTION_REGEX = /@\[([^\]]+)\]\([^)]+\)/g;

const renderTextWithMentions = (text) => {
  if (!text || !text.includes("@[")) return text;
  const parts = [];
  let last = 0;
  let m;
  MENTION_REGEX.lastIndex = 0;
  while ((m = MENTION_REGEX.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <span key={m.index} className="font-semibold text-primary">
        @{m[1]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
};

const getNotificationSenderName = (message) => {
  const sender = message?.sender || {};
  const firstName =
    message?.senderFirstName ??
    message?.sender_first_name ??
    sender?.firstName ??
    sender?.first_name ??
    "";
  const lastName =
    message?.senderLastName ??
    message?.sender_last_name ??
    sender?.lastName ??
    sender?.last_name ??
    "";
  const fullName = `${firstName} ${lastName}`.trim();

  return [
    message?.senderDisplayName ??
      message?.sender_display_name ??
      message?.senderName ??
      message?.sender_name ??
      sender?.displayName ??
      sender?.display_name ??
      sender?.name,
    fullName,
    message?.senderUsername,
    message?.sender_username,
    sender?.username,
    getMessageSenderDisplayName(message),
  ].find((value) => String(value || "").trim());
};

const MessageNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef({
    pathname: location.pathname,
    search: location.search,
  });
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    locationRef.current = {
      pathname: location.pathname,
      search: location.search,
    };
  }, [location.pathname, location.search]);
  
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Fetch initial unread count
    const fetchUnreadCount = async () => {
      try {
        const response = await messageService.getUnreadCount();
        const count = response.data?.count ?? response.count ?? 0;
        if (count > 0) {
          setNotifications([{ 
            id: 'initial', 
            text: `You have ${count} unread messages`,
            expiresAt: Date.now() + NOTIFICATION_VISIBLE_MS,
            removeAt: Date.now() + NOTIFICATION_VISIBLE_MS + NOTIFICATION_FADE_MS,
          }]);
        }
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };
    
    fetchUnreadCount();
    
    let detachMessageListener = null;

    const attachMessageListener = (socket) => {
      if (!socket) return;

      if (detachMessageListener) {
        detachMessageListener();
      }

      const handleNewMessage = (message) => {
        if (isOwnMessage(message, user?.id)) return;

        const isInConversation = isMessageForCurrentChatPath(
          message,
          locationRef.current.pathname,
          locationRef.current.search,
          user?.id,
        );
        
        if (!isInConversation) {
          const target = getMessageConversationTarget(message, user?.id);
          const eventContent = pickEventContent(message);
          const eventPreview =
            getRoleEventTypePreview(message) ||
            getEventPreview(eventContent, user) ||
            getFallbackRoleEventPreview(eventContent);
          setNotifications(prev => [
            ...prev, 
            {
              id: message.id || `${target.type}-${target.conversationId}-${Date.now()}`,
              conversationId: target.conversationId,
              conversationType: target.type,
              senderId: message.senderId || message.sender_id,
              senderName: eventPreview?.senderName || getNotificationSenderName(message),
              senderPrefix: eventPreview?.senderPrefix ?? null,
              text: eventPreview?.text || getMessagePreviewText(message),
              isEvent: Boolean(eventPreview),
              eventIcon: eventPreview?.icon || null,
              eventColor: eventPreview?.color || null,
              eventBackgroundColor: eventPreview?.backgroundColor || null,
              time: new Date(),
              expiresAt: Date.now() + NOTIFICATION_VISIBLE_MS,
              removeAt: Date.now() + NOTIFICATION_VISIBLE_MS + NOTIFICATION_FADE_MS,
            }
          ]);
        }
      };
      
      const handleMessageDeleted = (payload) => {
        setNotifications((prev) =>
          prev.filter((n) => String(n.id) !== String(payload.messageId)),
        );
      };

      socket.on('message:received', handleNewMessage);
      socket.on('message:deleted', handleMessageDeleted);

      detachMessageListener = () => {
        socket.off('message:received', handleNewMessage);
        socket.off('message:deleted', handleMessageDeleted);
      };
    };

    const unsubscribeSocketReady = socketService.onSocketReady(attachMessageListener);
    
    return () => {
      unsubscribeSocketReady();
      if (detachMessageListener) {
        detachMessageListener();
      }
    };
  }, [isAuthenticated, user?.id]);
  
  // Remove notification when clicked and navigate to conversation
  const handleNotificationClick = (notification) => {
    setNotifications(prev => 
      prev.filter(n => n.id !== notification.id)
    );
    
    if (notification.conversationId) {
      navigate(`/chat/${notification.conversationId}?type=${notification.conversationType || 'direct'}`);
    } else {
      navigate('/chat');
    }
  };
  
  // Auto-dismiss each notification after its own 20 second visibility window,
  // with a short fade-out phase before removal.
  useEffect(() => {
    if (notifications.length === 0) return undefined;

    const now = Date.now();
    const nextTransition = Math.min(
      ...notifications.map((notification) =>
        notification.isExiting
          ? notification.removeAt || now
          : notification.expiresAt || now,
      ),
    );
    const timeout = setTimeout(() => {
      const timestamp = Date.now();
      setNotifications((prev) =>
        prev
          .map((notification) =>
            !notification.isExiting &&
            notification.expiresAt &&
            notification.expiresAt <= timestamp
              ? { ...notification, isExiting: true }
              : notification,
          )
          .filter(
            (notification) =>
              !notification.removeAt || notification.removeAt > timestamp,
          ),
      );
    }, Math.max(0, nextTransition - now));

    return () => {
      clearTimeout(timeout);
    }
  }, [notifications]);
  
  if (notifications.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {notifications.map(notification => {
        const renderEventPreview =
          (notification.isEvent && {
            text: notification.text,
            icon: notification.eventIcon,
            color: notification.eventColor,
            backgroundColor: notification.eventBackgroundColor,
          }) ||
          getFallbackRoleEventPreview(notification.text) ||
          getEventPreview(notification.text, user);
        const isEvent = Boolean(renderEventPreview);
        const HeaderIcon = isEvent ? Clock : MessageCircle;
        const EventIcon = isEvent
          ? EVENT_PREVIEW_ICONS[renderEventPreview.icon] || Clock
          : MessageCircle;

        return (
          <div
            key={notification.id}
            className={`bg-white text-black rounded-lg rounded-br-none shadow-lg p-4 max-w-xs cursor-pointer ${
              notification.isExiting
                ? "animate-toast-fade-out"
                : "animate-slide-in"
            }`}
            onClick={() => handleNotificationClick(notification)}
          >
            <h4 className="text-xs font-medium text-primary-focus flex items-center gap-1.5 mb-2">
              <HeaderIcon size={12} strokeWidth={2.2} aria-hidden="true" />
              <span>{isEvent ? "New Event" : "New Message"}</span>
            </h4>
            {isEvent ? (
              <p
                className="text-sm font-medium truncate"
                style={{
                  color: renderEventPreview.color || undefined,
                  ...(renderEventPreview.backgroundColor
                    ? {
                        backgroundColor: renderEventPreview.backgroundColor,
                        borderRadius: "0.375rem",
                        maxWidth: "100%",
                        paddingLeft: "3px",
                        paddingRight: "3px",
                        width: "fit-content",
                      }
                    : {}),
                }}
              >
                <span className="flex min-w-0 items-center gap-1">
                  <EventIcon size={14} className="flex-shrink-0" />
                  <span className="truncate">{renderEventPreview.text}</span>
                </span>
              </p>
            ) : (
              <p className="text-sm">{renderTextWithMentions(notification.text)}</p>
            )}
            {isEvent && notification.senderName && (
              <p className="text-[11px] mt-0.5 text-primary-focus truncate">
                {notification.senderPrefix ?? "by "}{notification.senderName}
              </p>
            )}
            {!isEvent && notification.senderName && (
              <p className="text-[11px] mt-0.5 text-primary-focus truncate">
                from {notification.senderName}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MessageNotifications;
