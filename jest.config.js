const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.test.json');

const aliasMapper = pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' });

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transformIgnorePatterns: ['node_modules/(?!(p-map|lodash-es)/)'],
  moduleNameMapper: {
    ...aliasMapper,
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^lodash-es$': 'lodash'
  },
  testMatch: ['<rootDir>/packages/**/*.spec.ts', '<rootDir>/packages/**/__tests__/**/*.ts'],
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }]
  }
};
