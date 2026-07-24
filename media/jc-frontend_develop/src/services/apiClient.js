import axios from 'axios';

/**
 * Spring Boot 백엔드 API와 규격화된 데이터 송수신을 위한 Axios 커스텀 인스턴스
 */
const apiClient = axios.create({
    baseURL: 'http://localhost:8080/api/v1', // 백엔드 기본 자원 기반 REST URI 명시 규칙 반영
    timeout: 5000, // API 요청 후 5초 동안 응답이 없으면 타임아웃 처리
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true // JWT 토큰인증이나 세션 쿠키를 백엔드와 안전하게 공유하기 위한 필수 옵션
});

// HTTP 요청 가로채기(Interceptor) 설정 - 향후 로그인 구현 시 JWT 토큰을 자동으로 헤더에 주입하는 공간
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`; // 백엔드 Swagger인증 포맷과 매핑
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default apiClient;