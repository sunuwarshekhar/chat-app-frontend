import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function suppressProxyConnectionErrors() {
  return {
    name: 'suppress-proxy-connection-errors',
    configureServer() {
      const orig = console.error;
      console.error = (...args: unknown[]) => {
        const full = args
          .map((a) =>
            a instanceof Error ? a.message + (a.stack ?? '') : String(a),
          )
          .join(' ');
        const isProxyConnectionError =
          (full.includes('ECONNABORTED') || full.includes('ECONNRESET')) &&
          (full.includes('proxy') ||
            full.includes('socket') ||
            full.includes('node:internal') ||
            full.includes('node:net'));
        const isViteProxyLog =
          full.includes('[vite] ws proxy') ||
          full.includes('ws proxy socket error');
        if (isProxyConnectionError || isViteProxyLog) return;
        orig.apply(console, args);
      };
    },
  };
}

export default defineConfig({
  plugins: [react(), suppressProxyConnectionErrors()],
  server: {
    port: 5173,
    host: true, // listen on all network interfaces
    allowedHosts: ['.ngrok-free.app'], // allow any ngrok URL
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy) => {
          proxy.on('error', (err: NodeJS.ErrnoException) => {
            if (err.code !== 'ECONNABORTED' && err.code !== 'ECONNRESET') {
              console.error('[proxy /api]', err.message);
            }
          });
        },
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (err: NodeJS.ErrnoException) => {
            if (err.code !== 'ECONNABORTED' && err.code !== 'ECONNRESET') {
              console.error('[proxy /socket.io]', err.message);
            }
          });
        },
      },
    },
  },
});
