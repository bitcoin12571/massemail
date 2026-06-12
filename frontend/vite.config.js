import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.FRONTEND_PORT || 3000),
    strictPort: true,
    hmr: false,
    middlewareMode: false,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          mui: ['@mui/material', '@emotion/react', '@emotion/styled'],
          motion: ['framer-motion'],
          charts: ['recharts']
        }
      }
    }
  }
});
