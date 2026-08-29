import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Integration tests run via vitest.integration.config.ts (need a test DB).
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/integration/**'],
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/modules/**'],
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'coverage',
      // In-repo regression gate (L6): fail the build if coverage drops.
      thresholds: {
        statements: 90,
        lines: 90,
        functions: 90,
        branches: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
