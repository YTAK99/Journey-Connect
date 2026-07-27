import axios from "axios";

// 모든 백엔드 요청이 공유하는 기본 주소·타임아웃·JSON 헤더를 정의합니다.
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  // 로그인 뒤 저장된 JWT를 매 요청의 Authorization 헤더에 자동으로 붙입니다.
  const token = localStorage.getItem("accessToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 인증이 만료된 상태를 브라우저에 남기지 않아 다음 화면에서 재로그인을 유도합니다.
    if (error.response?.status === 401) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("loginUser");
    }

    return Promise.reject(error);
  },
);

// 백엔드 공통 응답 { data: ... }와 래핑되지 않은 응답을 모두 같은 형태로 돌려줍니다.
export const unwrapApiResponse = (response) => response.data?.data ?? response.data;

export const getApiErrorMessage = (error, fallbackMessage = "요청 처리에 실패했습니다.") => {
  return (
    error.response?.data?.message ||
    error.response?.data?.error?.message ||
    error.response?.data?.error ||
    error.message ||
    fallbackMessage
  );
};

export default apiClient;
