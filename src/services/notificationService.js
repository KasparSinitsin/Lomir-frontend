import api from "./api";

const FIELD_ALIASES = [
  ["createdAt", "created_at"],
  ["updatedAt", "updated_at"],
  ["readAt", "read_at"],
  ["navigateTo", "navigate_to"],
  ["referenceId", "reference_id"],
  ["referenceType", "reference_type"],
  ["recipientId", "recipient_id"],
  ["senderId", "sender_id"],
  ["teamId", "team_id"],
  ["teamName", "team_name"],
  ["roleId", "role_id"],
  ["roleName", "role_name"],
  ["memberId", "member_id"],
  ["userId", "user_id"],
  ["notificationType", "notification_type"],
  ["filledRoleName", "filled_role_name"],
  ["roleApplicationId", "role_application_id"],
  ["roleInvitationId", "role_invitation_id"],
];

const addCaseAliases = (value, aliases = FIELD_ALIASES) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const next = { ...value };
  aliases.forEach(([camelKey, snakeKey]) => {
    if (next[camelKey] === undefined && next[snakeKey] !== undefined) {
      next[camelKey] = next[snakeKey];
    }
    if (next[snakeKey] === undefined && next[camelKey] !== undefined) {
      next[snakeKey] = next[camelKey];
    }
  });
  return next;
};

const normalizeNotification = (notification) => {
  if (!notification || typeof notification !== "object") {
    return notification;
  }

  const metadata = addCaseAliases(notification.metadata);
  return addCaseAliases({
    ...notification,
    ...(metadata !== undefined ? { metadata } : {}),
  });
};

const normalizeNotificationListPayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload.map(normalizeNotification);
  }

  if (Array.isArray(payload?.data)) {
    return {
      ...payload,
      data: payload.data.map(normalizeNotification),
    };
  }

  const data = payload?.data ?? payload ?? {};
  const rawNotifications =
    data.notifications ?? data.data ?? payload?.notifications ?? [];
  const notifications = Array.isArray(rawNotifications)
    ? rawNotifications.map(normalizeNotification)
    : rawNotifications;
  const nextPayload = {
    ...payload,
    ...(Array.isArray(payload?.notifications) ? { notifications } : {}),
  };

  return {
    ...nextPayload,
    data: {
      ...data,
      notifications,
      data: Array.isArray(data.data) ? notifications : data.data,
    },
  };
};

const normalizeUnreadCountPayload = (payload) => {
  const data = payload?.data ?? payload ?? {};
  const rawFirstUnread = data.firstUnread ?? data.first_unread ?? null;
  const firstUnread = normalizeNotification(rawFirstUnread);
  const typeCounts = data.typeCounts ?? data.type_counts ?? {};
  const typeTeamCounts = data.typeTeamCounts ?? data.type_team_counts ?? {};

  return {
    ...payload,
    data: {
      ...data,
      count: data.count ?? 0,
      firstUnread,
      first_unread: firstUnread,
      typeCounts,
      type_counts: typeCounts,
      typeTeamCounts,
      type_team_counts: typeTeamCounts,
    },
  };
};

export const notificationService = {
  // Get unread notification count and first unread
  getUnreadCount: async () => {
    const response = await api.get("/api/notifications/unread-count", {
      skipResponseCaseTransform: true,
    });
    return normalizeUnreadCountPayload(response.data);
  },

  // Get all notifications
  getNotifications: async (params = {}) => {
    const { limit = 50, offset = 0, unreadOnly = false } = params;
    const response = await api.get("/api/notifications", {
      skipResponseCaseTransform: true,
      params: { limit, offset, unreadOnly },
    });
    return normalizeNotificationListPayload(response.data);
  },

  // Mark a single notification as read
  markAsRead: async (notificationId) => {
    const response = await api.put(
      `/api/notifications/${notificationId}/read`,
      undefined,
      { skipResponseCaseTransform: true },
    );
    return response.data;
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    const response = await api.put("/api/notifications/read-all", undefined, {
      skipResponseCaseTransform: true,
    });
    return response.data;
  },

  // Delete a notification
  deleteNotification: async (notificationId) => {
    const response = await api.delete(`/api/notifications/${notificationId}`, {
      skipResponseCaseTransform: true,
    });
    return response.data;
  },
};

export default notificationService;
