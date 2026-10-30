import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The client calls the backend on the same origin (/api) in production.
// During local development Vite proxies /api to the Express server.
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
});
