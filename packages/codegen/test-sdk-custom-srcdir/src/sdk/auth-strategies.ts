import type { AuthStrategy } from '@blimu/fetch';
import type { ClientOption } from './client';

export function buildAuthStrategies(cfg: ClientOption): AuthStrategy[] {
  const authStrategies: AuthStrategy[] = [...(cfg?.authStrategies ?? [])];

  if (cfg.bearerAuth) {
    authStrategies.push({
      type: 'bearer',
      token: cfg.bearerAuth,
    });
  }
  if (cfg.apiKeyAuth) {
    authStrategies.push({
      type: 'apiKey',
      key: cfg.apiKeyAuth,
      location: 'header',
      name: 'X-API-Key',
    });
  }
  if (cfg.basicAuth) {
    authStrategies.push({
      type: 'basic',
      username: cfg.basicAuth.username,
      password: cfg.basicAuth.password,
    });
  }
  return authStrategies;
}
