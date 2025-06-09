// Cache management service
export interface CacheItem<T> {
  data: T;
  expires: number;
}

export class CacheManager<T> {
  private cache = new Map<string, CacheItem<T>>();
  private ttl: number;
  private cleanupInterval: NodeJS.Timeout;
  
  constructor(ttlMs: number, cleanupIntervalMs: number = 60 * 60 * 1000) {
    this.ttl = ttlMs;
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
  }
  
  public set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + this.ttl
    });
  }
  
  public get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (item.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  public has(key: string): boolean {
    return this.get(key) !== null;
  }
  
  public delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  public clear(): void {
    this.cache.clear();
  }
  
  public size(): number {
    return this.cache.size;
  }
    private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, item] of entries) {
      if (item.expires < now) {
        this.cache.delete(key);
      }
    }
  }
  
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Cache instances
export const jobCache = new CacheManager<any>(60 * 60 * 1000); // 1 hour
export const enrichmentCache = new CacheManager<any>(24 * 60 * 60 * 1000); // 24 hours
export const queryCache = new CacheManager<any>(30 * 60 * 1000); // 30 minutes
