import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
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
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/admin/, /\/menu-data\.json$/],
        runtimeCaching: [
          {
            // Always try network first for the live menu data; fall back to cache offline
            urlPattern: ({ url }) => url.pathname.endsWith('/menu-data.json'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'menu-data',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 * 7 }
            }
          },
          {
            urlPattern: ({ url }) => url.hostname === 'images.unsplash.com' || url.hostname === 'loremflickr.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'menu-photos',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
        ]
      },
      devOptions: { enabled: false }
    })
  ],
  server: {
    port: 5173,
    open: true
  }
});
