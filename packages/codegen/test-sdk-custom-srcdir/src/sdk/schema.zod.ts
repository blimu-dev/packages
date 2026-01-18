// Generated zod schemas from OpenAPI components.schemas
// Use these schemas for runtime validation in forms, API requests, etc.

import { z } from 'zod';

/**
 * Zod schema for CreateUserRequest
 */
export const CreateUserRequestSchema = z.object({
  age: z.number().int().optional(),
  email: z.string(),
  name: z.string().optional(),
});

/**
 * Zod schema for DataItem
 */
export const DataItemSchema = z.object({
  id: z.string(),
  timestamp: z.iso.datetime(),
  value: z.number(),
});

/**
 * Zod schema for PatchUserRequest
 */
export const PatchUserRequestSchema = z.object({
  email: z.string().optional(),
  name: z.string().optional(),
});

/**
 * Zod schema for UpdateUserRequest
 */
export const UpdateUserRequestSchema = z.object({
  age: z.number().int().optional(),
  email: z.string().optional(),
  name: z.string().optional(),
});

/**
 * Zod schema for User
 */
export const UserSchema = z.object({
  age: z.number().int().nullable().optional(),
  email: z.string(),
  id: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  name: z.string().nullable().optional(),
  status: z.enum(['active', 'inactive', 'pending']),
});

// Operation query parameter schemas

/**
 * Schema for query params of users.ListUsers
 */
export const UsersListUsersQuerySchema = z.object({
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
  status: z.enum(['active', 'inactive', 'pending']).array().optional(),
});
