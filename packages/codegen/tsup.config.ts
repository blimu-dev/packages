import { defineConfig } from 'tsup';

// No externals for CLI - bundle everything for self-contained executable
// This ensures the CLI works even when installed globally or in isolated environments

// For library build, we could keep some externals, but bundling ensures
// it works out of the box without requiring users to install dependencies
// Note: Node.js built-ins (fs, path, etc.) are automatically external by tsup

// Shared function to copy templates to dist
async function copyTemplates() {
  const { copyFileSync, mkdirSync, readdirSync, statSync } = await import('fs');
  const { join } = await import('path');

  const srcTemplatesDir = join(
    process.cwd(),
    'src/generator/typescript/templates'
  );
  const distTemplatesDir = join(
    process.cwd(),
    'dist/generator/typescript/templates'
  );

  try {
    // Check if source templates directory exists
    const srcStats = statSync(srcTemplatesDir);
    if (!srcStats.isDirectory()) {
      console.warn(
        `Templates directory is not a directory: ${srcTemplatesDir}`
      );
      return;
    }

    // Create dist templates directory
    mkdirSync(distTemplatesDir, { recursive: true });

    // Copy all template files
    const files = readdirSync(srcTemplatesDir);
    for (const file of files) {
      const srcPath = join(srcTemplatesDir, file);
      const distPath = join(distTemplatesDir, file);
      const fileStats = statSync(srcPath);
      if (fileStats.isFile()) {
        copyFileSync(srcPath, distPath);
      }
    }
  } catch (error: any) {
    // Only warn if it's not a "not found" error
    if (error.code !== 'ENOENT') {
      console.warn('Could not copy templates:', error.message);
    }
    // ENOENT is okay - templates might not exist yet during initial setup
  }
}

export default defineConfig([
  {
    // CLI entry point (main.ts)
    // Bundle everything for a self-contained CLI tool
    entry: ['src/main.ts'],
    format: ['cjs'],
    dts: false, // CLI doesn't need type declarations
    splitting: false,
    sourcemap: true,
    clean: true, // Clean dist before first build
    minify: true, // Minify for smaller bundle size
    outDir: 'dist',
    banner: {
      js: '#!/usr/bin/env node',
    },
    // No externals - bundle all dependencies for self-contained CLI
    external: [],
    onSuccess: copyTemplates,
  },
  {
    // Library entry point (index.ts)
    // Bundle dependencies to ensure it works out of the box
    // Users don't need to worry about installing transitive dependencies
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: {
      resolve: true, // Enable DTS generation with dependency resolution
    },
    splitting: false,
    sourcemap: true,
    clean: false, // Don't clean - CLI build already cleaned and copied templates
    minify: false, // Don't minify libraries - users will minify in their own builds
    outDir: 'dist',
    // No externals - bundle all dependencies for easier consumption
    // This ensures the library works out of the box without requiring users to install dependencies
    // Tradeoff: Larger bundle size, but better developer experience
    // Note: For production libraries, consider externalizing common dependencies (zod, @nestjs/*, etc.)
    // and declaring them as peerDependencies to reduce bundle size
    external: [],
    tsconfig: './tsconfig.json', // Explicitly reference tsconfig
    onSuccess: copyTemplates, // Also copy templates for library build
  },
]);
