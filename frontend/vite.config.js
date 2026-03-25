import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],

  server: {
    port: 5173,
    strictPort: true,   // fail immediately if 5173 is taken, instead of auto-incrementing
    host: true,         // expose on LAN (useful for tablet/phone control surfaces)
  },

  preview: {
    port: 5173,
    strictPort: true,
  },
});