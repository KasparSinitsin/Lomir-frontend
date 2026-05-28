import api from "./api";

const normalizeUnreadCountPayload = (payload) => {
  const data = payload?.data ?? payload ?? {};
  const rawFirstUnread = data.firstUnread ?? data.first_unread ?? null;
  const firstUnread = rawFirstUnread
    ? {
        ...rawFirstUnread,
        navigateTo: rawFirstUnread.navigateTo ?? rawFirstUnread.navigate_to,
        navigate_to: rawFirstUnread.navigate_to ?? rawFirstUnread.navigateTo,
        referenceId:
          rawFirstUnread.referenceId ?? rawFirstUnread.reference_id,
        reference_id:
          rawFirstUnread.reference_id ?? rawFirstUnread.referenceId,
      }
    : null;
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
      params: { limit, offset, unreadOnly },
    });
    return response.data;
  },

  // Mark a single notification as read
  markAsRead: async (notificationId) => {
    const response = await api.put(`/api/notifications/${notificationId}/read`);
    return response.data;
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    const response = await api.put("/api/notifications/read-all");
    return response.data;
  },

  // Delete a notification
  deleteNotification: async (notificationId) => {
    const response = await api.delete(`/api/notifications/${notificationId}`);
    return response.data;
  },
};

export default notificationService;
