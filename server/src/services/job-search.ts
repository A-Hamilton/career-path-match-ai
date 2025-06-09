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
    from_database?: number;
    fallback?: boolean;
    api_strategy?: number;
  };
}

class JobSearchService {
  private readonly apiBaseUrl = 'https://api.theirstack.com/v1/jobs/search';
  private readonly maxEnrichmentsPerRequest = 3;
  private readonly cacheKeyPrefix = 'job_search';  /**
   * Search for jobs using proper cache → database → API → sanitize → update flow
   */
  async searchJobs(filters: JobSearchFilters): Promise<JobSearchResponse> {
    // Validate API key
    if (!appConfig.theirStackApiKey) {
      throw new Error('TheirStack API key not configured');
    }

    // Normalize and validate filters
    const normalizedFilters = this.normalizeFilters(filters);
    const cacheKey = this.generateCacheKey(normalizedFilters);

    // STEP 1: Check cache first
    const cached = jobCache.get(cacheKey);
    if (cached) {
      console.log('Cache hit - returning cached results');
      return cached;
    }

    // STEP 2: Check Firestore database
    console.log('Cache miss - checking Firestore database');
    const databaseJobs = await this.getDatabaseJobs(normalizedFilters);
    
    if (databaseJobs.length >= (normalizedFilters.limit || 3)) {
      console.log(`Found ${databaseJobs.length} jobs in database - sufficient data`);
      const response = await this.processDatabaseResults(databaseJobs, normalizedFilters, cacheKey);
      return response;
    }

    // STEP 3: Make API request (only if insufficient data from database)
    console.log(`Insufficient database results (${databaseJobs.length}) - making API request`);
    try {
      const apiResponse = await this.fetchFromAPI(normalizedFilters);
      const newJobs = this.deduplicateJobs(apiResponse.data, databaseJobs);

      if (newJobs.length > 0) {
        // STEP 4: Sanitize and enrich new data with AI
        console.log(`Processing ${newJobs.length} new jobs from API`);
        const sanitizedJobs = await this.sanitizeAndEnrichJobs(newJobs);
        
        // STEP 5: Update database with sanitized data
        await this.updateDatabaseWithNewJobs(sanitizedJobs);
        
        // Combine with existing database results
        const allJobs = [...databaseJobs, ...sanitizedJobs].slice(0, normalizedFilters.limit!);
        const response = this.createSuccessResponse(allJobs, normalizedFilters, {
          from_cache: 0,
          from_database: databaseJobs.length,
          from_api: sanitizedJobs.length,
          ...apiResponse.metadata
        });
        
        // Cache the result
        jobCache.set(cacheKey, response);
        return response;
      }

      // Return database jobs if no new ones found
      if (databaseJobs.length > 0) {
        console.log('No new API results - returning database results');
        return await this.processDatabaseResults(databaseJobs, normalizedFilters, cacheKey);
      }

      // No results found anywhere
      return this.createEmptyResponse(normalizedFilters);

    } catch (error: any) {
      console.error('API request failed:', error);
      
      // Fallback to database results if available
      if (databaseJobs.length > 0) {
        console.log('API failed - falling back to database results');
        return await this.processDatabaseResults(databaseJobs, normalizedFilters, cacheKey);
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

    // Convert frontend query params to JobSearchFilters format
    const filters: JobSearchFilters = {
      page,
      limit,
      posted_at_max_age_days: 30
    };

    // Add job title filter
    if (what && typeof what === 'string') {
      filters.job_title_or = [what.trim()];
    }

    // Add location filter
    if (where && typeof where === 'string') {
      filters.job_location_pattern_or = [where.trim()];
    }

    // Add salary filters
    if (salary_min) {
      filters.min_annual_salary_usd = Number(salary_min);
    }
    if (salary_max) {
      filters.max_annual_salary_usd = Number(salary_max);
    }

    // Add contract type filter
    if (contract_type && contract_type !== 'all') {
      filters.employment_statuses = [contract_type];
    }

    try {
      // Use the main searchJobs method with proper cache → database → API flow
      const response = await this.searchJobs(filters);

      // Apply frontend-specific sorting if needed
      if (sort && sort !== 'relevance' && response.data.length > 0) {
        response.data = this.applySorting(response.data, sort);
      }

      return response;

    } catch (error: any) {
      console.error('Get jobs error:', error);
      
      // Fallback to cached jobs with filters as last resort
      try {
        const cachedJobs = await this.getCachedJobsWithFilters(queryParams);
        if (cachedJobs.length > 0) {
          return await this.createFallbackResponse(cachedJobs, filters);
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }

      throw new Error(`Failed to fetch jobs: ${error.message}`);
    }
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

  /**
   * Get jobs from database for the specific search filters
   */
  private async getDatabaseJobs(filters: JobSearchFilters): Promise<any[]> {
    try {
      const cutoff = new Date(Date.now() - (filters.posted_at_max_age_days || 30) * 24 * 60 * 60 * 1000).toISOString();
      
      // Build filter object for database query
      const dbFilters: any = {
        cutoffDate: cutoff,
        limit: (filters.limit || 3) * 2 // Get extra for filtering
      };

      // Add location filter if specified
      if (filters.job_location_pattern_or && filters.job_location_pattern_or.length > 0) {
        dbFilters.location = filters.job_location_pattern_or[0];
      }

      // Add salary filters if specified
      if (filters.min_annual_salary_usd) {
        dbFilters.salaryMin = filters.min_annual_salary_usd;
      }
      if (filters.max_annual_salary_usd) {
        dbFilters.salaryMax = filters.max_annual_salary_usd;
      }

      // Add job title filter if specified
      if (filters.job_title_or && filters.job_title_or.length > 0) {
        dbFilters.jobTitle = filters.job_title_or[0];
      }

      return await dbService.getJobsWithFilters(dbFilters);
    } catch (error) {
      console.warn('Failed to get database jobs:', error);
      return [];
    }
  }
  /**
   * Process and return database results with enrichment
   */
  private async processDatabaseResults(
    databaseJobs: any[], 
    filters: JobSearchFilters, 
    cacheKey: string
  ): Promise<JobSearchResponse> {
    // Limit results and enrich with AI
    const jobsToReturn = databaseJobs.slice(0, filters.limit || 3);
    const enrichedJobs = await AIEnrichmentService.enrichJobs(jobsToReturn);

    // Get total count of matching jobs for proper pagination
    let totalCount = databaseJobs.length;
    try {
      // Build filter object for counting
      const countFilters: any = {
        cutoffDate: new Date(Date.now() - (filters.posted_at_max_age_days || 30) * 24 * 60 * 60 * 1000).toISOString()
      };

      if (filters.job_location_pattern_or && filters.job_location_pattern_or.length > 0) {
        countFilters.location = filters.job_location_pattern_or[0];
      }
      if (filters.min_annual_salary_usd) {
        countFilters.salaryMin = filters.min_annual_salary_usd;
      }
      if (filters.max_annual_salary_usd) {
        countFilters.salaryMax = filters.max_annual_salary_usd;
      }
      if (filters.job_title_or && filters.job_title_or.length > 0) {
        countFilters.jobTitle = filters.job_title_or[0];
      }

      totalCount = await dbService.countJobsWithFilters(countFilters);
    } catch (error) {
      console.warn('Failed to get total count, using database results length:', error);
    }

    const response: JobSearchResponse = {
      data: enrichedJobs,
      metadata: {
        total_results: totalCount,
        page: filters.page || 0,
        limit: filters.limit || 3,
        has_more: totalCount > enrichedJobs.length,
        from_cache: 0,
        from_database: enrichedJobs.length,
        from_api: 0
      }
    };

    // Cache the result
    jobCache.set(cacheKey, response);
    
    return response;
  }

  /**
   * Sanitize and enrich new jobs from API
   */
  private async sanitizeAndEnrichJobs(jobs: any[]): Promise<any[]> {
    if (!jobs || jobs.length === 0) {
      return [];
    }

    // First, sanitize the job data
    const sanitizedJobs = jobs.map(job => this.sanitizeJobData(job));

    // Then enrich with AI (limit to prevent overload)
    const jobsToEnrich = sanitizedJobs.slice(0, this.maxEnrichmentsPerRequest);
    return await AIEnrichmentService.enrichJobs(jobsToEnrich);
  }

  /**
   * Sanitize individual job data from API
   */
  private sanitizeJobData(job: any): any {
    return {
      id: job.id || `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      job_title: job.job_title || job.title || 'Unknown Position',
      company: job.company || job.company_object?.name || 'Unknown Company',
      location: job.location || '',
      long_location: job.long_location || job.location || '',
      description: job.description || job.short_description || '',
      short_description: job.short_description || job.description?.substring(0, 200) || '',
      date_posted: job.date_posted || new Date().toISOString(),
      min_annual_salary_usd: job.min_annual_salary_usd || null,
      max_annual_salary_usd: job.max_annual_salary_usd || null,
      country: job.country || '',
      industry: job.industry || '',
      tags: Array.isArray(job.tags) ? job.tags : [],
      employment_statuses: Array.isArray(job.employment_statuses) ? job.employment_statuses : [],
      url: job.url || job.final_url || '',
      final_url: job.final_url || job.url || '',
      remote: job.remote || false,
      cachedAt: new Date()
    };
  }

  /**
   * Update database with new sanitized jobs
   */
  private async updateDatabaseWithNewJobs(jobs: any[]): Promise<void> {
    if (!jobs || jobs.length === 0) {
      return;
    }

    try {
      await dbService.batchCreateJobs(jobs);
      console.log(`Successfully updated database with ${jobs.length} new jobs`);
    } catch (error) {
      console.error('Failed to update database with new jobs:', error);
      // Don't throw - this is not critical for the response
    }
  }
  /**
   * Create success response with metadata
   */
  private createSuccessResponse(
    jobs: any[], 
    filters: JobSearchFilters, 
    metadata: any
  ): JobSearchResponse {
    return {
      data: jobs,
      metadata: {
        total_results: metadata.total_results || jobs.length,
        page: filters.page || 0,
        limit: filters.limit || 3,
        has_more: metadata.total_results ? metadata.total_results > jobs.length : jobs.length >= (filters.limit || 3),
        from_cache: metadata.from_cache || 0,
        from_database: metadata.from_database || 0,
        from_api: metadata.from_api || 0
      }
    };
  }

  private async getCachedJobsWithFilters(queryParams: any): Promise<any[]> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const limit = Number(queryParams.limit) || 3;
    
    let jobs = await dbService.getRecentJobs(cutoff, limit * 4); // Get extra for filtering
    
    // Apply in-memory filters for complex criteria
    return jobs.filter((job: any) => {
      // Job title filter - more flexible matching
      if (queryParams.what && typeof queryParams.what === 'string') {
        const searchTerms = queryParams.what.toLowerCase().split(/\s+/);
        const jobTitle = job.job_title?.toLowerCase() || '';
        const hasMatch = searchTerms.some((term: string) => jobTitle.includes(term));
        if (!hasMatch) return false;
      }
      
      // Location filter - improved for country/city matching with priority for Poland
      if (queryParams.where && typeof queryParams.where === 'string') {
        const locationSearch = queryParams.where.toLowerCase().trim();
        const location = (job.location || '').toLowerCase();
        const longLocation = (job.long_location || '').toLowerCase();
        
        // Enhanced Poland matching
        if (locationSearch === 'poland' || locationSearch === 'pl') {
          return this.isPolandJob(location, longLocation);
        }
        
        // Priority matching for other locations: exact country match, then city match, then partial match
        const isCountryMatch = this.isCountryMatch(locationSearch, longLocation) || 
                              this.isCountryMatch(locationSearch, location);
        const isCityMatch = location.includes(locationSearch) || longLocation.includes(locationSearch);
        
        if (!isCountryMatch && !isCityMatch) return false;
      }
      
      // Salary range filter - fixed logic
      if (queryParams.salary_min || queryParams.salary_max) {
        const jobMinSalary = job.min_annual_salary_usd || 0;
        const jobMaxSalary = job.max_annual_salary_usd || Number.MAX_SAFE_INTEGER;
        
        if (queryParams.salary_min && jobMaxSalary < Number(queryParams.salary_min)) return false;
        if (queryParams.salary_max && jobMinSalary > Number(queryParams.salary_max)) return false;
      }
      
      if (queryParams.contract_type && job.employment_statuses && 
          !job.employment_statuses.includes(queryParams.contract_type as string)) return false;
      
      return true;
    });
  }

  /**
   * Enhanced Poland job detection
   */
  private isPolandJob(location: string, longLocation: string): boolean {
    const polandIndicators = [
      'poland', 'polska', 'pl', 'warsaw', 'krakow', 'cracow', 'gdansk', 'wroclaw',
      'poznan', 'lodz', 'katowice', 'bydgoszcz', 'lublin', 'bialystok'
    ];
    
    // Direct country match
    if (polandIndicators.some(indicator => 
      location.includes(indicator) || longLocation.includes(indicator))) {
      return true;
    }
    
    // Check if it's explicitly NOT Poland (exclude false positives)
    const excludePatterns = [
      'germany', 'uk', 'united kingdom', 'france', 'spain', 'italy', 
      'netherlands', 'belgium', 'denmark', 'sweden', 'norway'
    ];
    
    if (excludePatterns.some(pattern => 
      location.includes(pattern) || longLocation.includes(pattern))) {
      return false;
    }
    
    return false;
  }

  /**
   * Check if location search matches a country
   */
  private isCountryMatch(searchTerm: string, location: string): boolean {
    const countryMappings: Record<string, string[]> = {
      'poland': ['poland', 'pl', 'polska'],
      'germany': ['germany', 'de', 'deutschland'],
      'united states': ['united states', 'us', 'usa', 'america'],
      'united kingdom': ['united kingdom', 'uk', 'britain', 'england'],
      'france': ['france', 'fr', 'français'],
      'spain': ['spain', 'es', 'españa'],
      'italy': ['italy', 'it', 'italia'],
      'netherlands': ['netherlands', 'nl', 'holland'],
      'canada': ['canada', 'ca'],
      'australia': ['australia', 'au'],
    };

    // Direct country name match
    for (const [country, aliases] of Object.entries(countryMappings)) {
      if (aliases.includes(searchTerm)) {
        return aliases.some(alias => location.includes(alias));
      }
    }

    // Fallback to partial match for unlisted countries
    return location.includes(searchTerm);
  }

  private async processQueryResults(jobs: any[], queryParams: any, queryKey: string): Promise<JobSearchResponse> {
    const page = Number(queryParams.page) || 0;
    const limit = Number(queryParams.limit) || 3;
    
    // Apply sorting
    if (queryParams.sort === 'newest') {
      jobs.sort((a: any, b: any) => new Date(b.date_posted).getTime() - new Date(a.date_posted).getTime());
    } else if (queryParams.sort === 'salary') {
      jobs.sort((a: any, b: any) => (b.max_annual_salary_usd || 0) - (a.max_annual_salary_usd || 0));
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
      console.log('Making API request with filters:', JSON.stringify(filters, null, 2));
      
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

      if (response.status === 422) {
        console.error('API 422 Error - Invalid parameters:', {
          filters,
          responseData: response.data,
          message: response.data?.message || 'Invalid request parameters'
        });
        throw new Error(`Invalid search parameters: ${response.data?.message || 'Please try simplifying your search criteria'}`);
      }

      if (response.status !== 200) {
        console.error(`API Error ${response.status}:`, response.data);
        throw new Error(`API returned status ${response.status}: ${response.data?.message || 'Unknown error'}`);
      }

      const result = response.data;
      console.log(`API returned ${result.data?.length || 0} jobs`);
      
      return {
        data: Array.isArray(result.data) ? result.data : [],
        metadata: result.metadata || { total_results: 0 }
      };

    } catch (error: any) {
      if (error.response?.status === 402) {
        throw new Error('Rate limit reached. Please try again later.');
      }
      if (error.response?.status === 422) {
        throw new Error(`Invalid search parameters: ${error.response.data?.message || 'Please try simplifying your search criteria'}`);
      }
      
      console.error('API request failed:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      throw error;
    }
  }

  private deduplicateJobs(newJobs: any[], existingJobs: any[]): any[] {
    const existingJobIds = new Set(existingJobs.map((job: any) => String(job.id)));
    return newJobs.filter((job: any) => !existingJobIds.has(String(job.id)));
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
    
    // Try multiple strategies to avoid 422 errors from complex filters
    const strategies = [
      () => this.buildSimpleAPIFilters(queryParams, { page, limit }), // Most specific first
      () => this.buildBasicAPIFilters(queryParams, { page, limit }),  // Basic filters only
      () => this.buildMinimalAPIFilters({ page, limit })               // Minimal fallback
    ];

    for (let i = 0; i < strategies.length; i++) {
      try {
        const apiFilters = strategies[i]();
        console.log(`Trying API strategy ${i + 1}:`, JSON.stringify(apiFilters));
        
        const apiResponse = await this.fetchFromAPI(apiFilters);
        let jobs = apiResponse.data;

        // Apply client-side filtering for complex criteria that caused API 422
        if (i > 0) {
          jobs = this.applyClientSideFilters(jobs, queryParams);
        }

        const enrichedJobs = await AIEnrichmentService.enrichJobs(jobs.slice(0, limit));

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
            has_more: enrichedJobs.length >= limit,
            api_strategy: i + 1
          }
        };

        // Cache with shorter TTL
        queryCache.set(queryKey, responseData);
        
        return responseData;

      } catch (error: any) {
        console.warn(`API strategy ${i + 1} failed:`, error.message);
          // If this is the last strategy, return empty response
        if (i === strategies.length - 1) {
          console.error('All API strategies failed, returning empty response');
          return this.createEmptyResponse({ page, limit } as JobSearchFilters);
        }
        
        // Continue to next strategy
        continue;
      }
    }

    return this.createEmptyResponse({ page, limit } as JobSearchFilters);
  }

  /**
   * Build API filters with all parameters (most likely to cause 422)
   */
  private buildSimpleAPIFilters(queryParams: any, pagination: { page: number; limit: number }): JobSearchFilters {
    const apiFilters: JobSearchFilters = { 
      posted_at_max_age_days: 30,
      ...pagination
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

    return apiFilters;
  }

  /**
   * Build API filters with basic parameters only (avoid salary ranges)
   */
  private buildBasicAPIFilters(queryParams: any, pagination: { page: number; limit: number }): JobSearchFilters {
    const apiFilters: JobSearchFilters = { 
      posted_at_max_age_days: 30,
      ...pagination
    };
    
    if (queryParams.what && typeof queryParams.what === 'string') {
      apiFilters.job_title_or = [queryParams.what.trim()];
    }
    if (queryParams.where && typeof queryParams.where === 'string') {
      apiFilters.job_location_pattern_or = [queryParams.where.trim()];
    }
    // Skip salary and contract_type to avoid 422 errors

    return apiFilters;
  }

  /**
   * Build minimal API filters (most likely to succeed)
   */
  private buildMinimalAPIFilters(pagination: { page: number; limit: number }): JobSearchFilters {
    return { 
      posted_at_max_age_days: 30,
      ...pagination
    };
  }

  /**
   * Apply client-side filtering when API filters were simplified
   */
  private applyClientSideFilters(jobs: any[], queryParams: any): any[] {
    return jobs.filter((job: any) => {
      // Salary range filter
      if (queryParams.salary_min || queryParams.salary_max) {
        const jobMinSalary = job.min_annual_salary_usd || 0;
        const jobMaxSalary = job.max_annual_salary_usd || Number.MAX_SAFE_INTEGER;
        
        if (queryParams.salary_min && jobMaxSalary < Number(queryParams.salary_min)) return false;
        if (queryParams.salary_max && jobMinSalary > Number(queryParams.salary_max)) return false;
      }
      
      // Contract type filter
      if (queryParams.contract_type && queryParams.contract_type !== 'all' && job.employment_statuses) {
        if (!job.employment_statuses.includes(queryParams.contract_type)) return false;
      }
      
      return true;
    });
  }
  private createEmptyResponse(filters: JobSearchFilters): JobSearchResponse {
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
        has_more: existingJobs.length > enrichedJobs.length,
        fallback: true
      }
    };
  }
}

export const jobSearchService = new JobSearchService();
