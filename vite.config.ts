import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'
  return {
    // En producción la app se sirve bajo la subruta del repo (GitHub Pages).
    base: isProduction ? '/Aromia_web/' : '/',
    plugins: [react()],
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  }
})