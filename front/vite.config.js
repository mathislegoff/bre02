import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '^/\\w+\\.php': 'http://localhost:8000' } }, // tous les .php → serveur PHP
});
