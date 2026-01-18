import { FetchClient } from '@blimu/fetch';
import * as Schema from '../schema';

export class EntitlementsService {
  constructor(private core: FetchClient) {}

  /**
   * POST /v1/entitlements/check*
   * @summary Check if a user has a specific entitlement on a resource*
   * @description Checks whether a user has permission to perform a specific action (entitlement) on a resource.*/
  checkEntitlement(
    body: Schema.EntitlementCheckBody,
    init?: Omit<RequestInit, 'method' | 'body'>
  ): Promise<Schema.EntitlementCheckResult> {
    return this.core.request({
      method: 'POST',
      path: `/v1/entitlements/check`,
      body,
      ...(init ?? {}),
    });
  }
}
