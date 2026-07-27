import apiClient, { unwrapApiResponse } from "./apiClient";

// 인증 성공 응답을 한 번에 저장해 이후 API 요청과 화면의 사용자 표시에 함께 사용합니다.
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

  return saveAuth(unwrapApiResponse(response));
};

export const login = async (email, password) => {
  const response = await apiClient.post("/auth/login", {
    email,
    password,
  });

  return saveAuth(unwrapApiResponse(response));
};

export const logout = async () => {
  const refreshToken = localStorage.getItem("refreshToken");

  try {
    // 서버에는 리프레시 토큰 폐기를 요청하고, 실패하더라도 로컬 로그인 정보는 반드시 지웁니다.
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
  const user = unwrapApiResponse(response);

  localStorage.setItem("loginUser", JSON.stringify(user));
  return user;
};

export const getUser = () => {
  const storedUser = localStorage.getItem("loginUser");
  return storedUser ? JSON.parse(storedUser) : null;
};

export const isLogin = () => Boolean(localStorage.getItem("accessToken"));

export const findId = () => null;
export const findPassword = () => null;
