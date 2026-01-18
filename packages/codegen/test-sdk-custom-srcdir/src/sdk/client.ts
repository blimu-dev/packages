import { FetchClient, FetchError } from '@blimu/fetch';
import {
  type FetchClientConfig,
  type BearerAuthStrategy,
  type ApiKeyAuthStrategy,
} from '@blimu/fetch';
import { buildAuthStrategies } from './auth-strategies';
import { DataService } from './services/data';
import { EventsService } from './services/events';
import { UsersService } from './services/users';

export type ClientOption = FetchClientConfig & {
  apiKeyAuth?: ApiKeyAuthStrategy['key'];
  basicAuth?: { username: string; password: string };
  bearerAuth?: BearerAuthStrategy['token'];
};

export class TestClient {
  readonly data: DataService;
  readonly events: EventsService;
  readonly users: UsersService;

  constructor(options?: ClientOption) {
    const restCfg = { ...(options || {}) };
    delete restCfg.apiKeyAuth;
    delete restCfg.basicAuth;
    delete restCfg.bearerAuth;

    const authStrategies = buildAuthStrategies(options || {});

    const core = new FetchClient({
      ...restCfg,
      baseURL: options?.baseURL ?? 'https://api.test.com/v1',
      ...(authStrategies.length > 0 ? { authStrategies } : {}),
    });

    this.data = new DataService(core);
    this.events = new EventsService(core);
    this.users = new UsersService(core);
  }
}

// Re-export FetchError for backward compatibility
export { FetchError };
export const TestClientError = FetchError;
