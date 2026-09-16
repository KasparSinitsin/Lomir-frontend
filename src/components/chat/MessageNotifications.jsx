import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
import { getBadgeName } from '../../utils/badgeLabels';
import { useLocation, useNavigate } from 'react-router-dom';
import { messageService } from '../../services/messageService';
import { useAuth } from '../../contexts/AuthContext';
import useSocketEvents from '../../hooks/useSocketEvents';
import { getEventPreview } from '../../utils/eventPreview';
import { parseSystemMessage } from '../../utils/messageSystemParser';
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

// Styling only. The words live in the locale files: header labels in
// getNotificationHeaderLabel, sentences in getNotificationToastText, the
// byline in getToastByline — all literal t() calls, so i18n:check sees them.
// member_removed has no entry: handleNotificationNew hands it to the removal
// toast before this table is read.
const NOTIFICATION_TOAST_TYPES = {
  invitation_received:  { icon: 'Mail',         color: '#ec4899', byline: 'invitedBy' },
  role_invitation:      { icon: 'Mail',         color: '#ec4899', byline: 'invitedBy' },
  invitation_accepted:  { icon: 'UserCheck',    color: '#16a34a', senderColor: '#15803d', byline: 'acceptedBy' },
  invitation_declined:  { icon: 'UserX',        color: '#6b7280', byline: 'declinedBy' },
  invitation_cancelled: { icon: 'CircleX',      color: '#6b7280', byline: 'cancelledBy' },
  application_received: { icon: 'Mail',         color: '#ec4899', byline: 'appliedBy' },
  application_approved: { icon: 'CheckCircle',  color: '#16a34a', senderColor: '#15803d', byline: 'approvedBy' },
  role_application_deferred_invite: { icon: 'UserSearch', color: '#f59e0b', byline: 'approvedBy' },
  application_rejected: { icon: 'CircleX',      color: '#6b7280', byline: 'declinedBy' },
};

const getNotificationHeaderLabel = (t, type, { isRoleInvite, isRoleApplicationApproval }) => {
  if (isRoleApplicationApproval) return t("messageNotifications.header.teamRoleApplicationApproved");
  if (type === 'role_application_deferred_invite') return t("messageNotifications.header.roleOfferCreated");

  if (isRoleInvite) {
    switch (type) {
      case 'invitation_cancelled': return t("messageNotifications.header.teamRoleInviteCancelled");
      case 'invitation_accepted': return t("messageNotifications.header.teamRoleInviteAccepted");
      case 'invitation_declined': return t("messageNotifications.header.teamRoleInviteDeclined");
      default: return t("messageNotifications.header.teamRoleInvitation");
    }
  }

  switch (type) {
    case 'invitation_received': return t("messageNotifications.header.teamInvitation");
    case 'role_invitation': return t("messageNotifications.header.roleInvitation");
    case 'invitation_accepted': return t("messageNotifications.header.invitationAccepted");
    case 'invitation_declined': return t("messageNotifications.header.invitationDeclined");
    case 'invitation_cancelled': return t("messageNotifications.header.invitationCancelled");
    case 'application_received': return t("messageNotifications.header.newApplication");
    case 'application_approved': return t("messageNotifications.header.applicationApproved");
    case 'application_rejected': return t("messageNotifications.header.applicationDeclined");
    default: return null;
  }
};

/**
 * The toast sentence for a `notification:new` payload, built from `type` and
 * the fields BE #325 added. Returns null when a field the sentence needs is
 * missing — an older backend — and the caller then shows `payload.title`,
 * the English it always showed. Never a sentence with an empty team name.
 *
 * The actor is not in the sentence: the toast prints it on its own line.
 */
const getNotificationToastText = (t, payload) => {
  const team = payload?.teamName;
  if (!team) return null;

  const role = payload.roleName;

  switch (payload.type) {
    case 'invitation_received':
      return role
        ? t("messageNotifications.text.invitationReceivedRole", { team, role })
        : t("messageNotifications.text.invitationReceived", { team });
    case 'role_invitation':
      return role ? t("messageNotifications.text.roleInvitation", { team, role }) : null;
    case 'invitation_accepted':
      return payload.filledRoleName
        ? t("messageNotifications.text.invitationAcceptedRole", { team, role: payload.filledRoleName })
        : t("messageNotifications.text.invitationAccepted", { team });
    case 'invitation_declined':
      return role
        ? t("messageNotifications.text.invitationDeclinedRole", { team, role })
        : t("messageNotifications.text.invitationDeclined", { team });
    case 'invitation_cancelled':
      return role
        ? t("messageNotifications.text.invitationCancelledRole", { team, role })
        : t("messageNotifications.text.invitationCancelled", { team });
    case 'application_received':
      if (typeof payload.isRoleApplication !== 'boolean') return null;
      return payload.isRoleApplication
        ? t("messageNotifications.text.applicationReceivedRole", { team })
        : t("messageNotifications.text.applicationReceived", { team });
    case 'application_approved':
      return role
        ? t("messageNotifications.text.applicationApprovedRole", { team, role })
        : t("messageNotifications.text.applicationApproved", { team });
    case 'role_application_deferred_invite':
      return role ? t("messageNotifications.text.roleApplicationDeferredInvite", { team, role }) : null;
    case 'application_rejected':
      return t("messageNotifications.text.applicationRejected", { team });
    default:
      return null;
  }
};

const ROLE_CHANGE_PREVIEW = {
  role_updated:        { icon: 'Pencil',     color: '#f59e0b' },
  role_closed:         { icon: 'CircleX',    color: '#6b7280' },
  role_filled:         { icon: 'UserCheck',  color: '#f59e0b' },
  role_deleted:        { icon: 'UserMinus',  color: '#f59e0b' },
  role_reopened:       { icon: 'UserSearch', color: '#f59e0b' },
  role_reopened_admin: { icon: 'UserSearch', color: '#f59e0b' },
};

const getRoleStatusChangedText = (t, roleChangeType, values) => {
  switch (roleChangeType) {
    case 'role_updated': return t("messageNotifications.roleStatus.updated", values);
    case 'role_closed': return t("messageNotifications.roleStatus.closed", values);
    case 'role_filled': return t("messageNotifications.roleStatus.filled", values);
    case 'role_deleted': return t("messageNotifications.roleStatus.deleted", values);
    default: return t("messageNotifications.roleStatus.reopened", values);
  }
};

const getRoleStatusChangedPreview = (payload) => {
  const { roleChangeType, roleName, userType } = payload;
  const template = ROLE_CHANGE_PREVIEW[roleChangeType];
  if (!template) return null;
  // 'Vacant Role' is a saved role name, not UI copy — it stays English.
  const values = {
    role: roleName || 'Vacant Role',
    userType: userType === 'applicant' ? 'applicant' : 'invitee',
  };
  return {
    getText: (t) => getRoleStatusChangedText(t, roleChangeType, values),
    icon: template.icon,
    color: template.color,
  };
};

/**
 * The line under the sentence. `kind` comes from NOTIFICATION_TOAST_TYPES;
 * every other event toast reads "by …", a chat message "from …".
 */
const getToastByline = (t, { byline, senderName, senderIsViewer, isEvent }) => {
  if (!isEvent) return t("messageNotifications.byline.from", { name: senderName });
  if (senderIsViewer) return t("messageNotifications.byline.byYou");

  const values = { name: senderName };
  switch (byline) {
    case 'invitedBy': return t("messageNotifications.byline.invitedBy", values);
    case 'acceptedBy': return t("messageNotifications.byline.acceptedBy", values);
    case 'declinedBy': return t("messageNotifications.byline.declinedBy", values);
    case 'cancelledBy': return t("messageNotifications.byline.cancelledBy", values);
    case 'appliedBy': return t("messageNotifications.byline.appliedBy", values);
    case 'approvedBy': return t("messageNotifications.byline.approvedBy", values);
    default: return t("messageNotifications.byline.by", values);
  }
};

const NOTIFICATION_VISIBLE_MS = 20000;
const NOTIFICATION_FADE_MS = 700;
const TEAM_REMOVAL_SUPPRESS_MS = 15000;
const COMBINED_APPLICATION_APPROVAL_SUPPRESS_MS = 15000;

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

const getRoleIdFromPayload = (payload) =>
  payload?.roleId ??
  payload?.role_id ??
  payload?.role?.id ??
  payload?.data?.roleId ??
  payload?.data?.role_id ??
  payload?.metadata?.roleId ??
  payload?.metadata?.role_id ??
  null;

const getRoleNameFromPayload = (payload) =>
  payload?.roleName ??
  payload?.role_name ??
  payload?.role?.roleName ??
  payload?.role?.role_name ??
  payload?.data?.roleName ??
  payload?.data?.role_name ??
  payload?.metadata?.roleName ??
  payload?.metadata?.role_name ??
  null;

const getCombinedApplicationApprovalKey = ({ teamId, roleId, roleName }) => {
  if (teamId == null) return null;

  const normalizedRole = roleId != null
    ? `id:${roleId}`
    : `name:${String(roleName || "").trim().toLowerCase()}`;

  return normalizedRole === "name:" ? null : `${teamId}:${normalizedRole}`;
};

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

// Without a team name (an older backend) the English title is still the best
// sentence available — it names the team.
const buildCurrentUserRemovalText = (t, payload) => {
  const teamName =
    payload?.teamName ??
    payload?.team_name ??
    payload?.team?.name ??
    payload?.data?.teamName ??
    payload?.data?.team_name ??
    payload?.metadata?.teamName ??
    payload?.metadata?.team_name ??
    null;

  if (teamName) return t("messageNotifications.text.removed", { team: teamName });

  return payload?.title || t("messageNotifications.text.removedNoTeam");
};

const MENTION_REGEX =/@\[([^\]]+)\]\([^)]+\)/g;

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
  const { t } = useTranslation();
  const prevIsAuthenticatedRef = useRef(false);
  const currentUserRemovalSuppressionsRef = useRef(new Map());
  const combinedApplicationApprovalSuppressionsRef = useRef(new Map());

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

  const markCombinedApplicationApprovalSuppressed = useCallback((payload) => {
    const key = getCombinedApplicationApprovalKey({
      teamId: getTeamIdFromPayload(payload),
      roleId: getRoleIdFromPayload(payload),
      roleName: getRoleNameFromPayload(payload),
    });

    if (!key) return;

    combinedApplicationApprovalSuppressionsRef.current.set(
      key,
      Date.now() + COMBINED_APPLICATION_APPROVAL_SUPPRESS_MS,
    );
  }, []);

  const isCombinedApplicationApprovalSuppressed = useCallback((parsedMessage) => {
    const key = getCombinedApplicationApprovalKey({
      teamId: parsedMessage?.teamId,
      roleId: parsedMessage?.roleId,
      roleName: parsedMessage?.roleName,
    });

    if (!key) return false;

    const suppressUntil = combinedApplicationApprovalSuppressionsRef.current.get(key);

    if (!suppressUntil) return false;
    if (suppressUntil <= Date.now()) {
      combinedApplicationApprovalSuppressionsRef.current.delete(key);
      return false;
    }

    return true;
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
        getHeaderLabel: (t) => t("messageNotifications.header.removedFromTeam"),
        eventIcon: 'UserMinus',
        eventColor: '#6b7280',
        getText: (t) => buildCurrentUserRemovalText(t, payload),
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
            getText: (t) => t("messageNotifications.unreadOnLogin", { count }),
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

    if (
      parsedMessage?.type === 'role_application_filled' &&
      (
        (parsedMessage.applicantId != null && String(parsedMessage.applicantId) === String(user?.id)) ||
        isCurrentUserName(parsedMessage.applicantName, user)
      ) &&
      isCombinedApplicationApprovalSuppressed(parsedMessage)
    ) {
      return;
    }

    if (
      parsedMessage?.type === 'role_application_deferred_invite' &&
      (
        (parsedMessage.applicantId != null && String(parsedMessage.applicantId) === String(user?.id)) ||
        isCurrentUserName(parsedMessage.applicantName, user)
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

      const eventPreview = getEventPreview(eventContent, user, t);
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
          senderName: eventPreview?.senderIsViewer
            ? null
            : eventPreview?.senderName || getNotificationSenderName(message),
          senderIsViewer: Boolean(eventPreview?.senderIsViewer),
          text: eventPreview ? null : getMessagePreviewText(message),
          getText: eventPreview
            ? (t) => getEventPreview(eventContent, user, t)?.text
            : null,
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
    isCombinedApplicationApprovalSuppressed,
    upsertCurrentUserRemovalToast,
    user,
    t,
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
        getText: preview.getText,
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
        getHeaderLabel: (t) => t("messageNotifications.header.newBadge"),
        eventIcon: BADGE_CATEGORY_ICON[badgeCategory] || 'Award',
        eventColor: categoryColor,
        // badgeName is the stored English name: the highlight URL below needs it
        // as is; only the sentence shows the translated one.
        getText: (t) => t("messageNotifications.text.badgeAwarded", { badge: getBadgeName(badgeName, t) }),
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

    // The emit goes only to user:${memberId} — whoever receives it is the
    // removed member, so the type alone decides.
    if (payload.type === 'member_removed') {
      upsertCurrentUserRemovalToast(payload);
      return;
    }

    if (
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
    const isRoleApplicationApproval =
      payload.type === 'application_approved' && !!getRoleNameFromPayload(payload);
    if (isRoleApplicationApproval) {
      markCombinedApplicationApprovalSuppressed(payload);
    }
    const isRoleInvite = (['invitation_received', 'invitation_cancelled', 'invitation_declined'].includes(payload.type) && !!payload.roleName)
      || (payload.type === 'invitation_accepted' && !!payload.filledRoleName)
      || payload.type === 'role_application_deferred_invite';
    const dedupeKey = `notif-${payload.type}-${teamId ?? ''}-${payload.title}`;
    setNotifications((prev) => [
      ...prev.filter((notification) => notification.dedupeKey !== dedupeKey),
      {
        id: `notif-${payload.type}-${Date.now()}`,
        dedupeKey,
        isEvent: true,
        headerIconName: config.icon,
        secondaryHeaderIconName: isRoleInvite || isRoleApplicationApproval ? 'UserSearch' : null,
        getHeaderLabel: (t) => getNotificationHeaderLabel(t, payload.type, {
          isRoleInvite,
          isRoleApplicationApproval,
        }),
        eventIcon: config.icon,
        eventColor: config.color || null,
        getText: (t) => getNotificationToastText(t, payload) || payload.title,
        senderName: payload.actorName || null,
        byline: config.byline,
        senderColor: config.senderColor || null,
        navigateTo: '/teams/my-teams',
        time: new Date(),
        expiresAt: Date.now() + NOTIFICATION_VISIBLE_MS,
        removeAt: Date.now() + NOTIFICATION_VISIBLE_MS + NOTIFICATION_FADE_MS,
      },
    ]);
  }, [
    isTeamSuppressedForCurrentUserRemoval,
    markCombinedApplicationApprovalSuppressed,
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
        // Toast words are resolved here, never when the toast is created: the
        // language can still change after login (LanguageContext switches once
        // the user arrives), and a stored sentence would keep the old one.
        const text = notification.getText ? notification.getText(t) : notification.text;
        const renderEventPreview =
          (notification.isEvent && {
            text,
            icon: notification.eventIcon,
            color: notification.eventColor,
            backgroundColor: notification.eventBackgroundColor,
          }) ||
          getEventPreview(text, user, t);
        const isEvent = Boolean(renderEventPreview);
        const HeaderIcon = notification.headerIconName
          ? EVENT_PREVIEW_ICONS[notification.headerIconName] || Clock
          : isEvent ? Clock : MessageCircle;
        const SecondaryHeaderIcon = notification.secondaryHeaderIconName
          ? EVENT_PREVIEW_ICONS[notification.secondaryHeaderIconName] || null
          : null;
        const headerLabel =
          notification.getHeaderLabel?.(t) ||
          (isEvent
            ? t("messageNotifications.header.newEvent")
            : t("messageNotifications.header.newMessage"));
        const hasByline = Boolean(notification.senderName || (isEvent && notification.senderIsViewer));
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
              <p className="text-sm">{renderTextWithMentions(text)}</p>
            )}
            {hasByline && (
              <p
                className="text-[11px] mt-0.5 text-primary-focus truncate"
                style={isEvent && notification.senderColor ? { color: notification.senderColor } : undefined}
              >
                {getToastByline(t, { ...notification, isEvent })}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MessageNotifications;
