/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        module: 'ESNext',
        target: 'ES2022'
      }
    }]
  },
  
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1' // Fix for ESM imports in TS
  },
  
  transformIgnorePatterns: [
    'node_modules/(?!(@octokit|universal-user-agent|before-after-hook|@octokit/.*)/)'
  ],
  
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/cli.ts'
  ],
  
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // CI-specific settings can be overridden via CLI flags
  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true
};