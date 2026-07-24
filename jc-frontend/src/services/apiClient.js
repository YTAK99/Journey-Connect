import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("loginUser");
    }

    return Promise.reject(error);
  },
);

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
