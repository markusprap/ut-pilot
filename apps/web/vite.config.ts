import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:4001',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    plugins: [react()],
    define: {
      // API Key removed for security. Backend handles API calls.
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    build: {
      target: 'esnext'
    },
    esbuild: {
      target: 'esnext'
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'esnext'
      }
    }
  };
});
