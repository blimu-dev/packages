import { FetchClient } from '@blimu/fetch';
import * as Schema from '../schema';

export class DataService {
  constructor(private core: FetchClient) {}

  /**
   * GET /data/stream*
   * @summary Stream data as NDJSON*/
  async *streamData(
    init?: Omit<RequestInit, 'method' | 'body'>
  ): AsyncGenerator<Schema.DataItem, void, unknown> {
    yield* this.core.requestStream({
      method: 'GET',
      path: `/data/stream`,
      contentType: 'application/x-ndjson',
      streamingFormat: 'ndjson',
      ...(init ?? {}),
    });
  }
}
