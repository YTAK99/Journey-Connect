import apiClient from "./apiClient";

const saveAuth = (tokenResponse) => {
  localStorage.setItem("accessToken", tokenResponse.accessToken);
  localStorage.setItem("refreshToken", tokenResponse.refreshToken);
  localStorage.setItem("loginUser", JSON.stringify(tokenResponse.user));

  return tokenResponse.user;
};

export const signup = async ({ email, password, nickname }) => {
  const response = await apiClient.post("/auth/signup", {
    email,
    password,
    nickname,
  });

  return saveAuth(response.data.data);
};

export const login = async (email, password) => {
  const response = await apiClient.post("/auth/login", {
    email,
    password,
  });

  return saveAuth(response.data.data);
};

export const logout = async () => {
  const refreshToken = localStorage.getItem("refreshToken");

  try {
    if (refreshToken) {
      await apiClient.post("/auth/logout", { refreshToken });
    }
  } finally {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("loginUser");
  }
};

export const fetchCurrentUser = async () => {
  const response = await apiClient.get("/auth/me");
  const user = response.data.data;

  localStorage.setItem("loginUser", JSON.stringify(user));
  return user;
};

export const getUser = () => {
  const storedUser = localStorage.getItem("loginUser");
  return storedUser ? JSON.parse(storedUser) : null;
};

export const isLogin = () => Boolean(localStorage.getItem("accessToken"));

// 현재 백엔드에 아이디/비밀번호 찾기 API가 없어 기존 화면 호환용으로 유지합니다.
export const findId = () => null;
export const findPassword = () => null;
