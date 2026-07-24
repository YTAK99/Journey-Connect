import apiClient, { unwrapApiResponse } from "./apiClient";

export const getCrews = async ({ page = 0, size = 20 } = {}) => {
  const response = await apiClient.get("/crews", {
    params: { page, size },
  });

  return unwrapApiResponse(response);
};

export const joinCrew = async (crewId) => {
  const response = await apiClient.post(`/crews/${crewId}/join`);
  return unwrapApiResponse(response);
};

export const cancelCrewJoin = async (crewId) => {
  await apiClient.delete(`/crews/${crewId}/join`);
};
