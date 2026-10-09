import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost:5173/', pretendToBeVisual: true } },
    include: ['test/**/*.spec.ts', 'tests/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
    restoreMocks: true,
    clearMocks: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/core/**/*.ts', 'src/node/**/*.ts', 'src/client/options.ts'],
      exclude: ['src/core/types.ts', 'src/core/index.ts', 'src/core/styles.ts'],
      thresholds: { perFile: true, statements: 90, lines: 90, functions: 90, branches: 80 },
    },
  },
});
