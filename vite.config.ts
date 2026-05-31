import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
        },
      },
      '/health': 'http://127.0.0.1:8787',
      '/login': 'http://127.0.0.1:8787',
      '/manifest.json': 'http://127.0.0.1:8787',
      '/sw.js': 'http://127.0.0.1:8787',
      '/favicon.ico': 'http://127.0.0.1:8787',
      '/session': 'http://127.0.0.1:8787',
      '/extensions': 'http://127.0.0.1:8787',
      '/static': 'http://127.0.0.1:8787',
    },
  },
})
