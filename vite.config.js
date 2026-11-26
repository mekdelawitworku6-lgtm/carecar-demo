import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Portfolio demo: fully static, no backend, no service worker, no env vars.
// `base: './'` keeps asset paths relative so the build works on Render,
// GitHub Pages project sites, or any sub-path host.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 4173,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1600,
  },
})
