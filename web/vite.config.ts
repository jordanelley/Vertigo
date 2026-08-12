import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves the production build as a project site at /Vertigo/, not the domain
  // root, so every asset URL needs that prefix baked in - but only for `vite build`, otherwise
  // local dev would have to be visited at localhost:5173/Vertigo/ instead of the root.
  base: command === 'build' ? '/Vertigo/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
}))
