import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',

    // Test file patterns
    include: ['**/*.test.ts', '**/*.it.test.ts', '**/*.e2e.it.test.ts'],

    // Setup files
    setupFiles: ['./src/test/setup.ts'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.it.test.ts',
        'src/**/*.e2e.it.test.ts',
        'src/**/*.d.ts',
        'src/test/**',
        'dist/**',
      ],
    },

    // Clear mocks between tests
    clearMocks: true,
    restoreMocks: true,
  },

  // Module resolution
  resolve: {
    alias: {
      '@': '/src',
      '@lib': '/src/lib',
      '@commands': '/src/commands',
      '@mcp': '/src/mcp',
    },
  },
  plugins: [
    swc.vite({
      module: {
        type: 'es6',
      },
    }),
  ],
});
