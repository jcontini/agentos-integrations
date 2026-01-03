import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Look for tests in apps and connectors directories
    include: [
      'apps/**/tests/**/*.test.ts',
      'connectors/**/tests/**/*.test.ts',
    ],
    
    // Setup file runs in same process as tests (unlike globalSetup)
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
