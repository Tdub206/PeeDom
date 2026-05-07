module.exports = {
  preset: 'ts-jest',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/_preflight/',
    '/\\.claude/',
  ],
  // Exclude nested package.json files from haste module map to prevent naming
  // collisions (e.g. _preflight/ shares the same "peedom-mobile" package name).
  modulePathIgnorePatterns: [
    '<rootDir>/_preflight/',
    '<rootDir>/.claude/',
    '<rootDir>/.codex/',
    '<rootDir>/StallPass/',
    '<rootDir>/StallPass\\.git/',
  ],
};
