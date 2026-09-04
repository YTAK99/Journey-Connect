import { Client } from "@stomp/stompjs";
import apiClient, { unwrapApiResponse } from "./apiClient";

export const getCrews = async ({ keyword, region, category, page = 0, size = 20 } = {}) => {
  const response = await apiClient.get("/crews", {
    params: { keyword: keyword || undefined, region: region || undefined, category: category || undefined, page, size },
  });
  return unwrapApiResponse(response);
};

export const getCrew = async (crewId) => {
  const response = await apiClient.get(`/crews/${crewId}`);
  return unwrapApiResponse(response);
};

export const createCrew = async (payload) => {
  const response = await apiClient.post("/crews", payload);
  return unwrapApiResponse(response);
};

export const updateCrew = async (crewId, payload) => {
  const response = await apiClient.patch(`/crews/${crewId}`, payload);
  return unwrapApiResponse(response);
};

export const joinCrew = async (crewId, message = null) => {
  const response = await apiClient.post(`/crews/${crewId}/join`, { message });
  return unwrapApiResponse(response);
};

export const cancelCrewJoin = async (crewId) => {
  await apiClient.delete(`/crews/${crewId}/join`);
};

export const getMyCrews = async ({ page = 0, size = 100 } = {}) => {
  const response = await apiClient.get("/users/me/crews", { params: { page, size } });
  return unwrapApiResponse(response);
};

export const getMyRoutes = async ({ page = 0, size = 100 } = {}) => {
  const response = await apiClient.get("/users/me/posts", { params: { page, size } });
  return unwrapApiResponse(response);
};

export const getCrewMembers = async (crewId, { page = 0, size = 100 } = {}) => {
  const response = await apiClient.get(`/crews/${crewId}/members`, { params: { page, size } });
  return unwrapApiResponse(response);
};

export const kickCrewMember = async (crewId, userId) => {
  await apiClient.delete(`/crews/${crewId}/members/${userId}`);
};

export const getCrewApplications = async (crewId, { page = 0, size = 100 } = {}) => {
  const response = await apiClient.get(`/crews/${crewId}/applications`, { params: { page, size } });
  return unwrapApiResponse(response);
};

export const reviewCrewApplication = async (crewId, applicationId, status) => {
  const response = await apiClient.patch(`/crews/${crewId}/applications/${applicationId}`, { status });
  return unwrapApiResponse(response);
};

export const endCrew = async (crewId) => {
  const response = await apiClient.post(`/crews/${crewId}/end`);
  return unwrapApiResponse(response);
};

export const getCrewMessages = async (crewId, { beforeId, size = 50 } = {}) => {
  const response = await apiClient.get(`/crews/${crewId}/messages`, {
    params: { beforeId: beforeId || undefined, size },
  });
  return unwrapApiResponse(response);
};

const websocketUrl = () => {
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";
  if (/^https?:\/\//i.test(apiBase)) {
    return `${apiBase.replace(/^http/i, "ws").replace(/\/api\/v1\/?$/, "")}/ws`;
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
};

export const connectCrewChat = ({ crewId, onMessage, onConnectionChange, onError }) => {
  const token = localStorage.getItem("accessToken");
  const client = new Client({
    brokerURL: websocketUrl(),
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => {},
    onConnect: () => {
      onConnectionChange?.(true);
      client.subscribe(`/topic/crews/${crewId}`, (frame) => onMessage?.(JSON.parse(frame.body)));
    },
    onWebSocketClose: () => onConnectionChange?.(false),
    onStompError: (frame) => onError?.(new Error(frame.headers.message || "채팅 연결에 실패했습니다.")),
    onWebSocketError: () => onError?.(new Error("채팅 서버에 연결할 수 없습니다.")),
  });
  client.activate();
  return {
    send: (payload) => client.publish({
      destination: `/app/crews/${crewId}/messages`,
      body: JSON.stringify(payload),
    }),
    disconnect: () => client.deactivate(),
  };
};

export const crewPageItems = (page) => page?.items || page?.content || (Array.isArray(page) ? page : []);
