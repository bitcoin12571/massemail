import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  server: {
    port: Number(process.env.FRONTEND_PORT || 3000),
    hmr: false,
    middlewareMode: false
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
