import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 3000,
    proxy: {
      '/update-annotation': 'http://localhost:3001',
      '/included_files.csv': 'http://localhost:3001',
      '/midi': 'http://localhost:3001'
    }
  },
  build: {
    outDir: 'dist'
  }
})