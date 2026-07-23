import apiClient from "./apiClient";

const unwrap = (response) => response.data.data;

export const getFeed = async ({ cursor, size = 100 } = {}) => {
  const response = await apiClient.get("/feed", {
    params: {
      cursor: cursor || undefined,
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

export const getFeedItems = (feed) => {
  if (Array.isArray(feed)) return feed;
  return feed?.items || feed?.content || feed?.data || [];
};
