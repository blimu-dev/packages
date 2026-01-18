import { FetchClient } from '@blimu/fetch';

export class EventsService {
  constructor(private core: FetchClient) {}

  /**
   * GET /events*
   * @summary Stream server-sent events*/
  async *streamEvents(
    init?: Omit<RequestInit, 'method' | 'body'>
  ): AsyncGenerator<string, void, unknown> {
    yield* this.core.requestStream({
      method: 'GET',
      path: `/events`,
      contentType: 'text/event-stream',
      streamingFormat: 'sse',
      ...(init ?? {}),
    });
  }
}
