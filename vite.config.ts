import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'favicon.ico',
        'robots.txt',
        'sitemap.xml',
        'icon-192x192.png',
        'icon-512x512.png',
        'icon-192x192-maskable.png',
        'icon-512x512-maskable.png',
      ],
      manifest: {
        name: 'ScamGuard - Protect Yourself from Scams',
        short_name: 'ScamGuard',
        description: 'AI-powered scam detection tool to help you identify and protect against phishing, fraud, and malicious content',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-192x192-maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icon-512x512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          // Cache API responses with network-first strategy
          {
            urlPattern: /^https:\/\/.*\/api\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 3600, // 1 hour
              },
            },
          },
          // Cache static assets with cache-first strategy
          {
            urlPattern: /^https:\/\/.*(\.js|\.css|\.html|\.svg|\.woff2)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 604800, // 1 week
              },
            },
          },
          // Cache images with cache-first strategy
          {
            urlPattern: /^https:\/\/.*(\.png|\.jpg|\.jpeg|\.gif|\.webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 2592000, // 30 days
              },
            },
          },
        ],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
        navigator: {
          onOffline() {
            console.log('Offline mode enabled');
          },
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
