/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/*.test.ts',
    '**/*.it.test.ts', 
    '**/*.e2e.it.test.ts',
  ],
  
  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@commands/(.*)$': '<rootDir>/src/commands/$1',
    '^@mcp/(.*)$': '<rootDir>/src/mcp/$1',
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  
  // Coverage
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.it.test.ts',
    '!src/**/*.e2e.it.test.ts',
    '!src/**/*.d.ts',
    '!src/test/**',
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      isolatedModules: true,
    }],
  },
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
};