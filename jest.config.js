module.exports = {
  preset: 'ts-jest',
  roots: ['<rootDir>/__tests__'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'node',
  testRegex: '.*\\.test\\.ts$',
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
    '<rootDir>/StallPass/',
    '<rootDir>/StallPass\\.git/',
  ],
};
