import apiClient, { unwrapApiResponse } from "./apiClient";

// 크루 화면에서 필요한 목록 조회와 참가 신청/취소 요청을 백엔드 경로에 연결합니다.
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
