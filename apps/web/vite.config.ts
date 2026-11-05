import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    // Same origin in dev so the session cookie works (ADR-004).
    proxy: { '/v1': 'http://127.0.0.1:3000' },
  },
  test: { include: ['src/**/*.test.{ts,tsx}'], environment: 'node' },
});
