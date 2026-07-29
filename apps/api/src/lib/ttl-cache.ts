type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

/**
 * Small bounded cache for expensive, repeatable reads.
 *
 * The API currently runs as one Render instance, so a process-local cache avoids
 * a database round trip without introducing a new availability dependency.
 * The interface is intentionally storage-agnostic so Redis can replace it when
 * the service is scaled horizontally.
 */
export class TtlCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly maxEntries: number,
    private readonly ttlMs: number,
  ) {}

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }

    // Refresh insertion order so frequently used entries survive eviction.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    this.entries.delete(key);
    this.entries.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });

    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value as string | undefined;
      if (!oldestKey) break;
      this.entries.delete(oldestKey);
    }
  }

  clear(): void {
    this.entries.clear();
  }
}
