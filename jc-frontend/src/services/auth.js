import apiClient, { clearStoredAuth, unwrapApiResponse } from "./apiClient";

const saveAuth = (tokenResponse) => {
  localStorage.setItem("accessToken", tokenResponse.accessToken);
  localStorage.setItem("refreshToken", tokenResponse.refreshToken);
  localStorage.setItem("loginUser", JSON.stringify(tokenResponse.user));
  return tokenResponse.user;
};

export const signup = async ({ email, password, nickname }) => {
  const response = await apiClient.post("/auth/signup", { email, password, nickname });
  return saveAuth(unwrapApiResponse(response));
};

export const login = async (emailOrRequest, password) => {
  const request = typeof emailOrRequest === "object" && emailOrRequest !== null
    ? emailOrRequest
    : { email: emailOrRequest, password };
  const response = await apiClient.post("/auth/login", request);
  return saveAuth(unwrapApiResponse(response));
};

export const logout = async () => {
  const refreshToken = localStorage.getItem("refreshToken");
  try {
    if (refreshToken) await apiClient.post("/auth/logout", { refreshToken });
  } finally {
    clearStoredAuth();
  }
};

export const fetchCurrentUser = async () => {
  const response = await apiClient.get("/auth/me");
  const user = unwrapApiResponse(response);
  localStorage.setItem("loginUser", JSON.stringify(user));
  return user;
};

export const getUser = () => {
  try {
    const storedUser = localStorage.getItem("loginUser");
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    clearStoredAuth();
    return null;
  }
};

export const isLogin = () => Boolean(localStorage.getItem("accessToken"));
export const findId = () => null;
export const findPassword = () => null;
