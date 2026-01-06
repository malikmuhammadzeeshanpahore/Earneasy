import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // enable network access and use a non-privileged port for local dev
    host: true,
    port: 5173,
  },
})
