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
 * Formats specific TypeScript files in the generated SDK using Prettier.
 * This function formats only the files that were explicitly generated.
 *
 * @param outDir - The output directory where the SDK was generated
 * @param filesToFormat - Array of file paths (relative to outDir) to format. Only .ts and .tsx files will be formatted.
 * @param logger - Optional logger instance for logging formatting progress
 * @returns Promise that resolves when formatting is complete
 */
export async function formatWithPrettier(
  outDir: string,
  filesToFormat: string[],
  logger?: Logger | SimpleLogger
): Promise<void> {
  const log = logger || console;

  try {
    // Check if Prettier is available
    try {
      await execAsync('npx --yes prettier --version', {
        cwd: outDir,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        // Don't set shell explicitly - let Node.js use the default
      });
    } catch {
      log.warn?.(
        'Prettier is not available. Skipping code formatting. Install prettier to enable formatting.'
      );
      return;
    }

    // Filter to only TypeScript files and check they exist
    const tsFilesToFormat: string[] = [];
    for (const file of filesToFormat) {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const fullPath = path.join(outDir, file);
        if (fs.existsSync(fullPath)) {
          tsFilesToFormat.push(file);
        }
      }
    }

    if (tsFilesToFormat.length === 0) {
      log.debug?.('No TypeScript files to format.');
      return;
    }

    // Use Prettier to format only the specific files we generated
    // Prettier will use the .prettierrc file in the outDir if it exists
    // Use --loglevel=error to suppress informational output (only show errors)
    // Escape file paths for use in the command
    const escapedFiles = tsFilesToFormat
      .map((file) => {
        const escaped = file.replace(/\\/g, '/');
        return `"${escaped}"`;
      })
      .join(' ');

    const { stderr } = await execAsync(
      `npx --yes prettier --write --log-level=error ${escapedFiles}`,
      {
        cwd: outDir,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        // Don't set shell explicitly - let Node.js use the default
        // This works better across different platforms
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
