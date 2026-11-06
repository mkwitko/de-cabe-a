import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.int.test.ts'],
    globalSetup: ['src/test/global-setup.ts'],
    // ponytail: one shared "test" schema, files run serially; schema per worker if the suite grows slow.
    fileParallelism: false,
  },
});
