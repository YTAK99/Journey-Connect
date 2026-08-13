import apiClient, { unwrapApiResponse } from "./apiClient";

const unwrap = unwrapApiResponse;

// 피드는 createdAt/id 기반 커서로 다음 묶음을 조회해 중간 데이터가 추가돼도 중복을 줄입니다.
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

export const getPostAnalysis = async (postId) => {
  const response = await apiClient.get(`/posts/${postId}/analysis`);
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

export const uploadPostImages = async (files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const response = await apiClient.post("/uploads/images", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60000,
  });
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
  // API 버전별 목록 키 차이를 흡수해 화면 컴포넌트는 항상 배열만 다루게 합니다.
  if (Array.isArray(feed)) return feed;
  return feed?.items || feed?.content || feed?.data || [];
};
