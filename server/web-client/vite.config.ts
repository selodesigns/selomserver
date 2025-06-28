import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3241',
        changeOrigin: true,
        secure: false,
      },
      '/status': {
        target: 'http://localhost:3241',
        changeOrigin: true,
        secure: false,
      },
      '/identity': {
        target: 'http://localhost:3241',
        changeOrigin: true,
        secure: false,
      },
    }
  },
  build: {
    rollupOptions: {
      external: ['hls.js', '@popperjs/core', 'engine.io-parser'],
      output: {
        globals: {
          'hls.js': 'Hls',
          '@popperjs/core': 'Popper',
          'engine.io-parser': 'EngineIoParser'
        }
      }
    }
  }
})
