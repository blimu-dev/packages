import { Logger } from "@nestjs/common";
import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs";

const execAsync = promisify(exec);

/**
 * Simple logger interface for formatting operations
 */
interface SimpleLogger {
  warn?: (message: string) => void;
  debug?: (message: string) => void;
}

/**
 * Formats TypeScript files in the generated SDK using Biome.
 * This function formats all .ts and .tsx files in the src directory.
 *
 * @param outDir - The output directory where the SDK was generated
 * @param logger - Optional logger instance for logging formatting progress
 * @returns Promise that resolves when formatting is complete
 */
export async function formatWithBiome(
  outDir: string,
  logger?: Logger | SimpleLogger
): Promise<void> {
  const log = logger || console;

  try {
    // Check if Biome is available
    try {
      await execAsync("npx --yes @biomejs/biome --version", {
        cwd: outDir,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });
    } catch (error) {
      log.warn?.(
        "Biome is not available. Skipping code formatting. Install @biomejs/biome to enable formatting."
      );
      return;
    }

    // Format all TypeScript files in the src directory
    const srcDir = path.join(outDir, "src");

    // Check if src directory exists
    if (!fs.existsSync(srcDir)) {
      log.warn?.(
        `Source directory not found at ${srcDir}. Skipping formatting.`
      );
      return;
    }

    log.debug?.(`Formatting TypeScript files in ${srcDir}...`);

    // Use Biome to format all TypeScript files
    // Biome will automatically discover and format .ts and .tsx files
    const { stdout, stderr } = await execAsync(
      "npx --yes @biomejs/biome format --write src",
      {
        cwd: outDir,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      }
    );

    if (stdout) {
      log.debug?.(stdout);
    }
    if (stderr && !stderr.includes("warning")) {
      log.warn?.(stderr);
    }

    log.debug?.("Code formatting completed successfully.");
  } catch (error) {
    // Don't fail generation if formatting fails - just log a warning
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.warn?.(
      `Failed to format code with Biome: ${errorMessage}. Generated code will not be formatted.`
    );
  }
}
