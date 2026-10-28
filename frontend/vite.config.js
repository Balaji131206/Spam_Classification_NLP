import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server on 5173 proxies /api to FastAPI on 8000, so the same relative
// URLs work in development and in the production build served by FastAPI.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        // Split vendor code so no single chunk trips the 500 kB warning.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
        },
      },
    },
  },
});
