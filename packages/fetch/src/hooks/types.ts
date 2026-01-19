import type { QueryParams } from '../types';

/**
 * Lifecycle stages for request execution
 */
export type HookStage =
  | 'beforeRequest'
  | 'afterRequest'
  | 'afterResponse'
  | 'onError'
  | 'beforeRetry'
  | 'afterRetry'
  | 'onTimeout'
  | 'onStreamStart'
  | 'onStreamChunk'
  | 'onStreamEnd';

/**
 * Base context available to all hooks
 */
export interface BaseHookContext {
  url: string;
  init: Omit<RequestInit, 'body'> & {
    path?: string | undefined;
    method: string;
    query?: QueryParams | undefined;
    headers?: Headers | undefined;
    body?: RequestInit['body'] | null | undefined;
  };
  attempt: number;
}

/**
 * Context for beforeRequest hook
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BeforeRequestHookContext extends BaseHookContext {
  // Hooks can modify the request
}

/**
 * Context for afterRequest hook (before parsing)
 */
export interface AfterRequestHookContext extends BaseHookContext {
  response: Response;
}

/**
 * Context for afterResponse hook (after parsing)
 */
export interface AfterResponseHookContext extends BaseHookContext {
  response: Response;
  data: unknown;
}

/**
 * Context for onError hook
 */
export interface OnErrorHookContext extends BaseHookContext {
  error: unknown;
}

/**
 * Context for beforeRetry hook
 */
export interface BeforeRetryHookContext extends BaseHookContext {
  error: unknown;
  retryCount: number;
}

/**
 * Context for afterRetry hook
 */
export interface AfterRetryHookContext extends BaseHookContext {
  error: unknown;
  retryCount: number;
  success: boolean;
}

/**
 * Context for onTimeout hook
 */
export interface OnTimeoutHookContext extends BaseHookContext {
  timeoutMs: number;
}

/**
 * Context for onStreamStart hook
 */
export interface OnStreamStartHookContext extends BaseHookContext {
  response: Response;
}

/**
 * Context for onStreamChunk hook
 */
export interface OnStreamChunkHookContext extends BaseHookContext {
  chunk: unknown;
}

/**
 * Context for onStreamEnd hook
 */
export interface OnStreamEndHookContext extends BaseHookContext {
  response: Response;
}

/**
 * Union type of all hook contexts
 */
export type HookContext =
  | BeforeRequestHookContext
  | AfterRequestHookContext
  | AfterResponseHookContext
  | OnErrorHookContext
  | BeforeRetryHookContext
  | AfterRetryHookContext
  | OnTimeoutHookContext
  | OnStreamStartHookContext
  | OnStreamChunkHookContext
  | OnStreamEndHookContext;

/**
 * Hook function type
 */
export type Hook = (context: HookContext) => void | Promise<void>;

/**
 * Hook configuration interface
 */
export interface HooksConfig {
  beforeRequest?: Hook[];
  afterRequest?: Hook[];
  afterResponse?: Hook[];
  onError?: Hook[];
  beforeRetry?: Hook[];
  afterRetry?: Hook[];
  onTimeout?: Hook[];
  onStreamStart?: Hook[];
  onStreamChunk?: Hook[];
  onStreamEnd?: Hook[];
}
