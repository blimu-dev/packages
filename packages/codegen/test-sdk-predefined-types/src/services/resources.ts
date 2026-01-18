import { FetchClient } from '@blimu/fetch';
import * as Schema from '../schema';
import type { ResourceType } from '@blimu/types';

export class ResourcesService {
  constructor(private core: FetchClient) {}

  /**
   * GET /v1/resources/{resourceType}*
   * @summary List resources*
   * @description Retrieves a paginated list of resources of the specified type. Supports search and filtering. Resources are returned with their parent relationships and metadata.*/
  list(
    resourceType: ResourceType,
    query?: Schema.ResourcesListQuery,
    init?: Omit<RequestInit, 'method' | 'body'>
  ): Promise<Schema.ResourceList> {
    return this.core.request({
      method: 'GET',
      path: `/v1/resources/${encodeURIComponent(resourceType)}`,
      query,
      ...(init ?? {}),
    });
  }
}
