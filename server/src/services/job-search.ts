import { algoliaJobs } from '../config/algolia';
import { JobProcessorService } from './job-processor';
import { queryCache } from './cache';
import { cacheAnalytics } from './cache-analytics';

export interface JobSearchResponse {
  data: any[];
  metadata: {
    total_results: number;
    page: number;
    limit: number;
    has_more: boolean;
  };
}

// Request tracking and caching for smart polling
interface ProcessingRequest {
  searchKey: string;
  timestamp: number;
  status: 'processing' | 'completed' | 'failed';
}

interface CachedResult {
  searchKey: string;
  timestamp: number;
  isEmpty: boolean;
}

class RequestTracker {
  private static processingRequests = new Map<string, ProcessingRequest>();
  private static negativeCache = new Map<string, CachedResult>();
  private static readonly PROCESSING_TIMEOUT = 60000; // 1 minute
  private static readonly CACHE_TTL = 1800000; // 30 minutes (Layer 3 optimization - increased from 15 minutes)

  static generateSearchKey(queryParams: any): string {
    const normalized = {
      what: queryParams.what?.toLowerCase()?.trim() || '',
      where: queryParams.where?.toLowerCase()?.trim() || '',
      salary_min: queryParams.salary_min || '',
      salary_max: queryParams.salary_max || '',
      remote: queryParams.remote || false,
      contract_type: queryParams.contract_type || ''
    };
    return JSON.stringify(normalized);
  }

  static isProcessing(searchKey: string): boolean {
    const request = this.processingRequests.get(searchKey);
    if (!request) return false;
    
    // Check if request has timed out
    if (Date.now() - request.timestamp > this.PROCESSING_TIMEOUT) {
      this.processingRequests.delete(searchKey);
      return false;
    }
    
    return request.status === 'processing';
  }

  static startProcessing(searchKey: string): void {
    this.processingRequests.set(searchKey, {
      searchKey,
      timestamp: Date.now(),
      status: 'processing'
    });
  }

  static finishProcessing(searchKey: string, success: boolean): void {
    const request = this.processingRequests.get(searchKey);
    if (request) {
      request.status = success ? 'completed' : 'failed';
      // Remove completed/failed requests after a short delay
      setTimeout(() => {
        this.processingRequests.delete(searchKey);
      }, 5000);
    }
  }

  static isCachedEmpty(searchKey: string): boolean {
    const cached = this.negativeCache.get(searchKey);
    if (!cached) return false;
    
    // Check if cache has expired
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.negativeCache.delete(searchKey);
      return false;
    }
    
    return cached.isEmpty;
  }

  static cacheEmptyResult(searchKey: string): void {
    this.negativeCache.set(searchKey, {
      searchKey,
      timestamp: Date.now(),
      isEmpty: true
    });
  }

  static clearCache(searchKey?: string): void {
    if (searchKey) {
      this.negativeCache.delete(searchKey);
      this.processingRequests.delete(searchKey);
    } else {
      this.negativeCache.clear();
      this.processingRequests.clear();
    }
  }
}

class JobSearchService {
  /**
   * Get optimized job search for frontend with query parameters
   * Uses Algolia-first architecture with smart async job processing fallback
   */  async getJobs(queryParams: any): Promise<any> {
    // Generate unique search key for request tracking
    const searchKey = RequestTracker.generateSearchKey(queryParams);
      // Check the query cache first (Layer 1 optimization)
    const cachedResult = queryCache.get(searchKey);
    if (cachedResult) {
      console.log(`Returning cached response for search key: ${searchKey}`);
      cacheAnalytics.recordCacheHit(searchKey);
      return cachedResult;
    }
    
    cacheAnalytics.recordCacheMiss(searchKey);
    
    // Build the search query - include location in the search query instead of as exact filter
    let searchQuery = queryParams.what || '';
    if (queryParams.where) {
      // Add location to the search query for fuzzy matching
      searchQuery = searchQuery ? `${searchQuery} ${queryParams.where}` : queryParams.where;
    }
    
    // Build filters for exact numerical/boolean matches only
    const filters: string[] = [];
    if (queryParams.salary_min) filters.push(`min_annual_salary_usd >= ${queryParams.salary_min}`);
    if (queryParams.salary_max) filters.push(`max_annual_salary_usd <= ${queryParams.salary_max}`);
    if (queryParams.remote !== undefined) filters.push(`remote = ${queryParams.remote}`);
    const algoliaFilters = filters.join(' AND ');
    const page = Math.max(0, Number(queryParams.page) || 0);
    const limit = Math.min(10, Math.max(1, Number(queryParams.limit) || 3));    try {
      // 1. Search Algolia first
      console.log(`Searching Algolia for: "${searchQuery}" with filters: "${algoliaFilters}" (page: ${page}, limit: ${limit})`);
      
      const startTime = Date.now();
      const algoliaResult = await algoliaJobs.search(searchQuery, {
        filters: algoliaFilters || undefined,
        page,
        hitsPerPage: limit
      });
      const duration = Date.now() - startTime;
      
      cacheAnalytics.recordAlgoliaQuery(searchKey, duration);
      console.log(`Algolia search result: ${algoliaResult.hits.length} hits found (total: ${algoliaResult.nbHits})`);
      
      if (algoliaResult.hits && algoliaResult.hits.length > 0) {
        // Clear negative cache since we found results
        RequestTracker.clearCache(searchKey);
        
        // Return Algolia hits immediately
        const totalResults = algoliaResult.nbHits || 0;
        const result = {
          status: 200,
          data: algoliaResult.hits,
          metadata: {
            total_results: totalResults,
            page,
            limit,
            has_more: (page + 1) * limit < totalResults
          }
        };

        // Set the result in the query cache before returning (Layer 1 optimization)
        queryCache.set(searchKey, result);
        
        return result;
      } else {
        // No hits: Check smart processing logic
        console.log(`No Algolia hits for search key: ${searchKey}`);
        return this.handleNoResults(searchKey, queryParams);
      }
    } catch (error) {
      console.error('Error searching jobs:', error);
      // On error, still apply smart processing logic
      return this.handleNoResults(searchKey, queryParams);
    }
  }

  private async handleNoResults(searchKey: string, queryParams: any): Promise<any> {
    // Check if we're already processing this search
    if (RequestTracker.isProcessing(searchKey)) {
      return {
        status: 202,
        data: [],
        metadata: {
          status: 'pending',
          message: 'Still searching for jobs... Please wait.',
          searchInProgress: true
        }
      };
    }    // Check if we recently found no results for this search
    if (RequestTracker.isCachedEmpty(searchKey)) {
      const emptyResult = {
        status: 200,
        data: [],
        metadata: {
          total_results: 0,
          page: 0,
          limit: Number(queryParams.limit) || 3,
          has_more: false,
          cached: true,
          message: 'No jobs found for this search criteria.'
        }
      };
      
      // Cache this empty result in queryCache too
      queryCache.set(searchKey, emptyResult);
      
      return emptyResult;
    }    // Start new async processing
    RequestTracker.startProcessing(searchKey);
      setImmediate(async () => {
      try {
        const startTime = Date.now();
        const success = await JobProcessorService.fetchAndProcessJob(queryParams, searchKey);
        const duration = Date.now() - startTime;
        
        cacheAnalytics.recordJobProcessing(searchKey, duration);
        RequestTracker.finishProcessing(searchKey, success);
        
        if (!success) {
          // Cache negative result if no job was found/processed
          RequestTracker.cacheEmptyResult(searchKey);
        }
      } catch (error) {
        console.error('Async job processing failed:', error);
        RequestTracker.finishProcessing(searchKey, false);
        RequestTracker.cacheEmptyResult(searchKey);
      }
    });

    return {
      status: 202,
      data: [],
      metadata: {
        status: 'pending',
        message: 'Searching for new jobs...',
        searchInProgress: false
      }
    };
  }

  /**
   * Apply sorting to job results
   */
  private applySorting(jobs: any[], sort: string): any[] {
    const sortedJobs = [...jobs];
    
    switch (sort) {
      case 'newest':
        return sortedJobs.sort((a: any, b: any) => 
          new Date(b.date_posted).getTime() - new Date(a.date_posted).getTime()
        );
      case 'salary':
        return sortedJobs.sort((a: any, b: any) => 
          (b.max_annual_salary_usd || 0) - (a.max_annual_salary_usd || 0)
        );
      default:
        return sortedJobs;
    }
  }
}

export const jobSearchService = new JobSearchService();
