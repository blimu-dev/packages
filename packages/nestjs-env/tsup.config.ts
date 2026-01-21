import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  tsconfig: './tsconfig.json',
  outExtension({ format }) {
    return format === 'esm' ? { js: '.mjs' } : { js: '.cjs' };
  },
  external: [
    '@nestjs/common',
    '@nestjs/core',
    '@nestjs/config',
    'reflect-metadata',
    'rxjs',
    'zod',
  ],
});
