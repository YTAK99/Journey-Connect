import apiClient, { unwrapApiResponse } from "./apiClient";

export const getGoogleLocationSummary = async (query, languageCode = "ko") => {
  const response = await apiClient.get("/google/location-summary", {
    params: { query, languageCode },
  });

  return unwrapApiResponse(response);
};

export const getGoogleLocationSuggestions = async (query, languageCode = "ko") => {
  const response = await apiClient.get("/google/location-suggestions", {
    params: { query, languageCode },
  });

  return unwrapApiResponse(response);
};
