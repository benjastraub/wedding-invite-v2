import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// babel-plugin-styled-components gives readable class names and better
// debugging; it is a dev-time nicety and does not change runtime behavior.
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-styled-components'],
      },
    }),
  ],
  server: {
    port: 5173,
    // In development the Express API runs separately on :8080.
    // No CORS anywhere: same origin in production, proxied here in dev.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
