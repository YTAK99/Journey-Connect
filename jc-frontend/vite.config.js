import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // 로컬 개발에서도 프로젝트 루트의 .env를 공통 설정 파일로 사용합니다.
  envDir: '..',
  plugins: [react()],
})
