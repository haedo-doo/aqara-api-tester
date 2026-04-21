import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Aqara API 프록시
      '/aqara-api': {
        target: 'https://open-kr.aqara.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/aqara-api/, '/v3.0/open/api'),
      },
      // 로컬에서 /api/ 요청을 로컬 Express 서버로 프록시
      '/api/push': { target: 'http://localhost:3001', changeOrigin: true },
      '/api/messages': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});