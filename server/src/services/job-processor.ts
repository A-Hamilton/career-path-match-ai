// server/src/services/job-processor.ts
import { jobsIndex } from '../config/algolia';
import { dbService } from './database';
import { AIEnrichmentService } from './ai-enrichment';
import { AISanitizationService } from './ai-sanitization';
import { API_ENDPOINTS, appConfig } from '../config/app';
import { logger } from '../utils/logger';
import axios from 'axios';

export class JobProcessorService {
  /**
   * Fetch a job from TheirStack, enrich it, save to Firestore and Algolia.
   * This is called asynchronously when Algolia has no hits for a search.
   * 
   * @param queryParams - The search parameters
   * @param searchKey - Unique key for tracking this search request
   * @returns Promise<boolean> - Whether a job was successfully processed
   */  static async fetchAndProcessJob(queryParams: any, searchKey?: string): Promise<boolean> {
    try {      // 1. Check if we recently processed similar jobs to avoid duplicates (Smart Deduplication)
      const recentSimilarJobs = await JobProcessorService.checkForRecentSimilarJobs(queryParams);
      if (recentSimilarJobs && recentSimilarJobs.length >= 3) {
        logger.info(`Skipping job processing for search ${searchKey || 'unknown'} - found ${recentSimilarJobs.length} recent similar jobs`);
        return true; // Consider this a success since we have recent data
      }
        // 2. Fetch real jobs from TheirStack API
      const theirStackJobs = await JobProcessorService.fetchJobsFromTheirStack(queryParams);
      
      if (!theirStackJobs || theirStackJobs.length === 0) {
        logger.info(`No jobs found from TheirStack for search ${searchKey || 'unknown'}`);
        return false;
      }
        // Process all jobs since we're only getting 3 to maximize API credit value
      const jobsToProcess = theirStackJobs; // Process all 3 jobs
      
      let successCount = 0;
        for (const rawJob of jobsToProcess) {
        try {
          // 3. Check if this specific job already exists
          const existingJob = await JobProcessorService.checkJobExists(rawJob);
          if (existingJob) {
            logger.info(`Skipping duplicate job: ${rawJob.job_title} at ${rawJob.company}`);
            continue;
          }
          
          // 4. Enrich with Gemini AI
          const [enrichedJob] = await AIEnrichmentService.enrichJobs([rawJob]);

          // 5. Save to Firestore
          await dbService.upsertJob(enrichedJob);

          // 4. Save to Algolia, using the unique job ID as the objectID
          const objectToSave = { ...enrichedJob, objectID: enrichedJob.id, createdAt: Date.now() };
          await jobsIndex.saveObjects([objectToSave]);
            successCount++;
          logger.info(`Successfully indexed job ${enrichedJob.id} for search: ${searchKey || 'unknown'}`);
          
          // Small delay between processing jobs
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (jobError) {
          logger.error(`Failed to process individual job:`, jobError);
        }
      }      // Simulate realistic API processing time
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      logger.info(`Processed ${successCount}/${jobsToProcess.length} jobs for search: ${searchKey || 'unknown'}`);
      return successCount > 0;
      
    } catch (error) {
      logger.error(`Failed to process jobs for search ${searchKey || 'unknown'}:`, error);
      return false;
    }
  }  /**
   * Fetch real jobs from TheirStack API
   */
  private static async fetchJobsFromTheirStack(queryParams: any): Promise<any[]> {    try {
      if (!appConfig.theirStackApiKey) {
        logger.error('TheirStack API key not configured');
        return [];
      }// Build TheirStack API filters based on API specification
      const filters: any = {
        posted_at_max_age_days: 30, // Required field - jobs posted within last 30 days
        page: 0,
        limit: 3 // Only get 3 jobs to conserve API credits (1 credit per job)
      };

      // Add search criteria using correct parameter names from API docs
      if (queryParams.what) {
        // Use job_title_pattern_or for regex pattern matching (case-insensitive)
        const searchTerm = queryParams.what.trim();
        if (searchTerm) {
          filters.job_title_pattern_or = [searchTerm]; // Must be an array
        }
      }      // NOTE: location_name_or is not supported by TheirStack API
      // Location filtering will be done post-processing
      if (queryParams.where) {
        logger.info(`Location filtering for "${queryParams.where}" will be applied post-processing`);
        
        // Check if this is an unlikely location combination that should be skipped
        if (this.shouldSkipLocationSearch(queryParams.where, queryParams.what)) {
          logger.info(`Skipping TheirStack API call for unlikely location combination: "${queryParams.where}"`);
          return [];
        }
      }

      // Add salary filters if provided (using correct parameter names)
      if (queryParams.salary_min) {
        filters.min_salary_usd = parseInt(queryParams.salary_min);
      }      if (queryParams.salary_max) {
        filters.max_salary_usd = parseInt(queryParams.salary_max);
      }

      logger.info(`Fetching jobs from TheirStack API with filters:`, filters);

      const response = await axios.post(
        API_ENDPOINTS.THEIRSTACK_SEARCH,
        filters,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${appConfig.theirStackApiKey}`
          },
          timeout: 15000, // Increased timeout
          validateStatus: (status) => status < 500 // Accept 4xx errors to handle them gracefully
        }
      );      if (response.status === 402) {
        logger.warn('TheirStack API: Payment required or quota exceeded - consider upgrading plan or implementing fallback');
        // TODO: Could implement fallback to alternative job source here
        return [];
      }

      if (response.status === 429) {
        logger.warn('TheirStack API: Rate limit reached - will retry later');
        return [];
      }

      if (response.status === 422) {
        logger.error('TheirStack API: Invalid parameters:', response.data);
        return [];
      }

      if (response.status !== 200) {
        logger.error(`TheirStack API returned status ${response.status}:`, response.data);
        return [];
      }      const result = response.data;
      let jobsList = Array.isArray(result.data) ? result.data : [];

      logger.info(`Retrieved ${jobsList.length} jobs from TheirStack API`);// Apply location filtering post-processing since TheirStack doesn't support location_name_or
      if (queryParams.where) {
        const locationFilter = queryParams.where.toLowerCase().trim();
        const originalCount = jobsList.length;
        
        // More flexible location matching
        jobsList = jobsList.filter((job: any) => {
          // Handle special cases first
          if (locationFilter === 'remote' && job.remote) {
            return true;
          }
          
          // Get all possible location fields
          const jobLocation = (job.location?.name || job.location_name || job.location || '').toLowerCase();
          const jobLongLocation = (job.location?.full_name || job.long_location || '').toLowerCase();
          const jobCountry = (job.location?.country || job.country || '').toLowerCase();
          const jobCity = (job.location?.city || job.city || '').toLowerCase();
          const jobState = (job.location?.state || job.state || '').toLowerCase();
          
          // Split location filter into parts for flexible matching
          const filterParts: string[] = locationFilter.split(/[\s,]+/).filter((part: string) => part.length > 0);
          
          // Check if any filter part matches any location field
          return filterParts.some(filterPart => 
            jobLocation.includes(filterPart) || 
            jobLongLocation.includes(filterPart) ||
            jobCountry.includes(filterPart) ||
            jobCity.includes(filterPart) ||
            jobState.includes(filterPart) ||
            // Also check for common location abbreviations
            (filterPart === 'ny' && (jobLocation.includes('new york') || jobState.includes('new york'))) ||
            (filterPart === 'nyc' && jobLocation.includes('new york')) ||
            (filterPart === 'sf' && (jobLocation.includes('san francisco') || jobCity.includes('san francisco'))) ||
            (filterPart === 'belfast' && (jobLocation.includes('belfast') || jobCity.includes('belfast')))
          );
        });

        logger.info(`Location filter "${queryParams.where}" reduced results from ${originalCount} to ${jobsList.length} jobs`);
        
        // Debug: Log some job locations if filtering removed everything
        if (jobsList.length === 0 && originalCount > 0) {
          logger.debug('Sample job locations from original results:', {
            originalJobs: Array.isArray(result.data) ? result.data.slice(0, 3).map((job: any, index: number) => ({
              jobIndex: index + 1,
              location: job.location,
              location_name: job.location_name,
              long_location: job.long_location,
              country: job.country,
              city: job.city,
              state: job.state
            })) : [],
            filterTerm: locationFilter
          });
        }
      }      // Transform TheirStack jobs using AI sanitization instead of manual transformation
      const sanitizedJobs = await AISanitizationService.batchSanitizeJobs(jobsList);
      
      return sanitizedJobs;} catch (error: any) {
      logger.error('Error fetching jobs from TheirStack:', error.response?.data || error.message);
      return [];
    }
  }  /**
   * Check for recent similar jobs to prevent redundant processing (Smart Deduplication)
   */
  private static async checkForRecentSimilarJobs(queryParams: any): Promise<any[] | null> {
    try {
      const searchTerm = (queryParams.what || '').toLowerCase();
      const location = queryParams.where || '';
      
      // Search for jobs created in the last 4 hours that match the search criteria
      const cutoffTime = Date.now() - (4 * 60 * 60 * 1000); // 4 hours ago
      
      const searchQuery = `${searchTerm} ${location}`.trim();
      
      const result = await jobsIndex.search(searchQuery, {
        filters: `createdAt > ${cutoffTime}`,
        hitsPerPage: 10
      });
        if (result.hits && result.hits.length > 0) {
        logger.info(`Found ${result.hits.length} recent similar jobs for query: ${searchQuery}`);
        return result.hits;
      }
      
      return null;
    } catch (error) {
      logger.error('Error checking for recent similar jobs:', error);
      return null;
    }
  }

  /**
   * Check if a specific job already exists to prevent exact duplicates
   */
  private static async checkJobExists(jobData: any): Promise<boolean> {
    try {
      // Search for exact matches by title and company
      const result = await jobsIndex.search('', {
        filters: `job_title:"${jobData.job_title}" AND company:"${jobData.company}"`,
        hitsPerPage: 1
      });
        return result.hits && result.hits.length > 0;
    } catch (error) {
      logger.error('Error checking if job exists:', error);
      return false;
    }
  }

  /**
   * Determine if a location search is unlikely to yield results and should be skipped
   * This helps save API credits by avoiding searches for locations that TheirStack
   * is unlikely to have jobs for (e.g., small cities outside major markets)
   */
  private static shouldSkipLocationSearch(location: string, jobTitle?: string): boolean {
    if (!location) return false;
    
    const normalizedLocation = location.toLowerCase().trim();
    
    // Never skip remote searches
    if (normalizedLocation === 'remote' || normalizedLocation.includes('remote')) {
      return false;
    }
    
    // TheirStack primarily serves global tech markets, skip very specific local searches
    const smallCities = [
      'belfast', 'cork', 'galway', 'limerick', 'waterford', // Ireland (outside Dublin)
      'dundee', 'aberdeen', 'stirling', 'perth', // Scotland (outside major cities)
      'cardiff', 'swansea', 'newport', // Wales (outside major cities)
      'bath', 'exeter', 'brighton', 'bournemouth', 'plymouth', // UK smaller cities
      'regina', 'saskatoon', 'halifax', 'victoria', // Canada smaller cities
      'albany', 'rochester', 'syracuse', 'buffalo', // US smaller cities
    ];
    
    // Check if the location matches known smaller cities
    const isSmallCity = smallCities.some(city => normalizedLocation.includes(city));
    
    if (isSmallCity) {
      logger.info(`Location "${location}" identified as small city with limited tech job market`);
      return true;
    }
    
    // Additional checks for very specific location patterns
    if (normalizedLocation.includes(',')) {
      const parts = normalizedLocation.split(',').map(p => p.trim());
      // Check if it's a very specific location like "Belfast, Northern Ireland"
      if (parts.length === 2 && smallCities.includes(parts[0])) {
        return true;
      }
    }
    
    return false;
  }
}
