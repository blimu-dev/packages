// Generated zod schemas from OpenAPI components.schemas
// Use these schemas for runtime validation in forms, API requests, etc.

import { z } from 'zod';

/**
 * Schema for EntitlementType
 * Entitlement identifier
 */
export const EntitlementTypeSchema = z.string();

/**
 * Schema for ResourceType
 * Resource type identifier
 */
export const ResourceTypeSchema = z.string();

/**
 * Schema for UsageLimitType
 * Usage-based limit type identifier
 */
export const UsageLimitTypeSchema = z.string();

/**
 * Zod schema for BalanceResponse
 */
export const BalanceResponseSchema = z.object({ balance: z.number() });

/**
 * Zod schema for EntitlementCheckResult
 */
export const EntitlementCheckResultSchema = z.object({ allowed: z.boolean() });

/**
 * Zod schema for EntitlementCheckBody
 */
export const EntitlementCheckBodySchema = z.object({
  entitlement: EntitlementTypeSchema,
  resourceId: z.string(),
  userId: z.string(),
});

/**
 * Zod schema for ResourceList
 */
export const ResourceListSchema = z.object({
  items: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      type: ResourceTypeSchema,
    })
    .array(),
  total: z.number(),
});

// Operation query parameter schemas

/**
 * Schema for query params of Resources.List
 * Retrieves a paginated list of resources of the specified type. Supports search and filtering. Resources are returned with their parent relationships and metadata.
 */
export const ResourcesListQuerySchema = z.object({
  /** Number of items per page (minimum: 1, maximum: 100) */
  limit: z.number().optional(),
  /** Page number for pagination */
  page: z.number().optional(),
  /** Search query to filter resources by name */
  search: z.string().optional(),
});

/**
 * Schema for query params of Usage.GetBalance
 * Retrieves the current balance of a usage wallet for a specific resource and limit type.
 */
export const UsageGetBalanceQuerySchema = z.object({
  /** Time period for the balance calculation */
  period: z.enum(['monthly', 'yearly', 'lifetime']),
});
