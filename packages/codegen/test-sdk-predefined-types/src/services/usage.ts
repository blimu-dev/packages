import { FetchClient } from '@blimu/fetch';
import * as Schema from '../schema';
import type { ResourceType, UsageLimitType } from '@blimu/types';

export class UsageService {
  constructor(private core: FetchClient) {}

  /**
   * GET /v1/usage/balance/{resourceType}/{resourceId}/{limitType}*
   * @summary Get wallet balance*
   * @description Retrieves the current balance of a usage wallet for a specific resource and limit type.*/
  getBalance(
    resourceType: ResourceType,
    resourceId: string,
    limitType: UsageLimitType,
    query?: Schema.UsageGetBalanceQuery,
    init?: Omit<RequestInit, 'method' | 'body'>
  ): Promise<Schema.BalanceResponse> {
    return this.core.request({
      method: 'GET',
      path: `/v1/usage/balance/${encodeURIComponent(resourceType)}/${encodeURIComponent(resourceId)}/${encodeURIComponent(limitType)}`,
      query,
      ...(init ?? {}),
    });
  }
}
