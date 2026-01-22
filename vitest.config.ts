import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Look for tests in plugins and tests directories
    include: [
      'plugins/**/tests/**/*.test.ts',
      'tests/**/*.test.ts',
      'tests/plugins/**/*.test.ts',
      'tests/entities/**/*.test.ts',
    ],
    // Exclude plugins in .needs-work folder
    exclude: [
      'plugins/.needs-work/**',
      'node_modules/**',
    ],
    
    // Setup file runs in same process as tests
    setupFiles: ['./tests/setup.ts'],
    
    // Test environment
    environment: 'node',
    
    // Timeout for slow operations
    testTimeout: 30000,
    
    // Run tests sequentially (MCP connection is shared)
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,  // All tests in one process to share MCP connection
      },
    },
    
    // Reporter
    reporter: ['verbose'],
  },
});
