/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.spec.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.test.json'
    }]
  },
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/node-yalc/'],
  moduleNameMapper: {
    '^@ferrox-node/(.*)$': '<rootDir>/packages/$1/src',
    '^@node-yalc/([^/]+)$': '<rootDir>/node-yalc/$1/src',
    '^@node-yalc/([^/]+)/(.*)$': '<rootDir>/node-yalc/$1/src/$2',
    '^lodash-es(.*)$': 'lodash$1',
    '^../../../../sentinel/dist/index$': '<rootDir>/__mocks__/sentinel.ts'
  },
  resolver: '<rootDir>/jest-resolver.js',
  transformIgnorePatterns: [
    'node_modules/(?!lodash-es|p-map)'
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    '!packages/*/src/**/index.ts', // mostly re-exports
    '!packages/core/src/index.ts',
    '!packages/core/src/**/index.ts',
    '!packages/core/src/dummy-app.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  }
};
