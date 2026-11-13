import { defineConfig } from 'vitest/config';

// Full simulated matches take about a second each; statistical tests run several.
export default defineConfig({ test: { testTimeout: 120_000 } });
