import { FetchClient, FetchError } from '@blimu/fetch';
import { type FetchClientConfig, type ApiKeyAuthStrategy } from '@blimu/fetch';
import { buildAuthStrategies } from './auth-strategies';
import { EntitlementsService } from './services/entitlements';
import { ResourcesService } from './services/resources';
import { UsageService } from './services/usage';

export type ClientOption = FetchClientConfig & {
  apiKey?: ApiKeyAuthStrategy['key'];
};

export class TestClient {
  readonly entitlements: EntitlementsService;
  readonly resources: ResourcesService;
  readonly usage: UsageService;

  constructor(options?: ClientOption) {
    const restCfg = { ...(options || {}) };
    delete restCfg.apiKey;

    const authStrategies = buildAuthStrategies(options || {});

    const core = new FetchClient({
      ...restCfg,
      baseURL: options?.baseURL ?? '',
      ...(authStrategies.length > 0 ? { authStrategies } : {}),
    });

    this.entitlements = new EntitlementsService(core);
    this.resources = new ResourcesService(core);
    this.usage = new UsageService(core);
  }
}

// Re-export FetchError for backward compatibility
export { FetchError };
export const TestClientError = FetchError;
