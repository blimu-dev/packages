import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/sdk/**/*.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  tsconfig: './tsconfig.json',
  // External dependencies should not be bundled
  // This ensures proper type resolution and smaller bundle sizes
  external: [],
});
