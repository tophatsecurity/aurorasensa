// Request queue to prevent overwhelming slow Aurora server
// Limits concurrent requests and adds intelligent throttling

type QueuedRequest<T> = {
  path: string;
  method: string;
  body?: unknown;
  executor: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
};

class AuroraRequestQueue {
  private queue: QueuedRequest<unknown>[] = [];
  private activeRequests = 0;
  private maxConcurrent = 4; // Increased for better parallelism
  private requestDelay = 50; // Reduced delay between requests
  private lastRequestTime = 0;
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private cacheTTL = 30000; // 30 second cache

  getCacheKey(path: string, method: string): string {
    return `${method}:${path}`;
  }

  getCached<T>(path: string, method: string): T | null {
    if (method !== 'GET') return null;
    
    const key = this.getCacheKey(path, method);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data as T;
    }
    
    return null;
  }

  setCache<T>(path: string, method: string, data: T): void {
    if (method !== 'GET') return;
    
    const key = this.getCacheKey(path, method);
    this.cache.set(key, { data, timestamp: Date.now() });
    
    // Limit cache size
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
  }

  invalidateCache(pathPattern?: string): void {
    if (!pathPattern) {
      this.cache.clear();
      return;
    }
    
    for (const key of this.cache.keys()) {
      if (key.includes(pathPattern)) {
        this.cache.delete(key);
      }
    }
  }

  async enqueue<T>(
    path: string,
    method: string,
    body: unknown | undefined,
    executor: () => Promise<T>
  ): Promise<T> {
    // Check cache first for GET requests
    const cached = this.getCached<T>(path, method);
    if (cached !== null) {
      console.log(`[Queue] Cache hit for ${method} ${path}`);
      return cached;
    }

    // If we can execute immediately, do so
    if (this.activeRequests < this.maxConcurrent) {
      return this.execute(path, method, executor);
    }

    // Otherwise queue the request
    console.log(`[Queue] Queuing ${method} ${path} (active: ${this.activeRequests})`);
    
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        path,
        method,
        body,
        executor: executor as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
    });
  }

  private async execute<T>(
    path: string,
    method: string,
    executor: () => Promise<T>
  ): Promise<T> {
    // Add delay between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.requestDelay) {
      await new Promise(r => setTimeout(r, this.requestDelay - timeSinceLastRequest));
    }
    
    this.activeRequests++;
    this.lastRequestTime = Date.now();
    
    try {
      const result = await executor();
      
      // Cache successful GET responses
      this.setCache(path, method, result);
      
      return result;
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.queue.length === 0 || this.activeRequests >= this.maxConcurrent) {
      return;
    }

    const next = this.queue.shift();
    if (!next) return;

    // Execute the queued request with its stored executor
    this.execute(next.path, next.method, next.executor)
      .then(result => next.resolve(result))
      .catch(error => next.reject(error));
  }

  getStats() {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      cacheSize: this.cache.size,
    };
  }
}

export const auroraRequestQueue = new AuroraRequestQueue();
