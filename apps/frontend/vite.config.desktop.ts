import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Специальная конфигурация для Desktop приложения
export default defineConfig({
  plugins: [react()],
  
  base: './', // Относительные пути для локальных файлов
  
  resolve: {
    alias: {
      '@woxly/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@woxly/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  
  build: {
    outDir: '../desktop/dist-vite', // Собираем прямо в папку desktop
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild', // Используем esbuild вместо terser
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.desktop.html'),
      },
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'socket-vendor': ['socket.io-client'],
          'ui-vendor': ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  
  server: {
    port: 5173,
  },
  
  // Важно: для Desktop API должен быть на продакшн сервере
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('https://woxly.ru/api'),
    'import.meta.env.VITE_WS_URL': JSON.stringify('https://woxly.ru'),
  },
});







