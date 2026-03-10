import api from "./api";

export const notificationService = {
  // Get unread notification count and first unread
  getUnreadCount: async () => {
    const response = await api.get("/api/notifications/unread-count");
    return response.data;
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