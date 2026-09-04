import apiClient, { unwrapApiResponse } from "./apiClient";

const locationSummaryRequests = new Map();

// Google API 키를 브라우저에 노출하지 않도록 모든 장소·날씨 조회는 백엔드를 경유합니다.
export const getGoogleLocationSummary = (query, languageCode = "ko", location = null) => {
  const params = {
    query,
    languageCode,
    latitude: location?.latitude,
    longitude: location?.longitude,
    address: location?.address,
  };
  const requestKey = JSON.stringify(params);

  if (locationSummaryRequests.has(requestKey)) {
    return locationSummaryRequests.get(requestKey);
  }

  const request = apiClient
    .get("/google/location-summary", { params })
    .then(unwrapApiResponse)
    .finally(() => locationSummaryRequests.delete(requestKey));

  locationSummaryRequests.set(requestKey, request);
  return request;
};

export const getGoogleLocationSuggestions = async (query, languageCode = "ko", scope = "region") => {
  const response = await apiClient.get("/google/location-suggestions", {
    params: { query, languageCode, scope },
  });

  return unwrapApiResponse(response);
};
