import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1
  },
});
