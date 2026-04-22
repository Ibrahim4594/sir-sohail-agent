import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'components/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    // Loads .env.local into process.env before any test module imports,
    // so integration tests can reach Supabase + Gemini just like the
    // Next.js app does in dev.
    setupFiles: ['tests/setup-env.ts'],
    // Integration tests call live Gemini; the 5-stage pipeline can
    // take 3-8s per golden case. Unit tests (the vast majority) run
    // well under a second and aren't hurt by the higher cap.
    testTimeout: 60000,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
