import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base must match the GitHub repo name for GitHub Pages.
// Repo: badminton-tracker  ->  served at https://<user>.github.io/badminton-tracker/
export default defineConfig({
  plugins: [react()],
  base: '/badminton-tracker/',
})
