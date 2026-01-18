import type { AuthStrategy } from '@blimu/fetch';
import type { ClientOption } from './client';

export function buildAuthStrategies(cfg: ClientOption): AuthStrategy[] {
  const authStrategies: AuthStrategy[] = [...(cfg?.authStrategies ?? [])];

  if (cfg.apiKey) {
    authStrategies.push({
      type: 'apiKey',
      key: cfg.apiKey,
      location: 'header',
      name: 'X-API-KEY',
    });
  }
  return authStrategies;
}
