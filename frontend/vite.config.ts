import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      includeManifestIcons: false,
      manifest: {
        name: "Worker",
        short_name: "Worker",
        description: "Управление графиком склада",
        theme_color: "#034788",
        background_color: "#f9fafb",
        display: "standalone",
        display_override: ["standalone", "browser"],
        orientation: "portrait",
        start_url: "/",
        categories: ["business", "productivity"],
        prefer_related_applications: false,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['trimly-whole-yellowhammer.cloudpub.ru'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
})
