import { spawn } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const PHP = 'localhost:8000';

// `npm start` lance aussi le backend PHP (comptes, favoris), arrêté avec Vite
const backend = {
  name: 'backend-php',
  apply: 'serve',
  configureServer(server) {
    const racine = fileURLToPath(new URL('../back/public', import.meta.url));
    const php = spawn('php', ['-S', PHP, '-t', racine], { stdio: 'ignore' });
    php.on('error', () =>
      server.config.logger.warn('\n  PHP introuvable : comptes et favoris désactivés. Installer avec « brew install php ».\n'),
    );
    server.httpServer?.on('close', () => php.kill());
    process.on('exit', () => php.kill());
  },
};

export default defineConfig({
  plugins: [react(), backend],
  server: { proxy: { '^/\\w+\\.php': `http://${PHP}` } }, // tous les .php → serveur PHP
});
