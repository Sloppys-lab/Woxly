import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@woxly/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@woxly/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  build: {
    rollupOptions: {
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
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://woxly.ru', // Используем продакшн API
        changeOrigin: true,
      },
      '/ws': {
        target: 'wss://woxly.ru', // Используем продакшн WebSocket
        ws: true,
        changeOrigin: true,
      },
    },
  },
  // Для DEV режима используем продакшн API
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('https://woxly.ru/api'),
  },
})

