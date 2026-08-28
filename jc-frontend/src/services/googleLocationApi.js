import apiClient, { unwrapApiResponse } from "./apiClient";

// Google API 키를 브라우저에 노출하지 않도록 모든 장소·날씨 조회는 백엔드를 경유합니다.
export const getGoogleLocationSummary = async (query, languageCode = "ko") => {
  const response = await apiClient.get("/google/location-summary", {
    params: { query, languageCode },
  });

  return unwrapApiResponse(response);
};

export const getGoogleLocationSuggestions = async (query, languageCode = "ko", scope = "region") => {
  const response = await apiClient.get("/google/location-suggestions", {
    params: { query, languageCode, scope },
  });

  return unwrapApiResponse(response);
};
