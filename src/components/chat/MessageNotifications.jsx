import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle,
  CircleX,
  Clock,
  Compass,
  Crown,
  FileText,
  Heart,
  Lightbulb,
  LogOut,
  Mail,
  MessageCircle,
  Pencil,
  SendHorizontal,
  Settings,
  Shield,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  UserSearch,
  Users,
  UserX,
} from 'lucide-react';
import { CATEGORY_COLORS, DEFAULT_COLOR } from '../../constants/badgeConstants';
import { useLocation, useNavigate } from 'react-router-dom';
import { messageService } from '../../services/messageService';
import { useAuth } from '../../contexts/AuthContext';
import useSocketEvents from '../../hooks/useSocketEvents';
import { getEventPreview } from '../../utils/eventPreview';
import { parseSystemMessage } from './MessageDisplay';
import {
  getMessageSenderDisplayName,
  getMessageConversationTarget,
  getMessagePreviewText,
  isMessageForCurrentChatPath,
  isOwnMessage,
} from '../../utils/messageNotificationUtils';

const EVENT_PREVIEW_ICONS = {
  AlertTriangle,
  Award,
  CheckCircle,
  CircleX,
  Clock,
  Compass,
  Crown,
  FileText,
  Heart,
  Lightbulb,
  LogOut,
  Mail,
  Pencil,
  SendHorizontal,
  Settings,
  Shield,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  UserSearch,
  Users,
  UserX,
};

const BADGE_CATEGORY_ICON = {
  'Collaboration Skills': 'Users',
  'Technical Expertise': 'Settings',
  'Creative Thinking': 'Lightbulb',
  'Leadership Qualities': 'Compass',
  'Personal Attributes': 'Heart',
};

const NOTIFICATION_TOAST_TYPES = {
  invitation_received:  { icon: 'Mail',         label: 'Team Invitation',      color: '#ec4899', senderPrefix: 'Invited by ' },
  role_invitation:      { icon: 'Mail',         label: 'Role Invitation',      color: '#ec4899', senderPrefix: 'Invited by ' },
  invitation_accepted:  { icon: 'UserCheck',    label: 'Invitation Accepted',  color: '#16a34a', senderColor: '#15803d', senderPrefix: 'Accepted by ' },
  invitation_declined:  { icon: 'UserX',        label: 'Invitation Declined',  color: '#6b7280', senderPrefix: 'Declined by ' },
  invitation_cancelled: { icon: 'CircleX',      label: 'Invitation Cancelled', color: '#6b7280', senderPrefix: 'Cancelled by ' },
  application_received: { icon: 'Mail',         label: 'New Application',      color: '#ec4899', senderPrefix: 'Applied by ' },
  application_approved: { icon: 'CheckCircle',  label: 'Application Approved', color: '#16a34a', senderColor: '#15803d', senderPrefix: 'Approved by ' },
  application_rejected: { icon: 'CircleX',      label: 'Application Declined', color: '#6b7280', senderPrefix: 'Declined by ' },
  member_removed:       { icon: 'UserMinus',    label: 'Removed from Team',    senderPrefix: 'Removed by ' },
  member_removed_public:{ icon: 'UserMinus',    label: 'Removed from Team',    senderPrefix: null },
};

const ROLE_CHANGE_PREVIEW = {
  role_updated:       { text: (n, u) => `The role "${n}" you ${u === 'applicant' ? 'applied for' : 'were invited to'} has been updated`,  icon: 'Pencil',     color: '#f59e0b' },
  role_closed:        { text: (n, u) => `The role "${n}" you ${u === 'applicant' ? 'applied for' : 'were invited to'} has been closed`,   icon: 'CircleX',    color: '#6b7280' },
  role_filled:        { text: (n, u) => `The role "${n}" you ${u === 'applicant' ? 'applied for' : 'were invited to'} has been filled`,   icon: 'UserCheck',  color: '#f59e0b' },
  role_deleted:       { text: (n, u) => `The role "${n}" you ${u === 'applicant' ? 'applied for' : 'were invited to'} has been deleted`,  icon: 'UserMinus',  color: '#f59e0b' },
  role_reopened:      { text: (n, u) => `The role "${n}" you ${u === 'applicant' ? 'applied for' : 'were invited to'} is open again`,    icon: 'UserSearch', color: '#f59e0b' },
  role_reopened_admin:{ text: (n, u) => `The role "${n}" you ${u === 'applicant' ? 'applied for' : 'were invited to'} is open again`,    icon: 'UserSearch', color: '#f59e0b' },
};

const getRoleStatusChangedPreview = (payload) => {
  const { roleChangeType, roleName, userType } = payload;
  const template = ROLE_CHANGE_PREVIEW[roleChangeType];
  if (!template) return null;
  return {
    text: template.text(roleName || 'Vacant Role', userType),
    icon: template.icon,
    color: template.color,
    senderPrefix: null,
  };
};

const NOTIFICATION_VISIBLE_MS = 20000;
const NOTIFICATION_FADE_MS = 700;
const TEAM_REMOVAL_SUPPRESS_MS = 15000;

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
  const actorToken =
    eventType === "ROLE_FILLED" || eventType === "ROLE_REOPENED"
      ? roleEventMatch[3] || ""
      : "";
  const filledByToken = eventType === "ROLE_FILLED" ? roleEventMatch[4] || "" : "";
  const filledUserName = actorToken.includes(":")
    ? actorToken.split(":").slice(1).join(":").trim()
    : actorToken.trim();
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
    ROLE_REOPENED: filledUserName
      ? `${filledUserName} left the role ${roleName || "Vacant Role"}. It is open again.`
      : `Role reopened: ${roleName || "Vacant Role"}`,
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
    message?.userName ??
    message?.user_name ??
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
    role_reopened: filledUserName
      ? `${filledUserName} left the role ${roleName}. It is open again.`
      : `Role reopened: ${roleName}`,
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

const getRoleReopenedToastKey = (content, message = null) => {
  const rawType =
    message?.eventType ??
    message?.event_type ??
    message?.notificationType ??
    message?.notification_type ??
    message?.type;
  const normalizedType = String(rawType || "").toLowerCase();

  if (normalizedType === "role_reopened") {
    const roleId = message?.roleId ?? message?.role_id ?? message?.role?.id ?? "";
    const userId =
      message?.userId ??
      message?.user_id ??
      message?.filledByUserId ??
      message?.filled_by_user_id ??
      message?.filledByUser?.id ??
      message?.filled_by_user?.id ??
      "";
    const teamId = message?.teamId ?? message?.team_id ?? message?.team?.id ?? "";

    return `role-reopened:${teamId}:${roleId}:${userId}`;
  }

  const match = String(content || "").match(
    /(?:ROLE_REOPENED):\s*(.+?)\s+\|\s+(.+?)\s+\|\s+(.+)$/,
  );

  if (!match) return null;

  return `role-reopened:${match[1].trim()}:${match[2].trim()}:${match[3].trim()}`;
};

const getTeamIdFromMessage = (message, parsedMessage = null) =>
  parsedMessage?.teamId ??
  message?.teamId ??
  message?.team_id ??
  message?.team?.id ??
  null;

const getTeamIdFromPayload = (payload) =>
  payload?.teamId ??
  payload?.team_id ??
  payload?.team?.id ??
  payload?.data?.teamId ??
  payload?.data?.team_id ??
  payload?.metadata?.teamId ??
  payload?.metadata?.team_id ??
  null;

const getPayloadText = (payload) =>
  [
    payload?.title,
    payload?.message,
    payload?.content,
    payload?.text,
    payload?.body,
    payload?.data?.title,
    payload?.data?.message,
    payload?.data?.content,
    payload?.metadata?.title,
    payload?.metadata?.message,
    payload?.metadata?.content,
  ]
    .filter((value) => typeof value === 'string')
    .join(' ');

const getRemovedMemberIdFromPayload = (payload) =>
  payload?.memberId ??
  payload?.member_id ??
  payload?.removedUserId ??
  payload?.removed_user_id ??
  payload?.targetUserId ??
  payload?.target_user_id ??
  payload?.data?.memberId ??
  payload?.data?.member_id ??
  payload?.metadata?.memberId ??
  payload?.metadata?.member_id ??
  null;

const getRoleEventUserIdFromPayload = (payload) =>
  payload?.userId ??
  payload?.user_id ??
  payload?.filledByUserId ??
  payload?.filled_by_user_id ??
  payload?.filledByUser?.id ??
  payload?.filled_by_user?.id ??
  payload?.data?.userId ??
  payload?.data?.user_id ??
  payload?.metadata?.userId ??
  payload?.metadata?.user_id ??
  null;

const isCurrentUserName = (name, user) => {
  const normalizedName = String(name || '').trim().toLowerCase();
  if (!normalizedName) return false;

  const userFullName = `${user?.firstName || user?.first_name || ''} ${user?.lastName || user?.last_name || ''}`
    .trim()
    .toLowerCase();

  return (
    normalizedName === userFullName ||
    normalizedName === String(user?.username || '').trim().toLowerCase()
  );
};

const isMemberRoleChange = (parsedMessage) =>
  parsedMessage?.type === 'role_changed' &&
  String(parsedMessage.newRole || '').trim().toLowerCase() === 'member';

const isMemberRoleChangeForCurrentUser = (parsedMessage, user) => (
  isMemberRoleChange(parsedMessage) &&
  (
    (parsedMessage.memberId != null && String(parsedMessage.memberId) === String(user?.id)) ||
    isCurrentUserName(parsedMessage.memberName, user)
  )
);

const isRemovalForCurrentUser = (payload, user) => {
  const type = String(payload?.type ?? payload?.notificationType ?? '').toLowerCase();
  if (!type.includes('member_removed') && !type.includes('removed')) return false;

  const removedMemberId = getRemovedMemberIdFromPayload(payload);
  if (removedMemberId != null && String(removedMemberId) === String(user?.id)) {
    return true;
  }

  const text = getPayloadText(payload).toLowerCase();
  return /\byou\b/.test(text) && /removed from/.test(text);
};

const isTemporaryDemotionToast = (payload) => {
  const type = String(payload?.type ?? payload?.notificationType ?? '').toLowerCase();
  const text = getPayloadText(payload).toLowerCase();

  return (
    type === 'role_changed' &&
    (text.includes('demoted') ||
      text.includes('changed to member') ||
      text.includes('role changed to member') ||
      text.includes('to member'))
  );
};

const buildCurrentUserRemovalText = (payload) => {
  const title = String(payload?.title || '').trim();
  if (/^you\b/i.test(title)) return title;

  const teamName =
    payload?.teamName ??
    payload?.team_name ??
    payload?.team?.name ??
    payload?.data?.teamName ??
    payload?.data?.team_name ??
    payload?.metadata?.teamName ??
    payload?.metadata?.team_name ??
    null;

  return teamName
    ? `You were removed from "${teamName}"`
    : 'You were removed from the team';
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
  const prevIsAuthenticatedRef = useRef(false);
  const currentUserRemovalSuppressionsRef = useRef(new Map());

  const isTeamSuppressedForCurrentUserRemoval = useCallback((teamId) => {
    if (teamId == null) return false;

    const key = String(teamId);
    const suppressUntil = currentUserRemovalSuppressionsRef.current.get(key);

    if (!suppressUntil) return false;
    if (suppressUntil <= Date.now()) {
      currentUserRemovalSuppressionsRef.current.delete(key);
      return false;
    }

    return true;
  }, []);

  const markTeamSuppressedForCurrentUserRemoval = useCallback((teamId) => {
    if (teamId == null) return;

    currentUserRemovalSuppressionsRef.current.set(
      String(teamId),
      Date.now() + TEAM_REMOVAL_SUPPRESS_MS,
    );
  }, []);

  const upsertCurrentUserRemovalToast = useCallback((payload) => {
    const teamId = getTeamIdFromPayload(payload);
    markTeamSuppressedForCurrentUserRemoval(teamId);

    const dedupeKey = `current-user-removed:${teamId ?? 'unknown'}`;
    const now = Date.now();

    setNotifications((prev) => [
      ...prev.filter((notification) => notification.dedupeKey !== dedupeKey),
      {
        id: `notif-current-user-removed-${teamId ?? 'unknown'}-${now}`,
        dedupeKey,
        isEvent: true,
        headerIconName: 'UserMinus',
        headerLabel: 'Removed from Team',
        eventIcon: 'UserMinus',
        eventColor: '#6b7280',
        text: buildCurrentUserRemovalText(payload),
        senderPrefix: null,
        senderName: null,
        navigateTo: '/chat',
        time: new Date(),
        expiresAt: now + NOTIFICATION_VISIBLE_MS,
        removeAt: now + NOTIFICATION_VISIBLE_MS + NOTIFICATION_FADE_MS,
      },
    ]);
  }, [markTeamSuppressedForCurrentUserRemoval]);

  useEffect(() => {
    locationRef.current = {
      pathname: location.pathname,
      search: location.search,
    };
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isAuthenticated) {
      // Only clear the flag when transitioning from authenticated → not (i.e. logout),
      // not on the initial mount where isAuthenticated starts false while auth resolves.
      if (prevIsAuthenticatedRef.current) {
        sessionStorage.removeItem('lomir:initial_unread_checked');
      }
      prevIsAuthenticatedRef.current = false;
      return;
    }

    prevIsAuthenticatedRef.current = true;

    // Only show once per tab session (persists across page refreshes, cleared on logout).
    if (sessionStorage.getItem('lomir:initial_unread_checked')) return;
    sessionStorage.setItem('lomir:initial_unread_checked', '1');

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
  }, [isAuthenticated]);

  const handleNewMessage = useCallback((message) => {
    if (isOwnMessage(message, user?.id)) return;

    const eventContent = pickEventContent(message);
    const parsedMessage = parseSystemMessage(eventContent);
    const teamId = getTeamIdFromMessage(message, parsedMessage);

    if (
      parsedMessage?.type === 'member_removed_public' &&
      parsedMessage.userId != null &&
      String(parsedMessage.userId) === String(user?.id)
    ) {
      upsertCurrentUserRemovalToast({
        type: 'member_removed',
        teamId,
        teamName: parsedMessage.teamName,
        title: parsedMessage.teamName
          ? `You were removed from "${parsedMessage.teamName}"`
          : 'You were removed from the team',
      });
      return;
    }

    if (
      isTeamSuppressedForCurrentUserRemoval(teamId) &&
      (
        parsedMessage?.type === 'role_reopened' ||
        isMemberRoleChange(parsedMessage)
      )
    ) {
      return;
    }

    if (
      parsedMessage?.type === 'role_reopened' &&
      (
        (parsedMessage.userId != null && String(parsedMessage.userId) === String(user?.id)) ||
        isCurrentUserName(parsedMessage.userName, user)
      )
    ) {
      return;
    }

    if (isMemberRoleChangeForCurrentUser(parsedMessage, user)) {
      return;
    }

    const isInConversation = isMessageForCurrentChatPath(
      message,
      locationRef.current.pathname,
      locationRef.current.search,
      user?.id,
    );

    if (!isInConversation) {
      const target = getMessageConversationTarget(message, user?.id);

      // These system messages are shown via notification:new toast instead.
      if (/APPLICATION_APPROVED:|APPLICATION_DECLINED:|MEMBER_REMOVED:|INVITATION_DECLINED|INVITATION_CANCELLED/i.test(eventContent)) return;

      // Team join messages (👋/🎯) are visible in the team chat and covered by notification:new for the inviter.
      if ((message.team_id || message.teamId) && /^[\u{1F44B}\u{1F3AF}]/u.test(eventContent.trim())) return;

      const eventPreview =
        getRoleEventTypePreview(message) ||
        getEventPreview(eventContent, user) ||
        getFallbackRoleEventPreview(eventContent);
      const dedupeKey =
        getRoleReopenedToastKey(eventContent, message) ||
        (parsedMessage?.type === 'member_removed_public'
          ? `member-removed:${teamId ?? ''}:${parsedMessage.userId ?? ''}`
          : null);
      setNotifications(prev => [
        ...prev.filter((n) => !dedupeKey || n.dedupeKey !== dedupeKey),
        {
          id: message.id || `${target.type}-${target.conversationId}-${Date.now()}`,
          dedupeKey,
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
  }, [
    isTeamSuppressedForCurrentUserRemoval,
    upsertCurrentUserRemovalToast,
    user,
  ]);

  const handleMessageDeleted = useCallback((payload) => {
    setNotifications((prev) =>
      prev.filter((n) => String(n.id) !== String(payload.messageId)),
    );
  }, []);

  const handleRoleStatusChanged = useCallback((payload) => {
    const preview = getRoleStatusChangedPreview(payload);
    if (!preview) return;
    const id = `role-status-${payload.roleId}-${payload.userType}-${Date.now()}`;
    setNotifications((prev) => [
      // Replace any existing toast for the same role + change type so
      // repeated edits don't stack up.
      ...prev.filter(
        (n) =>
          !(
            n.roleId === payload.roleId &&
            n.roleChangeType === payload.roleChangeType &&
            n.userType === payload.userType
          ),
      ),
      {
        id,
        isEvent: true,
        roleId: payload.roleId,
        roleChangeType: payload.roleChangeType,
        userType: payload.userType,
        eventIcon: preview.icon,
        eventColor: preview.color,
        text: preview.text,
        senderPrefix: 'by ',
        senderName: payload.actorName || null,
        navigateTo: payload.userType === 'applicant'
          ? `/teams/my-teams?openApplication=${payload.applicationId}`
          : `/teams/my-teams?openInvitation=${payload.invitationId}`,
        time: new Date(),
        expiresAt: Date.now() + NOTIFICATION_VISIBLE_MS,
        removeAt: Date.now() + NOTIFICATION_VISIBLE_MS + NOTIFICATION_FADE_MS,
      },
    ]);
  }, []);

  const handleBadgeAwarded = useCallback((payload) => {
    const { badgeName, badgeCategory, awarderName } = payload;
    if (!badgeName) return;
    const categoryColor = CATEGORY_COLORS[badgeCategory] || DEFAULT_COLOR;
    const id = `badge-awarded-${payload.badgeId}-${Date.now()}`;
    setNotifications((prev) => [
      ...prev,
      {
        id,
        isEvent: true,
        headerIconName: 'Award',
        headerLabel: 'New Badge for you!',
        eventIcon: BADGE_CATEGORY_ICON[badgeCategory] || 'Award',
        eventColor: categoryColor,
        text: `You received the "${badgeName}" badge!`,
        senderPrefix: 'by ',
        senderName: awarderName || null,
        navigateTo: `/profile?scrollTo=badges&highlightBadge=${encodeURIComponent(badgeName)}`,
        time: new Date(),
        expiresAt: Date.now() + NOTIFICATION_VISIBLE_MS,
        removeAt: Date.now() + NOTIFICATION_VISIBLE_MS + NOTIFICATION_FADE_MS,
      },
    ]);
  }, []);

  const handleNotificationNew = useCallback((payload) => {
    if (!payload?.title) return;

    const teamId = getTeamIdFromPayload(payload);

    if (isRemovalForCurrentUser(payload, user)) {
      upsertCurrentUserRemovalToast(payload);
      return;
    }

    if (
      isTemporaryDemotionToast(payload) ||
      (
        isTeamSuppressedForCurrentUserRemoval(teamId) &&
        ['role_reopened', 'role_changed'].includes(String(payload.type || '').toLowerCase())
      ) ||
      (
        String(payload.type || '').toLowerCase() === 'role_reopened' &&
        String(getRoleEventUserIdFromPayload(payload) ?? '') === String(user?.id ?? '')
      )
    ) {
      return;
    }

    const config = NOTIFICATION_TOAST_TYPES[payload.type];
    if (!config) return;
    const isRoleInvite = (['invitation_received', 'invitation_cancelled', 'invitation_declined'].includes(payload.type) && !!payload.roleName)
      || (payload.type === 'invitation_accepted' && !!payload.filledRoleName);
    const dedupeKey =
      payload.type?.includes?.('member_removed')
        ? `member-removed:${teamId ?? ''}:${getRemovedMemberIdFromPayload(payload) ?? payload.title}`
        : `notif-${payload.type}-${teamId ?? ''}-${payload.title}`;
    setNotifications((prev) => [
      ...prev.filter((notification) => notification.dedupeKey !== dedupeKey),
      {
        id: `notif-${payload.type}-${Date.now()}`,
        dedupeKey,
        isEvent: true,
        headerIconName: config.icon,
        secondaryHeaderIconName: isRoleInvite ? 'UserSearch' : null,
        headerLabel: isRoleInvite
          ? payload.type === 'invitation_cancelled' ? 'Team & Role Invite Cancelled'
            : payload.type === 'invitation_accepted' ? 'Team & Role Invite Accepted'
            : payload.type === 'invitation_declined' ? 'Team & Role Invite Declined'
            : 'Team & Role Invitation'
          : config.label,
        eventIcon: config.icon,
        eventColor: config.color || null,
        text: payload.title,
        senderName: payload.actorName || null,
        senderPrefix: config.senderPrefix || null,
        senderColor: config.senderColor || null,
        navigateTo: '/teams/my-teams',
        time: new Date(),
        expiresAt: Date.now() + NOTIFICATION_VISIBLE_MS,
        removeAt: Date.now() + NOTIFICATION_VISIBLE_MS + NOTIFICATION_FADE_MS,
      },
    ]);
  }, [
    isTeamSuppressedForCurrentUserRemoval,
    upsertCurrentUserRemovalToast,
    user,
  ]);

  useSocketEvents(
    isAuthenticated
      ? {
          'message:received': handleNewMessage,
          'message:deleted': handleMessageDeleted,
          'role:statusChanged': handleRoleStatusChanged,
          'badge:awarded': handleBadgeAwarded,
          'notification:new': handleNotificationNew,
        }
      : null,
    [
      isAuthenticated,
      handleNewMessage,
      handleMessageDeleted,
      handleRoleStatusChanged,
      handleBadgeAwarded,
      handleNotificationNew,
    ],
  );
  
  // Remove notification when clicked and navigate to the appropriate destination
  const handleNotificationClick = (notification) => {
    setNotifications(prev =>
      prev.filter(n => n.id !== notification.id)
    );

    if (notification.navigateTo) {
      navigate(notification.navigateTo);
    } else if (notification.conversationId) {
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
        const HeaderIcon = notification.headerIconName
          ? EVENT_PREVIEW_ICONS[notification.headerIconName] || Clock
          : isEvent ? Clock : MessageCircle;
        const SecondaryHeaderIcon = notification.secondaryHeaderIconName
          ? EVENT_PREVIEW_ICONS[notification.secondaryHeaderIconName] || null
          : null;
        const headerLabel = notification.headerLabel || (isEvent ? 'New Event' : 'New Message');
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
              {SecondaryHeaderIcon && <SecondaryHeaderIcon size={12} strokeWidth={2.2} aria-hidden="true" />}
              <span>{headerLabel}</span>
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
              <p
                className="text-[11px] mt-0.5 text-primary-focus truncate"
                style={notification.senderColor ? { color: notification.senderColor } : undefined}
              >
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
