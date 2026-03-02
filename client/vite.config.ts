import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Load .env from the monorepo root instead of the client folder
  envDir: path.resolve(__dirname, '../'),
})
