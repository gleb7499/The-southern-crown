import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use 'backend' hostname when running in Docker, 'localhost' otherwise
const backendUrl = process.env.DOCKER_ENV === 'true' ? 'http://backend:8000' : 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/auth': {
        target: backendUrl,
        changeOrigin: true
      },
      '/api': {
        target: backendUrl,
        changeOrigin: true
      }
    }
  }
})
