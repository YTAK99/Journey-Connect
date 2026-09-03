import apiClient, { unwrapApiResponse } from "./apiClient";

export const getNotifications = async ({ page = 0, size = 20 } = {}) => {
  const response = await apiClient.get("/notifications", { params: { page, size } });
  return unwrapApiResponse(response);
};

export const getUnreadNotificationCount = async () => {
  const response = await apiClient.get("/notifications/unread-count");
  return unwrapApiResponse(response);
};

export const markAllNotificationsRead = async () => {
  const response = await apiClient.patch("/notifications/read-all");
  return unwrapApiResponse(response);
};
