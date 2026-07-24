import apiClient, { unwrapApiResponse } from "./apiClient";

const unwrap = unwrapApiResponse;

export const getFeed = async ({ cursor, size = 20 } = {}) => {
  const response = await apiClient.get("/feed", {
    params: {
      cursor: cursor || undefined,
      size,
    },
  });

  return unwrap(response);
};

export const getExplore = async ({ keyword, region, page = 0, size = 20 } = {}) => {
  const response = await apiClient.get("/explore", {
    params: {
      keyword: keyword || undefined,
      region: region || undefined,
      page,
      size,
    },
  });

  return unwrap(response);
};

export const getPost = async (postId) => {
  const response = await apiClient.get(`/posts/${postId}`);
  return unwrap(response);
};

export const createPost = async (post) => {
  const response = await apiClient.post("/posts", post);
  return unwrap(response);
};

export const updatePost = async (postId, post) => {
  const response = await apiClient.patch(`/posts/${postId}`, post);
  return unwrap(response);
};

export const deletePost = async (postId) => {
  await apiClient.delete(`/posts/${postId}`);
};

export const likePost = async (postId) => {
  await apiClient.post(`/posts/${postId}/likes`);
};

export const unlikePost = async (postId) => {
  await apiClient.delete(`/posts/${postId}/likes`);
};

export const bookmarkPost = async (postId) => {
  await apiClient.post(`/posts/${postId}/bookmarks`);
};

export const unbookmarkPost = async (postId) => {
  await apiClient.delete(`/posts/${postId}/bookmarks`);
};

export const getFeedItems = (feed) => {
  if (Array.isArray(feed)) return feed;
  return feed?.items || feed?.content || feed?.data || [];
};
