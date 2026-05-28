import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'logo.svg', 'logo-icon.svg', 'logo-lockup.svg', 'logo-mark.svg',
        'apple-touch-icon.png', 'favicon-32.png'
      ],
      manifest: {
        name: 'Pipón Pipón — Comidas caseras',
        short_name: 'Pipón',
        description: 'Comidas caseras todos los días. Pedí online por WhatsApp en Vega Maipú.',
        theme_color: '#F27900',
        background_color: '#111111',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'es-AR',
        icons: [
          { src: 'icon-192.png',          sizes: '192x192', type: 'image/png', purpose: 'any'      },
          { src: 'icon-512.png',          sizes: '512x512', type: 'image/png', purpose: 'any'      },
          { src: 'icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      },
      devOptions: { enabled: false }
    })
  ],
  server: {
    port: 5173,
    open: true
  }
});
