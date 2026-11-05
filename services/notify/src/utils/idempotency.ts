/**
 * In-memory LRU / TTL Idempotency Store for consumer deduplication.
 * Bounded to prevent memory leaks while guaranteeing at-least-once to exactly-once processing
 * during RabbitMQ redeliveries and network hiccups.
 */
interface CacheEntry {
  timestamp: number;
}

const DEFAULT_TTL_MS = 60 * 60 * 1000;
const MAX_ENTRIES = 10000;

export class IdempotencyStore {
  private readonly store = new Map<string, CacheEntry>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(ttlMs = DEFAULT_TTL_MS, maxEntries = MAX_ENTRIES) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
  }

  /**
   * Returns true if key has already been processed within TTL window.
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Marks a key as processed.
   */
  set(key: string): void {
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.store.delete(oldestKey);
      }
    }
    this.store.set(key, { timestamp: Date.now() });
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

export const defaultIdempotencyStore = new IdempotencyStore();

