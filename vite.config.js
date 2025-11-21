import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // https://vite.dev/config/
  plugins: [react()],
  base: process.env.VITE_PUBLIC_BASE_PATH || '/',
  server: {
    port: process.env.PORT || 8080,
    host: '0.0.0.0',
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
  },
});
