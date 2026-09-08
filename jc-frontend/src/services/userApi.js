import apiClient, { unwrapApiResponse } from "./apiClient";

export const getPublicUserProfile = async (userId) => {
  const response = await apiClient.get(`/users/${userId}`);
  return unwrapApiResponse(response);
};

export const getPublicUserPosts = async (userId, { page = 0, size = 100 } = {}) => {
  const response = await apiClient.get(`/users/${userId}/posts`, { params: { page, size } });
  return unwrapApiResponse(response);
};
