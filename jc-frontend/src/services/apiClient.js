import axios from "axios";

const publicAuthPaths = new Set(["/auth/login", "/auth/signup", "/auth/refresh", "/auth/logout"]);

const isProtectedGetPath = (requestPath = "") =>
  requestPath === "/auth/me" ||
  requestPath === "/users/me" ||
  requestPath.startsWith("/users/me/") ||
  requestPath === "/notifications" ||
  requestPath.startsWith("/notifications/") ||
  requestPath === "/crews/recommended" ||
  /^\/crews\/[^/]+\/applications$/.test(requestPath) ||
  requestPath.startsWith("/admin/");

const isPublicReadRequest = (config) => {
  const method = String(config?.method || "get").toLowerCase();
  const requestPath = config?.url?.split("?")[0] || "";
  return method === "get" && !isProtectedGetPath(requestPath);
};

const getJwtExpiryMs = (token) => {
  try {
    const payloadSegment = String(token || "").split(".")[1];
    if (!payloadSegment) return null;

    const normalized = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    const payload = JSON.parse(atob(padded));
    const exp = Number(payload.exp);
    return Number.isFinite(exp) ? exp * 1000 : null;
  } catch {
    return null;
  }
};

const isExpiredAccessToken = (token) => {
  const expiryMs = getJwtExpiryMs(token);
  return expiryMs != null && expiryMs <= Date.now() + 5000;
};

const containsKorean = (value) => /[가-힣]/.test(String(value || ""));
const toMessage = (value) => (typeof value === "string" ? value : "");

export function clearStoredAuth() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("loginUser");
  window.dispatchEvent(new Event("jc:auth-cleared"));
}

export function createApiClient(baseURL) {
  const client = axios.create({
    baseURL,
    timeout: 10000,
    headers: { "Content-Type": "application/json" },
  });

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken");
    const requestPath = config.url?.split("?")[0];
    const publicRead = isPublicReadRequest(config);

    if (config.__jcAnonymousRetry) {
      if (config.headers) delete config.headers.Authorization;
      return config;
    }

    const skipExpiredTokenOnPublicRead =
      publicRead && token && isExpiredAccessToken(token);

    if (
      token &&
      !skipExpiredTokenOnPublicRead &&
      !publicAuthPaths.has(requestPath)
    ) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const requestPath = error.config?.url?.split("?")[0] || "";
      const publicRead = isPublicReadRequest(error.config);
      const isProtectedRequest =
        !publicAuthPaths.has(requestPath) && !publicRead;
      const hadActiveSession = Boolean(localStorage.getItem("accessToken"));

      if (
        error.response?.status === 401 &&
        publicRead &&
        error.config?.headers?.Authorization &&
        !error.config.__jcAnonymousRetry
      ) {
        const retryConfig = {
          ...error.config,
          __jcAnonymousRetry: true,
          headers: { ...error.config.headers },
        };
        delete retryConfig.headers.Authorization;
        return client.request(retryConfig);
      }

      if (
        error.response?.status === 401 &&
        isProtectedRequest &&
        hadActiveSession
      ) {
        clearStoredAuth();
        window.dispatchEvent(new Event("jc:auth-expired"));
      }
      return Promise.reject(error);
    },
  );
  return client;
}

const apiClient = createApiClient(import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1");

export const unwrapApiResponse = (response) => response.data?.data ?? response.data;
export const getApiErrorMessage = (error, fallbackMessage = "요청 처리에 실패했습니다.") => {
  const remoteMessage =
    toMessage(error.response?.data?.message) ||
    toMessage(error.response?.data?.error?.message) ||
    toMessage(error.response?.data?.error);

  // 영어 UI용 fallback이 전달됐는데 서버 메시지가 한국어라면 locale 불일치를 노출하지 않습니다.
  if (remoteMessage && !containsKorean(fallbackMessage) && containsKorean(remoteMessage)) {
    return fallbackMessage;
  }

  return remoteMessage || toMessage(error.message) || fallbackMessage;
};

export default apiClient;
