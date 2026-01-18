import { Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

/**
 * Simple logger interface for formatting operations
 */
interface SimpleLogger {
  warn?: (message: string) => void;
  debug?: (message: string) => void;
}

/**
 * Formats TypeScript files in the generated SDK using Prettier.
 * This function formats all .ts and .tsx files in the src directory.
 *
 * @param outDir - The output directory where the SDK was generated
 * @param srcDir - The source directory path (e.g., "src" or "src/sdk"). Defaults to "src".
 * @param logger - Optional logger instance for logging formatting progress
 * @returns Promise that resolves when formatting is complete
 */
export async function formatWithPrettier(
  outDir: string,
  srcDir: string = 'src',
  logger?: Logger | SimpleLogger
): Promise<void> {
  const log = logger || console;

  try {
    // Check if Prettier is available
    try {
      await execAsync('npx --yes prettier --version', {
        cwd: outDir,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });
    } catch (error) {
      log.warn?.(
        'Prettier is not available. Skipping code formatting. Install prettier to enable formatting.'
      );
      return;
    }

    // Format all TypeScript files in the src directory
    const srcDirPath = path.join(outDir, srcDir);

    // Check if src directory exists
    if (!fs.existsSync(srcDirPath)) {
      log.warn?.(
        `Source directory not found at ${srcDirPath}. Skipping formatting.`
      );
      return;
    }

    // Use Prettier to format all TypeScript files
    // Prettier will use the .prettierrc file in the outDir if it exists
    // Use --loglevel=error to suppress informational output (only show errors)
    // Escape the srcDir path for use in the glob pattern
    const escapedSrcDir = srcDir.replace(/\\/g, '/');
    const { stdout, stderr } = await execAsync(
      `npx --yes prettier --write --log-level=error "${escapedSrcDir}/**/*.{ts,tsx}"`,
      {
        cwd: outDir,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      }
    );

    // Only log stderr (errors), stdout is suppressed by --loglevel=error
    if (stderr && !stderr.includes('warning')) {
      log.warn?.(stderr);
    }
  } catch (error) {
    // Don't fail generation if formatting fails - just log a warning
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.warn?.(
      `Failed to format code with Prettier: ${errorMessage}. Generated code will not be formatted.`
    );
  }
}
