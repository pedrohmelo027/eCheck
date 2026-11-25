/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/helpers/setupEnv.ts'],
  // Os testes usam o mesmo banco de desenvolvimento: rodar um arquivo por vez evita que um limpe os dados do outro.
  maxWorkers: 1,
  testTimeout: 30000,
};
