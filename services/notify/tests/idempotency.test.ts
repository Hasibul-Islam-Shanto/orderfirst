import { describe, it, expect } from 'vitest';
import { IdempotencyStore } from '../src/utils/idempotency.js';

describe('Phase 5: Consumer Idempotency Store Unit Tests', () => {
  it('records processed message keys and prevents duplicate processing', () => {
    const store = new IdempotencyStore(60000, 100);
    const key = 'user.registered:user-123:654321';

    expect(store.has(key)).toBe(false);
    store.set(key);
    expect(store.has(key)).toBe(true);
  });

  it('evicts expired keys beyond TTL', async () => {
    // 50ms TTL
    const store = new IdempotencyStore(50, 100);
    const key = 'user.registered:user-temp:111222';

    store.set(key);
    expect(store.has(key)).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(store.has(key)).toBe(false);
  });

  it('enforces maximum capacity and evicts oldest entries (LRU)', () => {
    const store = new IdempotencyStore(60000, 3);

    store.set('key-1');
    store.set('key-2');
    store.set('key-3');
    expect(store.size).toBe(3);

    // Adding key-4 should evict key-1
    store.set('key-4');
    expect(store.size).toBe(3);
    expect(store.has('key-1')).toBe(false);
    expect(store.has('key-2')).toBe(true);
    expect(store.has('key-3')).toBe(true);
    expect(store.has('key-4')).toBe(true);
  });
});

