import apiClient, { unwrapApiResponse } from "./apiClient";

export async function chatWithJourneyAi({ message, currentPostId, region, history }) {
  const response = await apiClient.post("/journey-ai/chat", {
    message,
    currentPostId: currentPostId || null,
    region: region || null,
    history: Array.isArray(history) ? history.slice(-6) : [],
  });
  return unwrapApiResponse(response);
}
