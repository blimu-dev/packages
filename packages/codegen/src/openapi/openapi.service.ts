import { Injectable, Logger } from '@nestjs/common';
import SwaggerParser from '@apidevtools/swagger-parser';
import * as fs from 'fs';
import * as path from 'path';
import type { OpenAPIDocument } from './openapi-version.utils';
import {
  detectOpenAPIVersion,
  isSupportedVersion,
} from './openapi-version.utils';

@Injectable()
export class OpenApiService {
  private readonly logger = new Logger(OpenApiService.name);

  /**
   * Load an OpenAPI document from a local file path or an HTTP(S) URL
   * Supports both OpenAPI 3.0 and 3.1
   */
  async loadDocument(input: string): Promise<OpenAPIDocument> {
    try {
      // Try to parse as URL; if it looks like http(s), fetch via URL
      let url: URL | null = null;
      try {
        url = new URL(input);
      } catch {
        // Not a URL, treat as file path
      }

      let api: OpenAPIDocument;
      if (url && (url.protocol === 'http:' || url.protocol === 'https:')) {
        // Load from URL
        this.logger.debug(`Loading OpenAPI spec from URL: ${input}`);

        // First, fetch and parse the document
        const response = await fetch(input, {
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch OpenAPI spec: HTTP ${response.status} ${response.statusText}`
          );
        }

        const documentText = await response.text();
        let documentJson: unknown;

        try {
          documentJson = JSON.parse(documentText);
        } catch {
          throw new Error('OpenAPI spec is not valid JSON');
        }

        // Parse the document first to get the raw structure
        // Then use bundle on the parsed document to preserve internal $ref pointers
        // This is important for component schema references (especially simple types)
        try {
          // SwaggerParser.parse accepts string | object and returns Promise<Document>
          // TypeScript's type definitions for SwaggerParser are complex, so we use type assertions
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parsed = (await SwaggerParser.parse(
            documentJson as any
          )) as any;
          // SwaggerParser.bundle accepts string | Document and returns Promise<Document>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const bundled = (await SwaggerParser.bundle(parsed as any)) as any;
          api = bundled as OpenAPIDocument;

          // Don't dereference - we want to preserve internal $ref pointers to component schemas
          // This allows us to correctly identify component schema references even for simple types
          // Only external $ref pointers should be resolved by bundle
        } catch (error) {
          // If bundle fails, try dereference directly
          this.logger.debug(
            `Bundle failed: ${error instanceof Error ? error.message : String(error)}`
          );
          this.logger.debug('Attempting dereference directly');

          // SwaggerParser.parse accepts string | object and returns Promise<Document>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parsed = (await SwaggerParser.parse(
            documentJson as any
          )) as any;
          // SwaggerParser.dereference accepts string | Document and returns Promise<Document>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const dereferenced = (await SwaggerParser.dereference(
            parsed as any
          )) as any;
          api = dereferenced as OpenAPIDocument;
        }
      } else {
        // Load from file
        const filePath = path.resolve(input);
        if (!fs.existsSync(filePath)) {
          throw new Error(`OpenAPI spec file not found: ${filePath}`);
        }
        this.logger.debug(`Loading OpenAPI spec from file: ${filePath}`);

        // Try bundle first (preserves internal $ref pointers)
        // If that fails, fall back to dereference
        try {
          api = (await SwaggerParser.bundle(filePath)) as OpenAPIDocument;
          // Don't dereference - we want to preserve internal $ref pointers to component schemas
        } catch (error) {
          // If bundle fails, try dereference directly
          this.logger.debug(
            `Bundle failed: ${error instanceof Error ? error.message : String(error)}`
          );
          this.logger.debug('Attempting dereference directly');
          api = (await SwaggerParser.dereference(filePath)) as OpenAPIDocument;
        }
      }

      // Detect and validate version
      const version = detectOpenAPIVersion(api);
      if (!isSupportedVersion(version)) {
        throw new Error(
          `Unsupported OpenAPI version: ${api.openapi}. Only versions 3.0.x and 3.1.0 are supported.`
        );
      }

      this.logger.log(`Detected OpenAPI version: ${version} (${api.openapi})`);
      return api;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to load OpenAPI document from ${input}: ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Validate an OpenAPI document
   */
  async validateDocument(input: string): Promise<void> {
    try {
      let url: URL | null = null;
      try {
        url = new URL(input);
      } catch {
        // Not a URL
      }

      if (url && (url.protocol === 'http:' || url.protocol === 'https:')) {
        await SwaggerParser.validate(input);
      } else {
        const filePath = path.resolve(input);
        if (!fs.existsSync(filePath)) {
          throw new Error(`OpenAPI spec file not found: ${filePath}`);
        }
        await SwaggerParser.validate(filePath);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Invalid OpenAPI document: ${error.message}`);
      }
      throw error;
    }
  }
}
