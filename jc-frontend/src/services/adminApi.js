import { createApiClient, unwrapApiResponse } from "./apiClient";

const defaultAdminBaseUrl = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/v1\/?$/, "/api/admin")
  : "http://localhost:8080/api/admin";
const adminClient = createApiClient(import.meta.env.VITE_ADMIN_API_BASE_URL || defaultAdminBaseUrl);

function cleanParams(params = {}) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "" && value !== null && value !== undefined));
}

async function get(path, params) {
  return unwrapApiResponse(await adminClient.get(path, { params: cleanParams(params) }));
}

async function command(path, reason) {
  return unwrapApiResponse(await adminClient.post(path, { reason }));
}

export const getAdminDashboard = () => get("/dashboard");
export const getAdminReports = (params) => get("/reports", params);
export const getAdminReport = (reportId) => get(`/reports/${reportId}`);
export const resolveAdminReport = (reportId, reason) => command(`/reports/${reportId}/resolve`, reason);
export const dismissAdminReport = (reportId, reason) => command(`/reports/${reportId}/dismiss`, reason);
export const getAdminPosts = (params) => get("/posts", params);
export const getAdminPost = (postId) => get(`/posts/${postId}`);
export const hideAdminPost = (postId, reason) => command(`/posts/${postId}/hide`, reason);
export const restoreAdminPost = (postId, reason) => command(`/posts/${postId}/restore`, reason);
export const getAdminUsers = (params) => get("/users", params);
export const getAdminUser = (userId) => get(`/users/${userId}`);
export const suspendAdminUser = (userId, reason) => command(`/users/${userId}/suspend`, reason);
export const unsuspendAdminUser = (userId, reason) => command(`/users/${userId}/unsuspend`, reason);
