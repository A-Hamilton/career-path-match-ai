import axios from 'axios';
import { appConfig } from '../config/app';
import { jobCache, queryCache } from './cache';
import { dbService } from './database';
import { AIEnrichmentService } from './ai-enrichment';

export interface JobSearchFilters {
  posted_at_max_age_days?: number;
  page?: number;
  limit?: number;
  job_title_or?: string[];
  job_location_pattern_or?: string[];
  min_annual_salary_usd?: number;
  max_annual_salary_usd?: number;
  employment_statuses?: string[];
  company_name_or?: string[];
  posted_at_gte?: string;
  posted_at_lte?: string;
}

export interface JobSearchResponse {
  data: any[];
  metadata: {
    total_results: number;
    page: number;
    limit: number;
    has_more: boolean;
    from_cache?: number;
    from_api?: number;
    fallback?: boolean;
  };
}

class JobSearchService {
  private readonly apiBaseUrl = 'https://api.theirstack.com/v1/jobs/search';
  private readonly maxEnrichmentsPerRequest = 3;
  private readonly cacheKeyPrefix = 'job_search';

  /**
   * Search for jobs using TheirStack API with intelligent caching and enrichment
   */
  async searchJobs(filters: JobSearchFilters): Promise<JobSearchResponse> {
    // Validate API key
    if (!appConfig.theirStackApiKey) {
      throw new Error('TheirStack API key not configured');
    }

    // Normalize and validate filters
    const normalizedFilters = this.normalizeFilters(filters);
    const cacheKey = this.generateCacheKey(normalizedFilters);
      // Check cache first
    const cached = jobCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Check for existing jobs in Firestore first
      const existingJobs = await this.getExistingJobs(normalizedFilters);
      
      if (existingJobs.length >= (normalizedFilters.limit || 3)) {
        return await this.handleExistingJobs(existingJobs, normalizedFilters, cacheKey);
      }

      // Fetch new jobs from API
      const apiResponse = await this.fetchFromAPI(normalizedFilters);
      const newJobs = this.deduplicateJobs(apiResponse.data, existingJobs);

      if (newJobs.length > 0) {
        return await this.handleNewJobs(newJobs, existingJobs, apiResponse.metadata, normalizedFilters, cacheKey);
      }

      // Return existing jobs if no new ones found
      if (existingJobs.length > 0) {
        return await this.handleExistingJobs(existingJobs, normalizedFilters, cacheKey);
      }

      // No results found
      return this.createEmptyResponse(normalizedFilters);

    } catch (error: any) {
      console.error('Job search error:', error);
      
      // Try to return existing jobs as fallback
      const existingJobs = await this.getExistingJobs(normalizedFilters);
      if (existingJobs.length > 0) {
        return await this.createFallbackResponse(existingJobs, normalizedFilters);
      }

      throw error;
    }
  }

  /**
   * Get optimized job search for frontend with query parameters
   */
  async getJobs(queryParams: any): Promise<JobSearchResponse> {
    const page = Math.max(0, Number(queryParams.page) || 0);
    const limit = Math.min(10, Math.max(1, Number(queryParams.limit) || 3));
    const { what, where, salary_min, salary_max, contract_type, sort } = queryParams;

    // Create cache key for this exact query
    const queryKey = this.generateQueryCacheKey({ page, limit, what, where, salary_min, salary_max, contract_type, sort });
      // Check query cache
    const cached = queryCache.get(queryKey);
    if (cached) {
      return cached;
    }

    try {
      // Get cached jobs from Firestore with optimized queries
      const cachedJobs = await this.getCachedJobsWithFilters(queryParams);
      
      if (cachedJobs.length > 0) {
        return await this.processQueryResults(cachedJobs, queryParams, queryKey);
      }

      // Fallback to API search
      return await this.fallbackAPISearch(queryParams, queryKey);

    } catch (error: any) {
      console.error('Get jobs error:', error);
      throw new Error(`Failed to fetch jobs: ${error.message}`);
    }
  }

  private normalizeFilters(filters: JobSearchFilters): JobSearchFilters {
    const normalized = { ...filters };
    
    // Set reasonable defaults and limits
    normalized.page = Math.max(0, normalized.page || 0);
    normalized.limit = Math.min(10, Math.max(1, normalized.limit || 3));
    
    // Ensure at least one required filter for TheirStack API
    if (!normalized.posted_at_max_age_days && !normalized.posted_at_gte && 
        !normalized.posted_at_lte && !normalized.company_name_or) {
      normalized.posted_at_max_age_days = 30;
    }

    return normalized;
  }

  private generateCacheKey(filters: JobSearchFilters): string {
    return `${this.cacheKeyPrefix}_${JSON.stringify(filters)}`;
  }

  private generateQueryCacheKey(query: any): string {
    return `query_${JSON.stringify(query)}`;
  }

  private async getExistingJobs(filters: JobSearchFilters): Promise<any[]> {
    try {
      const cutoff = new Date(Date.now() - (filters.posted_at_max_age_days || 30) * 24 * 60 * 60 * 1000).toISOString();
      
      return await dbService.getRecentJobs(cutoff, filters.limit! + 5);
    } catch (error) {
      console.warn('Failed to get existing jobs:', error);
      return [];
    }
  }

  private async getCachedJobsWithFilters(queryParams: any): Promise<any[]> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const limit = Number(queryParams.limit) || 3;
    
    let jobs = await dbService.getRecentJobs(cutoff, limit * 3); // Get extra for filtering
    
    // Apply in-memory filters for complex criteria
    return jobs.filter(job => {
      if (queryParams.what && typeof queryParams.what === 'string' && 
          !job.job_title?.toLowerCase().includes(queryParams.what.toLowerCase())) return false;
      
      if (queryParams.where && typeof queryParams.where === 'string' && 
          !job.location?.toLowerCase().includes(queryParams.where.toLowerCase()) &&
          !job.long_location?.toLowerCase().includes(queryParams.where.toLowerCase())) return false;
      
      if (queryParams.salary_min && queryParams.salary_max) {
        if (job.min_annual_salary_usd && job.min_annual_salary_usd < Number(queryParams.salary_min)) return false;
        if (job.max_annual_salary_usd && job.max_annual_salary_usd > Number(queryParams.salary_max)) return false;
      }
      
      if (queryParams.contract_type && job.employment_statuses && 
          !job.employment_statuses.includes(queryParams.contract_type as string)) return false;
      
      return true;
    });
  }

  private async processQueryResults(jobs: any[], queryParams: any, queryKey: string): Promise<JobSearchResponse> {
    const page = Number(queryParams.page) || 0;
    const limit = Number(queryParams.limit) || 3;
    
    // Apply sorting
    if (queryParams.sort === 'newest') {
      jobs.sort((a, b) => new Date(b.date_posted).getTime() - new Date(a.date_posted).getTime());
    } else if (queryParams.sort === 'salary') {
      jobs.sort((a, b) => (b.max_annual_salary_usd || 0) - (a.max_annual_salary_usd || 0));
    }

    // Paginate
    const pageResults = jobs.slice(page * limit, (page + 1) * limit);
    
    // Enrich with AI
    const enrichedResults = await AIEnrichmentService.enrichJobs(pageResults);

    const responseData: JobSearchResponse = {
      data: enrichedResults,
      metadata: {
        total_results: jobs.length,
        page,
        limit,
        has_more: (page + 1) * limit < jobs.length
      }
    };

    // Cache the result
    queryCache.set(queryKey, responseData);
    
    return responseData;
  }

  private async fetchFromAPI(filters: JobSearchFilters): Promise<{ data: any[], metadata: any }> {
    try {
      const response = await axios.post(this.apiBaseUrl, filters, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${appConfig.theirStackApiKey}`
        },
        timeout: 10000,
        validateStatus: () => true
      });

      if (response.status === 402) {
        throw new Error('Rate limit reached. Please try again later.');
      }

      if (response.status !== 200) {
        throw new Error(`API returned status ${response.status}`);
      }

      const result = response.data;
      return {
        data: Array.isArray(result.data) ? result.data : [],
        metadata: result.metadata || { total_results: 0 }
      };

    } catch (error: any) {
      if (error.response?.status === 402) {
        throw new Error('Rate limit reached. Please try again later.');
      }
      throw error;
    }
  }

  private deduplicateJobs(newJobs: any[], existingJobs: any[]): any[] {
    const existingJobIds = new Set(existingJobs.map(job => String(job.id)));
    return newJobs.filter(job => !existingJobIds.has(String(job.id)));
  }
  private async handleExistingJobs(existingJobs: any[], filters: JobSearchFilters, cacheKey: string): Promise<JobSearchResponse> {
    const enrichedJobs = await AIEnrichmentService.enrichJobs(existingJobs.slice(0, filters.limit || 3));
    
    const responseData: JobSearchResponse = {
      data: enrichedJobs,
      metadata: {
        total_results: existingJobs.length,
        page: filters.page || 0,
        limit: filters.limit!,
        has_more: existingJobs.length > filters.limit!
      }
    };

    // Cache with shorter TTL for existing data
    jobCache.set(cacheKey, responseData);
    
    return responseData;
  }

  private async handleNewJobs(
    newJobs: any[], 
    existingJobs: any[], 
    apiMetadata: any, 
    filters: JobSearchFilters, 
    cacheKey: string
  ): Promise<JobSearchResponse> {
    // Enrich new jobs with AI (limit to prevent overload)
    const jobsToEnrich = newJobs.slice(0, this.maxEnrichmentsPerRequest);
    const enrichedNewJobs = await AIEnrichmentService.enrichJobs(jobsToEnrich);

    // Persist new jobs to Firestore
    try {
      await dbService.batchCreateJobs(enrichedNewJobs);
      console.log(`Persisted ${enrichedNewJobs.length} new jobs to Firestore`);
    } catch (error) {
      console.error('Failed to persist new jobs:', error);
    }

    // Combine existing and new jobs for response
    const allJobs = [...existingJobs, ...enrichedNewJobs].slice(0, filters.limit!);
    
    const responseData: JobSearchResponse = {
      data: allJobs,
      metadata: {
        ...apiMetadata,
        page: filters.page || 0,
        limit: filters.limit!,
        has_more: enrichedNewJobs.length >= filters.limit!,
        from_cache: existingJobs.length,
        from_api: enrichedNewJobs.length
      }
    };

    // Cache the result
    jobCache.set(cacheKey, responseData);
    
    return responseData;
  }

  private async fallbackAPISearch(queryParams: any, queryKey: string): Promise<JobSearchResponse> {
    const page = Number(queryParams.page) || 0;
    const limit = Number(queryParams.limit) || 3;
    
    const apiFilters: JobSearchFilters = { 
      posted_at_max_age_days: 30, 
      page, 
      limit 
    };
    
    if (queryParams.what && typeof queryParams.what === 'string') {
      apiFilters.job_title_or = [queryParams.what.trim()];
    }
    if (queryParams.where && typeof queryParams.where === 'string') {
      apiFilters.job_location_pattern_or = [queryParams.where.trim()];
    }
    if (queryParams.salary_min) apiFilters.min_annual_salary_usd = Number(queryParams.salary_min);
    if (queryParams.salary_max) apiFilters.max_annual_salary_usd = Number(queryParams.salary_max);
    if (queryParams.contract_type && queryParams.contract_type !== 'all') {
      apiFilters.employment_statuses = [queryParams.contract_type];
    }

    try {
      const apiResponse = await this.fetchFromAPI(apiFilters);
      const enrichedJobs = await AIEnrichmentService.enrichJobs(apiResponse.data);

      // Persist to Firestore
      if (enrichedJobs.length > 0) {
        try {
          await dbService.batchCreateJobs(enrichedJobs);
        } catch (error) {
          console.error('Failed to persist API fallback jobs:', error);
        }
      }

      const responseData: JobSearchResponse = {
        data: enrichedJobs,
        metadata: {
          total_results: apiResponse.metadata.total_results || enrichedJobs.length,
          page,
          limit,
          has_more: enrichedJobs.length >= limit
        }
      };

      // Cache with shorter TTL
      queryCache.set(queryKey, responseData);
      
      return responseData;

    } catch (error) {
      console.warn('API fallback failed:', error);
      return this.createEmptyResponse({ page, limit });
    }
  }

  private createEmptyResponse(filters: { page?: number; limit?: number }): JobSearchResponse {
    return {
      data: [],
      metadata: {
        total_results: 0,
        page: filters.page || 0,
        limit: filters.limit || 3,
        has_more: false
      }
    };
  }
  private async createFallbackResponse(existingJobs: any[], filters: JobSearchFilters): Promise<JobSearchResponse> {
    const enrichedJobs = await AIEnrichmentService.enrichJobs(existingJobs.slice(0, filters.limit || 3));
    
    return {
      data: enrichedJobs,
      metadata: {
        total_results: existingJobs.length,
        page: filters.page || 0,
        limit: filters.limit || 3,
        has_more: false,
        fallback: true
      }
    };
  }
}

export const jobSearchService = new JobSearchService();
