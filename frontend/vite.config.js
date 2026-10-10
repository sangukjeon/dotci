import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 개발 중에는 /api 요청을 내 컴퓨터의 FastAPI(8000번)로 넘긴다.
    // 배포 후에는 vercel.json의 rewrites가 같은 일을 한다.
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
