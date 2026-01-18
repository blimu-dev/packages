/**
 * This file is generated only once. If it already exists, it will not be overwritten.
 * You can safely add custom exports, re-exports, or any other code here as needed.
 * Your customizations will be preserved across SDK regenerations.
 */

// Re-export everything from client
export * from './client';

// Re-export all error types from @blimu/fetch for instanceof checks
export * from '@blimu/fetch';

// Re-exports for better ergonomics
export * from './utils';
export * as Schema from './schema';
export * as ZodSchema from './schema.zod';
export { DataService } from './services/data';
export { EventsService } from './services/events';
export { UsersService } from './services/users';
