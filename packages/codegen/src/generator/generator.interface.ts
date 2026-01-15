import { IR } from "../ir/ir.types";
import { Client } from "../config/config.schema";

/**
 * Generator interface for SDK generators
 * @template TClient - The specific client type this generator handles
 */
export interface Generator<TClient extends Client = Client> {
  /**
   * Get the type identifier for this generator (e.g., "typescript")
   */
  getType(): string;

  /**
   * Generate an SDK from the given configuration and IR
   */
  generate(client: TClient, ir: IR): Promise<void>;
}
