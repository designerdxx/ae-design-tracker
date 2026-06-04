import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Distinct dev port + strictPort so we never silently attach to another local project's
  // server (the sibling ae-ds project uses 5173).
  server: { port: 5183, strictPort: true },
})
