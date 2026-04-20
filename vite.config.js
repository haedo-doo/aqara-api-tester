import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ===== 로컬 개발환경 CORS 프록시 설정 =====
// Vercel 배포 시에는 vercel.json의 rewrite가 사용됨
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/aqara-api': {
        target: 'https://open-kr.aqara.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/aqara-api/, '/v3.0/open/api'),
      },
    },
  },
});