// Cache Analytics Service - Track cache effectiveness to optimize API usage
interface CacheMetrics {
  hits: number;
  misses: number;
  algoliaQueries: number;
  jobProcessingCalls: number;
  cacheEfficiency: number;
}

interface CacheEvent {
  timestamp: number;
  type: 'hit' | 'miss' | 'algolia' | 'processing';
  searchKey?: string;
  duration?: number;
}

class CacheAnalyticsService {
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    algoliaQueries: 0,
    jobProcessingCalls: 0,
    cacheEfficiency: 0
  };

  private events: CacheEvent[] = [];
  private readonly MAX_EVENTS = 1000; // Keep only last 1000 events

  /**
   * Record a cache hit
   */
  recordCacheHit(searchKey: string): void {
    this.metrics.hits++;
    this.updateCacheEfficiency();
    this.addEvent('hit', searchKey);
    console.log(`[CACHE] Hit for key: ${searchKey.substring(0, 50)}...`);
  }

  /**
   * Record a cache miss
   */
  recordCacheMiss(searchKey: string): void {
    this.metrics.misses++;
    this.updateCacheEfficiency();
    this.addEvent('miss', searchKey);
    console.log(`[CACHE] Miss for key: ${searchKey.substring(0, 50)}...`);
  }

  /**
   * Record an Algolia query
   */
  recordAlgoliaQuery(searchKey: string, duration?: number): void {
    this.metrics.algoliaQueries++;
    this.addEvent('algolia', searchKey, duration);
    console.log(`[ALGOLIA] Query for key: ${searchKey.substring(0, 50)}... (${duration || 'N/A'}ms)`);
  }

  /**
   * Record job processing API call
   */
  recordJobProcessing(searchKey: string, duration?: number): void {
    this.metrics.jobProcessingCalls++;
    this.addEvent('processing', searchKey, duration);
    console.log(`[PROCESSING] Job processing for key: ${searchKey.substring(0, 50)}... (${duration || 'N/A'}ms)`);
  }

  /**
   * Get current cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cache efficiency report
   */
  getEfficiencyReport(): any {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const apiSavings = this.metrics.hits; // Each hit saves an API call
    
    return {
      totalRequests,
      cacheHits: this.metrics.hits,
      cacheMisses: this.metrics.misses,
      cacheEfficiency: this.metrics.cacheEfficiency,
      algoliaQueries: this.metrics.algoliaQueries,
      jobProcessingCalls: this.metrics.jobProcessingCalls,
      apiCallsSaved: apiSavings,
      costSavingsEstimate: this.estimateCostSavings(apiSavings),
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Reset metrics (useful for testing or periodic reporting)
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      algoliaQueries: 0,
      jobProcessingCalls: 0,
      cacheEfficiency: 0
    };
    this.events = [];
    console.log('[CACHE ANALYTICS] Metrics reset');
  }
  /**
   * Get hourly cache statistics
   */
  getHourlyStats(): any {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const recentEvents = this.events.filter(event => event.timestamp >= oneHourAgo);
    
    const stats = {
      hits: recentEvents.filter(e => e.type === 'hit').length,
      misses: recentEvents.filter(e => e.type === 'miss').length,
      algoliaQueries: recentEvents.filter(e => e.type === 'algolia').length,
      jobProcessing: recentEvents.filter(e => e.type === 'processing').length,
      efficiency: 0
    };
    
    const totalRequests = stats.hits + stats.misses;
    stats.efficiency = totalRequests > 0 ? (stats.hits / totalRequests) * 100 : 0;
    
    return stats;
  }

  private updateCacheEfficiency(): void {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    this.metrics.cacheEfficiency = totalRequests > 0 ? (this.metrics.hits / totalRequests) * 100 : 0;
  }

  private addEvent(type: CacheEvent['type'], searchKey?: string, duration?: number): void {
    this.events.push({
      timestamp: Date.now(),
      type,
      searchKey,
      duration
    });

    // Keep only recent events
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }
  }

  private estimateCostSavings(apiCallsSaved: number): string {
    // Rough estimate: Algolia costs ~$0.0005 per search, TheirStack might cost more
    const algoliaUnit = 0.0005;
    const theirStackUnit = 0.01; // Estimated higher cost for external API
    
    const algoliaServiceSavings = apiCallsSaved * algoliaUnit;
    const theirStackSavings = this.metrics.jobProcessingCalls * theirStackUnit;
    
    const totalSavings = algoliaServiceSavings + theirStackSavings;
    
    return `$${totalSavings.toFixed(2)} (${apiCallsSaved} API calls saved)`;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.metrics.cacheEfficiency < 30) {
      recommendations.push('Cache efficiency is low. Consider increasing cache TTL or warming more popular searches.');
    }
    
    if (this.metrics.jobProcessingCalls > this.metrics.algoliaQueries * 2) {
      recommendations.push('High job processing calls. Consider enhancing cache warming for popular queries.');
    }
    
    if (this.metrics.misses > this.metrics.hits) {
      recommendations.push('More cache misses than hits. Review popular search patterns and improve cache warming.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Cache performance looks good! Continue monitoring for optimization opportunities.');
    }
    
    return recommendations;
  }
}

export const cacheAnalytics = new CacheAnalyticsService();
