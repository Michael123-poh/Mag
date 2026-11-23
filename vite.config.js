import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
const apiTarget = process.env.API_TARGET || 'http://127.0.0.1:3001'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // accessible depuis les autres ordinateurs du réseau (http://adresse-de-ce-pc:5173) et pas seulement depuis ce PC
    // Les appels /api sont transmis au serveur Node (même origine côté navigateur : cookie de session sécurisé, pas de CORS)
    proxy: { '/api': apiTarget },
  },
  preview: {
    host: true,
    proxy: { '/api': apiTarget },
  },
})
