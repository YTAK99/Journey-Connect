import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // 로컬 개발에서도 프로젝트 루트의 .env를 공통 설정 파일로 사용합니다.
  envDir: '..',
  plugins: [react()],
  server: {
    // 업로드 API가 반환하는 동일 출처 이미지 경로를 로컬에서도 백엔드로 전달합니다.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
