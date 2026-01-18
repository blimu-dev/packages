// Generated types from OpenAPI components.schemas

import type { ResourceType, EntitlementType } from '@blimu/types';

export type Enum<T> = T[keyof T];

export interface BalanceResponse {
  balance: number;
}

export interface EntitlementCheckBody {
  entitlement: EntitlementType;
  resourceId: string;
  userId: string;
}

export interface EntitlementCheckResult {
  allowed: boolean;
}

export interface ResourceList {
  items: { id: string; name: string | null; type: ResourceType }[];
  total: number;
}

// Operation query parameter interfaces

/**
 * Query params for Resources.List*
 * Retrieves a paginated list of resources of the specified type. Supports search and filtering. Resources are returned with their parent relationships and metadata.*/
export interface ResourcesListQuery {
  /** Number of items per page (minimum: 1, maximum: 100) */
  limit?: number;
  /** Page number for pagination */
  page?: number;
  /** Search query to filter resources by name */
  search?: string;
}

/**
 * Query params for Usage.GetBalance*
 * Retrieves the current balance of a usage wallet for a specific resource and limit type.*/
export interface UsageGetBalanceQuery {
  /** Time period for the balance calculation */
  period: 'monthly' | 'yearly' | 'lifetime';
}
