import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestContext } from '../src/config/context.js';
import { fetchCatalogBatchWithRetry } from '../src/modules/catalog-client/catalog.client.js';

describe('Phase 4: Distributed Tracing & Correlation in Orders Service', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('forwards active x-request-id from AsyncLocalStorage to the catalog service', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: '10000000-0000-4000-8000-000000000001',
          name: 'Classic Burger',
          price: '12.50',
          isAvailable: true,
        },
      ],
    });
    globalThis.fetch = mockFetch;

    const traceId = 'trace-uuid-4444-8888-abcdef123456';

    await requestContext.run({ requestId: traceId }, async () => {
      const result = await fetchCatalogBatchWithRetry([
        '10000000-0000-4000-8000-000000000001',
      ]);
      expect(result).toHaveLength(1);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const fetchHeaders = mockFetch.mock.calls[0]?.[1]?.headers;
    expect(fetchHeaders).toHaveProperty('X-Request-Id', traceId);

    globalThis.fetch = originalFetch;
  });
});

