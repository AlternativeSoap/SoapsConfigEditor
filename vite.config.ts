import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub project Pages live under /SoapsConfigEditor/. Local and Tauri builds stay at /.
const base = process.env.GITHUB_PAGES === 'true' ? '/SoapsConfigEditor/' : '/'

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
  },
})
